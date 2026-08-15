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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else [settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
