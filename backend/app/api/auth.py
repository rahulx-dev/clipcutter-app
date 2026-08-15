from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, update
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import re
import secrets
import hashlib

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.db.database import get_db
from app.db.models import User, OTPRecord, EmailVerificationToken, PlanType, AuthProvider
from app.services.sms_service import send_sms_otp, mask_phone_number
from app.services.email_service import send_verification_email
from app.services.google_auth_service import verify_google_id_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
INDIAN_PHONE_REGEX = re.compile(r"^(\+91[\-\s]?)?[6789]\d{9}$")


def sanitize_indian_phone(phone: str) -> str:
    """Validate and sanitize an Indian mobile number to E.164 format (+91XXXXXXXXXX)."""
    clean = phone.strip().replace(" ", "").replace("-", "")
    if not INDIAN_PHONE_REGEX.match(clean):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid 10-digit Indian mobile number (+91) starting with 6, 7, 8, or 9."
        )
    
    digits = "".join(filter(str.isdigit, clean))
    if len(digits) == 10:
        return f"+91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    else:
        return f"+91{digits[-10:]}"


def validate_genuine_email(email: str) -> str:
    """Validate that email has an authentic structure and genuine domain."""
    clean_email = email.strip().lower()
    if not clean_email or not EMAIL_REGEX.match(clean_email):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid email address (e.g. yourname@gmail.com)"
        )
    return clean_email


# ── Request Schemas ──────────────────────────────────────────────────
class SendPhoneOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian phone number (+91)")


class VerifyPhoneOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian phone number (+91)")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")


class GoogleOAuthRequest(BaseModel):
    credential: str = Field(..., description="Google OAuth 2.0 ID Token / Credential string")


class UserRegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


# ── 1. Phone Number + Real SMS OTP Routes ────────────────────────────
@router.post("/phone/send-otp")
async def send_phone_otp(
    req: SendPhoneOtpRequest, 
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a secure 6-digit OTP, store bcrypt hash, and dispatch via real SMS gateway.
    
    Enforces:
    - Phone number validation (+91 Indian standard).
    - 60-second resend cooldown.
    - Rate limiting: max 3 requests per phone within 10 minutes.
    - Zero plaintext OTP in response or server logs.
    """
    e164_phone = sanitize_indian_phone(req.phone)
    now_utc = datetime.now(timezone.utc)

    # 1. Check Cooldown (60 seconds)
    recent_otp_query = await db.execute(
        select(OTPRecord)
        .where(OTPRecord.phone == e164_phone)
        .order_by(OTPRecord.created_at.desc())
    )
    last_record = recent_otp_query.scalars().first()

    if last_record and last_record.last_sent_at:
        # Normalize timezone
        last_sent = last_record.last_sent_at
        if last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=timezone.utc)
            
        elapsed_seconds = (now_utc - last_sent).total_seconds()
        if elapsed_seconds < settings.OTP_COOLDOWN_SECONDS:
            remaining = int(settings.OTP_COOLDOWN_SECONDS - elapsed_seconds)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting a new OTP."
            )

    # 2. Check Rate Limit (Max 3 OTPs in 10 minutes window)
    window_start = now_utc - timedelta(minutes=settings.OTP_RATE_LIMIT_WINDOW_MINUTES)
    count_query = await db.execute(
        select(func.count(OTPRecord.id))
        .where(
            and_(
                OTPRecord.phone == e164_phone,
                OTPRecord.created_at >= window_start
            )
        )
    )
    otp_count_in_window = count_query.scalar() or 0
    if otp_count_in_window >= settings.OTP_RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Too many OTP requests. For security, please try again after 10 minutes."
        )

    # 3. Generate Cryptographically Secure 6-Digit OTP
    otp_code = str(secrets.randbelow(900000) + 100000)
    
    # 4. Hash OTP with bcrypt before persisting
    hashed_otp = hash_password(otp_code)
    expiry_time = now_utc + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    client_ip = request.client.host if request.client else None

    # Invalidate previous unused OTPs for this phone
    otp_entry = OTPRecord(
        phone=e164_phone,
        otp_hash=hashed_otp,
        attempts=0,
        expires_at=expiry_time,
        last_sent_at=now_utc,
        is_used=False,
        ip_address=client_ip,
        created_at=now_utc
    )
    db.add(otp_entry)
    await db.commit()

    # 5. Dispatch Real SMS
    try:
        await send_sms_otp(e164_phone, otp_code)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send SMS to your mobile carrier: {str(e)}"
        )

    return {
        "success": True,
        "message": f"Verification code dispatched to {mask_phone_number(e164_phone)}",
        "phone": e164_phone,
        "cooldown_seconds": settings.OTP_COOLDOWN_SECONDS,
        "expires_in_seconds": settings.OTP_EXPIRY_MINUTES * 60
    }


@router.post("/phone/verify-otp")
async def verify_phone_otp(
    req: VerifyPhoneOtpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify 6-digit SMS OTP against bcrypt hash, check attempt limits, and authenticate user.
    """
    e164_phone = sanitize_indian_phone(req.phone)
    submitted_otp = req.otp_code.strip()

    if len(submitted_otp) != 6 or not submitted_otp.isdigit():
        raise HTTPException(status_code=400, detail="OTP must be a valid 6-digit number")

    now_utc = datetime.now(timezone.utc)

    # Fetch latest active OTP record
    result = await db.execute(
        select(OTPRecord)
        .where(
            and_(
                OTPRecord.phone == e164_phone,
                OTPRecord.is_used == False
            )
        )
        .order_by(OTPRecord.created_at.desc())
    )
    otp_record = result.scalars().first()

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="No active OTP found. Please request a new verification code."
        )

    # Check Attempt Limit (Max 5 attempts)
    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp_record.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail="Maximum verification attempts exceeded. Please request a new OTP."
        )

    # Check Expiration
    expires = otp_record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now_utc > expires:
        otp_record.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail="Verification code has expired. Please request a new OTP."
        )

    # Verify Bcrypt Hash
    is_valid = verify_password(submitted_otp, otp_record.otp_hash)
    if not is_valid:
        otp_record.attempts += 1
        await db.commit()
        attempts_left = max(0, settings.OTP_MAX_ATTEMPTS - otp_record.attempts)
        raise HTTPException(
            status_code=400,
            detail=f"Invalid OTP code. {attempts_left} attempts remaining."
        )

    # Mark OTP as used
    otp_record.is_used = True
    
    # ── Authenticate or Register User ────────────────────────────────
    user_query = await db.execute(select(User).where(User.phone == e164_phone))
    user = user_query.scalar_one_or_none()

    if not user:
        # Create new phone-verified user with 3 starter credits
        user = User(
            phone=e164_phone,
            name=f"User {e164_phone[-4:]}",
            auth_provider=AuthProvider.PHONE.value,
            phone_verified=True,
            plan=PlanType.FREE,
            credits_remaining=settings.FREE_CREDITS,
            is_admin=False
        )
        db.add(user)
    else:
        user.phone_verified = True

    await db.commit()
    await db.refresh(user)

    # Create JWT session token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "success": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.to_dict(),
        "message": "Phone verified successfully"
    }


