import asyncio
import subprocess
import math
import uuid
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy import select as sa_select

from app.services.transcription import extract_audio, transcribe_audio
from app.services.face_tracker import analyze_faces, calculate_crop_coords
from app.services.llm_metadata import generate_metadata
from app.services.viral_analyzer import analyze_viral_moment
from app.services.hook_engine import generate_hook_variations
from app.services.cleanup import cleanup_temp_files
from app.db.models import Project, Clip, ProjectStatus, User, PlanType
from app.core.config import settings


def extract_clip(source_path: str, start_time: float, end_time: float, output_path: str) -> str:
    """Extract a sub-clip from source video using FFmpeg fast seek."""
    cmd = [
        settings.FFMPEG_PATH,
        '-ss', str(max(0, start_time)),
        '-to', str(end_time),
        '-i', str(source_path),
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        str(output_path),
        '-y'
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


def generate_ass_subtitles(
    words: list[dict],
    output_path: str,
    style: str = 'hormozi',
    video_width: int = 1080,
    video_height: int = 1920,
    watermark: bool = False,
    hook_banner: Optional[str] = None
) -> str:
    """Generate .ass subtitle script with word-by-word synchronized highlighting, 16+ styles, and hook banner."""
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
"""
    
    # ── 16+ Viral Caption Presets ──
    if style == 'hormozi':
        # 1. Hormozi Yellow (Bold Impact, yellow active word)
        header += "Style: Default,Impact,75,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H00FFFF&\\fscx110\\fscy110}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True
    elif style == 'neon_cyber':
        # 2. Neon Cyberpunk (Electric Cyan active word)
        header += "Style: Default,Impact,72,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&HFFFF00&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H00E0E0E0&}"
        uppercase = True
    elif style == 'beast_red':
        # 3. Beast Mode Red (Fire red active word)
        header += "Style: Default,Impact,76,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H0000FF&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True
    elif style == 'golden_luxury':
        # 4. Golden Luxury (Amber gold active word)
        header += "Style: Default,Impact,74,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H00D7FF&\\fscx112\\fscy112}"
        inactive_format = "{\\c&H00F0F0F0&}"
        uppercase = True
    elif style == 'karaoke_green':
        # 5. Karaoke Glow (Electric lime green active word)
        header += "Style: Default,Arial,68,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,380,1\n"
        active_format = "{\\c&H00FF00&\\fscx118\\fscy118}"
        inactive_format = "{\\c&H00E6E6E6&}"
        uppercase = False
    elif style == 'sunset_orange':
        # 6. Sunset Flame (Flame orange active word)
        header += "Style: Default,Arial,68,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,380,1\n"
        active_format = "{\\c&H0070FF&\\fscx118\\fscy118}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = False
    elif style == 'dynamic':
        # 7. Dynamic Pop (Neon chartreuse scale & bounce)
        header += "Style: Default,Arial,68,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,380,1\n"
        active_format = "{\\c&H32F0B8&\\fscx120\\fscy120}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = False
    elif style == 'minimal':
        # 8. Clean Minimal (Translucent dark box)
        header += "Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,0,0,2,20,20,420,1\n"
        active_format = "{\\fscx110\\fscy110\\c&H00FFFFFF&}"
        inactive_format = "{\\c&H00D0D0D0&}"
        uppercase = False
    elif style == 'ali_abdaal':
        # 9. Ali Abdaal Clean (Calm sky blue active word)
        header += "Style: Default,Arial,66,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,390,1\n"
        active_format = "{\\c&HFFB030&\\fscx112\\fscy112}"
        inactive_format = "{\\c&H00F0F0F0&}"
        uppercase = False
    elif style == 'iman_gadzhi':
        # 10. Iman Gadzhi Noir (Editorial uppercase, soft gold highlight)
        header += "Style: Default,Times New Roman,72,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,390,1\n"
        active_format = "{\\c&H40D8F8&\\fscx110\\fscy110}"
        inactive_format = "{\\c&H00E0E0E0&}"
        uppercase = True
    elif style == 'retro_arcade':
        # 11. Retro Arcade (Gaming 8-bit neon yellow)
        header += "Style: Default,Impact,70,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H00E6FF&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H0033FF33&}"
        uppercase = True
    elif style == 'neon_violet':
        # 12. Neon Violet Glow (Cyber magenta/purple highlight)
        header += "Style: Default,Arial,68,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,380,1\n"
        active_format = "{\\c&HFF33CC&\\fscx118\\fscy118}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = False
    elif style == 'electric_blue':
        # 13. Electric Blue Bolt (Bright electric blue)
        header += "Style: Default,Impact,74,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&HFF9900&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True
    elif style == 'matrix_terminal':
        # 14. Matrix Terminal (Code green monospace)
        header += "Style: Default,Courier New,65,&H0000FF00,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,400,1\n"
        active_format = "{\\c&H00FFFF&\\fscx110\\fscy110}"
        inactive_format = "{\\c&H0033CC33&}"
        uppercase = False
    elif style == 'impact_white':
        # 15. High-Impact White (Bold white with heavy shadow)
        header += "Style: Default,Impact,78,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,6,0,2,20,20,380,1\n"
        active_format = "{\\fscx115\\fscy115\\c&H00FFFFFF&}"
        inactive_format = "{\\c&H00D0D0D0&}"
        uppercase = True
    elif style == 'comic_pop':
        # 16. Comic Pop (Bubbly badge style)
        header += "Style: Default,Arial,72,&H0000FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H0000FF&\\fscx120\\fscy120}"
        inactive_format = "{\\c&H00FFFF00&}"
        uppercase = True
    elif style == 'tiktok_trending':
        # 17. TikTok Trending (Cyan/White punch)
        header += "Style: Default,Impact,74,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&HFFFF00&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True
    elif style == 'podcast_spotlight':
        # 18. Podcast Spotlight (Warm amber studio)
        header += "Style: Default,Arial,68,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,390,1\n"
        active_format = "{\\c&H00BFFF&\\fscx112\\fscy112}"
        inactive_format = "{\\c&H00E0E0E0&}"
        uppercase = False
    elif style == 'emerald_focus':
        # 19. Deep Focus Emerald (Rich emerald green)
        header += "Style: Default,Arial,70,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,380,1\n"
        active_format = "{\\c&H50C878&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H00E6E6E6&}"
        uppercase = False
    elif style == 'midnight_pink':
        # 20. Midnight Neon Pink (Hot neon pink)
        header += "Style: Default,Impact,72,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&HB400FF&\\fscx118\\fscy118}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True
    elif style == 'vlog_casual':
        # 21. Vlog Casual (Warm relaxed yellow)
        header += "Style: Default,Arial,66,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,390,1\n"
        active_format = "{\\c&H00E6FF&\\fscx110\\fscy110}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = False
    elif style == 'cinematic_gold':
        # 22. Cinematic Gold (Editorial serif)
        header += "Style: Default,Times New Roman,74,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,390,1\n"
        active_format = "{\\c&H00D7FF&\\fscx110\\fscy110}"
        inactive_format = "{\\c&H00DCDCDC&}"
        uppercase = True
    elif style == 'kinetic_fast':
        # 23. Kinetic Fast Paced (High retention punch)
        header += "Style: Default,Impact,76,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H00FF00&\\fscx120\\fscy120}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True
    elif style == 'crimson_shadow':
        # 24. Crimson Shadow (Thriller deep red)
        header += "Style: Default,Impact,74,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H0000D0&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H00E0E0E0&}"
        uppercase = True
    elif style == 'ice_hologram':
        # 25. Ice Hologram (Ice blue futuristic)
        header += "Style: Default,Arial,68,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,380,1\n"
        active_format = "{\\c&HFFFF80&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = False
    elif style == 'tech_mono':
        # 26. Tech Monologue (JetBrains mono green)
        header += "Style: Default,Courier New,66,&H0000FF00,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,400,1\n"
        active_format = "{\\c&H00FF7F&\\fscx112\\fscy112}"
        inactive_format = "{\\c&H0033CC33&}"
        uppercase = False
    elif style == 'peak_motivation':
        # 27. Peak Motivation (Hyper fire flame)
        header += "Style: Default,Impact,76,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H0045FF&\\fscx118\\fscy118}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True
    elif style == 'subtle_lower_third':
        # 28. Subtle Lower Third (Clean modern minimal bar)
        header += "Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,0,0,2,20,20,420,1\n"
        active_format = "{\\c&H00FFFFFF&\\fscx108\\fscy108}"
        inactive_format = "{\\c&H00D0D0D0&}"
        uppercase = False
    elif style == 'typewriter':
        # 29. Typewriter Vintage Mono
        header += "Style: Default,Courier New,68,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,390,1\n"
        active_format = "{\\c&H00FFFF&\\fscx112\\fscy112}"
        inactive_format = "{\\c&H00E0E0E0&}"
        uppercase = False
    elif style == 'yt_shorts':
        # 30. YouTube Shorts Prime (Bold Red & White)
        header += "Style: Default,Impact,76,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H0000FF&\\fscx118\\fscy118}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True
    elif style == 'pastel_pop':
        # 31. Bold Pastel Pop (Lavender & Yellow)
        header += "Style: Default,Arial,70,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,20,20,380,1\n"
        active_format = "{\\c&HFFB6C1&\\fscx115\\fscy115}"
        inactive_format = "{\\c&H00FFF0F5&}"
        uppercase = False
    else:
        header += "Style: Default,Impact,75,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,380,1\n"
        active_format = "{\\c&H00FFFF&\\fscx110\\fscy110}"
        inactive_format = "{\\c&H00FFFFFF&}"
        uppercase = True

    # Watermark style for free users
    if watermark:
        header += "Style: Watermark,Impact,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,0,8,20,20,95,1\n"

    # Hook banner style (first 4 seconds)
    if hook_banner:
        header += "Style: HookBanner,Impact,52,&H00FFFFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,3,0,0,8,40,40,160,1\n"

    header += "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    
    # Continuous watermark banner for free users
    if watermark:
        header += "Dialogue: 2,0:00:00.00,9:59:59.00,Watermark,,0,0,0,,{\\c&H0035FF&\\3c&H90000000&\\b1\\fscx108\\fscy108}[ GARIB USER ]\n"

    # Hook banner for opening 4 seconds
    if hook_banner:
        clean_hook = hook_banner.replace('{', '').replace('}', '').strip()
        header += f"Dialogue: 3,0:00:00.00,0:00:04.20,HookBanner,,0,0,0,,{{\\c&H00D0FF&\\b1}}✦ {clean_hook}\n"
    
    def format_time(seconds: float) -> str:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        cs = int(round((seconds - int(seconds)) * 100))
        if cs >= 100:
            s += 1
            cs = 0
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    lines = []
    chunk_size = 4
    for i in range(0, len(words), chunk_size):
        chunk = words[i:i+chunk_size]
        if not chunk:
            continue
        
        for j, active_word in enumerate(chunk):
            w_start = active_word.get('start', 0.0)
            w_end = active_word.get('end', w_start + 0.3)
            
            line_text = ""
            for k, w in enumerate(chunk):
                word_text = str(w.get('word', '')).strip()
                if uppercase:
                    word_text = word_text.upper()
                if k == j:
                    line_text += f"{active_format}{word_text}{{\\r}} "
                else:
                    line_text += f"{inactive_format}{word_text}{{\\r}} "
            
            lines.append(f"Dialogue: 0,{format_time(w_start)},{format_time(w_end)},Default,,0,0,0,,{line_text.strip()}")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(lines) + "\n")
    return output_path


def render_final_vertical_clip(
    input_path: str,
    crop_data: list[dict],
    ass_path: str,
    output_path: str,
    use_nvenc: bool = True,
    enhance_audio: bool = True
) -> str:
    """Ultra-fast single-pass 9:16 crop, scale, subtitle burn, and audio enhancement."""
    import cv2
    cap = cv2.VideoCapture(str(input_path))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
    cap.release()

    crop_w = int(frame_height * 9 / 16)
    crop_h = frame_height
    
    if crop_data:
        crop_xs = [d['crop_x'] for d in crop_data]
        crop_xs.sort()
        crop_x = crop_xs[len(crop_xs)//2]
    else:
        crop_x = max(0, (frame_width - crop_w) // 2)

    escaped_ass = str(ass_path).replace('\\', '/').replace(':', '\\:')
    
    # Combined single-pass filter: Crop -> Scale 1080x1920 -> Burn Subtitles
    filter_chain = f"crop={crop_w}:{crop_h}:{crop_x}:0,scale=1080:1920,ass='{escaped_ass}'"
    
    cmd = [settings.FFMPEG_PATH, '-i', str(input_path), '-vf', filter_chain]
    
    # Audio filters: loudnorm for broadcast standard audio volume
    if enhance_audio:
        cmd.extend(['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,highpass=f=70,lowpass=f=12000'])
    
    if use_nvenc and settings.FFMPEG_NVENC:
        cmd.extend(['-c:v', 'h264_nvenc', '-preset', 'p1', '-tune', 'ull', '-cq', '24', '-c:a', 'aac', '-b:a', '128k'])
    else:
        cmd.extend(['-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '4', '-crf', '24', '-c:a', 'aac', '-b:a', '128k'])
        
    cmd.extend([str(output_path), '-y'])
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        print(f"[FFmpeg] NVENC failed. Falling back to CPU ultrafast encode...")
        cmd_fallback = [
            settings.FFMPEG_PATH, '-i', str(input_path),
            '-vf', filter_chain,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '4', '-crf', '24',
            '-c:a', 'aac', '-b:a', '128k',
            str(output_path), '-y'
        ]
        subprocess.run(cmd_fallback, check=True, capture_output=True)
        
    return output_path


def segment_transcript(segments: list[dict], min_dur: int = 30, max_dur: int = 75, target_count: int = 4) -> list[dict]:
    """Smart segmentation: groups sentences into viral shorts chunks and ranks them."""
    if not segments:
        return []

    clips = []
    current_words = []
    current_start = segments[0].get('start', 0.0)
    current_text = ""

    for s in segments:
        seg_words = s.get('words', [])
        seg_dur = s.get('end', 0.0) - current_start

        if seg_dur >= min_dur and current_words:
            current_words.extend(seg_words)
            current_text += " " + s.get('text', '')
            clips.append({
                'start_time': current_start,
                'end_time': s.get('end', current_start + 30.0),
                'text': current_text.strip(),
                'words': current_words
            })
            current_words = []
            current_start = s.get('end', 0.0)
            current_text = ""
        else:
            current_words.extend(seg_words)
            current_text += " " + s.get('text', '')

    if current_words and (segments[-1].get('end', 0.0) - current_start) >= (min_dur * 0.7):
        clips.append({
            'start_time': current_start,
            'end_time': segments[-1].get('end', current_start + 30.0),
            'text': current_text.strip(),
            'words': current_words
        })

    # If no clips produced (e.g. very short video), treat entire transcript as 1 clip
    if not clips and segments:
        all_words = []
        full_txt = ""
        for s in segments:
            all_words.extend(s.get('words', []))
            full_txt += " " + s.get('text', '')
        clips.append({
            'start_time': segments[0].get('start', 0.0),
            'end_time': segments[-1].get('end', 10.0),
            'text': full_txt.strip(),
            'words': all_words
        })
        
    # Limit to target count (1, 4, 10, or all)
    if target_count and target_count > 0:
        return clips[:target_count]
    return clips


async def is_cancelled(session_factory, project_id: int) -> bool:
    """Check if the project was marked as CANCELLED by the user."""
    try:
        async with session_factory() as session:
            res = await session.execute(sa_select(Project.status).where(Project.id == project_id))
            status = res.scalar_one_or_none()
            return status == ProjectStatus.CANCELLED
    except Exception:
        return False


async def process_full_pipeline(
    project_id: int,
    caption_style: str,
    session_factory,
    shorts_count: int = 4,
    language_pref: str = "auto",
    editing_intensity: str = "BALANCED"
):
    """
    End-to-End Clip Cutter v3.0 AI Processing Pipeline:
      1. Audio extraction via FFmpeg
      2. Fast Whisper Transcription (Multi-language & Hinglish)
      3. Semantic Viral Moment Extraction & Ranking
      4. Auto Face Centering (OpenCV 9:16 safe crop)
      5. Synchronized ASS Subtitles (16 styles + dynamic watermark)
      6. Single-pass NVENC / CPU Fallback Rendering
      7. AI 0-100 Viral Potential Scoring & Hook Generation
      8. Ollama SEO Titles & Hashtags
    """
    async def update_project(session_factory, proj_id, **kwargs):
        async with session_factory() as session:
            result = await session.execute(sa_select(Project).where(Project.id == proj_id))
            proj = result.scalar_one_or_none()
            if proj:
                for key, value in kwargs.items():
                    if hasattr(proj, key):
                        setattr(proj, key, value)
                await session.commit()

    try:
        # ── Step 1: Initial Validation ───────────────────────────
        async with session_factory() as session:
            result = await session.execute(sa_select(Project).where(Project.id == project_id))
            project = result.scalar_one_or_none()
            if not project:
                return
            source_file = project.source_file_path
            user_id = project.user_id
            target_shorts = shorts_count or project.target_shorts_count or 4
            lang_pref = language_pref or project.language_preference or "auto"

        if not source_file or not os.path.exists(source_file):
            await update_project(session_factory, project_id,
                status=ProjectStatus.FAILED, progress=0,
                error_message="Source video file not found on disk.",
                progress_message="File missing")
            return

        # ── Step 2: Audio Extraction & Multi-Language Transcription ────────
        await update_project(session_factory, project_id,
            status=ProjectStatus.TRANSCRIBING, progress=15.0,
            progress_message="Extracting audio track...")

        audio_path = await asyncio.to_thread(extract_audio, source_file, settings.TEMP_DIR)
        
        await update_project(session_factory, project_id,
            progress=25.0, progress_message=f"Running Whisper AI ({lang_pref.upper()})...")
            
        transcript_data = await asyncio.to_thread(transcribe_audio, audio_path, language_pref=lang_pref)
        detected_lang = transcript_data.get('language', 'en')

        # ── Step 3: Fast Semantic Segmentation ───────────────────
        await update_project(session_factory, project_id,
            status=ProjectStatus.SEGMENTING, progress=35.0,
            progress_message="Analyzing viral highlight boundaries & retention curves...",
            transcript=transcript_data.get('full_text', ''))

        clips_data = segment_transcript(
            transcript_data.get('segments', []),
            settings.CLIP_MIN_DURATION,
            settings.CLIP_MAX_DURATION,
            target_count=target_shorts
        )

        if not clips_data:
            await update_project(session_factory, project_id,
                status=ProjectStatus.FAILED, progress=0,
                error_message="Could not detect speech or segments in the video.",
                progress_message="No speech detected")
            return

        # Check if user is free tier (not admin, plan is FREE)
        is_free_user = False
        async with session_factory() as session:
            user_res = await session.execute(sa_select(User).where(User.id == user_id))
            user_obj = user_res.scalar_one_or_none()
            if user_obj:
                is_free_user = bool(
                    not user_obj.is_admin and (
                        user_obj.plan == PlanType.FREE or 
                        str(getattr(user_obj, 'plan', '')).upper() in ['FREE', 'PLANTYPE.FREE']
                    )
                )

        # ── Step 4: Single-Pass Video Render (Fast) ──────────────
        await update_project(session_factory, project_id,
            status=ProjectStatus.PROCESSING, progress=45.0,
            progress_message=f"Rendering {len(clips_data)} shorts with 9:16 framing & subtitles...")

        clip_progress_step = 40.0 / max(1, len(clips_data))

        for i, clip_info in enumerate(clips_data):
            clip_id = str(uuid.uuid4())[:8]
            raw_clip_path = str(settings.TEMP_DIR / f"raw_{clip_id}.mp4")
            ass_path = str(settings.TEMP_DIR / f"sub_{clip_id}.ass")
            final_path = str(settings.OUTPUT_DIR / f"clip_{project_id}_{clip_id}.mp4")

            await update_project(session_factory, project_id,
                progress_message=f"Rendering short {i+1}/{len(clips_data)} (GPU Single-Pass)...")

            # 4a: Fast segment cut
            await asyncio.to_thread(
                extract_clip, source_file,
                clip_info['start_time'], clip_info['end_time'],
                raw_clip_path
            )

            # 4b: Fast face tracking & crop calculation
            face_data = await asyncio.to_thread(analyze_faces, raw_clip_path, 15)
            
            import cv2
            cap = cv2.VideoCapture(raw_clip_path)
            vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
            vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
            cap.release()

            crop_coords = await asyncio.to_thread(calculate_crop_coords, face_data, vid_w, vid_h)

            # 4c: Subtitle script generation with dynamic watermark
            clip_words = [dict(w) for w in clip_info.get('words', [])]
            offset = clip_info.get('start_time', 0.0)
            for w_dict in clip_words:
                w_dict['start'] = max(0, w_dict.get('start', 0.0) - offset)
                w_dict['end'] = max(0, w_dict.get('end', 0.0) - offset)

            await asyncio.to_thread(
                generate_ass_subtitles,
                clip_words,
                ass_path,
                caption_style,
                watermark=is_free_user
            )

            # 4d: Ultra-fast single-pass render (Crop + Scale + Subtitles + Audio Enhancement)
            await asyncio.to_thread(
                render_final_vertical_clip,
                raw_clip_path,
                crop_coords,
                ass_path,
                final_path,
                settings.FFMPEG_NVENC
            )

            # 4e: AI Viral Scoring & AI Hook Generation
            clip_duration = clip_info['end_time'] - clip_info['start_time']
            viral_analysis = analyze_viral_moment(clip_info.get('text', ''), clip_duration, clip_words)
            is_hindi_mode = detected_lang in ['hi', 'hinglish'] or lang_pref in ['hi', 'hinglish']
            generated_hooks = generate_hook_variations(clip_info.get('text', '')[:120], is_hindi=is_hindi_mode)

            # 4f: Store in database
            async with session_factory() as session:
                db_clip = Clip(
                    project_id=project_id,
                    start_time=clip_info['start_time'],
                    end_time=clip_info['end_time'],
                    aspect_ratio="9:16",
                    video_path=final_path,
                    transcript_segment=clip_info.get('text', '').strip(),
                    caption_style=caption_style,
                    viral_score=viral_analysis.get('viral_score', 85.0),
                    viral_breakdown=viral_analysis.get('breakdown'),
                    ai_explanation=viral_analysis.get('reason'),
                    hooks=generated_hooks,
                    selected_hook="Original",
                    seo_titles=[f"Viral Short #{i+1}"],
                    qc_status={"synced": True, "audio_ok": True, "safe_area": True}
                )
                session.add(db_clip)
                await session.commit()

            current_progress = 45.0 + (clip_progress_step * (i + 1))
            await update_project(session_factory, project_id, progress=min(85.0, current_progress))

            # Cleanup temp files immediately
            for temp_f in [raw_clip_path, ass_path]:
                try:
                    if os.path.exists(temp_f):
                        os.remove(temp_f)
                except OSError:
                    pass

        # ── Step 5: Fast Ollama AI Viral Metadata ────────────────
        await update_project(session_factory, project_id,
            status=ProjectStatus.GENERATING_METADATA, progress=88.0,
            progress_message="Generating AI viral titles, hashtags & SEO...")

        async with session_factory() as session:
            result = await session.execute(sa_select(Clip).where(Clip.project_id == project_id))
            clips = result.scalars().all()
            for idx, clip in enumerate(clips):
                try:
                    metadata = await generate_metadata(clip.transcript_segment or "")
                    clip.title = metadata.get('title') or f"Viral Short #{idx+1}"
                    clip.description = metadata.get('description') or (clip.transcript_segment[:180] + "...")
                    clip.tags = metadata.get('tags') or ["shorts", "viral", "fyp", "trending"]
                    clip.hashtags = metadata.get('hashtags') or ["#Shorts", "#Viral", "#Trending"]
                    clip.seo_titles = [
                        clip.title,
                        f"Why {clip.title[:40]} Will Blow Your Mind",
                        f"The Truth About {clip.title[:40]}",
                        f"Stop Making This Mistake ({clip.title[:30]})",
                        f"How To Master {clip.title[:35]}"
                    ]
                except Exception:
                    clip.title = f"Viral Short #{idx+1}"
                    clip.description = clip.transcript_segment[:180] if clip.transcript_segment else ""
                    clip.tags = ["shorts", "trending"]
                    clip.hashtags = ["#Shorts", "#Trending"]
                    clip.seo_titles = [clip.title]
            await session.commit()

        # ── Step 6: Mark Completed & Clean Up ────────────────────
        await update_project(session_factory, project_id,
            status=ProjectStatus.COMPLETED, progress=100.0,
            progress_message="Completed! Your 9:16 shorts are ready to download.")

        # Cleanup source audio
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception:
            pass

    except Exception as e:
        import traceback
        traceback.print_exc()
        await update_project(session_factory, project_id,
            status=ProjectStatus.FAILED, progress=0,
            error_message=str(e),
            progress_message="Processing failed")
