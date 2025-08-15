from fastapi import FastAPI, File, UploadFile
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

@app.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    try:
        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8')
        
        # Use genai to parse resume
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""
        Parse the following resume and extract structured information. 
        Return a JSON object with the following structure:
        {{
            "personalInfo": {{
                "name": "string",
                "email": "string", 
                "phone": "string",
                "location": "string"
            }},
            "summary": "string",
            "experience": [
                {{
                    "title": "string",
                    "company": "string",
                    "duration": "string",
                    "description": ["string"]
                }}
            ],
            "education": [
                {{
                    "degree": "string",
                    "institution": "string",
                    "year": "string"
                }}
            ],
            "skills": ["string"],
            "certifications": ["string"],
            "projects": [
                {{
                    "name": "string",
                    "description": "string",
                    "technologies": ["string"]
                }}
            ]
        }}
        
        Resume content:
        {text_content}
        """
        
        response = model.generate_content(prompt)
        
        # Parse the response as JSON
        try:
            parsed_data = json.loads(response.text)
            return JSONResponse({
                "success": True,
                "data": parsed_data,
                "confidence": 0.85
            })
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return JSONResponse({
                "success": False,
                "error": "Failed to parse AI response as JSON",
                "confidence": 0.0
            })
            
    except Exception as e:
        return JSONResponse({
            "success": False,
            "error": str(e),
            "confidence": 0.0
        })

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "resume-parser"} 