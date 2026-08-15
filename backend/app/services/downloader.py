import asyncio
from pathlib import Path
from fastapi import UploadFile
import yt_dlp
import uuid
import shutil
import os
import logging

logger = logging.getLogger("clipcutter.downloader")


async def download_youtube(url: str, output_dir: Path) -> dict:
    """
    Download YouTube video using multi-client mobile/embedded extractors.
    Bypasses datacenter bot detection where possible, and provides graceful,
    meaningful error messages when YouTube restricts automated access.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    temp_prefix = str(uuid.uuid4())[:8]

    def _download():
        base_opts = {
            'noplaylist': True,
            'merge_output_format': 'mp4',
            'outtmpl': str(output_dir / f'%(id)s_{temp_prefix}.%(ext)s'),
            'quiet': False,
            'no_warnings': False,
            'geo_bypass': True,
            'nocheckcertificate': True,
            'socket_timeout': 15,
            'retries': 3,
            'fragment_retries': 3,
        }

        # Multi-client priority: android, ios, web_embedded, mweb, tv
        opts = {
            **base_opts,
            'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best[height<=1080]/18/22/best',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'ios', 'web_embedded', 'mweb', 'tv'],
                }
            },
            'http_headers': {
                'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 14; en_US; Pixel 7 Pro Build/UQ1A.240205.004)',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        }

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
                vid_id = info.get('id', '')
                title = info.get('title', 'YouTube Video')
                duration = int(info.get('duration') or 0)

                matched_file = _find_downloaded_file(output_dir, vid_id, temp_prefix)
                if matched_file and matched_file.exists():
                    logger.info(f"[Downloader] Successfully downloaded: {title} ({matched_file.name})")
                    return {
                        'title': title,
                        'duration': duration,
                        'file_path': str(matched_file.resolve()),
                        'video_id': vid_id
                    }
                else:
                    raise RuntimeError("Downloaded video file could not be located on disk.")
        except Exception as e:
            err_str = str(e).lower()
            logger.error(f"[Downloader] YouTube extraction error: {e}")

            # Clean up any leftover temporary files for this download
            _cleanup_partial_files(output_dir, vid_id if 'vid_id' in locals() else '', temp_prefix)

            # Distinguish bot/captcha block from other errors
            if "sign in to confirm you're not a bot" in err_str or "bot verification" in err_str or "http error 429" in err_str:
                raise RuntimeError("YouTube is currently blocking automated downloads from this server. Please try again later or upload the video directly.")
            elif "private video" in err_str or "video unavailable" in err_str or "this video has been removed" in err_str:
                raise RuntimeError("This YouTube video is unavailable or restricted. Please check the URL or upload the video directly.")
            elif "no video formats found" in err_str:
                raise RuntimeError("Could not retrieve a compatible video stream for this YouTube URL. Please upload the video directly.")
            else:
                raise RuntimeError(f"YouTube download failed: {str(e)}")

    # Enforce a hard 90-second total timeout
    try:
        return await asyncio.wait_for(asyncio.to_thread(_download), timeout=90.0)
    except asyncio.TimeoutError:
        logger.error("[Downloader] Download timed out after 90 seconds")
        raise RuntimeError("YouTube video download timed out. Please try uploading the video directly.")


def _find_downloaded_file(output_dir: Path, vid_id: str, prefix: str) -> Path:
    """Find downloaded video file matching the video ID and prefix."""
    if not vid_id:
        return None
    # 1. Exact match with prefix
    for f in output_dir.glob(f"{vid_id}_{prefix}.*"):
        if f.is_file() and f.suffix.lower() in ['.mp4', '.mkv', '.webm', '.mov'] and not f.name.endswith('.part'):
            return f
    # 2. General match by video id
    for f in output_dir.glob(f"{vid_id}*"):
        if f.is_file() and f.suffix.lower() in ['.mp4', '.mkv', '.webm', '.mov'] and not f.name.endswith('.part'):
            return f
    return None


def _cleanup_partial_files(output_dir: Path, vid_id: str, prefix: str):
    """Remove any unmerged or .part files left over from failed downloads."""
    try:
        patterns = [f"*{prefix}*", f"*{vid_id}*.part", f"*{vid_id}*.ytdl"] if vid_id else [f"*{prefix}*"]
        for pat in patterns:
            for f in output_dir.glob(pat):
                if f.is_file():
                    try:
                        f.unlink(missing_ok=True)
                    except Exception:
                        pass
    except Exception:
        pass


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
