from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import razorpay
import time
import logging
from datetime import datetime, timezone, timedelta

from app.core.config import settings
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import User, Subscription, PlanType, SubscriptionStatus

logger = logging.getLogger("clipcutter.billing")

router = APIRouter(prefix="/api/billing", tags=["Billing"])


def get_razorpay_client() -> razorpay.Client:
    """
    Dynamically initialize and return Razorpay Client using backend environment variables.
    Never exposes credentials to logs or frontend.
    """
    key_id = (settings.RAZORPAY_KEY_ID or "").strip()
    key_secret = (settings.RAZORPAY_KEY_SECRET or "").strip()

    if not key_id or not key_secret:
        logger.error("[Razorpay Configuration Error] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in backend environment.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay payment gateway is not configured on the server. Please check RAZORPAY_KEY_ID in .env."
        )

    if "xxxxxx" in key_id or "xxxxxx" in key_secret:
        logger.error("[Razorpay Configuration Error] Placeholder credentials detected.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay is configured with placeholder credentials. Please set valid Razorpay Test keys."
        )

    return razorpay.Client(auth=(key_id, key_secret))


class OrderCreate(BaseModel):
    plan: Optional[str] = None
    plan_type: Optional[str] = None


class VerifyPayment(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    subscription_id: Optional[int] = None
    plan_type: Optional[str] = None


@router.post("/create-order")
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. create-order request received
    logger.info(f"[create-order -> 1] Request received for user_id={current_user.id}")

    # 2. authenticated user confirmed
    logger.info(f"[create-order -> 2] Authenticated user confirmed: {current_user.email} (id={current_user.id})")

    # 3. requested plan
    raw_plan = order_data.plan or order_data.plan_type or "BASE"
    logger.info(f"[create-order -> 3] Requested plan: {raw_plan}")

    # 4. resolved plan type
    plan_str = raw_plan.upper()
    if plan_str in ["BASE", "CREATOR"]:
        amount = settings.BASE_PLAN_PRICE_INR * 100
        plan_type = PlanType.BASE
    elif plan_str in ["PRO", "AGENCY"]:
        amount = settings.PRO_PLAN_PRICE_INR * 100
        plan_type = PlanType.PRO
    else:
        logger.warning(f"[create-order -> 4] Invalid plan requested: {raw_plan}")
        raise HTTPException(status_code=400, detail=f"Invalid plan '{raw_plan}'. Valid options are BASE or PRO.")
    logger.info(f"[create-order -> 4] Resolved plan type: {plan_type.value}")

    # 5. calculated amount
    logger.info(f"[create-order -> 5] Calculated amount: {amount} paise (₹{amount / 100:.2f})")

    # 6. Razorpay client initialized
    client = get_razorpay_client()
    key_preview = f"{settings.RAZORPAY_KEY_ID[:8]}..." if len(settings.RAZORPAY_KEY_ID) > 8 else "configured"
    logger.info(f"[create-order -> 6] Razorpay client initialized (Key prefix: {key_preview})")

    receipt = f"order_{current_user.id}_{int(time.time())}"

    # 7. BEFORE razorpay.orders.create()
    logger.info(f"[create-order -> 7] BEFORE razorpay.orders.create() with receipt={receipt}")
    try:
        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "notes": {
                "user_id": str(current_user.id),
                "plan_type": plan_type.value,
                "email": current_user.email
            }
        })
    except razorpay.errors.RazorpayError as rzp_err:
        logger.error(f"[create-order RazorpayError] Failed calling Razorpay API: {type(rzp_err).__name__}: {rzp_err}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Razorpay order creation error: {str(rzp_err)}"
        )
    except Exception as e:
        logger.error(f"[create-order Exception] Unexpected error during order creation: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not initiate payment order: {str(e)}"
        )

    # 8. AFTER razorpay.orders.create()
    logger.info(f"[create-order -> 8] AFTER razorpay.orders.create() succeeded")

    # 9. Razorpay order ID received
    order_id = order.get("id")
    if not order_id:
        logger.error(f"[create-order -> 9] Order ID missing from Razorpay response: {order}")
        raise HTTPException(status_code=502, detail="Invalid response from Razorpay (missing order ID)")
    logger.info(f"[create-order -> 9] Razorpay order ID received: {order_id}")

    # 10. subscription database insert
    new_sub = Subscription(
        user_id=current_user.id,
        plan_type=plan_type,
        razorpay_order_id=order_id,
        status=SubscriptionStatus.PENDING,
        amount_paid=amount / 100
    )
    db.add(new_sub)
    await db.flush()
    logger.info(f"[create-order -> 10] Subscription DB record inserted: sub_id={new_sub.id}")

    # 11. database commit
    await db.commit()
    await db.refresh(new_sub)
    logger.info(f"[create-order -> 11] Database committed successfully for sub_id={new_sub.id}")

    # 12. response returned
    response_payload = {
        "order_id": order_id,
        "amount": amount,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
        "subscription_id": new_sub.id,
        "plan_type": plan_type.value
    }
    logger.info(f"[create-order -> 12] Response returned: order_id={order_id}, sub_id={new_sub.id}")
    return response_payload


