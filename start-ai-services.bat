@echo off
echo Starting InterviewAce AI Services...
echo.

echo Starting Resume Parser on port 8001...
start "Resume Parser" cmd /k "cd src\ai-services && uvicorn resume_parser:app --host 0.0.0.0 --port 8001"

echo Starting Interview Generator on port 8002...
start "Interview Generator" cmd /k "cd src\ai-services && uvicorn interview_generator:app --host 0.0.0.0 --port 8002"

echo Starting Answer Feedback on port 8003...
start "Answer Feedback" cmd /k "cd src\ai-services && uvicorn answer_feedback:app --host 0.0.0.0 --port 8003"

echo.
echo All AI services started! Check the new command windows.
echo.
echo Resume Parser: http://localhost:8001/health
echo Interview Generator: http://localhost:8002/health
echo Answer Feedback: http://localhost:8003/health
echo.
pause

