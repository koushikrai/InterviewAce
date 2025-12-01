"""
Verification script to check if ML resume parser integration is working correctly.
"""
import os
import sys
import json
from pathlib import Path

def check_file_exists(filepath: str, description: str) -> tuple[bool, str]:
    """Check if a file exists."""
    exists = os.path.exists(filepath)
    status = "✓" if exists else "✗"
    return exists, f"{status} {description}: {filepath}"

def check_directory_exists(dirpath: str, description: str) -> tuple[bool, str]:
    """Check if a directory exists."""
    exists = os.path.isdir(dirpath)
    status = "✓" if exists else "✗ (will be created when model is trained)"
    return exists, f"{status} {description}: {dirpath}"

def check_imports() -> list[tuple[bool, str]]:
    """Check if required imports work."""
    results = []
    
    # Check torch
    try:
        import torch
        results.append((True, "✓ torch is available"))
    except ImportError:
        results.append((False, "✗ torch is not installed (run: pip install torch>=2.0.0)"))
    
    # Check resume_parser imports
    try:
        sys.path.insert(0, os.path.dirname(__file__))
        from resume_parser import _load_ml_parser, _parse_resume_ml, _apply_role_alignment
        results.append((True, "✓ resume_parser functions can be imported"))
    except Exception as e:
        results.append((False, f"✗ resume_parser import failed: {e}"))
    
    return results

def check_code_structure() -> list[tuple[bool, str]]:
    """Check code structure and integration points."""
    results = []
    base_dir = Path(__file__).parent
    
    # Check required files
    files_to_check = [
        ("resume_parser.py", "Main resume parser service"),
        ("fine_tuning/prepare_resume_dataset.py", "Dataset preparation script"),
        ("fine_tuning/train_lora.py", "Training script"),
        ("requirements.txt", "Dependencies file"),
    ]
    
    for filepath, description in files_to_check:
        full_path = base_dir / filepath
        exists, msg = check_file_exists(str(full_path), description)
        results.append((exists, msg))
    
    # Check models directory
    models_dir = base_dir / "models" / "resume_parser_ml"
    exists, msg = check_directory_exists(str(models_dir), "Models directory")
    results.append((exists, msg))
    
    # Check if model exists
    model_path = models_dir / "model.pt"
    if model_path.exists():
        results.append((True, "✓ Trained model found (ML parser will be used)"))
    else:
        results.append((False, "✗ No trained model found (will fallback to AI)"))
    
    return results

def check_requirements() -> list[tuple[bool, str]]:
    """Check if requirements.txt has torch."""
    results = []
    base_dir = Path(__file__).parent
    req_file = base_dir / "requirements.txt"
    
    if req_file.exists():
        with open(req_file, 'r') as f:
            content = f.read()
            if 'torch' in content:
                results.append((True, "✓ torch is in requirements.txt"))
            else:
                results.append((False, "✗ torch is missing from requirements.txt"))
    else:
        results.append((False, "✗ requirements.txt not found"))
    
    return results

def check_integration_logic() -> list[tuple[bool, str]]:
    """Check if integration logic is correct."""
    results = []
    base_dir = Path(__file__).parent
    parser_file = base_dir / "resume_parser.py"
    
    if parser_file.exists():
        with open(parser_file, 'r') as f:
            content = f.read()
            
            # Check for ML-first logic
            if '_load_ml_parser' in content:
                results.append((True, "✓ _load_ml_parser function exists"))
            else:
                results.append((False, "✗ _load_ml_parser function missing"))
            
            if '_parse_resume_ml' in content:
                results.append((True, "✓ _parse_resume_ml function exists"))
            else:
                results.append((False, "✗ _parse_resume_ml function missing"))
            
            if 'confidence >= 0.7' in content or 'confidence >= 0.7' in content:
                results.append((True, "✓ Confidence threshold check exists"))
            else:
                results.append((False, "✗ Confidence threshold check missing"))
            
            if 'falling back to AI' in content.lower():
                results.append((True, "✓ AI fallback logic exists"))
            else:
                results.append((False, "✗ AI fallback logic missing"))
            
            if 'TORCH_AVAILABLE' in content:
                results.append((True, "✓ Torch availability check exists"))
            else:
                results.append((False, "✗ Torch availability check missing"))
    
    return results

def check_response_format() -> list[tuple[bool, str]]:
    """Check if response format matches backend expectations."""
    results = []
    base_dir = Path(__file__).parent
    parser_file = base_dir / "resume_parser.py"
    
    if parser_file.exists():
        with open(parser_file, 'r') as f:
            content = f.read()
            
            # Check for correct response structure
            if '"success": True' in content and '"data":' in content:
                results.append((True, "✓ Response format includes success and data fields"))
            else:
                results.append((False, "✗ Response format may be incorrect"))
            
            # Check for required fields in ML output
            required_fields = ['skills', 'experience', 'education', 'projects', 'certifications']
            all_present = all(field in content for field in required_fields)
            if all_present:
                results.append((True, "✓ ML output includes all required fields"))
            else:
                missing = [f for f in required_fields if f not in content]
                results.append((False, f"✗ Missing fields in ML output: {missing}"))
    
    return results

def main():
    """Run all verification checks."""
    print("=" * 60)
    print("ML Resume Parser Integration Verification")
    print("=" * 60)
    print()
    
    all_checks = []
    
    print("1. File Structure:")
    print("-" * 60)
    all_checks.extend(check_code_structure())
    for exists, msg in check_code_structure():
        print(f"  {msg}")
    print()
    
    print("2. Dependencies:")
    print("-" * 60)
    all_checks.extend(check_requirements())
    for exists, msg in check_requirements():
        print(f"  {msg}")
    print()
    
    print("3. Imports:")
    print("-" * 60)
    all_checks.extend(check_imports())
    for exists, msg in check_imports():
        print(f"  {msg}")
    print()
    
    print("4. Integration Logic:")
    print("-" * 60)
    all_checks.extend(check_integration_logic())
    for exists, msg in check_integration_logic():
        print(f"  {msg}")
    print()
    
    print("5. Response Format:")
    print("-" * 60)
    all_checks.extend(check_response_format())
    for exists, msg in check_response_format():
        print(f"  {msg}")
    print()
    
    # Summary
    print("=" * 60)
    passed = sum(1 for exists, _ in all_checks if exists)
    total = len(all_checks)
    print(f"Summary: {passed}/{total} checks passed")
    print("=" * 60)
    
    if passed == total:
        print("\n✓ All checks passed! Integration looks good.")
        print("\nNote: If model.pt doesn't exist, train the model first:")
        print("  cd src/ai-services/fine_tuning")
        print("  python prepare_resume_dataset.py --input ../../../Datasets/master_resumes.jsonl ...")
        print("  python train_lora.py --task resume_parsing ...")
    else:
        print("\n✗ Some checks failed. Please review the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())




