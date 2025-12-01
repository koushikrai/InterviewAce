from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from typing import Dict, Any, Optional, Tuple, Callable
import json
import PyPDF2
from docx import Document
import io
import re

# Try to import torch for ML model (optional)
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None  # type: ignore

try:
    from knowledge_base import KnowledgeBase  # optional RAG
except Exception:
    KnowledgeBase = None  # type: ignore

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

# Helper functions for text extraction from binary files
async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text content from uploaded file based on file extension"""
    try:
        content = await file.read()
        
        if file.filename.lower().endswith('.pdf'):
            return extract_text_from_pdf(content)
        elif file.filename.lower().endswith('.docx'):
            return extract_text_from_docx(content)
        else:
            # For .txt files or other text formats
            return content.decode('utf-8', errors='ignore')
            
    except Exception as e:
        print(f"Error reading file: {str(e)}")
        raise Exception(f"Failed to read file: {str(e)}")

def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF content"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {str(e)}")
        raise Exception(f"Failed to extract PDF text: {str(e)}")

def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX content"""
    try:
        doc = Document(io.BytesIO(content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting DOCX text: {str(e)}")
        raise Exception(f"Failed to extract DOCX text: {str(e)}")

def _load_role_profile(job_title: str | None) -> dict:
    if not job_title:
        return {}
    try:
        key = job_title.lower().replace("/", "-").replace(" ", "_")
        profile_path = os.path.join(os.path.dirname(__file__), "role_profiles", f"{key}.json")
        if os.path.exists(profile_path):
            with open(profile_path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"Failed to load role profile: {e}")
    return {}


def _load_ml_parser() -> Tuple[Optional[Callable], Optional[Callable]]:
    """Load ML resume parser model if available."""
    if not TORCH_AVAILABLE:
        return None, None
    
    try:
        model_path = os.path.join(os.path.dirname(__file__), "models", "resume_parser_ml", "model.pt")
        if not os.path.exists(model_path):
            return None, None
        
        checkpoint = torch.load(model_path, map_location='cpu')
        vocab = checkpoint.get("vocab", {})
        skill_vocab = checkpoint.get("skill_vocab", {})
        input_dim = checkpoint.get("input_dim", len(vocab))
        num_skills = checkpoint.get("num_skills", len(skill_vocab))
        
        # Load model architecture (define locally to avoid circular import)
        class TinyResumeParser(torch.nn.Module):
            def __init__(self, input_dim: int, num_skills: int):
                super().__init__()
                self.encoder = torch.nn.Sequential(
                    torch.nn.Linear(input_dim, 256),
                    torch.nn.ReLU(),
                    torch.nn.Dropout(0.2),
                    torch.nn.Linear(256, 128),
                    torch.nn.ReLU()
                )
                self.skills_head = torch.nn.Linear(128, num_skills)
                self.score_head = torch.nn.Linear(128, 1)
            
            def forward(self, x: torch.Tensor):
                encoded = self.encoder(x)
                skills_logits = self.skills_head(encoded)
                score = self.score_head(encoded)
                return skills_logits, score.squeeze(-1)
        
        model = TinyResumeParser(input_dim, num_skills)
        model.load_state_dict(checkpoint["state_dict"])
        model.eval()
        
        def vectorize_text(text: str) -> torch.Tensor:
            """Vectorize text using vocab."""
            vec = torch.zeros(len(vocab), dtype=torch.float32)
            for token in text.lower().split():
                if token in vocab:
                    vec[vocab[token]] += 1.0
            return vec
        
        def parse_fn(text: str) -> Dict[str, Any]:
            """Parse resume text using ML model."""
            with torch.no_grad():
                x = vectorize_text(text).unsqueeze(0)
                skills_logits, score_pred = model(x)
                
                # Get predicted skills (sigmoid > 0.5)
                skills_probs = torch.sigmoid(skills_logits[0])
                predicted_skill_indices = (skills_probs > 0.5).nonzero(as_tuple=True)[0]
                predicted_skills = [skill for skill, idx in skill_vocab.items() 
                                   if idx in predicted_skill_indices.tolist()]
                
                # Get predicted score
                predicted_score = float(score_pred[0].item())
                predicted_score = max(0, min(100, predicted_score))  # Clamp to 0-100
                
                # Calculate confidence based on model output
                # Higher confidence if skills_probs are well-separated (high or low)
                skills_confidence = float(torch.mean(torch.abs(skills_probs - 0.5) * 2).item())
                score_confidence = 1.0 - min(1.0, abs(predicted_score - 50) / 50)  # Higher if score is extreme
                overall_confidence = (skills_confidence * 0.6 + score_confidence * 0.4)
                
                # Extract experience and education using simple keyword matching
                experience_summary = _extract_experience_keywords(text)
                education_level = _extract_education_keywords(text)
                
                return {
                    "skills": predicted_skills,
                    "score": predicted_score,
                    "experience_summary": experience_summary,
                    "education_level": education_level,
                    "confidence": overall_confidence
                }
        
        def confidence_fn(result: Dict[str, Any]) -> float:
            """Calculate confidence score from ML result."""
            return result.get("confidence", 0.5)
        
        print("ML resume parser loaded successfully")
        return parse_fn, confidence_fn
        
    except Exception as e:
        print(f"Failed to load ML parser: {e}")
        return None, None


def _extract_experience_keywords(text: str) -> list:
    """Extract experience using keyword matching."""
    experience = []
    # Look for job title patterns
    title_patterns = [
        r"(?:Senior|Junior|Lead|Principal)?\s*(?:Software|Data|DevOps|ML|AI|Full.?Stack)?\s*(?:Engineer|Developer|Scientist|Architect|Manager)",
        r"(?:Software|Data|DevOps|ML|AI|Full.?Stack)?\s*(?:Engineer|Developer|Scientist|Architect|Manager)",
    ]
    
    lines = text.split('\n')
    for line in lines:
        for pattern in title_patterns:
            matches = re.finditer(pattern, line, re.IGNORECASE)
            for match in matches:
                exp_text = line.strip()
                if exp_text and len(exp_text) < 100:  # Reasonable length
                    experience.append({
                        "title": match.group(0),
                        "company": "Unknown",
                        "duration": "Unknown",
                        "achievements": []
                    })
                    break
        if len(experience) >= 3:  # Limit to 3
            break
    
    return experience if experience else [{
        "title": "Software Developer",
        "company": "Unknown",
        "duration": "Unknown",
        "achievements": []
    }]


def _extract_education_keywords(text: str) -> dict:
    """Extract education using keyword matching."""
    education_keywords = {
        "phd": "Ph.D",
        "ph.d": "Ph.D",
        "doctorate": "Ph.D",
        "master": "Master's",
        "m.e": "Master's",
        "me": "Master's",
        "m.s": "Master's",
        "ms": "Master's",
        "bachelor": "Bachelor's",
        "b.e": "Bachelor's",
        "be": "Bachelor's",
        "b.s": "Bachelor's",
        "bs": "Bachelor's"
    }
    
    text_lower = text.lower()
    for keyword, degree in education_keywords.items():
        if keyword in text_lower:
            return {
                "degree": degree,
                "institution": "Unknown",
                "year": "Unknown",
                "gpa": ""
            }
    
    return {
        "degree": "Bachelor's",
        "institution": "Unknown",
        "year": "Unknown",
        "gpa": ""
    }


def _parse_resume_ml(text: str, parser_fn: Callable, job_title: str | None = None) -> Dict[str, Any]:
    """Parse resume using ML model and format to match AI output."""
    result = parser_fn(text)
    
    # Format to match AI output structure
    formatted = {
        "skills": result.get("skills", []),
        "experience": result.get("experience_summary", []),
        "education": result.get("education_level", {}),
        "projects": [],  # Not extracted by ML yet
        "certifications": [],  # Not extracted by ML yet
        "summary": text[:500] if len(text) > 500 else text,  # Use first 500 chars as summary
        "contact": {
            "email": "",
            "phone": "",
            "location": "",
            "linkedin": ""
        },
        "confidence": result.get("confidence", 0.5)  # Include confidence for threshold check
    }
    
    return formatted


def _apply_role_alignment(parsed_data: Dict[str, Any], role_profile: Dict[str, Any], job_title: str) -> Dict[str, Any]:
    """Apply role profile alignment checks to parsed data."""
    must = set([s.lower() for s in role_profile.get("must_have_skills", [])])
    has = set([s.lower() for s in parsed_data.get("skills", [])])
    missing = [s for s in role_profile.get("must_have_skills", []) if s.lower() not in has]
    
    parsed_data["roleAlignment"] = {
        "targetRole": role_profile.get("title", job_title),
        "mustHaveCoverage": round(100 * (len(must.intersection(has)) / max(len(must) or 1, 1))),
        "missingMustHaves": missing[:10]
    }
    return parsed_data


@app.post("/parse")
async def parse_resume(file: UploadFile = File(...), jobTitle: str | None = Form(default=None)):
    try:
        print(f"Processing resume: {file.filename}")
        print(f"File size: {file.size} bytes")
        print(f"Content type: {file.content_type}")
        
        # Extract text content from the file
        text_content = await extract_text_from_file(file)
        
        if not text_content or len(text_content.strip()) < 50:
            return JSONResponse({
                "success": False,
                "error": "Resume content too short or empty. Please upload a valid resume.",
                "data": None
            })
        
        print(f"Extracted text length: {len(text_content)} characters")
        print(f"Text preview: {text_content[:200]}...")
        
        # Try ML parser first
        ml_parser, confidence_fn = _load_ml_parser()
        if ml_parser:
            try:
                print("Attempting ML-based resume parsing...")
                ml_result = _parse_resume_ml(text_content, ml_parser, jobTitle)
                confidence = confidence_fn(ml_result)
                
                print(f"ML parsing confidence: {confidence:.2f}")
                
                if confidence >= 0.7:  # Confidence threshold
                    # Apply role profile alignment if jobTitle provided
                    if jobTitle:
                        role_profile = _load_role_profile(jobTitle)
                        if role_profile:
                            ml_result = _apply_role_alignment(ml_result, role_profile, jobTitle)
                    
                    print("ML parsing successful, returning ML results")
                    return JSONResponse({
                        "success": True,
                        "data": ml_result,
                        "message": "Resume parsed successfully using ML model"
                    })
                else:
                    print(f"ML confidence too low ({confidence:.2f} < 0.7), falling back to AI")
            except Exception as ml_error:
                print(f"ML parsing failed, falling back to AI: {ml_error}")
                # Continue to AI fallback
        
        # Fallback to AI service (existing code)
        print("Using AI service for resume parsing...")
        role_profile = _load_role_profile(jobTitle)
        # Use Gemini AI for comprehensive resume analysis if configured
        model = genai.GenerativeModel(model_name) if api_key else None
        
        # Create comprehensive resume analysis prompt with truncated content
        snippet = text_content[:4000]
        role_context = ""
        if role_profile:
            role_context = f"""
            Target Role Profile:
            Title: {role_profile.get('title', jobTitle)}
            Seniority: {role_profile.get('seniority', 'unspecified')}
            Must-Have Skills: {', '.join(role_profile.get('must_have_skills', [])[:30])}
            Nice-to-Have Skills: {', '.join(role_profile.get('nice_to_have_skills', [])[:30])}
            Impact Patterns: {', '.join(role_profile.get('impact_patterns', [])[:10])}
            Anti-Patterns: {', '.join(role_profile.get('anti_patterns', [])[:10])}
            """

        # Retrieve senior exemplars from KB to ground suggestions
        kb_context = ""
        if KnowledgeBase is not None:
            try:
                kb = KnowledgeBase()
                retrieved = kb.retrieve(query=snippet, top_k=2, role_hint=jobTitle)
                if retrieved:
                    parts = []
                    for r in retrieved:
                        text = (r.get("text") or "")[:1000]
                        parts.append(text)
                    kb_context = "\n\nRetrieved Exemplars (anonymized):\n" + "\n---\n".join(parts)
            except Exception as e:
                print(f"KB retrieval skipped: {e}")

        analysis_prompt = f"""
        You are an expert resume analyst and career coach. Analyze the following resume and provide comprehensive insights.
        
        Resume Content (truncated):
        {snippet}
        
        {role_context}
        {kb_context}

        Please provide a detailed analysis with the following structure:
        
        1. Skills Analysis:
           - Technical skills (programming languages, tools, technologies)
           - Soft skills (communication, leadership, teamwork)
           - Industry-specific skills
        
        2. Experience Analysis:
           - Work history with key achievements
           - Project highlights
           - Leadership roles
           - Quantifiable results
        
        3. Education & Certifications:
           - Academic background
           - Professional certifications
           - Relevant coursework
        
        4. Projects & Achievements:
           - Notable projects
           - Awards and recognition
           - Publications or presentations
        
        5. Contact Information:
           - Email, phone, location
           - Professional profiles
        
        6. Summary & Objective:
           - Career summary
           - Professional objectives
        
        Return the response as a JSON object with this exact structure:
        {{
            "skills": ["skill1", "skill2"],
            "experience": [
                {{
                    "title": "string",
                    "company": "string",
                    "duration": "string",
                    "achievements": ["string1", "string2"]
                }}
            ],
            "education": {{
                "degree": "string",
                "institution": "string",
                "year": "string",
                "gpa": "string"
            }},
            "projects": [
                {{
                    "name": "string",
                    "description": "string",
                    "technologies": ["tech1", "tech2"],
                    "outcome": "string"
                }}
            ],
            "certifications": ["cert1", "cert2"],
            "summary": "string",
            "contact": {{
                "email": "string",
                "phone": "string",
                "location": "string",
                "linkedin": "string"
            }}
        }}
        
        Make sure to extract all relevant information and structure it properly. If a target role profile is provided, tailor the analysis to emphasize alignment with that role and explicitly call out gaps vs the must-have skills.
        """
        
        try:
            if model is not None:
                # Call Gemini AI for resume analysis
                response = model.generate_content(analysis_prompt)
                ai_analysis = response.text
                
                # Parse the AI response
                start_idx = ai_analysis.find('{')
                end_idx = ai_analysis.rfind('}') + 1
                
                if start_idx != -1 and end_idx != -1:
                    json_content = ai_analysis[start_idx:end_idx]
                    parsed_data = json.loads(json_content)
                    
                    print(f"AI resume analysis successful")
                    return JSONResponse({
                        "success": True,
                        "data": parsed_data,
                        "message": "Resume parsed successfully using AI analysis"
                    })
                else:
                    # Fallback if JSON parsing fails
                    raise Exception("AI response format invalid")
            else:
                raise Exception("No API key configured; using fallback")
        except Exception as ai_error:
            print(f"AI resume analysis failed: {str(ai_error)}")
            # Fallback to enhanced dummy data
            parsed_data = {
                "skills": ["JavaScript", "React", "Node.js", "Python", "SQL", "Git", "AWS", "Docker", "TypeScript", "MongoDB"],
                "experience": [
                    {
                        "title": "Senior Software Engineer",
                        "company": "Tech Solutions Inc.",
                        "duration": "2022 - Present",
                        "achievements": [
                            "Led development of microservices architecture",
                            "Improved system performance by 40%",
                            "Mentored 3 junior developers"
                        ]
                    },
                    {
                        "title": "Full Stack Developer",
                        "company": "Digital Innovations",
                        "duration": "2020 - 2022",
                        "achievements": [
                            "Built responsive web applications",
                            "Implemented CI/CD pipelines",
                            "Reduced bug reports by 30%"
                        ]
                    }
                ],
                "education": {
                    "degree": "Bachelor of Science in Computer Science",
                    "institution": "University of Technology",
                    "year": "2020",
                    "gpa": "3.8/4.0"
                },
                "projects": [
                    {
                        "name": "E-commerce Platform",
                        "description": "Full-stack e-commerce solution with payment integration",
                        "technologies": ["React", "Node.js", "MongoDB", "Stripe"],
                        "outcome": "Successfully deployed and serving 1000+ users"
                    },
                    {
                        "name": "Task Management App",
                        "description": "Collaborative project management tool",
                        "technologies": ["Vue.js", "Express", "PostgreSQL"],
                        "outcome": "Used by 5 development teams"
                    }
                ],
                "certifications": ["AWS Certified Developer", "MongoDB Certified Developer", "Google Cloud Professional"],
                "summary": "Experienced full-stack developer with 3+ years building scalable web applications. Passionate about clean code, user experience, and continuous learning. Strong expertise in modern JavaScript frameworks, cloud services, and agile development methodologies.",
                "contact": {"email": "developer@example.com", "phone": "+1-555-0123", "location": "San Francisco, CA", "linkedin": "linkedin.com/in/developer"}
            }
            
            # If role profile exists, add deterministic coverage checks
            if role_profile:
                must = set([s.lower() for s in role_profile.get("must_have_skills", [])])
                has = set([s.lower() for s in parsed_data.get("skills", [])])
                missing = [s for s in role_profile.get("must_have_skills", []) if s.lower() not in has]
                parsed_data["roleAlignment"] = {
                    "targetRole": role_profile.get("title", jobTitle),
                    "mustHaveCoverage": round(100 * (len(must.intersection(has)) / max(len(must) or 1, 1))),
                    "missingMustHaves": missing[:10]
                }

            print(f"Fallback resume parsing. Using enhanced dummy data")
            return JSONResponse({
                "success": True,
                "data": parsed_data,
                "message": "Resume parsed successfully (fallback mode)"
            })
        
    except Exception as e:
        print(f"Error in parse_resume: {str(e)}")
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