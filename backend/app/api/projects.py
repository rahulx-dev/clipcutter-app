from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import os

from app.core.config import settings
from app.core.security import get_current_user, require_credits
from app.db.database import get_db, AsyncSessionLocal
from app.db.models import User, Project, SourceType, ProjectStatus, Clip
from app.services.downloader import save_uploaded_file, download_youtube
from app.services.media_probe import probe_video

router = APIRouter(prefix="/api/projects", tags=["Projects"])


class YouTubeRequest(BaseModel):
    url: str
    title: Optional[str] = None


class ExportRequest(BaseModel):
    resolution: str = "1080x1920"  # "1080x1920" | "720x1280"
    fps: int = 30                 # 24 | 30 | 60
    preset: str = "youtube_shorts" # "youtube_shorts" | "instagram_reels" | "tiktok"


@router.post("/upload")
async def upload_project(
    file: UploadFile = File(...),
    title: str = Form("Untitled Project"),
    current_user: User = Depends(require_credits),
    db: AsyncSession = Depends(get_db),
):
    """Upload a video file, probe its metadata and create a new project."""
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)

    filename = file.filename or "video.mp4"
    ext = os.path.splitext(filename)[1].lower()
    ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v", ".flv", ".wmv", ".ts", ".3gp", ".m2ts"}
    
    is_valid_ext = ext in ALLOWED_EXTENSIONS
    is_valid_mime = bool(file.content_type and (
        file.content_type.startswith("video/") or 
        file.content_type in ["application/octet-stream", "application/x-mpegURL", "binary/octet-stream"]
    ))
    
    if not (is_valid_ext or is_valid_mime):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format '{ext or file.content_type}'. Please upload an MP4, MOV, WebM, or MKV video."
        )

    result = await save_uploaded_file(file, settings.TEMP_DIR)
    
    # Run fast probe to extract thumbnail, resolution, fps, duration, audio check
    meta = probe_video(result["file_path"])
    
    if not current_user.is_admin:
        current_user.credits_remaining = max(0, current_user.credits_remaining - 1)
    
    project = Project(
        user_id=current_user.id,
        title=title or filename or "Untitled",
        source_type=SourceType.UPLOAD,
        source_file_path=result["file_path"],
        duration_seconds=meta.get("duration", 0.0),
        video_metadata=meta,
        status=ProjectStatus.PENDING,
        progress=100.0,
        progress_message="File uploaded & inspected — ready to generate",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project.to_dict()


async def _background_download(url: str, project_id: int):
    """Background task to download YouTube video, probe metadata and auto-start pipeline."""
    from app.services.video_editor import process_full_pipeline
    import asyncio
    
    try:
        result = await download_youtube(url, settings.TEMP_DIR)
        meta = probe_video(result["file_path"])
        
        target_shorts = 4
        lang_pref = "auto"
        editing_int = "BALANCED"

        async with AsyncSessionLocal() as session:
            db_result = await session.execute(
                select(Project).where(Project.id == project_id)
            )
            project = db_result.scalar_one_or_none()
            if project:
                project.source_file_path = result["file_path"]
                project.title = project.title if project.title != "YouTube Video" else result["title"]
                project.duration_seconds = result.get("duration") or meta.get("duration")
                project.video_metadata = meta
                target_shorts = project.target_shorts_count or 4
                lang_pref = project.language_preference or "auto"
                editing_int = project.editing_intensity or "BALANCED"
                project.status = ProjectStatus.PENDING
                project.progress = 100.0
                project.progress_message = "Download complete — starting viral shorts pipeline..."
                await session.commit()

        # Trigger processing in background
        asyncio.create_task(
            process_full_pipeline(
                project_id,
                'hormozi',
                AsyncSessionLocal,
                shorts_count=target_shorts,
                language_pref=lang_pref,
                editing_intensity=editing_int
            )
        )
    except Exception as e:
        async with AsyncSessionLocal() as session:
            db_result = await session.execute(
                select(Project).where(Project.id == project_id)
            )
            project = db_result.scalar_one_or_none()
            if project:
                project.status = ProjectStatus.FAILED
                project.error_message = f"Download failed: {str(e)}"
                project.progress_message = "Download failed"
                await session.commit()


@router.post("/youtube")
async def youtube_project(
    req: YouTubeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_credits),
    db: AsyncSession = Depends(get_db),
):
    """Register a YouTube URL, immediately allocate a project and kick off background download."""
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)

    if "youtube.com" not in req.url and "youtu.be" not in req.url:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    if not current_user.is_admin:
        current_user.credits_remaining = max(0, current_user.credits_remaining - 1)

    project = Project(
        user_id=current_user.id,
        title=req.title or "YouTube Video",
        source_type=SourceType.YOUTUBE,
        source_url=req.url,
        status=ProjectStatus.DOWNLOADING,
        progress=20.0,
        progress_message="Starting YouTube video download...",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    background_tasks.add_task(_background_download, req.url, project.id)
    return project.to_dict()


@router.get("")
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all projects for the authenticated user, ordered by creation date."""
    stmt = (
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
    )
    result = await db.execute(stmt)
    projects = result.scalars().all()
    return [p.to_dict() for p in projects]


@router.get("/{project_id}")
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed project info including its clips."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project or (project.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=404, detail="Project not found")

    clip_result = await db.execute(
        select(Clip).where(Clip.project_id == project_id).order_by(Clip.viral_score.desc())
    )
    clips = clip_result.scalars().all()

    data = project.to_dict()
    data["clips"] = [c.to_dict() for c in clips]
    return data


@router.get("/{project_id}/probe")
async def probe_project_metadata(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Probe and return detailed video inspection metadata."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project or (project.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.source_file_path or not os.path.exists(project.source_file_path):
        return project.video_metadata or {}

    meta = probe_video(project.source_file_path)
    project.video_metadata = meta
    await db.commit()
    return meta


@router.get("/{project_id}/clips")
async def get_project_clips(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all clips for a project sorted by viral score."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project or (project.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Clip).where(Clip.project_id == project_id).order_by(Clip.viral_score.desc())
    )
    clips = result.scalars().all()
    return [c.to_dict() for c in clips]


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project and its associated clips and files."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project or (project.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=404, detail="Project not found")

    # Clean up video files
    if project.source_file_path and os.path.exists(project.source_file_path):
        try:
            os.remove(project.source_file_path)
        except OSError:
            pass

    # Clean up clip files
    clip_result = await db.execute(select(Clip).where(Clip.project_id == project_id))
    clips = clip_result.scalars().all()
    for clip in clips:
        if clip.video_path and os.path.exists(clip.video_path):
            try:
                os.remove(clip.video_path)
            except OSError:
                pass

    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully"}


# ── Clip Download & Streaming ─────────────────────────────────────────
clip_router = APIRouter(prefix="/api/clips", tags=["Clips"])


@clip_router.get("/{clip_id}/download")
async def download_clip(
    clip_id: int,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Download a generated clip video file (.mp4)."""
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if not clip.video_path or not os.path.exists(clip.video_path):
        raise HTTPException(status_code=404, detail="Clip video file not found on disk")

    clean_title = "".join(c for c in (clip.title or f"clip_{clip.id}") if c.isalnum() or c in (' ', '_', '-')).strip()
    if not clean_title:
        clean_title = f"clip_{clip.id}"
    filename = f"{clean_title}.mp4"

    return FileResponse(
        path=clip.video_path,
        media_type="video/mp4",
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Accept-Ranges": "bytes"
        }
    )


@clip_router.get("/{clip_id}/stream")
async def stream_clip(
    clip_id: int,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Stream a generated clip video file directly inside the browser player."""
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if not clip.video_path or not os.path.exists(clip.video_path):
        raise HTTPException(status_code=404, detail="Clip video file not found")

    return FileResponse(
        path=clip.video_path,
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"}
    )


@clip_router.delete("/{clip_id}")
async def delete_clip(
    clip_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single generated clip video file and database record."""
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    # Verify project ownership
    proj_result = await db.execute(select(Project).where(Project.id == clip.project_id))
    proj = proj_result.scalar_one_or_none()
    if proj and proj.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Delete video file from disk
    if clip.video_path and os.path.exists(clip.video_path):
        try:
            os.remove(clip.video_path)
        except OSError:
            pass

    await db.delete(clip)
    await db.commit()
    return {"message": "Clip deleted successfully", "clip_id": clip_id}
