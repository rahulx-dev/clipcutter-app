import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import select

from app.core.config import settings
from app.db.database import create_tables, dispose_engine, AsyncSessionLocal
from app.db.models import User, PlanType, AuthProvider
from app.core.security import hash_password

from app.api.auth import router as auth_router
from app.api.billing import router as billing_router
from app.api.projects import router as projects_router, clip_router
from app.api.process import router as process_router
from app.api.captions import router as captions_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_tables()
    
    async with AsyncSessionLocal() as db:
        if settings.ADMIN_EMAIL:
            result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
            admin = result.scalar_one_or_none()
            if not admin:
                admin_user = User(
                    email=settings.ADMIN_EMAIL,
                    name="Administrator",
                    password_hash=hash_password(settings.ADMIN_PASSWORD),
                    is_admin=True,
                    plan=PlanType.ADMIN,
                    auth_provider=AuthProvider.EMAIL.value,
                    email_verified=True,
                    credits_remaining=999999
                )
                db.add(admin_user)
                await db.commit()
                
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    
    yield
    # Shutdown
    await dispose_engine()

app = FastAPI(title="Clip Cutter API", version="3.0.0", lifespan=lifespan)

import logging
logger = logging.getLogger("clipcutter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else [
        settings.FRONTEND_URL,
        "https://clipcutter-app.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup Diagnostics ───────────────────────────────────────────────
if "change" in settings.JWT_SECRET.lower() or "replace" in settings.JWT_SECRET.lower():
    logger.warning("⚠️  JWT_SECRET is using a placeholder value! Set a strong random secret in production.")
if not settings.GOOGLE_CLIENT_ID or "your-google" in settings.GOOGLE_CLIENT_ID.lower() or "clipcutter-google" in settings.GOOGLE_CLIENT_ID.lower():
    logger.warning("⚠️  GOOGLE_CLIENT_ID is not configured! Google login will not work.")
if settings.DEBUG:
    logger.info("🔧 Running in DEBUG mode — CORS allows all origins")
else:
    logger.info(f"🔒 Production mode — CORS restricted to: {settings.FRONTEND_URL}")

try:
    import yt_dlp
    logger.info(f"📦 yt-dlp version: {yt_dlp.version.__version__}")
except Exception as e:
    logger.warning(f"⚠️ Could not probe yt-dlp: {e}")

try:
    import yt_dlp_ejs
    logger.info("📦 yt-dlp-ejs: INSTALLED")
except ImportError:
    logger.warning("⚠️ yt-dlp-ejs: NOT INSTALLED")

import shutil, subprocess
deno_path = shutil.which("deno")
node_path = shutil.which("node")
if deno_path:
    try:
        deno_ver = subprocess.check_output([deno_path, "--version"], text=True).splitlines()[0]
        logger.info(f"⚡ JS Runtime: {deno_ver} ({deno_path})")
    except Exception:
        logger.info(f"⚡ JS Runtime: Deno found at {deno_path}")
elif node_path:
    try:
        node_ver = subprocess.check_output([node_path, "--version"], text=True).strip()
        logger.info(f"⚡ JS Runtime: Node.js {node_ver} ({node_path})")
    except Exception:
        logger.info(f"⚡ JS Runtime: Node.js found at {node_path}")
else:
    logger.warning("⚠️ JS Runtime: NONE FOUND (Install Deno for yt-dlp challenge execution)")

ffmpeg_path = shutil.which("ffmpeg")
if ffmpeg_path:
    logger.info(f"🎬 FFmpeg: FOUND ({ffmpeg_path})")
else:
    logger.warning("⚠️ FFmpeg: NOT FOUND in PATH")

app.mount("/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")

app.include_router(auth_router)
app.include_router(billing_router)
app.include_router(projects_router)
app.include_router(clip_router)
app.include_router(process_router)
app.include_router(captions_router)

@app.get("/")
async def root():
    return {"name": "Clip Cutter API", "version": "3.0.0", "status": "running"}
