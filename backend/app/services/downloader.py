import asyncio
from pathlib import Path
from fastapi import UploadFile
import yt_dlp
import uuid
import shutil
import os
import logging

from app.core.config import settings

logger = logging.getLogger("clipcutter.downloader")


async def download_youtube(url: str, output_dir: Path) -> dict:
    """
    Download YouTube video with multi-tier mobile client fallback.
    Tier 1 uses YouTube's official Android App client which bypasses datacenter IP blocks.
    Tier 2 uses iOS App client.
    Tier 3 uses Web/Creator client.
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
            'socket_timeout': 20,
            'retries': 3,
            'fragment_retries': 3,
        }

        # Apply cookies if configured
        if settings.YOUTUBE_COOKIES_FILE and Path(settings.YOUTUBE_COOKIES_FILE).exists():
            base_opts['cookiefile'] = str(Path(settings.YOUTUBE_COOKIES_FILE).resolve())
        elif settings.YOUTUBE_COOKIES:
            cookie_tmp = output_dir / f"cookies_{temp_prefix}.txt"
            cookie_tmp.write_text(settings.YOUTUBE_COOKIES, encoding="utf-8")
            base_opts['cookiefile'] = str(cookie_tmp)

        # Apply proxy if configured
        if settings.YOUTUBE_PROXY:
            base_opts['proxy'] = settings.YOUTUBE_PROXY

        # Tier configurations
        tiers = [
            # Tier 1: Android Mobile Client (Bypasses cloud datacenter bot challenge)
            {
                'name': 'Android Mobile Client',
                'opts': {
                    **base_opts,
                    'format': '18/22/best[height<=720]/best',
                    'extractor_args': {'youtube': {'player_client': ['android']}},
                    'http_headers': {
                        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 14; en_US; Pixel 7 Pro Build/UQ1A.240205.004)',
                        'Accept-Language': 'en-US,en;q=0.9',
                    }
                }
            },
            # Tier 2: iOS Mobile Client
            {
                'name': 'iOS Mobile Client',
                'opts': {
                    **base_opts,
                    'format': '18/22/best[height<=720]/best',
                    'extractor_args': {'youtube': {'player_client': ['ios']}},
                    'http_headers': {
                        'User-Agent': 'com.google.ios.youtube/19.10.1 (iPhone14,3; U; CPU iOS 17_4 like Mac OS X; en_US)',
                        'Accept-Language': 'en-US,en;q=0.9',
                    }
                }
            },
            # Tier 3: Android Creator Client
            {
                'name': 'Creator Client',
                'opts': {
                    **base_opts,
                    'format': '18/22/best[height<=720]/best',
                    'extractor_args': {'youtube': {'player_client': ['android_creator']}},
                }
            }
        ]

        last_error = None
        vid_id = ''

        for tier in tiers:
            try:
                logger.info(f"[Downloader] Attempting download with {tier['name']}...")
                with yt_dlp.YoutubeDL(tier['opts']) as ydl:
                    info = ydl.extract_info(url, download=True)
                    vid_id = info.get('id', '')
                    title = info.get('title', 'YouTube Video')
                    duration = int(info.get('duration') or 0)

                    matched_file = _find_downloaded_file(output_dir, vid_id, temp_prefix)
                    if matched_file and matched_file.exists():
                        logger.info(f"[Downloader] Successfully downloaded via {tier['name']}: {title} ({matched_file.name})")
                        return {
                            'title': title,
                            'duration': duration,
                            'file_path': str(matched_file.resolve()),
                            'video_id': vid_id
                        }
            except Exception as e:
                last_error = e
                logger.warning(f"[Downloader] {tier['name']} attempt failed: {e}")
                _cleanup_partial_files(output_dir, vid_id, temp_prefix)

        # If all tiers failed
        err_str = str(last_error).lower() if last_error else ""
        _cleanup_partial_files(output_dir, vid_id, temp_prefix)

        if (
            "sign in to confirm you're not a bot" in err_str
            or "sign in to confirm you’re not a bot" in err_str
            or "bot verification" in err_str
            or "http error 429" in err_str
            or "use --cookies" in err_str
            or "cookies-from-browser" in err_str
        ):
            raise RuntimeError("YouTube is currently blocking automated downloads on cloud servers for this video. Please upload the video file directly from your device.")
        elif "private video" in err_str or "video unavailable" in err_str or "this video has been removed" in err_str:
            raise RuntimeError("This YouTube video is unavailable or restricted. Please check the URL or upload the video directly.")
        elif "no video formats found" in err_str:
            raise RuntimeError("Could not retrieve a compatible video stream for this YouTube URL. Please upload the video directly.")
        else:
            raise RuntimeError(f"YouTube download failed: {str(last_error)}")

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
