from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import json
import hashlib

# Load .env if present
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

# Configure genai with either GOOGLE_API_KEY or GEMINI_API_KEY
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
if api_key:
    genai.configure(api_key=api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict[str, list[dict]] = {}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "interview-generator"}

@app.get("/test")
async def test():
    return {"message": "Interview generator service is working!"}

@app.post("/generate")
async def generate_questions(request: Request):
    try:
        data = await request.json()
        job_title = data.get("jobTitle", "Software Engineer")
        resume_data = data.get("resume", {})
        difficulty = data.get("difficulty", "medium")
        num_questions = int(data.get("numQuestions", 5))

        # Truncate resume context to reduce tokens
        resume_snippet = json.dumps(resume_data)[:1200]
        cache_key = hashlib.sha1(f"{job_title}|{difficulty}|{num_questions}|{resume_snippet}".encode()).hexdigest()
        if cache_key in _cache:
            return JSONResponse({
                "success": True,
                "questions": _cache[cache_key],
                "jobTitle": job_title,
                "difficulty": difficulty,
                "count": len(_cache[cache_key]),
                "metadata": {"source": "cache", "usedResume": bool(resume_data)}
            })

        model = genai.GenerativeModel(model_name) if api_key else None
        generation_prompt = f"""
        You are an expert interview coach creating personalized interview questions for a {job_title} position.
        Difficulty: {difficulty}
        Return an array of JSON objects: [{{"question":"string","type":"technical|behavioral|general","expectedDuration":"string"}}]
        Count: {num_questions}
        Resume context (optional, truncated): {resume_snippet}
        """
        try:
            if model is not None:
                response = model.generate_content(generation_prompt)
                ai_questions = response.text
                start_idx = ai_questions.find('[')
                end_idx = ai_questions.rfind(']') + 1
                if start_idx != -1 and end_idx != -1:
                    json_content = ai_questions[start_idx:end_idx]
                    parsed_questions = json.loads(json_content)
                    formatted = [
                        {
                            "id": i + 1,
                            "question": q.get("question", f"Question {i+1}"),
                            "type": q.get("type", "general"),
                            "expectedDuration": q.get("expectedDuration", "2-3 minutes"),
                        }
                        for i, q in enumerate(parsed_questions[:num_questions])
                    ]
                    while len(formatted) < num_questions:
                        formatted.append({
                            "id": len(formatted) + 1,
                            "question": f"Tell me about a challenge you solved related to {job_title}.",
                            "type": "general",
                            "expectedDuration": "2-3 minutes",
                        })
                    _cache[cache_key] = formatted
                    return JSONResponse({
                        "success": True,
                        "questions": formatted,
                        "jobTitle": job_title,
                        "difficulty": difficulty,
                        "count": len(formatted),
                        "metadata": {"source": "ai", "usedResume": bool(resume_data)}
                    })
                else:
                    raise Exception("AI response format invalid")
            else:
                raise Exception("No API key configured; using fallback")
        except Exception as ai_error:
            print(f"AI question generation failed: {str(ai_error)}")
            enhanced_questions = [
                {"id": 1, "question": f"Describe a recent project relevant to a {job_title} role.", "type": "general", "expectedDuration": "2-3 minutes"},
                {"id": 2, "question": f"How do you keep your {job_title} skills up to date?", "type": "behavioral", "expectedDuration": "2 minutes"},
                {"id": 3, "question": f"Explain a difficult concept you mastered related to {job_title}.", "type": "technical", "expectedDuration": "3-4 minutes"},
                {"id": 4, "question": f"Tell me about a time you overcame a challenge.", "type": "behavioral", "expectedDuration": "3 minutes"},
                {"id": 5, "question": f"What excites you about working as a {job_title}?", "type": "general", "expectedDuration": "2 minutes"},
            ][:num_questions]
            return JSONResponse({
                "success": True,
                "questions": enhanced_questions,
                "jobTitle": job_title,
                "difficulty": difficulty,
                "count": len(enhanced_questions),
                "metadata": {"source": "fallback", "usedResume": bool(resume_data)}
            })
    except Exception as e:
        print(f"Error in generate_questions: {str(e)}")
        return JSONResponse({"success": False, "error": str(e), "questions": []}) 