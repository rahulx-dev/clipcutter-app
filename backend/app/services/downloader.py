import asyncio
from pathlib import Path
from fastapi import UploadFile
import yt_dlp
import uuid
import shutil
import os

async def download_youtube(url: str, output_dir: Path) -> dict:
    """Download YouTube video with multi-tier anti-403 fallback clients."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    def _download():
        base_opts = {
            'noplaylist': True,
            'merge_output_format': 'mp4',
            'outtmpl': str(output_dir / '%(id)s.%(ext)s'),
            'quiet': False,
            'no_warnings': True,
            'geo_bypass': True,
            'nocheckcertificate': True,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        }

        # Attempt 1: Multi-client adaptive format
        try:
            opts_tier1 = {
                **base_opts,
                'format': 'best[ext=mp4]/bestvideo[height<=1080]+bestaudio/best',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'ios', 'mweb', 'web']
                    }
                }
            }
            with yt_dlp.YoutubeDL(opts_tier1) as ydl:
                info = ydl.extract_info(url, download=True)
                vid_id = info.get('id', '')
                matched_file = _find_downloaded_file(output_dir, vid_id)
                if matched_file and matched_file.exists():
                    return {
                        'title': info.get('title', 'YouTube Video'),
                        'duration': int(info.get('duration') or 0),
                        'file_path': str(matched_file.resolve()),
                        'video_id': vid_id
                    }
        except Exception as e1:
            print(f"[Downloader] Tier 1 download warning: {e1}. Trying robust progressive fallback...")

        # Attempt 2: Universal progressive stream fallback (Format 18 / 22 - never 403 throttled)
        try:
            opts_tier2 = {
                **base_opts,
                'format': '18/22/best[height<=720]/best',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'mweb']
                    }
                }
            }
            with yt_dlp.YoutubeDL(opts_tier2) as ydl:
                info = ydl.extract_info(url, download=True)
                vid_id = info.get('id', '')
                matched_file = _find_downloaded_file(output_dir, vid_id)
                if matched_file and matched_file.exists():
                    return {
                        'title': info.get('title', 'YouTube Video'),
                        'duration': int(info.get('duration') or 0),
                        'file_path': str(matched_file.resolve()),
                        'video_id': vid_id
                    }
        except Exception as e2:
            print(f"[Downloader] Tier 2 fallback failed: {e2}")

        # Attempt 3: General web fallback
        opts_tier3 = {
            **base_opts,
            'format': 'best',
        }
        with yt_dlp.YoutubeDL(opts_tier3) as ydl:
            info = ydl.extract_info(url, download=True)
            vid_id = info.get('id', '')
            matched_file = _find_downloaded_file(output_dir, vid_id)
            return {
                'title': info.get('title', 'YouTube Video'),
                'duration': int(info.get('duration') or 0),
                'file_path': str(matched_file.resolve()) if matched_file else str(output_dir / f"{vid_id}.mp4"),
                'video_id': vid_id
            }

    return await asyncio.to_thread(_download)


def _find_downloaded_file(output_dir: Path, vid_id: str) -> Path:
    """Find any video file matching the video ID stem."""
    if not vid_id:
        return output_dir / "video.mp4"
    direct = output_dir / f"{vid_id}.mp4"
    if direct.exists():
        return direct
    for f in output_dir.glob(f"{vid_id}*"):
        if f.is_file() and f.suffix.lower() in ['.mp4', '.mkv', '.webm', '.mov']:
            return f
    return direct


async def save_uploaded_file(file: UploadFile, output_dir: Path) -> dict:
    """Save user-uploaded offline video file to disk with absolute path."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    ext = file.filename.split('.')[-1] if (file.filename and '.' in file.filename) else 'mp4'
    file_id = str(uuid.uuid4())
    file_path = output_dir / f"{file_id}.{ext}"
    
    def _save():
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
    await asyncio.to_thread(_save)
    
    return {
        'title': file.filename or "Uploaded Video",
        'file_path': str(file_path.resolve())
    }
