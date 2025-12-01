# ML-Primary Resume Parser with AI Fallback (REVISED)

## Overview
Train a multi-task ML model on `datasets/master_resumes.jsonl` to extract key resume fields (skills, experience summary, education level) and predict quality scores. Use this model as the **primary** resume parser in `resume_parser.py`, with AI service (Gemini) as fallback only when ML confidence is low or parsing fails. Interview question generation and feedback generation remain AI-only (unchanged).

## Architecture Change
- **Resume Parsing**: ML model FIRST → AI service fallback → Dummy data fallback
- **Interview Generation**: AI service only (unchanged)
- **Feedback Generation**: AI service only (unchanged)

## Critical Fixes for Project Compatibility

### 1. Dependencies
- **ADD** `torch>=2.0.0` to `src/ai-services/requirements.txt`
- **ADD** `transformers>=4.30.0`, `peft>=0.4.0` (for Phase 4 LoRA, optional)

### 2. Model Storage Path
- **Standardize**: Store models in `src/ai-services/models/resume_parser_ml/`
- **Reason**: Relative to service file location, keeps models with service code
- **Update**: `_load_ml_parser()` should use:
  ```python
  model_path = os.path.join(os.path.dirname(__file__), "models", "resume_parser_ml", "model.pt")
  ```

### 3. Response Format Compatibility
- **CRITICAL**: ML parser must return same structure as AI:
  ```python
  {
    "success": True,
    "data": {
      "skills": [...],
      "experience": [...],
      "education": {...},
      "projects": [...],
      "certifications": [...],
      "summary": "...",
      "contact": {...}
    },
    "message": "Resume parsed successfully using ML model"
  }
  ```
- **Add metadata field** (optional): `"source": "ml"` vs `"source": "ai"` for debugging

### 4. Role Profile Integration
- **Maintain**: ML parser should still accept `jobTitle` parameter
- **Post-process**: After ML extraction, apply role profile alignment checks (like current code does)
- **Add**: `roleAlignment` field to ML output if `jobTitle` provided

### 5. Error Handling Flow
- **New flow**: ML parser → AI service → Fallback dummy data
- **Confidence threshold**: If ML confidence < 0.7, fallback to AI
- **Exception handling**: Wrap ML parsing in try-except, fallback to AI on any error

### 6. Backend Compatibility
- **No changes needed**: `aiService.ts` and `resumeController.ts` work as-is
- **Reason**: Python service maintains same API contract

## Phase 1: Dataset Preparation

### 1.1 Create Multi-Task Dataset Transformer
**File**: `src/ai-services/fine_tuning/prepare_resume_dataset.py`

- Read `datasets/master_resumes.jsonl` line by line
- For each resume JSON, extract:
  - **Text representation**: Flatten resume to text (summary + experience + skills + education)
  - **Key fields** (ground truth labels):
    - `skills`: List of skill names from `skills.technical.*`
    - `experience_summary`: Concatenated job titles and companies
    - `education_level`: Highest degree level (B.E, M.E, Ph.D, etc.)
    - `experience_years`: Calculated from `experience[].dates`
  - **Quality score** (0-100): Heuristic-based:
    - Experience depth (0-30): Years, progression, seniority
    - Skills richness (0-25): Count, diversity, proficiency levels
    - Achievement quality (0-25): Quantifiable results, impact
    - Education & certs (0-10): Degree level, certifications
    - Structure (0-10): Completeness of sections
- Output format per line:
  ```json
  {
    "text": "resume text...",
    "skills": ["Python", "React", "AWS"],
    "experience_summary": "Senior SWE at TechCorp, Developer at Startup",
    "education_level": "B.E",
    "experience_years": 5,
    "score": 75
  }
  ```
- Split 80/20 train/val, save as JSONL

### 1.2 Field Extraction Logic
- Parse structured JSON fields:
  - Skills: Flatten `skills.technical.programming_languages`, `frameworks`, `databases`, `cloud` arrays
  - Experience: Format as "Title at Company" from `experience[]`
  - Education: Extract `education[].degree.level`, take highest
  - Years: Parse `experience[].dates.start/end`, calculate total

