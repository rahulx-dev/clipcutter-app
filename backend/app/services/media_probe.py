import subprocess
import json
import os
import base64
from pathlib import Path
from typing import Dict, Any, Optional

from app.core.config import settings


def probe_video(video_path: str) -> Dict[str, Any]:
    """Inspect video file metadata using FFprobe and generate a base64 thumbnail safely."""
    if not video_path or not os.path.exists(video_path):
        return {
            "error": "File not found",
            "exists": False,
            "width": 1920,
            "height": 1080,
            "duration": 0.0,
            "fps": 30.0,
            "has_audio": True,
            "thumbnail": None
        }

    try:
        file_size_bytes = os.path.getsize(video_path)
        file_size_mb = round(file_size_bytes / (1024 * 1024), 2)
    except Exception:
        file_size_mb = 0.0

    # 1. Run ffprobe
    ffprobe_bin = getattr(settings, 'FFPROBE_PATH', 'ffprobe')
    cmd = [
        ffprobe_bin,
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        str(video_path)
    ]
    
    probe_data = {}
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
        if proc.stdout:
            probe_data = json.loads(proc.stdout)
    except Exception as e:
        print(f"[MediaProbe] FFprobe warning on {video_path}: {e}")

    # Extract video stream
    streams = probe_data.get('streams', [])
    v_stream = next((s for s in streams if s.get('codec_type') == 'video'), {})
    a_stream = next((s for s in streams if s.get('codec_type') == 'audio'), None)
    fmt = probe_data.get('format', {})

    try:
        width = int(v_stream.get('width') or 1920)
        height = int(v_stream.get('height') or 1080)
    except Exception:
        width, height = 1920, 1080
    
    # Calculate FPS safely
    r_fps = v_stream.get('r_frame_rate', '30/1') or '30/1'
    try:
        if '/' in str(r_fps):
            num, den = str(r_fps).split('/')
            fps = round(float(num) / max(1.0, float(den)), 1)
        else:
            fps = round(float(r_fps), 1)
    except Exception:
        fps = 30.0

    # Duration safely
    try:
        dur_val = fmt.get('duration') or v_stream.get('duration') or 0.0
        duration = float(dur_val)
    except Exception:
        duration = 0.0

    # Bitrate safely
    try:
        bitrate = int(fmt.get('bit_rate') or 0)
    except Exception:
        bitrate = 0

    # 2. Generate small thumbnail safely
    thumbnail_b64 = None
    try:
        thumb_time = max(0.2, min(duration * 0.1, 5.0))
        temp_thumb = str(settings.TEMP_DIR / f"thumb_{Path(video_path).stem}.jpg")
        
        thumb_cmd = [
            settings.FFMPEG_PATH,
            '-ss', str(thumb_time),
            '-i', str(video_path),
            '-vframes', '1',
            '-q:v', '4',
            '-vf', 'scale=480:-1',
            temp_thumb,
            '-y'
        ]
        
        subprocess.run(thumb_cmd, capture_output=True)
        if os.path.exists(temp_thumb):
            with open(temp_thumb, "rb") as img_f:
                b64_str = base64.b64encode(img_f.read()).decode('utf-8')
                thumbnail_b64 = f"data:image/jpeg;base64,{b64_str}"
            try:
                os.remove(temp_thumb)
            except OSError:
                pass
    except Exception as e:
        print(f"[MediaProbe] Thumbnail extraction skipped: {e}")

    return {
        "width": width,
        "height": height,
        "resolution": f"{width}x{height}",
        "aspect_ratio": "16:9" if width >= height else "9:16",
        "duration": round(duration, 2),
        "fps": fps,
        "has_audio": a_stream is not None,
        "bitrate_kbps": round(bitrate / 1000) if bitrate else None,
        "file_size_mb": file_size_mb,
        "thumbnail": thumbnail_b64
    }
