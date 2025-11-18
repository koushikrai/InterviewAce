# Voice Interview Setup & Troubleshooting Checklist

## ✅ Pre-Flight Checks (Do This First)

### 1. Start All Services
```bash
npm run start-apis
```

**Expected Output:**
```
[1] 🔄 Loading Whisper model: base...
[1] ✅ Successfully loaded Whisper model: base
[1] INFO:     Uvicorn running on http://0.0.0.0:5000
```

**If you see errors:**
- Make sure you installed: `pip install -r src/ai-services/requirements.txt`
- Check if port 5000 is available

### 2. Run Diagnostic
```bash
npm run check:voice
```

**Expected Output:**
```
✅ Voice Service       Service running and model loaded
✅ Whisper Package     Installed version 20250625
✅ FFmpeg              Installed and available
✅ Python Version      Python 3.13.1
✅ Network Latency     45ms latency to voice service

Passed: 5  Failed: 0  Warnings: 0

🎉 All critical checks passed! Voice interview is ready to use.
```

---

## 🔧 Critical Issues & Fixes

### Issue 1: ❌ "Voice service NOT running on port 5000"

**Root Causes:**
1. Services not started
2. Port 5000 in use
3. Service crashed

**Fixes:**

**Option A: Start Services**
```bash
npm run start-apis
```

**Option B: Check if port is in use**
```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```

Kill conflicting process or use different port:
```bash
# In .env or environment
export VITE_VOICE_API_URL=http://localhost:5001
```

**Option C: Check service logs**
```bash
# Look for error messages
# Should see: "Loading Whisper model: base"
# Then: "Successfully loaded Whisper model: base"
# Then: "INFO:     Uvicorn running on http://0.0.0.0:5000"
```

---

### Issue 2: ⚠️ "Whisper model not loaded / Still initializing"

**Root Cause:** First run downloads ~140MB model

**Fix:**
1. **Wait 30-60 seconds** - model is downloading
2. Check disk space (need ~500MB free)
3. Check internet connection

**Monitor Progress:**
```bash
# On Mac/Linux
ls -lh ~/.cache/whisper/

# On Windows
dir "%USERPROFILE%\.cache\whisper\"

# Should show base.pt growing in size
```

---

### Issue 3: ❌ "CORS error" in Browser Console

**Error Message:**
```
Access to XMLHttpRequest at 'http://localhost:5000/interview/stt' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Root Cause:** CORS middleware not applied (should be fixed now)

**Fix:**
1. Clear browser cache: Ctrl+Shift+Delete
2. Try in Incognito/Private mode
3. Restart all services: `npm run start-apis`
4. Restart browser

---

### Issue 4: ❌ "Empty transcript or '[No speech detected]'" OR "Audio file too small"

**Root Causes:**
1. Microphone too quiet
2. Background noise too loud
3. Audio file too short (<3 seconds) or incomplete
4. Browser not capturing audio correctly

**Fixes:**

**1. Check Recording Duration:**
- Record at least **3-5 seconds** of audio (not 1-2 seconds)
- Longer recordings are more reliable
- Speak continuously without pausing

**2. Check Microphone:**
- Test microphone in browser settings
- Ensure microphone permission granted
- Try different microphone
- Move microphone closer
- Avoid phone microphones (use headset/computer mic)

**3. Check Audio Quality:**
- Speak clearly and loudly
- Reduce background noise
- Try in quiet room
- Avoid speaking too fast

**4. Check Browser:**
- Try Chrome, Firefox, or Edge (modern versions)
- Older browsers may have issues with WebM recording
- Clear browser cache: Ctrl+Shift+Delete
- Try in Incognito/Private mode

**5. If File Still < 10 KB:**
- This means browser recording failed to capture audio properly
- Check microphone permissions in browser settings
- Try different browser or computer
- Restart browser and try again

---

### Issue 5: ❌ "FFmpeg not found" or Audio Processing Fails

**What it means:** ffmpeg is required to process WebM/Opus audio from browser recording

**Impact:** Without ffmpeg:
- Voice transcription will fail with cryptic error
- Cannot process browser WebM recordings
- Must install ffmpeg

**Fix (Required):**

**Windows (Recommended - Chocolatey):**
```powershell
choco install ffmpeg -y
```

**Windows (Manual Download):**
1. Go to https://ffmpeg.org/download.html
2. Download "Full" build (essentials_build)
3. Extract to folder (e.g., `C:\ffmpeg`)
4. Add to System PATH:
   - Right-click Start → System → Advanced system settings
   - Click Environment Variables
   - Under System variables, select Path → Edit
   - Click New, add: `C:\ffmpeg\bin` (or your extraction path)
   - Click OK three times
5. Restart terminal/IDE
6. Verify: `ffmpeg -version` should show version info

**Mac:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install ffmpeg
```

**Verify Installation:**
```powershell
ffmpeg -version
# Should show: ffmpeg version 8.0... (or similar)
```

---

### Issue 6: ❌ "Network error" or "Connection refused"