## Phase 2: Multi-Task Model Training (Baseline)

### 2.1 Extend Training Script for Multi-Task Learning
**File**: `src/ai-services/fine_tuning/train_lora.py`

- Create `TinyResumeParser(torch.nn.Module)` with:
  - Shared encoder: Bag-of-words vectorization → linear layer
  - Task heads:
    - **Skills extraction**: Multi-label classification (sigmoid per skill in vocab)
    - **Experience summary**: Sequence generation (simplified: extract key phrases)
    - **Education level**: Classification (B.E, M.E, Ph.D, etc.)
    - **Quality score**: Regression (single value 0-100)
- Loss function: Weighted combination:
  - `loss = 0.3 * skills_loss + 0.2 * experience_loss + 0.2 * education_loss + 0.3 * score_loss`
- Training: 10 epochs, lr=3e-4, batch_size=32
- Save to `src/ai-services/models/resume_parser_ml/` with vocab, label maps, metadata

### 2.2 Simplified Approach (Initial)
For MVP, start with **skills extraction + score prediction** only:
- Skills: Multi-label binary classification (top 100 skills from dataset)
- Score: Regression
- Experience/Education: Extract via simple keyword matching (not ML)
- Can expand to full multi-task later

## Phase 3: ML-First Integration in Resume Parser

### 3.1 Add ML Model Loader
**File**: `src/ai-services/resume_parser.py`

- Add `_load_ml_parser()` function:
  ```python
  def _load_ml_parser():
      model_path = os.path.join(os.path.dirname(__file__), "models", "resume_parser_ml", "model.pt")
      if os.path.exists(model_path):
          checkpoint = torch.load(model_path, map_location='cpu')
          # Load model, vocab, skill_labels, etc.
          return parser_fn, confidence_fn
      return None, None
  ```

### 3.2 ML Parsing Function
- Create `_parse_resume_ml(text: str, parser_fn, job_title: str | None = None) -> dict`:
  - Vectorize text
  - Run through model to get:
    - `skills`: Predicted skill list
    - `score`: Quality score (0-100)
    - `experience_summary`: Keyword-based extraction
    - `education_level`: Keyword-based extraction
  - Return structured dict matching AI output format:
    ```python
    {
      "skills": [...],
      "experience": [...],
      "education": {...},
      "projects": [...],
      "certifications": [...],
      "summary": "...",
      "contact": {...}
    }
    ```
  - Compute confidence: Based on model output probabilities/uncertainty

### 3.3 Role Alignment Helper
- Create `_apply_role_alignment(parsed_data: dict, role_profile: dict, job_title: str) -> dict`:
  - Same logic as current code (lines 304-313)
  - Add `roleAlignment` field to parsed_data
  - Return updated dict

### 3.4 Update `/parse` Endpoint Logic
**File**: `src/ai-services/resume_parser.py` (modify `parse_resume` function)

**New flow**:
1. Extract text from uploaded file
2. **Try ML parser first**:
   - Load ML model (if available)
   - Call `_parse_resume_ml(text, parser_fn, jobTitle)`
   - Get confidence score
   - If confidence >= 0.7 and parsing successful:
     - Apply role profile alignment if `jobTitle` provided
     - Return ML results immediately with `success: True, data: {...}, message: "..."` format
     - Skip AI call (cost/speed benefit)
3. **Fallback to AI service**:
   - If ML not available, confidence < 0.7, or parsing fails
   - Use existing Gemini AI analysis (current implementation)
   - Return AI results in same format
4. **Final fallback**:
   - If AI also fails, use existing dummy data fallback
   - Return in same format

### 3.5 Backward Compatibility
- If ML model not found: Works exactly as before (AI-only)
- If ML parsing fails: Gracefully fallback to AI
- No breaking changes to API contract
- Response format always matches: `{success: bool, data: {...}, message: string}`

## Phase 4: LoRA Fine-Tuning (Future Upgrade)

### 4.1 Transformer-Based Parser
**File**: `src/ai-services/fine_tuning/train_lora_transformer.py`

