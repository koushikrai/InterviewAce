from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import genai
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
        
        # Use genai to generate interview questions
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        Generate {num_questions} interview questions for a {job_title} position.
        The questions should be {difficulty} difficulty level.
        
        Resume context:
        - Skills: {resume_data.get('skills', [])}
        - Experience: {resume_data.get('experience', [])}
        - Education: {resume_data.get('education', [])}
        
        Generate questions that cover:
        1. Technical skills relevant to {job_title}
        2. Problem-solving scenarios
        3. Behavioral questions
        4. Experience-based questions
        
        Return a JSON array of questions with this structure:
        [
            {{
                "id": "unique_id",
                "question": "question text",
                "category": "technical|behavioral|problem-solving",
                "difficulty": "easy|medium|hard",
                "expectedAnswer": "brief description of what a good answer should include"
            }}
        ]
        """
        
        response = model.generate_content(prompt)
        
        # Parse the response as JSON
        try:
            questions = json.loads(response.text)
            return JSONResponse({
                "success": True,
                "questions": questions,
                "jobTitle": job_title,
                "difficulty": difficulty,
                "count": len(questions)
            })
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return JSONResponse({
                "success": False,
                "error": "Failed to parse AI response as JSON",
                "questions": []
            })
            
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e),
            "questions": []
        })

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "interview-generator"} 