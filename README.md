# ✂️ Clip Cutter

**Local AI-Powered Short-Form Video Generator**

Transform long-form videos into viral 9:16 shorts with AI-powered face tracking, smart segmentation, and multiple caption styles — all running locally on your hardware. Zero cloud APIs required.

![License](https://img.shields.io/badge/license-MIT-purple)
![Python](https://img.shields.io/badge/python-3.11+-blue)
![React](https://img.shields.io/badge/react-18+-cyan)

---

## 🎬 Features

- **Smart Video Ingestion** — Upload MP4/MOV files or paste YouTube URLs
- **AI Transcription** — Faster-Whisper with CUDA acceleration, supports English, Hindi, and Hinglish
- **Intelligent Segmentation** — Automatically finds 30-90 second viral-worthy segments
- **Face-Centered Cropping** — MediaPipe face detection with smoothed tracking for 9:16 vertical output
- **3 Caption Styles** — Hormozi Bold, Clean Minimal, and Dynamic Pop
- **Hardware-Accelerated** — NVENC encoding for fast video processing
- **AI Metadata** — Local LLM generates titles, descriptions, tags, and hashtags
- **Credit System** — Free trial (3 shorts), Base plan (₹99/mo), Pro plan (₹199/mo)
- **Razorpay Integration** — Test mode payment processing
- **Admin Account** — Unlimited generation for the admin user

---

## 🖥️ Hardware Requirements

| Component | Minimum |
|-----------|---------|
| CPU | Intel i5 / AMD Ryzen 5 |
| GPU | NVIDIA GTX 1650+ (4GB VRAM) |
| RAM | 16GB |
| Storage | 50GB free |
| OS | Windows 10/11 |

**Tested on:** i5-13450HX, RTX 3050 6GB, 24GB RAM

---

## 🛠️ Prerequisites

Install these before starting:

### 1. Python 3.11+
```bash
# Download from https://www.python.org/downloads/
python --version  # Should be 3.11+
```

### 2. Node.js 18+ & npm
```bash
# Download from https://nodejs.org/
node --version  # Should be 18+
```

### 3. FFmpeg (with NVENC support)
```bash
# Download from https://github.com/BtbN/FFmpeg-Builds/releases
# Add to PATH
ffmpeg -version
ffmpeg -encoders | findstr nvenc  # Should list h264_nvenc
```

### 4. CUDA Toolkit 11.8+
```bash
# Download from https://developer.nvidia.com/cuda-toolkit
nvcc --version
```

### 5. Ollama (for AI metadata generation)
```bash
# Download from https://ollama.ai
# Install and run:
ollama pull llama3.2:3b
ollama serve
```

---

## 🚀 Quick Start

### 1. Clone & Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env file with your settings (defaults work for local dev)
```

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install
```

### 3. Start Ollama (separate terminal)

```bash
ollama serve
# In another terminal:
ollama run llama3.2:3b
```

### 4. Start Backend (separate terminal)

```bash
cd backend
venv\Scripts\activate
python run.py
# Server starts at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 5. Start Frontend (separate terminal)

```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

---

## 👤 Admin Account

An admin account is auto-created on first startup:

| Field | Value |
|-------|-------|
| Email | `test@test.com` |
| Password | `test@123` |
| Credits | **Unlimited** |

The admin account bypasses all credit checks and can generate unlimited shorts.

---

## 📁 Project Structure

```
clip-cutter/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   │   ├── auth.py       # Authentication (register, login)
│   │   │   ├── billing.py    # Razorpay payment integration
│   │   │   ├── process.py    # Video processing pipeline
│   │   │   └── projects.py   # Project CRUD operations
│   │   ├── core/         # Configuration & security
│   │   │   ├── config.py     # Pydantic settings from .env
│   │   │   └── security.py   # JWT, password hashing
│   │   ├── db/           # Database layer
│   │   │   ├── database.py   # Async SQLAlchemy setup
│   │   │   └── models.py     # User, Project, Clip, Subscription
│   │   ├── services/     # Business logic
│   │   │   ├── cleanup.py        # Temp file management
│   │   │   ├── downloader.py     # yt-dlp integration
│   │   │   ├── face_tracker.py   # MediaPipe face detection
│   │   │   ├── llm_metadata.py   # Ollama LLM integration
│   │   │   ├── transcription.py  # Faster-Whisper pipeline
│   │   │   └── video_editor.py   # FFmpeg processing
│   │   └── main.py       # FastAPI application entry
│   ├── requirements.txt
│   ├── run.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── VideoUploader.jsx
│   │   │   ├── ClipEditor.jsx
│   │   │   ├── CaptionStylePicker.jsx
│   │   │   ├── PricingModal.jsx
│   │   │   └── MetadataViewer.jsx
│   │   ├── pages/        # Route pages
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Pricing.jsx
│   │   ├── App.jsx       # Router & auth context
│   │   ├── main.jsx      # React entry point
│   │   └── index.css     # Tailwind + custom styles
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get current user profile |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/upload` | Upload video file |
| POST | `/api/projects/youtube` | Import from YouTube URL |
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/{id}` | Get project details |
| DELETE | `/api/projects/{id}` | Delete project |

### Processing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process/{id}` | Start clip generation |
| GET | `/api/process/{id}/status` | Check processing progress |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/create-order` | Create Razorpay order |
| POST | `/api/billing/verify-payment` | Verify payment |
| GET | `/api/billing/plans` | Get pricing plans |

---

## 💰 Pricing Plans

| Feature | Free | Base (₹99/mo) | Pro (₹199/mo) |
|---------|------|---------------|----------------|
| Shorts/month | 3 | 50 | 150 |
| Caption Styles | All 3 | All 3 | All 3 |
| YouTube Import | ✅ | ✅ | ✅ |
| AI Metadata | ✅ | ✅ | ✅ |
| NVENC Acceleration | ✅ | ✅ | ✅ |

---

## 🎨 Caption Styles

1. **Hormozi Bold** — Impact font, uppercase, yellow word highlight, thick black outline
2. **Clean Minimal** — Arial, white text on translucent black backdrop
3. **Dynamic Pop** — Montserrat, purple highlight with scale animation

---

## ⚙️ Environment Variables

Edit `backend/.env` to configure:

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./clipcutter.db

# JWT
JWT_SECRET=your-secret-key

# Whisper
WHISPER_MODEL=small          # base, small, medium, large-v3
WHISPER_DEVICE=cuda          # cuda or cpu
WHISPER_COMPUTE_TYPE=float16 # float16, int8, float32

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# FFmpeg
FFMPEG_NVENC=true
```

---

## 🐛 Troubleshooting

### CUDA not detected
```bash
# Verify CUDA installation
python -c "import torch; print(torch.cuda.is_available())"
# If false, install CUDA-enabled PyTorch:
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

### FFmpeg NVENC not available
- Ensure you have an NVIDIA GPU with NVENC support
- The app will auto-fallback to CPU encoding (libx264) if NVENC fails

### Ollama connection refused
- Ensure `ollama serve` is running
- The app generates clips without metadata if Ollama is unavailable

### Whisper out of memory
- Switch to `base` model in `.env`: `WHISPER_MODEL=base`
- Or use CPU: `WHISPER_DEVICE=cpu`, `WHISPER_COMPUTE_TYPE=float32`

---

## 📄 License

MIT License — free for personal and commercial use.
