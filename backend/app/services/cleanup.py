import asyncio
import os
from pathlib import Path
from app.core.config import settings

def cleanup_temp_files(project_id: int) -> None:
    try:
        for file in settings.TEMP_DIR.iterdir():
            if str(project_id) in file.name:
                try:
                    file.unlink()
                except Exception:
                    pass
    except Exception as e:
        print(f"Error cleaning up temp files for project {project_id}: {e}")

def cleanup_project_temps(file_path: str) -> None:
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
        
        wav_path = path.with_suffix('.wav')
        if wav_path.exists():
            wav_path.unlink()
    except Exception as e:
        print(f"Error cleaning up file {file_path}: {e}")

async def run_cleanup(file_path: str) -> None:
    await asyncio.to_thread(cleanup_project_temps, file_path)
