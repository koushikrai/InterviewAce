# InterviewAce - AI Interview Prep MVP

A full-stack platform to analyze resumes, generate interview questions, practice interviews (text/voice), provide AI feedback, and track progress.

## Stack
- Frontend: React + TypeScript + shadcn/ui + React Query + Vite
- Backend: Express + Mongoose (MongoDB) + Axios + Helmet/CORS
- AI services: Trained with Lora + FastAPI (Python) + google-generativeai (Gemini)
- Voice: MediaRecorder (browser) + Google Cloud Speech-to-Text

## Features
- Resume analysis (PDF/DOCX) with ATS scoring, JD match, skill gaps, keyword match
- Interview question generation (Gemini) with fallbacks and caching
- Per-answer AI feedback with detailed breakdowns and session analytics
- Progress dashboard, session report, trend chart
- Voice mode: live speech-to-text, debounced chunk uploads

## Quick Start (Local Dev)
Requirements: Node 18+, Python 3.11, MongoDB 6+, pnpm/npm, valid Gemini/Google keys

1) Install dependencies
```
npm ci
pip install -r src/ai-services/requirements.txt
```

2) Environment variables
- Backend (.env):
```
MONGODB_URI=mongodb://localhost:27017/interviewace
PORT=3000
RESUME_PARSER_URL=http://127.0.0.1:8001
INTERVIEW_GENERATOR_URL=http://127.0.0.1:8002
ANSWER_FEEDBACK_URL=http://127.0.0.1:8003
ALLOWED_ORIGINS=http://localhost:8080
ENFORCE_AUTH=false
GOOGLE_APPLICATION_CREDENTIALS=./gcp.json
STT_LANGUAGE=en-US
```
- AI services (src/ai-services/.env):
```
GEMINI_API_KEY=your_gemini_key
# or
GOOGLE_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-flash
```
- Frontend (.env):
```
VITE_API_URL=http://localhost:3000
```
- Place your Google Cloud service account JSON as `gcp.json` (see gcp.json.example below)

3) Start services
- MongoDB:
```
mongod --dbpath C:\data\db
```
- AI services (3 terminals or use your batch script):
```
cd src/ai-services
uvicorn resume_parser:app --host 127.0.0.1 --port 8001 --reload
uvicorn interview_generator:app --host 127.0.0.1 --port 8002 --reload
uvicorn answer_feedback:app --host 127.0.0.1 --port 8003 --reload
```
- Backend:
```
npm run dev:server
```
- Frontend:
```
npm run dev
```
Open: http://localhost:8080

## Quick Start (Docker Compose)
Requirements: Docker + Docker Compose

1) Set env in your shell (or use an .env file that compose reads):
```
set GEMINI_API_KEY=your_key
# or
set GOOGLE_API_KEY=your_key
set GEMINI_MODEL=gemini-1.5-flash
```
2) Place your GCP credentials file at project root as `gcp.json`.
3) Run:
```
docker compose up --build
```
- Frontend: http://localhost:8080
- Backend: http://localhost:3000

## Testing
- API tests (node:test + supertest):
```
npm run test:api
```
Ensure Mongo is running and ENFORCE_AUTH=false during tests.

## Notes & Tips
- Voice STT requires valid GCP credentials (GOOGLE_APPLICATION_CREDENTIALS). Browser records audio/webm with opus.
- Gemini rate limits: default to `gemini-1.5-flash` in dev; backoff with jitter and fallbacks are implemented.
- CORS is configurable via `ALLOWED_ORIGINS`.

## Health
- Backend: `/health`, `/health/ai`
- AI services: `/health` on each service (8001–8003)

## License
MIT
