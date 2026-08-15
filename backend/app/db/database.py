from typing import AsyncGenerator
import sqlite3
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# ── Async Engine ─────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

# ── Session Factory ──────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ── Dependency Injection ─────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session for FastAPI route handlers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Table Management & Auto Migrations ──────────────────────────────
async def create_tables():
    """Create all database tables and automatically migrate new columns."""
    from app.db.models import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Auto-migrate missing columns for SQLite
        try:
            # 1. Projects columns
            proj_cols_needed = [
                ("language_preference", "TEXT DEFAULT 'auto'"),
                ("target_shorts_count", "INTEGER DEFAULT 4"),
                ("editing_intensity", "TEXT DEFAULT 'BALANCED'"),
                ("video_metadata", "JSON"),
                ("updated_at", "DATETIME")
            ]
            for col_name, col_def in proj_cols_needed:
                try:
                    await conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col_name} {col_def}"))
                except Exception:
                    pass  # Column already exists

            # 2. Clips columns
            clip_cols_needed = [
                ("viral_score", "FLOAT DEFAULT 85.0"),
                ("viral_breakdown", "JSON"),
                ("ai_explanation", "TEXT"),
                ("hooks", "JSON"),
                ("selected_hook", "TEXT"),
                ("broll_suggestions", "JSON"),
                ("zoom_cuts", "JSON"),
                ("seo_titles", "JSON"),
                ("qc_status", "JSON")
            ]
            for col_name, col_def in clip_cols_needed:
                try:
                    await conn.execute(text(f"ALTER TABLE clips ADD COLUMN {col_name} {col_def}"))
                except Exception:
                    pass  # Column already exists
            # 3. Users columns
            user_cols_needed = [
                ("name", "VARCHAR(255)"),
                ("phone", "VARCHAR(20)"),
                ("google_id", "VARCHAR(255)"),
                ("avatar", "VARCHAR(1000)"),
                ("auth_provider", "VARCHAR(50) DEFAULT 'PHONE'"),
                ("email_verified", "BOOLEAN DEFAULT 0"),
                ("phone_verified", "BOOLEAN DEFAULT 0"),
                ("updated_at", "DATETIME")
            ]
            for col_name, col_def in user_cols_needed:
                try:
                    await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
                except Exception:
                    pass  # Column already exists

            # 4. Clean invalid empty strings for JSON columns
            try:
                await conn.execute(text("UPDATE projects SET video_metadata = NULL WHERE video_metadata = '' OR video_metadata = 'null'"))
            except Exception:
                pass
        except Exception as e:
            print(f"[DB Migration Note] {e}")


async def dispose_engine():
    """Dispose the database engine on shutdown."""
    await engine.dispose()
