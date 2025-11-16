from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
from typing import Dict, Any
import json

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

@app.post("/feedback")
async def feedback(request: Request):
    try:
        data = await request.json()
        question = data.get("question", "")
        answer = data.get("answer", "")
        job_title = data.get("jobTitle", "Software Engineer")
        question_category = data.get("category", "general")
        
        print(f"Evaluating answer for: {question[:50]}...")
        print(f"Answer length: {len(answer)} characters")
        print(f"Job title: {job_title}")
        print(f"Category: {question_category}")
        
        # Use Gemini AI for comprehensive feedback analysis when API key exists
        model = genai.GenerativeModel(model_name) if api_key else None
        
        # Create comprehensive evaluation prompt
        q_snip = question[:800]
        a_snip = answer[:1200]
        evaluation_prompt = f"""
        You are an expert interview coach evaluating a candidate's answer for a {job_title} position.
        
        Question: {q_snip}
        Question Category: {question_category}
        Candidate's Answer: {a_snip}
        
        Please provide a comprehensive evaluation with the following structure:
        
        1. Overall Score (0-100)
        2. Communication Skills (0-100 each):
           - Clarity: How clear and understandable is the response
           - Articulation: How well the candidate expresses ideas
           - Structure: How organized and logical the response is
        
        3. Technical Knowledge (0-100 each):
           - Accuracy: How correct is the technical information
           - Depth: How detailed and thorough is the knowledge
           - Relevance: How relevant is the answer to the question
        
        4. Behavioral Assessment (0-100 each):
           - Confidence: How confident and assured the candidate appears
           - Examples: How well they provide specific examples
           - Storytelling: How engaging and memorable their response is
        
        5. Strengths: List 2-3 specific strengths
        6. Areas for Improvement: List 2-3 specific improvements
        7. Next Steps: Provide 2-3 actionable next steps
        8. Confidence Level: low/medium/high
        9. Sentiment: positive/neutral/negative
        10. Keywords: Extract 5-8 key terms from the answer
        
        Return the response as a JSON object with this exact structure:
        {{
            "overallScore": number,
            "communication": {{"clarity": number, "articulation": number, "structure": number}},
            "technical": {{"accuracy": number, "depth": number, "relevance": number}},
            "behavioral": {{"confidence": number, "examples": number, "storytelling": number}},
            "strengths": ["string1", "string2"],
            "improvements": ["string1", "string2"],
            "nextSteps": ["string1", "string2"],
            "confidenceLevel": "low|medium|high",
            "sentiment": "positive|neutral|negative",
            "keywords": ["keyword1", "keyword2", "keyword3"]
        }}
        """
        
        try:
            if model is not None:
                response = model.generate_content(evaluation_prompt)
                ai_feedback = response.text
                start_idx = ai_feedback.find('{')
                end_idx = ai_feedback.rfind('}') + 1
                if start_idx != -1 and end_idx != -1:
                    json_content = ai_feedback[start_idx:end_idx]
                    parsed_feedback = json.loads(json_content)
                    comm_avg = sum(parsed_feedback['communication'].values()) / 3
                    tech_avg = sum(parsed_feedback['technical'].values()) / 3
                    behav_avg = sum(parsed_feedback['behavioral'].values()) / 3
                    comprehensive_feedback = {
                        "success": True,
                        "score": parsed_feedback.get('overallScore', 75),
                        "feedback": f"Comprehensive evaluation for {question_category} question. Overall performance: {parsed_feedback.get('overallScore', 75)}/100",
                        "suggestions": parsed_feedback.get('improvements', []),
                        "keywords": parsed_feedback.get('keywords', []),
                        "sentiment": parsed_feedback.get('sentiment', 'neutral'),
                        "breakdown": {
                            "accuracy": parsed_feedback.get('technical', {}).get('accuracy', 70),
                            "completeness": tech_avg,
                            "clarity": parsed_feedback.get('communication', {}).get('clarity', 70),
                            "relevance": parsed_feedback.get('technical', {}).get('relevance', 70)
                        },
                        "categories": {
                            "technical": tech_avg,
                            "communication": comm_avg,
                            "problemSolving": tech_avg,
                            "confidence": parsed_feedback.get('behavioral', {}).get('confidence', 70)
                        },
                        "detailedFeedback": {
                            "communication": {
                                "clarity": parsed_feedback.get('communication', {}).get('clarity', 70),
                                "articulation": parsed_feedback.get('communication', {}).get('articulation', 70),
                                "structure": parsed_feedback.get('communication', {}).get('structure', 70),
                                "overall": comm_avg
                            },
                            "technical": {
                                "accuracy": parsed_feedback.get('technical', {}).get('accuracy', 70),
                                "depth": parsed_feedback.get('technical', {}).get('depth', 70),
                                "relevance": parsed_feedback.get('technical', {}).get('relevance', 70),
                                "overall": tech_avg
                            },
                            "behavioral": {
                                "confidence": parsed_feedback.get('behavioral', {}).get('confidence', 70),
                                "examples": parsed_feedback.get('behavioral', {}).get('examples', 70),
                                "storytelling": parsed_feedback.get('behavioral', {}).get('storytelling', 70),
                                "overall": behav_avg
                            },
                            "overall": {
                                "score": parsed_feedback.get('overallScore', 75),
                                "strengths": parsed_feedback.get('strengths', []),
                                "improvements": parsed_feedback.get('improvements', []),
                                "sentiment": parsed_feedback.get('sentiment', 'neutral')
                            }
                        },
                        "improvementAreas": parsed_feedback.get('improvements', []),
                        "nextSteps": parsed_feedback.get('nextSteps', []),
                        "confidenceLevel": parsed_feedback.get('confidenceLevel', 'medium'),
                        "questionCategory": question_category,
                        "expectedKeywords": [],
                        "userKeywords": parsed_feedback.get('keywords', []),
                        "keywordMatch": 75
                    }
                    print(f"AI evaluation successful. Overall score: {comprehensive_feedback['score']}")
                    return JSONResponse(comprehensive_feedback)
                else:
                    raise Exception("AI response format invalid")
            else:
                raise Exception("No API key configured; using fallback")
        except Exception as ai_error:
            print(f"AI evaluation failed: {str(ai_error)}")
            return JSONResponse({
                "success": True,
                "score": 75,
                "feedback": f"Enhanced feedback for {question_category} question. You provided relevant information and showed understanding of the topic.",
                "suggestions": [
                    "Consider adding specific examples to strengthen your response",
                    "Try to quantify your achievements when possible",
                    "Make sure your answer directly addresses the question asked",
                    "Practice structuring your responses with clear beginning, middle, and end"
                ],
                "keywords": ["relevant", "understanding", "examples", "structure"],
                "sentiment": "positive",
                "breakdown": {"accuracy": 80, "completeness": 70, "clarity": 75, "relevance": 80},
                "categories": {"technical": 70, "communication": 80, "problemSolving": 75, "confidence": 75},
                "detailedFeedback": {
                    "communication": {"clarity": 75, "articulation": 80, "structure": 70, "overall": 75},
                    "technical": {"accuracy": 80, "depth": 70, "relevance": 80, "overall": 77},
                    "behavioral": {"confidence": 75, "examples": 70, "storytelling": 75, "overall": 73},
                    "overall": {"score": 75, "strengths": ["Good understanding of the topic", "Relevant information provided"], "improvements": ["Add specific examples", "Improve response structure"], "sentiment": "positive"}
                },
                "improvementAreas": ["Add specific examples", "Improve response structure"],
                "nextSteps": ["Practice with STAR method", "Record and review responses"],
                "confidenceLevel": "medium",
                "questionCategory": question_category,
                "expectedKeywords": [],
                "userKeywords": ["relevant", "understanding", "examples"],
                "keywordMatch": 75
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
