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

            # 4. Migrate users.password_hash and users.email to NULLABLE if created as NOT NULL
            try:
                res = await conn.execute(text("PRAGMA table_info(users)"))
                cols = res.fetchall()
                pwd_col = next((c for c in cols if c[1] == "password_hash"), None)
                if pwd_col and pwd_col[3] == 1:  # notnull is True
                    print("[DB Migration] Migrating users table to make password_hash nullable for Google/Phone OAuth...")
                    await conn.execute(text("PRAGMA foreign_keys=OFF"))
                    await conn.execute(text("""
                        CREATE TABLE users_temp (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name VARCHAR(255),
                            email VARCHAR(255),
                            phone VARCHAR(20),
                            password_hash VARCHAR(255) NULL,
                            google_id VARCHAR(255),
                            avatar VARCHAR(1000),
                            auth_provider VARCHAR(50) DEFAULT 'PHONE' NOT NULL,
                            email_verified BOOLEAN DEFAULT 0 NOT NULL,
                            phone_verified BOOLEAN DEFAULT 0 NOT NULL,
                            plan VARCHAR(50) DEFAULT 'FREE' NOT NULL,
                            is_admin BOOLEAN DEFAULT 0 NOT NULL,
                            credits_remaining INTEGER DEFAULT 3 NOT NULL,
                            created_at DATETIME NOT NULL,
                            updated_at DATETIME
                        )
                    """))
                    existing_col_names = [c[1] for c in cols]
                    common_cols = [c for c in [
                        "id", "name", "email", "phone", "password_hash", "google_id", "avatar",
                        "auth_provider", "email_verified", "phone_verified", "plan",
                        "is_admin", "credits_remaining", "created_at", "updated_at"
                    ] if c in existing_col_names]
                    cols_str = ", ".join(common_cols)
                    await conn.execute(text(f"INSERT INTO users_temp ({cols_str}) SELECT {cols_str} FROM users"))
                    await conn.execute(text("DROP TABLE users"))
                    await conn.execute(text("ALTER TABLE users_temp RENAME TO users"))
                    await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
                    await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone ON users (phone)"))
                    await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)"))
                    await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id)"))
                    await conn.execute(text("PRAGMA foreign_keys=ON"))
                    print("[DB Migration] Successfully migrated users table with nullable password_hash.")
            except Exception as e:
                print(f"[DB Migration users table note] {e}")

            # 5. Clean invalid empty strings for JSON columns
            try:
                await conn.execute(text("UPDATE projects SET video_metadata = NULL WHERE video_metadata = '' OR video_metadata = 'null'"))
            except Exception:
                pass
        except Exception as e:
            print(f"[DB Migration Note] {e}")


async def dispose_engine():
    """Dispose the database engine on shutdown."""
    await engine.dispose()
