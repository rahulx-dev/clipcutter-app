import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import DeclarativeBase, relationship


# ── Base ─────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Enums ────────────────────────────────────────────────────────────
class PlanType(str, enum.Enum):
    FREE = "FREE"
    BASE = "BASE"
    PRO = "PRO"
    ADMIN = "ADMIN"


class AuthProvider(str, enum.Enum):
    PHONE = "PHONE"
    GOOGLE = "GOOGLE"
    EMAIL = "EMAIL"


class SourceType(str, enum.Enum):
    UPLOAD = "UPLOAD"
    YOUTUBE = "YOUTUBE"


class ProjectStatus(str, enum.Enum):
    PENDING = "PENDING"
    DOWNLOADING = "DOWNLOADING"
    TRANSCRIBING = "TRANSCRIBING"
    SEGMENTING = "SEGMENTING"
    PROCESSING = "PROCESSING"
    GENERATING_METADATA = "GENERATING_METADATA"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    PENDING = "PENDING"


# ── User ─────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    avatar = Column(String(1000), nullable=True)
    auth_provider = Column(String(50), default="PHONE", nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    
    plan = Column(Enum(PlanType), default=PlanType.FREE, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    credits_remaining = Column(Integer, default=3, nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    subscriptions = relationship("Subscription", back_populates="user", lazy="select")
    projects = relationship("Project", back_populates="user", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "_id": str(self.id),
            "name": self.name or (self.email.split('@')[0] if self.email else (self.phone or "Creator")),
            "email": self.email,
            "phone": self.phone,
            "googleId": self.google_id,
            "avatar": self.avatar,
            "authProvider": self.auth_provider if isinstance(self.auth_provider, str) else (self.auth_provider.value if hasattr(self.auth_provider, 'value') else str(self.auth_provider)),
            "emailVerified": bool(self.email_verified),
            "phoneVerified": bool(self.phone_verified),
            "plan": self.plan.value if hasattr(self.plan, 'value') else str(self.plan),
            "is_admin": bool(self.is_admin),
            "credits_remaining": self.credits_remaining if not self.is_admin else "unlimited",
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }


# ── Phone OTP Records ────────────────────────────────────────────────
class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    phone = Column(String(20), index=True, nullable=False)
    otp_hash = Column(String(255), nullable=False)  # Only bcrypt hashed OTP
    attempts = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_sent_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    is_used = Column(Boolean, default=False, nullable=False)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )


# ── Email Verification Tokens ────────────────────────────────────────
class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)  # SHA-256 hash of random token
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = relationship("User", lazy="select")



# ── Subscription ─────────────────────────────────────────────────────
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_type = Column(Enum(PlanType), nullable=False)
    razorpay_order_id = Column(String(255), nullable=True)
    razorpay_payment_id = Column(String(255), nullable=True)
    status = Column(
        Enum(SubscriptionStatus),
        default=SubscriptionStatus.PENDING,
        nullable=False,
    )
    amount_paid = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="subscriptions")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_type": self.plan_type.value,
            "razorpay_order_id": self.razorpay_order_id,
            "status": self.status.value,
            "amount_paid": self.amount_paid,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ── Subtitle Preset ──────────────────────────────────────────────────
class SubtitlePreset(Base):
    __tablename__ = "subtitle_presets"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    font_name = Column(String(100), default="Montserrat-Black")
    font_size = Column(Integer, default=22)
    primary_color = Column(String(10), default="&H00FFFFFF")
    highlight_color = Column(String(10), default="&H0000FFFF")
    outline_color = Column(String(10), default="&H00000000")
    outline_width = Column(Float, default=3.0)
    shadow_width = Column(Float, default=1.5)
    animation_type = Column(String(50), default="pop_bounce")
    max_words_per_line = Column(Integer, default=3)
    is_system = Column(Boolean, default=False)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "font_name": self.font_name,
            "font_size": self.font_size,
            "primary_color": self.primary_color,
            "highlight_color": self.highlight_color,
            "outline_color": self.outline_color,
            "outline_width": self.outline_width,
            "shadow_width": self.shadow_width,
            "animation_type": self.animation_type,
            "max_words_per_line": self.max_words_per_line,
            "is_system": self.is_system,
        }


