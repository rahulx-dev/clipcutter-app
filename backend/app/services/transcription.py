import asyncio
import subprocess
import os
from pathlib import Path
from faster_whisper import WhisperModel
from app.core.config import settings

# Global cached model instance to avoid reloading every time
_cached_model = None

def get_whisper_model():
    """Load and cache the Whisper model with auto-fallback to CPU."""
    global _cached_model
    if _cached_model is not None:
        return _cached_model

    # Try CUDA first if requested
    if settings.WHISPER_DEVICE.lower() == "cuda":
        try:
            print(f"[Whisper] Loading model '{settings.WHISPER_MODEL}' on CUDA (float16)...")
            _cached_model = WhisperModel(
                settings.WHISPER_MODEL,
                device="cuda",
                compute_type=settings.WHISPER_COMPUTE_TYPE
            )
            print("[Whisper] Successfully loaded on CUDA.")
            return _cached_model
        except Exception as e:
            print(f"[Whisper] CUDA initialization failed ({e}). Falling back to CPU...")

    # CPU fallback
    print(f"[Whisper] Loading model '{settings.WHISPER_MODEL}' on CPU (int8)...")
    _cached_model = WhisperModel(
        settings.WHISPER_MODEL,
        device="cpu",
        compute_type="int8"
    )
    print("[Whisper] Successfully loaded on CPU.")
    return _cached_model


def extract_audio(video_path: str, output_dir: Path, max_duration: int = 720) -> str:
    """Extract 16kHz mono WAV audio from video using FFmpeg (capped to max_duration for fast viral highlight extraction)."""
    video_name = Path(video_path).stem
    output_path = output_dir / f"{video_name}.wav"
    
    cmd = [
        settings.FFMPEG_PATH,
        '-i', str(video_path),
        '-t', str(max_duration),  # Transcribe first 12 mins for instant viral extraction
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        str(output_path),
        '-y'
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as e:
        print(f"[FFmpeg] Audio extraction error: {e.stderr.decode('utf-8', errors='ignore')}")
        raise RuntimeError(f"FFmpeg failed to extract audio from video: {video_path}")
        
    return str(output_path)


def transcribe_audio(audio_path: str, language_pref: str = "auto") -> dict:
    """Transcribe audio with word-level timestamps and multi-language support (Hindi, Hinglish, English)."""
    model = get_whisper_model()
    
    # Configure language & initial prompts
    whisper_lang = None
    initial_prompt = None
    
    if language_pref == "hi":
        whisper_lang = "hi"
        initial_prompt = "नमस्ते, यह वीडियो हिंदी में है। कृपया शुद्ध और स्पष्ट हिंदी में ट्रांसक्राइब करें।"
    elif language_pref == "hinglish":
        whisper_lang = None
        initial_prompt = "Transcribe conversational Indian podcast, Hindi and Hinglish in Roman script: bhai, kya baat hai, paisa, business, growth, viral shorts."
    elif language_pref == "en":
        whisper_lang = "en"
    
    print(f"[Whisper] Transcribing audio: {audio_path} (Language Mode: {language_pref})")
    
    transcribe_kwargs = {
        "word_timestamps": True,
        "beam_size": 1,  # Ultra-fast greedy decoding
        "best_of": 1,
        "temperature": 0.0,
        "vad_filter": True,
        "vad_parameters": dict(min_silence_duration_ms=500)
    }
    
    if whisper_lang:
        transcribe_kwargs["language"] = whisper_lang
    if initial_prompt:
        transcribe_kwargs["initial_prompt"] = initial_prompt
        
    segments_gen, info = model.transcribe(str(audio_path), **transcribe_kwargs)
    
    segments = []
    full_text = ""
    for segment in segments_gen:
        words = []
        if segment.words:
            for word in segment.words:
                words.append({
                    'word': word.word,
                    'start': word.start,
                    'end': word.end,
                    'confidence': word.probability
                })
        segments.append({
            'start': segment.start,
            'end': segment.end,
            'text': segment.text,
            'words': words
        })
        full_text += segment.text + " "
        
    detected_lang = info.language or ("hi" if language_pref in ["hi", "hinglish"] else "en")
    print(f"[Whisper] Transcription completed. Detected language: {detected_lang} (Confidence: {info.language_probability:.2f})")
    
    return {
        'language': detected_lang,
        'segments': segments,
        'full_text': full_text.strip()
    }


async def run_transcription(video_path: str, language_pref: str = "auto") -> dict:
    def _run():
        audio_path = extract_audio(video_path, settings.TEMP_DIR)
        return transcribe_audio(audio_path, language_pref=language_pref)
    return await asyncio.to_thread(_run)
