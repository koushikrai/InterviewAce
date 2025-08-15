from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from typing import Dict, Any
import json
import PyPDF2
from docx import Document
import io

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

async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text content from uploaded file"""
    try:
        # Read file content
        content = await file.read()
        
        # Determine file type and extract text accordingly
        if file.filename.lower().endswith('.pdf'):
            return extract_text_from_pdf(content)
        elif file.filename.lower().endswith(('.docx', '.doc')):
            return extract_text_from_docx(content)
        else:
            return f"Unsupported file type: {file.filename}"
            
    except Exception as e:
        print(f"Error extracting text from file: {str(e)}")
        return f"Error extracting text: {str(e)}"

def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF content"""
    try:
        import io
        from PyPDF2 import PdfReader
        
        pdf_file = io.BytesIO(content)
        pdf_reader = PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {str(e)}")
        return f"Error extracting PDF text: {str(e)}"

def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX content"""
    try:
        import io
        from docx import Document
        
        docx_file = io.BytesIO(content)
        doc = Document(docx_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        return text.strip()
    except Exception as e:
        print(f"Error extracting DOCX text: {str(e)}")
        return f"Error extracting DOCX text: {str(e)}"

@app.post("/parse")
async def parse_resume(file: UploadFile):
    try:
        print(f"Processing file: {file.filename}")
        
        # Extract text from the uploaded file
        text_content = await extract_text_from_file(file)
        
        if not text_content:
            return JSONResponse({
                "success": False,
                "error": "Failed to extract text from file",
                "data": None
            })
        
        print(f"Extracted text length: {len(text_content)} characters")
        
        # For now, return structured dummy data that matches what the backend expects
        # This will be replaced with actual Gemini AI analysis later
        parsed_data = {
            "skills": [
                "JavaScript", "React", "Node.js", "Python", "SQL", "Git", "AWS", "Docker"
            ],
            "experience": [
                {
                    "title": "Full Stack Developer",
                    "company": "Tech Corp",
                    "duration": "2 years",
                    "description": "Developed web applications using React and Node.js"
                },
                {
                    "title": "Frontend Developer",
                    "company": "Startup Inc",
                    "duration": "1 year",
                    "description": "Built responsive UI components and improved user experience"
                }
            ],
            "education": {
                "degree": "Bachelor of Science in Computer Science",
                "institution": "University of Technology",
                "graduationYear": "2022"
            },
            "projects": [
                {
                    "name": "E-commerce Platform",
                    "description": "Full-stack application with React frontend and Node.js backend",
                    "technologies": ["React", "Node.js", "MongoDB", "Express"]
                },
                {
                    "name": "Task Management App",
                    "description": "Real-time collaborative task management with WebSocket support",
                    "technologies": ["React", "Socket.io", "Node.js", "PostgreSQL"]
                }
            ],
            "certifications": [
                "AWS Certified Developer",
                "React Developer Certification",
                "Node.js Best Practices"
            ],
            "summary": "Experienced full-stack developer with expertise in modern web technologies and cloud platforms.",
            "contact": {
                "email": "developer@example.com",
                "phone": "+1-555-0123",
                "location": "San Francisco, CA"
            }
        }
        
        print(f"Returning parsed data with {len(parsed_data['skills'])} skills")
        
        return JSONResponse({
            "success": True,
            "data": parsed_data,
            "message": "Resume parsed successfully"
        })
        
    except Exception as e:
        print(f"Error parsing resume: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "data": None
        })

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "resume-parser"}

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify communication"""
    return {"message": "Python service is working!", "timestamp": "2025-08-15"} 