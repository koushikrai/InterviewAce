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

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text content from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text content from DOCX file"""
    try:
        doc = Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        return f"Error extracting DOCX text: {str(e)}"

def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract text content from various file types"""
    file_extension = filename.lower().split('.')[-1]
    
    if file_extension == 'pdf':
        return extract_text_from_pdf(file_content)
    elif file_extension in ['docx', 'doc']:
        return extract_text_from_docx(file_content)
    else:
        # Try to decode as text for other file types
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            return f"Unsupported file type: {file_extension}"

@app.post("/parse")
async def parse_resume(file: UploadFile = File(...)):
    try:
        print(f"Processing file: {file.filename}, size: {len(await file.read())} bytes")
        # Reset file position
        await file.seek(0)
        
        # Read file content
        content = await file.read()
        
        # Extract text content based on file type
        text_content = extract_text_from_file(content, file.filename)
        
        print(f"Extracted text length: {len(text_content)} characters")
        print(f"Text preview: {text_content[:200]}...")
        
        # Check if text extraction was successful
        if text_content.startswith("Error extracting") or text_content.startswith("Unsupported file type"):
            print(f"Text extraction failed: {text_content}")
            return JSONResponse({
                "success": False,
                "error": text_content,
                "confidence": 0.0
            })
        
        # For now, return a simple response without calling Gemini (to test communication)
        print("Returning simple response for testing")
        return JSONResponse({
            "success": True,
            "data": {
                "personalInfo": {"name": "Test User", "email": "test@example.com"},
                "skills": ["Python", "JavaScript", "React"],
                "experience": [],
                "education": [],
                "projects": []
            },
            "confidence": 0.85
        })
        
    except Exception as e:
        print(f"Error in parse_resume: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e),
            "confidence": 0.0
        })

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "resume-parser"}

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify communication"""
    return {"message": "Python service is working!", "timestamp": "2025-08-15"} 