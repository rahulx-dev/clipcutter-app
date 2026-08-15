from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env file."""

    # ── App ──────────────────────────────────────────────────────────
    APP_NAME: str = "Clip Cutter"
    DEBUG: bool = True
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Paths ────────────────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    TEMP_DIR: Optional[Path] = None
    OUTPUT_DIR: Optional[Path] = None

    # ── Database ─────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./clipcutter.db"

    # ── JWT Authentication ───────────────────────────────────────────
    JWT_SECRET: str = "clip-cutter-super-secret-key-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440  # 24 hours

    # ── Admin Account ────────────────────────────────────────────────
    ADMIN_EMAIL: str = "test@test.com"
    ADMIN_PASSWORD: str = "test@123"

    # ── Google OAuth 2.0 ─────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ── Brevo Transactional Email API (Email OTP) ────────────────────
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "noreply@clipcutter.ai"
    BREVO_SENDER_NAME: str = "Clip_Cut"
    EMAIL_OTP_EXPIRY_MINUTES: int = 5
    EMAIL_OTP_MAX_ATTEMPTS: int = 5
    EMAIL_OTP_COOLDOWN_SECONDS: int = 60
    EMAIL_OTP_RATE_LIMIT_WINDOW_MINUTES: int = 10
    EMAIL_OTP_RATE_LIMIT_MAX_REQUESTS: int = 3

    # ── SMTP Email Fallback ──────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Clip_Cut"

    # ── SMS Gateway (Phone OTP) ──────────────────────────────────────
    SMS_PROVIDER: str = "fast2sms"  # "fast2sms" | "twilio" | "msg91" | "console"
    FAST2SMS_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    MSG91_AUTH_KEY: str = ""
    MSG91_TEMPLATE_ID: str = ""

    # ── Phone OTP Policy ─────────────────────────────────────────────
    OTP_EXPIRY_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 5
    OTP_COOLDOWN_SECONDS: int = 60
    OTP_RATE_LIMIT_WINDOW_MINUTES: int = 10
    OTP_RATE_LIMIT_MAX_REQUESTS: int = 3

    # ── Whisper (Transcription) ──────────────────────────────────────
    WHISPER_MODEL: str = "small"
    WHISPER_DEVICE: str = "cuda"
    WHISPER_COMPUTE_TYPE: str = "float16"

    # ── Ollama (LLM Metadata) ────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_GENERATE_URL: str = "http://localhost:11434/api/generate"
    OLLAMA_MODEL: str = "llama3.2:3b"

    # ── Razorpay (Billing) ───────────────────────────────────────────
    RAZORPAY_KEY_ID: str = "rzp_test_xxxxxxxxxxxxx"
    RAZORPAY_KEY_SECRET: str = "xxxxxxxxxxxxxxxxxxxxxxxx"

    # ── FFmpeg ────────────────────────────────────────────────────────
    FFMPEG_NVENC: bool = True
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"

    # ── Pricing & Quotas ─────────────────────────────────────────────
    FREE_CREDITS: int = 3
    BASE_PLAN_CREDITS: int = 50
    BASE_PLAN_PRICE_INR: int = 99
    PRO_PLAN_CREDITS: int = 150
    PRO_PLAN_PRICE_INR: int = 199

    # ── Video Processing ─────────────────────────────────────────────
    MAX_VIDEO_DURATION_MINUTES: int = 120
    CLIP_MIN_DURATION: int = 30
    CLIP_MAX_DURATION: int = 90
    FACE_SAMPLE_RATE: int = 5  # Analyze every Nth frame

    # ── YouTube Downloader (Cookies & Proxy Support) ───────────────────
    YOUTUBE_COOKIES: Optional[str] = None
    YOUTUBE_COOKIES_FILE: Optional[str] = None
    YOUTUBE_PROXY: Optional[str] = None

    model_config = {
        "env_file": [".env", "backend/.env", "../.env"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    def model_post_init(self, __context):
        """Set computed defaults after init."""
        if self.TEMP_DIR is None:
            self.TEMP_DIR = self.BASE_DIR / "temp" / "raw"
        if self.OUTPUT_DIR is None:
            self.OUTPUT_DIR = self.BASE_DIR / "output"
        # Ensure directories exist
        self.TEMP_DIR.mkdir(parents=True, exist_ok=True)
        self.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
