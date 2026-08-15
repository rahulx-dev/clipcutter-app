import cv2
import asyncio
import os
from pathlib import Path

# Path to local Haar Cascade XML
CASCADE_PATH = Path(__file__).resolve().parent / "haarcascade_frontalface_default.xml"
_face_cascade = None


def get_face_cascade():
    """Load and cache the OpenCV Haar Cascade face detector."""
    global _face_cascade
    if _face_cascade is not None:
        return _face_cascade

    if CASCADE_PATH.exists():
        _face_cascade = cv2.CascadeClassifier(str(CASCADE_PATH))
        if not _face_cascade.empty():
            return _face_cascade

    # Fallback to default cv2 path if available
    try:
        default_path = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
        if os.path.exists(default_path):
            _face_cascade = cv2.CascadeClassifier(default_path)
            return _face_cascade
    except Exception:
        pass

    return None


def analyze_faces(video_path: str, sample_rate: int = 15) -> list[dict]:
    """Sample video frames at fast intervals and track speaker coordinates."""
    cascade = get_face_cascade()
    
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
    
    # Analyze 2 frames per second for ultra-fast tracking
    actual_sample_rate = max(10, int(fps // 2))
    
    frame_idx = 0
    results = []
    prev_center_x = frame_width // 2
    alpha = 0.3
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_idx % actual_sample_rate == 0:
            h, w = frame.shape[:2]
            center_x = prev_center_x
            center_y = h // 2
            confidence = 0.5
            
            if cascade is not None and not cascade.empty():
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                # Fast face detection
                faces = cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.15,
                    minNeighbors=4,
                    minSize=(int(h * 0.1), int(h * 0.1))
                )
                
                if len(faces) > 0:
                    # Pick largest face by area (w * h)
                    largest = max(faces, key=lambda f: f[2] * f[3])
                    fx, fy, fw, fh = largest
                    detected_center_x = fx + fw // 2
                    detected_center_y = fy + fh // 2
                    
                    # Apply Exponential Moving Average for smooth cinematic camera panning
                    center_x = int(alpha * detected_center_x + (1 - alpha) * prev_center_x)
                    center_y = detected_center_y
                    confidence = 0.95
                    
            prev_center_x = center_x
            
            results.append({
                'frame_idx': frame_idx,
                'timestamp': frame_idx / fps,
                'center_x': center_x,
                'center_y': center_y,
                'confidence': confidence
            })
            
        frame_idx += 1
        
    cap.release()
    return results


def calculate_crop_coords(face_data: list[dict], frame_width: int, frame_height: int) -> list[dict]:
    """Calculate 9:16 vertical crop bounds centered on speaker."""
    crop_data = []
    crop_width = int(frame_height * 9 / 16)
    
    for data in face_data:
        center_x = data.get('center_x', frame_width // 2)
        # Center the 9:16 box around the speaker and clamp within 16:9 boundaries
        crop_x = max(0, min(center_x - crop_width // 2, frame_width - crop_width))
        crop_data.append({
            'timestamp': data.get('timestamp', 0.0),
            'crop_x': crop_x,
            'crop_width': crop_width,
            'crop_height': frame_height
        })
        
    return crop_data


async def run_face_tracking(video_path: str) -> list[dict]:
    return await asyncio.to_thread(analyze_faces, video_path)
