from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from typing import Dict, Any
import json

# Configure genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate")
async def generate_questions(request: Request):
    try:
        data = await request.json()
        job_title = data.get("jobTitle", "Software Engineer")
        resume_data = data.get("resume", {})
        difficulty = data.get("difficulty", "medium")
        num_questions = data.get("numQuestions", 5)
        
        print(f"Generating questions for: {job_title}")
        print(f"Resume data keys: {list(resume_data.keys()) if resume_data else 'None'}")
        
        # For now, return simple questions without calling Gemini (to test communication)
        # This matches the format the backend expects
        simple_questions = [
            {
                "id": "1",
                "question": f"Tell me about your experience with {job_title} roles and what interests you about this position.",
                "category": "behavioral",
                "difficulty": difficulty,
                "expectedAnswer": "Discuss relevant experience and motivation for the role"
            },
            {
                "id": "2", 
                "question": f"Describe a challenging project you worked on that's relevant to {job_title} positions.",
                "category": "technical",
                "difficulty": difficulty,
                "expectedAnswer": "Explain the problem, your approach, and the outcome"
            },
            {
                "id": "3",
                "question": "What are your greatest strengths and how do they apply to this position?",
                "category": "behavioral",
                "difficulty": difficulty,
                "expectedAnswer": "Identify 2-3 key strengths with specific examples"
            },
            {
                "id": "4",
                "question": "Where do you see yourself in 5 years in your {job_title} career?",
                "category": "career",
                "difficulty": difficulty,
                "expectedAnswer": "Show career progression and alignment with company goals"
            }
        ]
        
        print(f"Returning {len(simple_questions)} questions")
        return JSONResponse({
            "success": True,
            "questions": simple_questions,
            "jobTitle": job_title,
            "difficulty": difficulty,
            "count": len(simple_questions)
        })
        
    except Exception as e:
        print(f"Error in generate_questions: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "questions": []
        })

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "interview-generator"}

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify communication"""
    return {"message": "Interview generator is working!", "timestamp": "2025-08-15"} 