@router.post("/verify-payment")
async def verify_payment(
    payment_data: VerifyPayment,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    logger.info(f"[verify-payment] Received verification for order={payment_data.razorpay_order_id}, user={current_user.email}")
    client = get_razorpay_client()

    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': payment_data.razorpay_order_id,
            'razorpay_payment_id': payment_data.razorpay_payment_id,
            'razorpay_signature': payment_data.razorpay_signature
        })
        logger.info(f"[verify-payment] Cryptographic signature verified successfully for order {payment_data.razorpay_order_id}")
    except razorpay.errors.SignatureVerificationError as sig_err:
        logger.error(f"[verify-payment SignatureVerificationError] Invalid signature: {sig_err}")
        raise HTTPException(status_code=400, detail="Payment signature verification failed. Please contact support.")
    except Exception as e:
        logger.error(f"[verify-payment Exception] Error verifying signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid payment verification parameters.")

    if payment_data.subscription_id:
        result = await db.execute(select(Subscription).where(Subscription.id == payment_data.subscription_id))
    else:
        result = await db.execute(select(Subscription).where(Subscription.razorpay_order_id == payment_data.razorpay_order_id))

    subscription = result.scalar_one_or_none()

    if not subscription or subscription.user_id != current_user.id:
        logger.error(f"[verify-payment] Subscription record not found for user {current_user.id}")
        raise HTTPException(status_code=404, detail="Subscription record not found.")

    now_utc = datetime.now(timezone.utc)
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.razorpay_payment_id = payment_data.razorpay_payment_id
    subscription.expires_at = now_utc + timedelta(days=30)

    user_res = await db.execute(select(User).where(User.id == current_user.id))
    user = user_res.scalar_one()

    user.plan = subscription.plan_type
    if subscription.plan_type == PlanType.BASE:
        user.credits_remaining += settings.BASE_PLAN_CREDITS
    elif subscription.plan_type == PlanType.PRO:
        user.credits_remaining += settings.PRO_PLAN_CREDITS

    await db.commit()
    await db.refresh(user)
    logger.info(f"[verify-payment SUCCESS] User {user.email} upgraded to {user.plan.value}, new credits: {user.credits_remaining}")

    return {
        "success": True,
        "message": "Payment verified successfully",
        "plan": user.plan.value,
        "credits": user.credits_remaining
    }


@router.get("/plans")
async def get_plans():
    return [
        {
            "name": "FREE",
            "price": 0,
            "credits": settings.FREE_CREDITS,
            "description": "Basic features with limited credits"
        },
        {
            "name": "BASE",
            "price": settings.BASE_PLAN_PRICE_INR,
            "credits": settings.BASE_PLAN_CREDITS,
            "description": "More credits for regular creators"
        },
        {
            "name": "PRO",
            "price": settings.PRO_PLAN_PRICE_INR,
            "credits": settings.PRO_PLAN_CREDITS,
            "description": "Maximum credits for professional creators"
        }
    ]