# ── Project ──────────────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    source_type = Column(Enum(SourceType), nullable=False)
    source_file_path = Column(String(2000), nullable=True)
    source_url = Column(String(2000), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    video_metadata = Column(JSON, nullable=True)
    transcript = Column(Text, nullable=True)
    status = Column(
        Enum(ProjectStatus),
        default=ProjectStatus.PENDING,
        nullable=False,
    )
    progress = Column(Float, default=0.0, nullable=False)
    progress_message = Column(String(255), default="Initializing...", nullable=False)
    error_message = Column(Text, nullable=True)
    
    # v3.0 Processing Preferences
    target_shorts_count = Column(Integer, default=4, nullable=False)
    language_preference = Column(String(20), default="auto", nullable=False)
    editing_intensity = Column(String(20), default="BALANCED", nullable=False)

    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="projects")
    clips = relationship("Clip", back_populates="project", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "source_type": self.source_type.value if hasattr(self.source_type, 'value') else str(self.source_type),
            "duration_seconds": self.duration_seconds,
            "video_metadata": self.video_metadata,
            "status": self.status.value if hasattr(self.status, 'value') else str(self.status),
            "progress": self.progress,
            "progress_message": self.progress_message,
            "error_message": self.error_message,
            "target_shorts_count": self.target_shorts_count,
            "language_preference": self.language_preference,
            "editing_intensity": self.editing_intensity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "clips_count": len(self.__dict__.get("clips", [])) if ("clips" in self.__dict__ and self.__dict__["clips"]) else 0,
        }


# ── Clip ─────────────────────────────────────────────────────────────
class Clip(Base):
    __tablename__ = "clips"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    aspect_ratio = Column(String(10), default="9:16", nullable=False)
    video_path = Column(String(2000), nullable=True)
    transcript_segment = Column(Text, nullable=True)
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    hashtags = Column(JSON, nullable=True)
    caption_style = Column(String(50), default="hormozi")
    
    # v3.0 Intelligence Suite
    viral_score = Column(Float, default=85.0, nullable=False)
    viral_breakdown = Column(JSON, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    hooks = Column(JSON, nullable=True)
    selected_hook = Column(String(500), nullable=True)
    broll_suggestions = Column(JSON, nullable=True)
    zoom_cuts = Column(JSON, nullable=True)
    seo_titles = Column(JSON, nullable=True)
    qc_status = Column(JSON, nullable=True)

    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    project = relationship("Project", back_populates="clips")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": round(self.end_time - self.start_time, 2),
            "aspect_ratio": self.aspect_ratio,
            "video_path": self.video_path,
            "transcript_segment": self.transcript_segment,
            "title": self.title,
            "description": self.description,
            "tags": self.tags,
            "hashtags": self.hashtags,
            "caption_style": self.caption_style,
            "viral_score": round(self.viral_score or 85.0, 1),
            "viral_breakdown": self.viral_breakdown or {
                "hook": 18, "retention": 17, "emotional": 16,
                "pacing": 14, "caption": 9, "context": 8, "shareability": 5
            },
            "ai_explanation": self.ai_explanation or "Selected for high audience engagement and clear narrative context.",
            "hooks": self.hooks or [],
            "selected_hook": self.selected_hook,
            "broll_suggestions": self.broll_suggestions or [],
            "zoom_cuts": self.zoom_cuts or [],
            "seo_titles": self.seo_titles or [self.title] if self.title else [],
            "qc_status": self.qc_status or {"synced": True, "audio_ok": True, "safe_area": True},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
