import asyncio
from pathlib import Path
from fastapi import UploadFile
import yt_dlp
import uuid
import shutil
import os

async def download_youtube(url: str, output_dir: Path) -> dict:
    """
    Download YouTube video with multi-tier anti-bot fallback clients.
    Uses iOS & Android mobile app clients to bypass cloud datacenter bot verification.
    """
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
        }

        # Attempt 1: iOS Mobile Client (Highest success rate on cloud datacenter IPs)
        try:
            opts_ios = {
                **base_opts,
                'format': 'bestvideo[height<=1080][ext=mp4]+bestaudio/best[height<=1080]/18/22/best',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['ios'],
                        'player_skip': ['webpage', 'configs', 'js']
                    }
                },
                'http_headers': {
                    'User-Agent': 'com.google.ios.youtube/19.10.1 (iPhone14,3; U; CPU iOS 17_4 like Mac OS X; en_US)',
                    'Accept-Language': 'en-US,en;q=0.9',
                }
            }
            with yt_dlp.YoutubeDL(opts_ios) as ydl:
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
            print(f"[Downloader] Tier 1 iOS client warning: {e1}. Trying Tier 2 Android client...")

        # Attempt 2: Android App Client
        try:
            opts_android = {
                **base_opts,
                'format': '18/22/best[height<=720]/best',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android'],
                        'player_skip': ['webpage', 'configs']
                    }
                },
                'http_headers': {
                    'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 14; en_US; Pixel 7 Pro Build/UQ1A.240205.004)',
                }
            }
            with yt_dlp.YoutubeDL(opts_android) as ydl:
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
            print(f"[Downloader] Tier 2 Android client warning: {e2}. Trying Tier 3 TV Embedded...")

        # Attempt 3: TV Embedded / Mobile Web client
        opts_tier3 = {
            **base_opts,
            'format': 'best',
            'extractor_args': {
                'youtube': {
                    'player_client': ['tv_embedded', 'mweb']
                }
            }
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
