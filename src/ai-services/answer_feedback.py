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

@app.post("/feedback")
async def feedback(request: Request):
    try:
        data = await request.json()
        question = data.get("question", "")
        answer = data.get("answer", "")
        job_title = data.get("jobTitle", "Software Engineer")
        question_category = data.get("category", "general")
        
        # Use genai to evaluate the answer
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        Evaluate this interview answer for a {job_title} position.
        
        Question: {question}
        Question Category: {question_category}
        Candidate's Answer: {answer}
        
        Provide a comprehensive evaluation with the following structure:
        {{
            "score": 0-100,
            "feedback": "detailed feedback on the answer",
            "suggestions": ["specific improvement suggestions"],
            "keywords": ["key terms mentioned"],
            "sentiment": "positive|neutral|negative",
            "breakdown": {{
                "accuracy": 0-100,
                "completeness": 0-100,
                "clarity": 0-100,
                "relevance": 0-100
            }},
            "categories": {{
                "technical": 0-100,
                "communication": 0-100,
                "problemSolving": 0-100,
                "confidence": 0-100
            }}
        }}
        
        Consider:
        - Technical accuracy for technical questions
        - Communication clarity and structure
        - Problem-solving approach
        - Confidence and assertiveness
        - Relevance to the question asked
        - Completeness of the answer
        """
        
        response = model.generate_content(prompt)
        
        # Parse the response as JSON
        try:
            evaluation = json.loads(response.text)
            return JSONResponse({
                "success": True,
                "score": evaluation.get("score", 0),
                "feedback": evaluation.get("feedback", ""),
                "suggestions": evaluation.get("suggestions", []),
                "keywords": evaluation.get("keywords", []),
                "sentiment": evaluation.get("sentiment", "neutral"),
                "breakdown": evaluation.get("breakdown", {}),
                "categories": evaluation.get("categories", {})
            })
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return JSONResponse({
                "success": False,
                "error": "Failed to parse AI response as JSON",
                "score": 0,
                "feedback": "Unable to evaluate answer due to technical issues."
            })
            
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e),
            "score": 0,
            "feedback": "Error occurred during evaluation."
        })

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "answer-feedback"} 