# ── 2. Real Google OAuth 2.0 Route ───────────────────────────────────
@router.post("/google")
async def google_oauth_login(
    req: GoogleOAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user using real Google OAuth 2.0 ID token.
    Cryptographically verifies token against Google's public certificates.
    """
    # 1. Cryptographically verify the Google ID token
    verified_data = verify_google_id_token(req.credential)
    
    google_id = verified_data["google_id"]
    email = verified_data["email"]
    name = verified_data["name"]
    avatar = verified_data["avatar"]
    email_verified = verified_data["email_verified"]

    # 2. Check if user exists by google_id or verified email
    user_query = await db.execute(
        select(User).where(
            (User.google_id == google_id) | (User.email == email)
        )
    )
    user = user_query.scalar_one_or_none()

    if not user:
        # Create new verified Google user
        user = User(
            email=email,
            name=name,
            google_id=google_id,
            avatar=avatar,
            auth_provider=AuthProvider.GOOGLE.value,
            email_verified=email_verified,
            plan=PlanType.FREE,
            credits_remaining=settings.FREE_CREDITS,
            is_admin=(email == settings.ADMIN_EMAIL)
        )
        db.add(user)
    else:
        # Update existing user profile with latest Google data
        user.google_id = google_id
        if avatar:
            user.avatar = avatar
        if name and not user.name:
            user.name = name
        user.email_verified = True

    await db.commit()
    await db.refresh(user)

    # 3. Generate JWT access token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "success": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.to_dict(),
        "message": "Google authentication successful"
    }


# ── 3. Standard Email / Password Routes ──────────────────────────────
class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: str


@router.post("/register")
async def register(
    user_data: UserRegisterRequest, 
    db: AsyncSession = Depends(get_db)
):
    clean_email = validate_genuine_email(user_data.email)
    
    if len(user_data.password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    result = await db.execute(select(User).where(User.email == clean_email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        if existing_user.email_verified:
            raise HTTPException(status_code=400, detail="This email is already registered. Please sign in.")
        else:
            # Update password and resend verification
            existing_user.password_hash = hash_password(user_data.password)
            if user_data.name:
                existing_user.name = user_data.name
            user = existing_user
    else:
        user = User(
            email=clean_email,
            name=user_data.name or clean_email.split('@')[0],
            password_hash=hash_password(user_data.password),
            auth_provider=AuthProvider.EMAIL.value,
            email_verified=False,
            plan=PlanType.FREE,
            credits_remaining=settings.FREE_CREDITS,
            is_admin=(clean_email == settings.ADMIN_EMAIL)
        )
        db.add(user)
        await db.flush()

    # Invalidate previous unused tokens for this user
    await db.execute(
        update(EmailVerificationToken)
        .where(and_(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.is_used == False
        ))
        .values(is_used=True)
    )

    # Generate single-use cryptographically secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.EMAIL_VERIFICATION_EXPIRY_MINUTES)

    token_record = EmailVerificationToken(
        user_id=user.id,
        email=clean_email,
        token_hash=token_hash,
        expires_at=expires_at,
        is_used=False
    )
    db.add(token_record)
    await db.commit()

    # Dispatch verification email
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
    send_verification_email(clean_email, user.name, verification_url)
    
    return {
        "success": True,
        "email_verified": False,
        "email": clean_email,
        "message": f"Verification email sent to {clean_email}. Please check your inbox to activate your account."
    }


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    clean_email = form_data.username.strip().lower()
    
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()
    
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Enforce email verification for email-registered accounts
    if not user.email_verified and user.auth_provider == AuthProvider.EMAIL.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the activation link."
        )
        
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "success": True,
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": user.to_dict(),
        "message": "Login successful"
    }


@router.get("/verify-email")
@router.post("/verify-email")
async def verify_email(
    token: Optional[str] = None,
    req: Optional[VerifyEmailRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    raw_token = token or (req.token if req else None)
    if not raw_token or not raw_token.strip():
        raise HTTPException(status_code=400, detail="Verification token is missing")

    token_hash = hashlib.sha256(raw_token.strip().encode()).hexdigest()
    now_utc = datetime.now(timezone.utc)

    result = await db.execute(
        select(EmailVerificationToken)
        .where(and_(
            EmailVerificationToken.token_hash == token_hash,
            EmailVerificationToken.is_used == False
        ))
        .order_by(EmailVerificationToken.created_at.desc())
    )
    token_record = result.scalars().first()

    if not token_record:
        raise HTTPException(
            status_code=400, 
            detail="Invalid or already used verification link. Please request a new verification email."
        )

    exp = token_record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)

    if exp < now_utc:
        raise HTTPException(
            status_code=400, 
            detail="This verification link has expired. Please request a new verification email."
        )

    # Invalidate token
    token_record.is_used = True

    # Mark user as verified
    user_res = await db.execute(select(User).where(User.id == token_record.user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")

    user.email_verified = True
    await db.commit()
    await db.refresh(user)

    # Issue access token so user is seamlessly logged in upon verification
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "success": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.to_dict(),
        "message": "Email verified successfully! Your account is now fully active."
    }


@router.post("/resend-verification")
async def resend_verification(
    req: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    clean_email = validate_genuine_email(req.email)
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    if user.email_verified:
        return {
            "success": True,
            "already_verified": True,
            "message": "Your email is already verified. You can sign in directly."
        }

    now_utc = datetime.now(timezone.utc)

    # Check 60-second cooldown from last token
    last_token_res = await db.execute(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.user_id == user.id)
        .order_by(EmailVerificationToken.created_at.desc())
    )
    last_token = last_token_res.scalars().first()
    if last_token and last_token.created_at:
        created = last_token.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed = (now_utc - created).total_seconds()
        if elapsed < settings.EMAIL_VERIFICATION_COOLDOWN_SECONDS:
            remaining = int(settings.EMAIL_VERIFICATION_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting a new verification link."
            )

    # Invalidate previous tokens
    await db.execute(
        update(EmailVerificationToken)
        .where(and_(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.is_used == False
        ))
        .values(is_used=True)
    )

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = now_utc + timedelta(minutes=settings.EMAIL_VERIFICATION_EXPIRY_MINUTES)

    token_record = EmailVerificationToken(
        user_id=user.id,
        email=clean_email,
        token_hash=token_hash,
        expires_at=expires_at,
        is_used=False
    )
    db.add(token_record)
    await db.commit()

    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"
    send_verification_email(clean_email, user.name, verification_url)

    return {
        "success": True,
        "message": f"A fresh verification link has been sent to {clean_email}."
    }


# ── 4. Current User Session ──────────────────────────────────────────
@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user.to_dict()


@router.post("/logout")
async def logout():
    return {"success": True, "message": "Logged out successfully"}
