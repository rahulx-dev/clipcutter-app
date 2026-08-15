from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import uuid
import asyncio

from app.core.config import settings
from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.downloader import save_uploaded_file, download_youtube
from app.services.transcription import extract_audio, transcribe_audio
from app.services.video_editor import generate_ass_subtitles, render_final_vertical_clip
from app.services.face_tracker import analyze_faces, calculate_crop_coords

router = APIRouter(prefix="/api/captions", tags=["Caption Studio"])


class BurnCaptionsRequest(BaseModel):
    video_path: str
    words: List[Dict[str, Any]]
    style: str = "hormozi"
    aspect_ratio: str = "original"  # "original" | "9:16"


class ExportSrtRequest(BaseModel):
    words: List[Dict[str, Any]]


@router.post("/transcribe")
async def transcribe_for_studio(
    file: Optional[UploadFile] = File(None),
    youtube_url: Optional[str] = Form(None),
    language_pref: str = Form("auto"),
    current_user: User = Depends(get_current_user),
):
    """Ingest and transcribe video for the Auto Caption Studio."""
    if file:
        saved = await save_uploaded_file(file, settings.TEMP_DIR)
        video_path = saved["file_path"]
    elif youtube_url:
        yt_res = await download_youtube(youtube_url, settings.TEMP_DIR)
        video_path = yt_res["file_path"]
    else:
        raise HTTPException(status_code=400, detail="Must provide either a video file or YouTube URL")

    # 1. Audio extraction
    audio_path = await asyncio.to_thread(extract_audio, video_path, settings.TEMP_DIR)

    # 2. Multi-language Whisper transcription
    transcript_data = await asyncio.to_thread(transcribe_audio, audio_path, language_pref=language_pref)

    # Clean audio
    try:
        if os.path.exists(audio_path):
            os.remove(audio_path)
    except Exception:
        pass

    return {
        "video_path": video_path,
        "language_detected": transcript_data.get("language", "en"),
        "full_text": transcript_data.get("full_text", ""),
        "segments": transcript_data.get("segments", [])
    }


@router.post("/export-srt")
async def export_srt_file(req: ExportSrtRequest):
    """Convert word timestamps into standard .SRT subtitle format."""
    words = req.words
    if not words:
        raise HTTPException(status_code=400, detail="No words provided for subtitle export")

    def format_srt_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        ms = int(round((seconds - int(seconds)) * 1000))
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    lines = []
    chunk_size = 5
    counter = 1

    for i in range(0, len(words), chunk_size):
        chunk = words[i:i+chunk_size]
        if not chunk:
            continue
        start_t = chunk[0].get("start", 0.0)
        end_t = chunk[-1].get("end", start_t + 1.5)
        text = " ".join([w.get("word", "").strip() for w in chunk])
        
        lines.append(str(counter))
        lines.append(f"{format_srt_time(start_t)} --> {format_srt_time(end_t)}")
        lines.append(text)
        lines.append("")
        counter += 1

    srt_content = "\n".join(lines)
    return PlainTextResponse(
        content=srt_content,
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="subtitles.srt"'}
    )


@router.post("/burn")
async def burn_custom_captions(
    req: BurnCaptionsRequest,
    current_user: User = Depends(get_current_user),
):
    """Burn custom edited words into video with selected caption style."""
    if not os.path.exists(req.video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    job_id = str(uuid.uuid4())[:8]
    ass_path = str(settings.TEMP_DIR / f"custom_{job_id}.ass")
    output_path = str(settings.OUTPUT_DIR / f"captioned_{job_id}.mp4")

    # Generate ASS
    generate_ass_subtitles(
        req.words,
        ass_path,
        style=req.style,
        watermark=False
    )

    # Render
    import cv2
    cap = cv2.VideoCapture(req.video_path)
    vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
    vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
    cap.release()

    face_data = await asyncio.to_thread(analyze_faces, req.video_path, 15)
    crop_coords = await asyncio.to_thread(calculate_crop_coords, face_data, vid_w, vid_h)

    await asyncio.to_thread(
        render_final_vertical_clip,
        req.video_path,
        crop_coords,
        ass_path,
        output_path,
        settings.FFMPEG_NVENC
    )

    # Clean ass
    try:
        if os.path.exists(ass_path):
            os.remove(ass_path)
    except Exception:
        pass

    return {
        "message": "Captions burned successfully",
        "output_path": output_path,
        "download_url": f"/api/captions/download/{os.path.basename(output_path)}"
    }


@router.get("/download/{filename}")
async def download_captioned_video(filename: str):
    file_path = settings.OUTPUT_DIR / filename
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Exported video file not found")

    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