**Error Message:**
```
POST http://localhost:5000/interview/stt 500 (Internal Server Error)
Error: Network Error
```

**Root Causes:**
1. Voice service crashed
2. Whisper model not loaded yet
3. Audio file too large
4. Transcription timeout (>120s)

**Fixes:**

**1. Restart Service:**
```bash
# Kill old process (if needed)
# Windows: taskkill /F /IM python.exe
# Mac/Linux: killall python

# Restart
npm run start-apis
```

**2. Wait for Model:**
- First-time use: wait 30-60 seconds
- Model will be cached for next time

**3. Try Shorter Audio:**
- Start with 10-second clips
- Work up to longer recordings

**4. Check Logs:**
```
Look at terminal running: npm run start-apis
Should see: ✅ Transcription complete: 245 chars
```

---

### Issue 7: ⚠️ "Slow Transcription (>30s)"

**Root Causes:**
1. Large audio file
2. CPU-intensive model
3. Many concurrent requests

**Fixes:**

**1. Use Smaller Model (Faster):**
```bash
# Restart with tiny model
WHISPER_MODEL=tiny npm run start-apis
```

Models & Speed:
- `tiny`: ~1s per 30s audio (fastest, less accurate)
- `base`: ~3-5s per 30s audio (default, balanced)
- `small`: ~5-8s per 30s audio (more accurate)

**2. Use GPU Acceleration (Advanced):**
- Requires CUDA/GPU installed
- 5-10x faster transcription

**3. Monitor Performance:**
```bash
# In browser console, see how long it takes
console.time('transcription');
// ... do voice recording ...
console.timeEnd('transcription');
```

---

## 📝 Step-by-Step Testing

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "voice-stt",
  "model": "base",
  "model_loaded": true
}
```

### Test 2: Test Audio Upload
```bash
# Create test WebM file or use browser recording
# Send to service
curl -X POST http://localhost:5000/interview/stt \
  -F "audio=@audio.webm"
```

**Expected Response:**
```json
{
  "transcript": "your transcribed text",
  "language": "en",
  "success": true
}
```

### Test 3: Full Integration Test
1. Open app: http://localhost:5173
2. Go to **Mock Interview**
3. Click **Voice Mode**
4. Click microphone button
5. Say: "Hello, this is a test"
6. Click microphone again
7. Wait 5-30 seconds
8. Should see transcript in answer field

---

## 🐛 Debugging Tips

### Check Terminal Logs
```
📥 Received audio: chunk.webm (Content-Type: audio/webm;codecs=opus)
📊 File size: 45.3 KB
✅ Using converted WAV file for transcription
🎵 Transcribing audio with Whisper...
✅ Transcription complete: 245 chars, language: en
```

### Browser Console Debug
```javascript
// Enable detailed logging
localStorage.debug = 'axios:*';

// Check voiceAPI
voiceAPI.health().then(r => console.log(r.data));

// Check network requests
// DevTools → Network tab → Filter "stt"
```

### Check Network Tab (DevTools)
1. Open DevTools (F12)
2. Go to Network tab
3. Do voice recording
4. Should see POST to `localhost:5000/interview/stt`
5. Check Response tab for transcript

---

## ✨ Verified Working Setup

If you see all of these, voice interview should work:

- ✅ `npm run start-apis` shows 4 services running
- ✅ `npm run check:voice` shows all green checks
- ✅ `curl http://localhost:5000/health` returns `"status": "ok"`
- ✅ Browser console shows no CORS errors
- ✅ Microphone permission granted
- ✅ Mock Interview page loads
- ✅ Voice Mode button visible and clickable

---

## 🎯 Common Success Cases

### Success Case 1: Quick Test
```bash
# Terminal 1
npm run start-apis

# Terminal 2 (wait 30s for model)
npm run check:voice

# Browser
Go to Mock Interview → Voice Mode → Speak → See transcript
```

### Success Case 2: Troubleshooting
```bash
# Clean start
npm run start-apis

# Different terminal
npm run check:voice  # Should show all green

# If CORS error: Clear cache and reload page

# If slow: Switch to tiny model
WHISPER_MODEL=tiny npm run start-apis
```

---

## 📞 Need More Help?

### Check These Files
- `VOICE_STT_SETUP.md` - Complete setup guide
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `README_VOICE_FEATURE.md` - Quick start
- `src/ai-services/voice_stt.py` - Service code
- `src/lib/api.ts` - Frontend API
- `src/pages/Interview.tsx` - Interview integration

### Run Diagnostics
```bash
npm run check:voice
```

### View Service Logs
```
Terminal output from: npm run start-apis
Look for lines with: ✅, ❌, or ⚠️
```

---

## ✅ You're Ready When:

- ✅ All services start without errors
- ✅ Health check passes
- ✅ Diagnostic shows no critical failures
- ✅ Mock Interview page loads
- ✅ You can record audio
- ✅ Transcript appears in 30 seconds

Enjoy the voice interview feature! 🎉
