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

@app.post("/feedback")
async def feedback(request: Request):
    try:
        data = await request.json()
        question = data.get("question", "")
        answer = data.get("answer", "")
        job_title = data.get("jobTitle", "Software Engineer")
        question_category = data.get("category", "general")
        model = genai.GenerativeModel('gemini-pro')
        print(f"Evaluating answer for: {question[:50]}...")
        print(f"Answer length: {len(answer)} characters")
                
        # For now, return simple feedback without calling Gemini (to test communication)
        # This matches the format the backend expects
        simple_feedback = {
            "score": 75,  # Default score
            "feedback": f"Good answer for a {question_category} question. You provided relevant information and showed understanding of the topic.",
            "suggestions": [
                "Consider adding specific examples to strengthen your response",
                "Try to quantify your achievements when possible",
                "Make sure your answer directly addresses the question asked"
            ],
            "keywords": ["relevant", "understanding", "examples"],
            "sentiment": "positive",
            "breakdown": {
                "accuracy": 80,
                "completeness": 70,
                "clarity": 75,
                "relevance": 80
            },
            "categories": {
                "technical": 70,
                "communication": 80,
                "problemSolving": 75,
                "confidence": 75
            }
        }
        
        print(f"Returning feedback with score: {simple_feedback['score']}")
        return JSONResponse({
            "success": True,
            "score": simple_feedback["score"],
            "feedback": simple_feedback["feedback"],
            "suggestions": simple_feedback["suggestions"],
            "keywords": simple_feedback["keywords"],
            "sentiment": simple_feedback["sentiment"],
            "breakdown": simple_feedback["breakdown"],
            "categories": simple_feedback["categories"]
        })
        
    except Exception as e:
        print(f"Error in feedback: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "score": 0,
            "feedback": "Error occurred during evaluation."
        })

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "answer-feedback"}

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify communication"""
    return {"message": "Answer feedback service is working!", "timestamp": "2025-08-15"} 