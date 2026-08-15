from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.security import require_credits, get_current_user
from app.db.database import get_db, AsyncSessionLocal
from app.db.models import User, Project, ProjectStatus, Clip
from app.services.video_editor import process_full_pipeline

router = APIRouter(prefix="/api/process", tags=["Processing"])

ALLOWED_STYLES = [
    'hormozi', 'neon_cyber', 'minimal', 'dynamic',
    'beast_red', 'karaoke_green', 'golden_luxury', 'sunset_orange',
    'ali_abdaal', 'iman_gadzhi', 'retro_arcade', 'neon_violet',
    'electric_blue', 'matrix_terminal', 'impact_white', 'comic_pop',
    'tiktok_trending', 'podcast_spotlight', 'emerald_focus', 'midnight_pink',
    'vlog_casual', 'cinematic_gold', 'kinetic_fast', 'crimson_shadow',
    'ice_hologram', 'tech_mono', 'peak_motivation', 'subtle_lower_third'
]


class ProcessRequest(BaseModel):
    caption_style: str = 'hormozi'
    shorts_count: int = 4
    language_pref: str = 'auto'
    editing_intensity: str = 'BALANCED'


class UpdateHookRequest(BaseModel):
    hook_text: str


@router.post("/{project_id}")
async def process_project(
    project_id: int,
    req: ProcessRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_credits),
    db: AsyncSession = Depends(get_db)
):
    if req.caption_style not in ALLOWED_STYLES:
        raise HTTPException(status_code=400, detail=f"Invalid caption style. Must be one of: {', '.join(ALLOWED_STYLES)}")
        
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project or (project.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.target_shorts_count = req.shorts_count
    project.language_preference = req.language_pref
    project.editing_intensity = req.editing_intensity

    # If YouTube video is still downloading, store settings and wait for download completion
    if not project.source_file_path or project.status == ProjectStatus.DOWNLOADING:
        await db.commit()
        return {
            "message": "Video is downloading. Processing will start automatically once download finishes.",
            "project_id": project.id,
            "status": "QUEUED"
        }
        
    project.status = ProjectStatus.PROCESSING
    await db.commit()
    
    background_tasks.add_task(
        process_full_pipeline,
        project.id,
        req.caption_style,
        AsyncSessionLocal,
        shorts_count=req.shorts_count,
        language_pref=req.language_pref,
        editing_intensity=req.editing_intensity
    )
    return {"message": "Processing started", "project_id": project.id}


@router.get("/{project_id}/status")
async def get_project_status(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project or (project.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=404, detail="Project not found")
        
    result = await db.execute(select(Clip).where(Clip.project_id == project_id))
    clips = result.scalars().all()
    
    return {
        "status": project.status,
        "progress": project.progress,
        "progress_message": project.progress_message,
        "clips_count": len(clips),
        "credits_remaining": current_user.credits_remaining if not current_user.is_admin else "unlimited"
    }


@router.post("/clips/{clip_id}/hook")
async def update_clip_hook(
    clip_id: int,
    req: UpdateHookRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update active hook on a generated clip."""
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
        
    clip.selected_hook = req.hook_text
    await db.commit()
    return {"message": "Hook updated successfully", "selected_hook": clip.selected_hook}


@router.post("/{project_id}/cancel")
async def cancel_project_processing(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel ongoing processing of a project and reset status."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project or (project.user_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.status = ProjectStatus.CANCELLED
    project.progress = 0.0
    project.progress_message = "Generation cancelled by user"
    await db.commit()
    
    return {
        "message": "Generation cancelled successfully",
        "project_id": project.id,
        "status": "CANCELLED"
    }
