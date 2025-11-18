"""
Voice-to-Text Service using OpenAI Whisper
Converts WebM audio to WAV and transcribes using Whisper model
Fallback to direct WebM processing if ffmpeg unavailable
"""

import os
import sys
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Optional

try:
    import whisper
except ImportError:
    print('ERROR: whisper not installed. Run: pip install openai-whisper')
    sys.exit(1)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Voice STT Service", version="1.0.0")

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Whisper model on startup
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
logger.info(f"Loading Whisper model: {WHISPER_MODEL}")

try:
    model = whisper.load_model(WHISPER_MODEL, device="cpu")
    logger.info(f"Successfully loaded Whisper model: {WHISPER_MODEL}")
except Exception as e:
    logger.error(f"Failed to load Whisper model: {e}")
    model = None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "voice-stt",
        "model": WHISPER_MODEL,
        "model_loaded": model is not None
    }


def convert_webm_to_wav(webm_path: str, wav_path: str) -> bool:
    """
    Convert WebM audio file to WAV using ffmpeg.
    Returns True if successful, False otherwise.
    """
    try:
        # Check if ffmpeg is available
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True, timeout=5)
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        logger.warning("ffmpeg not found. Attempting to process WebM directly with Whisper.")
        return False
    
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-i", webm_path,
                "-ar", "16000",
                "-ac", "1",
                "-c:a", "pcm_s16le",
                wav_path,
                "-loglevel", "quiet"
            ],
            check=True,
            capture_output=True,
            timeout=30
        )
        logger.info(f"Successfully converted WebM to WAV: {wav_path}")
        return True
    except Exception as e:
        logger.error(f"FFmpeg conversion failed: {e}")
        return False


def ffmpeg_available() -> bool:
    """Return True if ffmpeg binary is available on PATH."""
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True, timeout=5)
        return True
    except Exception:
        return False


@app.post("/interview/stt")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio file from WebM to text using Whisper
    
    Args:
        audio: WebM audio file from browser (field name: 'audio')
        
    Returns:
        JSON with transcript and language
    """
    
    if model is None:
        logger.error("Whisper model not loaded - service may still be initializing")
        raise HTTPException(
            status_code=503,
            detail="Whisper model not yet loaded. Try again in a few seconds."
        )
    
    # Validate file upload
    if not audio.filename:
        logger.warning(f"Empty filename. Content-Type: {audio.content_type}")
        raise HTTPException(
            status_code=400,
            detail="No audio file provided"
        )
    
    temp_wav_path = None
    temp_webm_path = None
    audio_path = None
    
    try:
        logger.info(f"📥 Received audio: {audio.filename} (Content-Type: {audio.content_type})")
        
        # Save uploaded WebM to temporary file
        temp_webm_path = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".webm"
        ).name
        
        content = await audio.read()
        with open(temp_webm_path, "wb") as f:
            f.write(content)
        
        file_size_kb = len(content) / 1024
        logger.info(f"📊 File size: {file_size_kb:.1f} KB")
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Audio file is empty")
        
        # WebM files should typically be at least 20 KB for a few seconds of audio
        # Smaller files are likely incomplete or corrupted from the browser
        if len(content) < 10000:  # < 10 KB is suspicious
            logger.warning(f"⚠️ Audio file very small ({file_size_kb:.1f} KB). May be incomplete.")
            raise HTTPException(
                status_code=400,
                detail=(
                    "Audio file is too small or incomplete (less than 10 KB). "
                    "Record at least 3-5 seconds of audio and speak clearly. "
                    "If the problem persists, try a different browser or microphone."
                )
            )
        
        # Ensure ffmpeg is available. Whisper and our conversion both rely on ffmpeg
        # when handling WebM/Opus content. If ffmpeg is not present, return a
        # clear 503 so the frontend can surface a helpful message instead of
        # allowing Whisper to raise a FileNotFoundError internally.
        if not ffmpeg_available():
            logger.warning("ffmpeg not found. Cannot process WebM audio without ffmpeg.")
            raise HTTPException(
                status_code=503,
                detail=(
                    "ffmpeg is required to process WebM/Opus audio. "
                    "Install ffmpeg and ensure it is on your PATH. See: https://ffmpeg.org/download.html"
                ),
            )

        # Try to convert WebM to WAV using ffmpeg
        temp_wav_path = tempfile.NamedTemporaryFile(delete=False, suffix=".wav").name

        try:
            conversion_success = convert_webm_to_wav(temp_webm_path, temp_wav_path)
        except Exception as e:
            logger.warning(f"⚠️ WebM conversion failed: {e}")
            conversion_success = False

        # Use WAV if conversion successful, otherwise fall back to WebM (rare)
        if conversion_success and os.path.exists(temp_wav_path) and os.path.getsize(temp_wav_path) > 0:
            audio_path = temp_wav_path
            logger.info("✅ Using converted WAV file for transcription")
        else:
            audio_path = temp_webm_path
            logger.warning("⚠️ Using WebM directly (conversion failed despite ffmpeg present)")
            logger.info("Tip: Check ffmpeg output and file integrity")
        
        # Transcribe using Whisper
        logger.info("🎵 Transcribing audio with Whisper...")
        result = model.transcribe(
            audio_path,
            fp16=False,
            language="en",
            verbose=False
        )
        
        transcript = result.get("text", "").strip()
        language = result.get("language", "en")
        
        if not transcript:
            logger.warning("⚠️ No speech detected in audio")
            transcript = "[No speech detected]"
        
        logger.info(f"✅ Transcription complete: {len(transcript)} chars, language: {language}")
        logger.debug(f"   Transcript: \"{transcript[:100]}...\"")
        
        return {
            "transcript": transcript,
            "language": language,
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Transcription failed: {error_msg}", exc_info=True)
        
        # Provide context-specific error messages
        if "Invalid data found when processing input" in error_msg or "unrecognized format" in error_msg.lower():
            detail = (
                "Audio file is corrupted or incomplete. "
                "Try recording again and ensure 3+ seconds of audio. "
                "If using older browser, try Chrome or Firefox."
            )
            status_code = 400
        elif "whisper" in error_msg.lower() or "model" in error_msg.lower():
            detail = "Whisper model error. Try restarting the service."
            status_code = 503
        elif "ffmpeg" in error_msg.lower() or "decode" in error_msg.lower():
            detail = "Audio format error. Install ffmpeg or use a different audio format."
            status_code = 500
        else:
            detail = f"Transcription failed: {error_msg}"
            status_code = 500
        
        raise HTTPException(status_code=status_code, detail=detail)
        
    finally:
        # Clean up temporary files
        if temp_webm_path and os.path.exists(temp_webm_path):
            try:
                os.remove(temp_webm_path)
                logger.info(f"Cleaned up WebM temp file: {temp_webm_path}")
            except Exception as e:
                logger.warning(f"Failed to delete WebM temp file: {e}")
        
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.remove(temp_wav_path)
                logger.info(f"Cleaned up WAV temp file: {temp_wav_path}")
            except Exception as e:
                logger.warning(f"Failed to delete WAV temp file: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
