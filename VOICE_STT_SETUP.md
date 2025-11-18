# Voice-to-Text (STT) Setup Guide

This document provides setup instructions for the Whisper-based speech-to-text service.

## Prerequisites

The voice STT service requires **ffmpeg** to be installed on your system for audio format conversion (WebM → WAV).

### Installing ffmpeg

#### Windows
Using Chocolatey (recommended):
```powershell
choco install ffmpeg
```

Or using Scoop:
```powershell
scoop install ffmpeg
```

Or download manually from: https://ffmpeg.org/download.html#build-windows

#### macOS
Using Homebrew:
```bash
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install ffmpeg
```

### Verify ffmpeg Installation
```bash
ffmpeg -version
```

## Python Dependencies

All required Python packages are already installed in `src/ai-services/requirements.txt`:
- `openai-whisper==20231117` - Speech-to-text model
- `pydub==0.25.1` - Audio format conversion
- `fastapi` & `uvicorn` - API framework (already present)

If you need to reinstall:
```bash
cd src/ai-services
pip install -r requirements.txt
```

## Configuration

The voice service can be configured via environment variables in `.env`:

```bash
# Whisper model size (options: tiny, base, small, medium, large)
# Default: base (recommended for balance of speed and accuracy)
WHISPER_MODEL=base
```

Model sizes and performance:
- `tiny` - Fastest, least accurate (~1s per 30s audio)
- `base` - Balanced (recommended) (~3-5s per 30s audio)
- `small` - Better accuracy (~5-8s per 30s audio)
- `medium` - Good accuracy (~10-15s per 30s audio)
- `large` - Most accurate (~20-30s per 30s audio)

## Running the Service

### Option 1: Using npm script (recommended)
All services including voice STT will start automatically:
```bash
npm run start-apis
```

This starts 4 concurrent services:
- Resume Parser (port 8001)
- Interview Generator (port 8002)
- Answer Feedback (port 8003)
- **Voice STT (port 5000)** ← New service

### Option 2: Manual startup
```bash
cd src/ai-services
uvicorn voice_stt:app --host 0.0.0.0 --port 5000
```

### Option 3: With reload for development
```bash
cd src/ai-services
uvicorn voice_stt:app --host 0.0.0.0 --port 5000 --reload
```

## Testing the Service

### Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "voice-stt",
  "model": "base",
  "model_loaded": true
}
```

### Test Transcription
1. Record an audio file as WebM format
2. Send it to the API:
```bash
curl -X POST http://localhost:5000/interview/stt \
  -F "file=@audio.webm"
```

Expected response:
```json
{
  "transcript": "Hello, this is a test transcription",
  "language": "en",
  "success": true
}
```

## Frontend Integration

The React frontend automatically sends voice data to the voice service on port 5000:

1. Navigate to **Mock Interview** in the app
2. Select **Voice Mode**
3. Click the microphone button to start recording
4. Speak your answer clearly
5. Click the button again to stop recording
6. The transcribed text will appear in the answer field within 5-30 seconds

## Troubleshooting

### ffmpeg not found
**Error**: `pydub.exceptions.CouldntDecodeError` or `ffmpeg: not recognized`

**Solution**: Install ffmpeg using the instructions above, then restart the service.

### Model download fails
**Error**: Network error when loading Whisper model

**Solution**: 
1. Check your internet connection
2. The model will be cached in `~/.cache/whisper/` after first download
3. For offline setup, download models manually and point to them

### High latency (>30 seconds per audio chunk)
**Recommendation**: Switch to a smaller model:
```bash
# In .env
WHISPER_MODEL=tiny
```

Or use GPU if available (requires CUDA):
```python
# Edit voice_stt.py: device="cuda" instead of device="cpu"
```

### Microphone permission denied
**Error**: "Mic access denied" toast notification

**Solution**: Browser needs microphone permission. Check browser settings and grant permission when prompted.

## Architecture

```
Browser (React)
    ↓ (WebM audio blob)
    ↓
Voice STT Service (Port 5000)
    ↓
    ├─ Convert WebM → WAV (pydub + ffmpeg)
    ├─ Transcribe with Whisper model
    ↓
Transcript JSON
    ↓
Browser (append to answer field)
```

## Performance Notes

- First request takes longer (~5-10 seconds) as the Whisper model is loaded
- Subsequent requests are faster (~1-5 seconds depending on audio length and model size)
- Audio chunks are processed on-the-fly as user speaks
- Maximum audio length: No hard limit, but processing time increases with length

## First-Time Setup Checklist

- [ ] ffmpeg installed and verified (`ffmpeg -version`)
- [ ] Python dependencies installed (`pip install -r src/ai-services/requirements.txt`)
- [ ] Voice service starts without errors (`npm run start-apis`)
- [ ] Health check passes (`curl http://localhost:5000/health`)
- [ ] Microphone permission granted in browser
- [ ] Voice mode works in Mock Interview page