- Base model: `distilbert-base-uncased`
- Multi-task heads:
  - Skills: Token classification (BIO tagging) or sequence classification
  - Score: Regression head on [CLS]
  - Education: Classification head
- LoRA: `r=8, alpha=16`
- Training: 3 epochs, batch_size=16, lr=2e-4
- Save to `src/ai-services/models/resume_parser_lora/`

### 4.2 Update Parser to Prefer LoRA
- Load order: LoRA → Tiny model → AI fallback

## Implementation Details

### Key Files to Create/Modify:
1. **NEW**: `src/ai-services/fine_tuning/prepare_resume_dataset.py` - Multi-task dataset transformation
2. **MODIFY**: `src/ai-services/fine_tuning/train_lora.py` - Add multi-task model (skills + score)
3. **MODIFY**: `src/ai-services/resume_parser.py` - ML-first parsing with AI fallback
4. **MODIFY**: `src/ai-services/requirements.txt` - Add torch dependency
5. **NEW**: `src/ai-services/fine_tuning/train_lora_transformer.py` - LoRA training (Phase 4)
6. **NEW**: `src/ai-services/models/resume_parser_ml/` directory - Store trained models

### Dependencies to Add:
- `torch>=2.0.0` (required for Phase 2)
- `transformers>=4.30.0`, `peft>=0.4.0` (for Phase 4 LoRA, optional)

### Testing Strategy:
- Validate field extraction heuristics on sample resumes
- Test ML parsing on various resume formats
- Verify fallback to AI when ML confidence is low
- Ensure backward compatibility (works without model)
- Test response format matches AI output exactly
- Verify role profile alignment works with ML output

### Backward Compatibility:
- All changes are optional/graceful fallbacks
- Resume parser works without trained model (current AI-only behavior)
- Model loading failures don't break the service
- Interview and feedback generation unchanged
- Backend code (`aiService.ts`, `resumeController.ts`) requires no changes

## Updated Code Structure

### Example: Updated `/parse` Endpoint

```python
@app.post("/parse")
async def parse_resume(file: UploadFile = File(...), jobTitle: str | None = Form(default=None)):
    try:
        # Extract text
        text_content = await extract_text_from_file(file)
        
        if not text_content or len(text_content.strip()) < 50:
            return JSONResponse({
                "success": False,
                "error": "Resume content too short or empty.",
                "data": None
            })
        
        # Try ML parser first
        ml_parser, confidence_fn = _load_ml_parser()
        if ml_parser:
            try:
                ml_result = _parse_resume_ml(text_content, ml_parser, jobTitle)
                confidence = confidence_fn(ml_result)
                
                if confidence >= 0.7:  # Threshold
                    # Apply role profile alignment if jobTitle provided
                    if jobTitle:
                        role_profile = _load_role_profile(jobTitle)
                        if role_profile:
                            ml_result = _apply_role_alignment(ml_result, role_profile, jobTitle)
                    
                    return JSONResponse({
                        "success": True,
                        "data": ml_result,
                        "message": "Resume parsed successfully using ML model"
                    })
            except Exception as ml_error:
                print(f"ML parsing failed, falling back to AI: {ml_error}")
                # Continue to AI fallback
        
        # Fallback to AI service (existing code)
        role_profile = _load_role_profile(jobTitle)
        model = genai.GenerativeModel(model_name) if api_key else None
        # ... rest of existing AI code ...
        
    except Exception as e:
        # Final fallback to dummy data (existing code)
        # ...
```

## Summary of Critical Requirements

1. ✅ Add `torch>=2.0.0` to `requirements.txt`
2. ✅ Standardize model path to `src/ai-services/models/resume_parser_ml/`
3. ✅ Ensure ML parser returns same JSON structure as AI
4. ✅ Integrate role profile alignment into ML flow
5. ✅ Update error handling: ML → AI → Dummy fallback
6. ✅ Add confidence threshold (0.7) for ML acceptance
7. ✅ Maintain backward compatibility (works without model)
8. ✅ Response format: `{success: bool, data: {...}, message: string}`
9. ✅ No backend changes required




