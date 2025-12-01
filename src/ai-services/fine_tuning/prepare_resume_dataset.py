"""
Prepare training dataset from master_resumes.jsonl for multi-task resume parsing.
Extracts skills, experience summary, education level, experience years, and computes quality scores.
"""
import argparse
import json
import os
from typing import Dict, Any, List
from datetime import datetime
import re


def extract_skills(resume: Dict[str, Any]) -> List[str]:
    """Extract all technical skills from resume."""
    skills = []
    technical = resume.get("skills", {}).get("technical", {})
    
    # Programming languages
    for lang in technical.get("programming_languages", []):
        name = lang.get("name", "").strip()
        if name and name.lower() not in ["unknown", "not provided", ""]:
            skills.append(name)
    
    # Frameworks
    for fw in technical.get("frameworks", []):
        name = fw.get("name", "").strip()
        if name and name.lower() not in ["unknown", "not provided", ""]:
            skills.append(name)
    
    # Databases
    for db in technical.get("databases", []):
        name = db.get("name", "").strip()
        if name and name.lower() not in ["unknown", "not provided", ""]:
            skills.append(name)
    
    # Cloud
    for cloud in technical.get("cloud", []):
        name = cloud.get("name", "").strip()
        if name and name.lower() not in ["unknown", "not provided", ""]:
            skills.append(name)
    
    # Other technical skills (project_management, automation, software_tools, etc.)
    for category in ["project_management", "automation", "software_tools"]:
        for item in technical.get(category, []):
            name = item.get("name", "").strip()
            if name and name.lower() not in ["unknown", "not provided", ""]:
                skills.append(name)
    
    return list(set(skills))  # Remove duplicates


def extract_experience_summary(resume: Dict[str, Any]) -> str:
    """Extract experience summary as 'Title at Company' format."""
    experiences = resume.get("experience", [])
    summary_parts = []
    
    for exp in experiences:
        title = exp.get("title", "").strip()
        company = exp.get("company", "").strip()
        if title and company and title.lower() not in ["unknown", "not provided"]:
            summary_parts.append(f"{title} at {company}")
    
    return ", ".join(summary_parts[:5])  # Limit to top 5


def extract_education_level(resume: Dict[str, Any]) -> str:
    """Extract highest education level."""
    education_list = resume.get("education", [])
    if not education_list:
        return "Unknown"
    
    # Priority order: Ph.D > M.E/M.S > B.E/B.S > Diploma > Others
    degree_levels = []
    for edu in education_list:
        degree = edu.get("degree", {})
        level = degree.get("level", "").strip()
        if level and level.lower() not in ["unknown", "not provided", ""]:
            degree_levels.append(level)
    
    if not degree_levels:
        return "Unknown"
    
    # Return highest level found
    priority = {"phd": 5, "ph.d": 5, "doctorate": 5, "me": 4, "m.e": 4, "ms": 4, "m.s": 4, 
                "master": 4, "be": 3, "b.e": 3, "bs": 3, "b.s": 3, "bachelor": 3,
                "diploma": 2, "hsc": 1, "ssc": 1}
    
    highest = max(degree_levels, key=lambda d: priority.get(d.lower(), 0))
    return highest


def calculate_experience_years(resume: Dict[str, Any]) -> float:
    """Calculate total years of experience from dates."""
    experiences = resume.get("experience", [])
    total_years = 0.0
    
    for exp in experiences:
        dates = exp.get("dates", {})
        start = dates.get("start", "")
        end = dates.get("end", "")
        duration = dates.get("duration", "")
        
        # Try to parse duration string
        if duration and duration.lower() not in ["unknown", "not provided", "present"]:
            # Extract years from duration (e.g., "2 years", "1 year 6 months")
            year_match = re.search(r'(\d+)\s*year', duration.lower())
            month_match = re.search(r'(\d+)\s*month', duration.lower())
            
            if year_match:
                total_years += float(year_match.group(1))
            if month_match:
                total_years += float(month_match.group(1)) / 12.0
        
        # Try to parse start/end dates
        elif start and end and start.lower() not in ["unknown", "not provided"]:
            try:
                # Format: "2017-08" or "2017-08-01"
                start_date = datetime.strptime(start[:7], "%Y-%m")
                if end.lower() in ["present", "current", ""]:
                    end_date = datetime.now()
                else:
                    end_date = datetime.strptime(end[:7], "%Y-%m")
                
                delta = end_date - start_date
                total_years += delta.days / 365.25
            except (ValueError, TypeError):
                pass
    
    return round(total_years, 1)


def calculate_quality_score(resume: Dict[str, Any], skills: List[str], 
                           experience_years: float, education_level: str) -> int:
    """Calculate quality score (0-100) based on heuristics."""
    score = 0
    
    # Experience depth (0-30 points)
    if experience_years >= 10:
        score += 30
    elif experience_years >= 7:
        score += 25
    elif experience_years >= 5:
        score += 20
    elif experience_years >= 3:
        score += 15
    elif experience_years >= 1:
        score += 10
    elif experience_years > 0:
        score += 5
    
    # Skills richness (0-25 points)
    skill_count = len(skills)
    if skill_count >= 15:
        score += 25
    elif skill_count >= 10:
        score += 20
    elif skill_count >= 7:
        score += 15
    elif skill_count >= 5:
        score += 10
    elif skill_count >= 3:
        score += 5
    
    # Achievement quality (0-25 points)
    experiences = resume.get("experience", [])
    projects = resume.get("projects", [])
    
    # Check for quantifiable results in responsibilities
    has_quantifiable = False
    for exp in experiences:
        responsibilities = exp.get("responsibilities", [])
        for resp in responsibilities:
            if re.search(r'\d+%|\d+\+|\d+\s*(users|clients|projects|years)', resp.lower()):
                has_quantifiable = True
                break
    
    # Check project impact
    has_project_impact = False
    for proj in projects:
        impact = proj.get("impact", "")
        if impact and impact.lower() not in ["unknown", "not provided", ""]:
            has_project_impact = True
    
    if has_quantifiable and has_project_impact:
        score += 25
    elif has_quantifiable or has_project_impact:
        score += 15
    elif len(experiences) >= 2:
        score += 10
    elif len(experiences) >= 1:
        score += 5
    
    # Education & certifications (0-10 points)
    education_priority = {"phd": 10, "ph.d": 10, "doctorate": 10, "me": 8, "m.e": 8, 
                         "ms": 8, "m.s": 8, "master": 8, "be": 6, "b.e": 6, 
                         "bs": 6, "b.s": 6, "bachelor": 6, "diploma": 3}
    
    edu_score = education_priority.get(education_level.lower(), 0)
    score += edu_score
    
    # Certifications bonus
    certs = resume.get("certifications", [])
    if isinstance(certs, str) and certs.strip() and certs.lower() not in ["unknown", "not provided"]:
        score += 2
    elif isinstance(certs, list) and len(certs) > 0:
        score += min(2, len(certs))
    
    # Structure & completeness (0-10 points)
    has_summary = bool(resume.get("personal_info", {}).get("summary", "").strip())
    has_contact = bool(resume.get("personal_info", {}).get("email", "").strip())
    has_projects = len(projects) > 0
    
    if has_summary and has_contact and has_projects:
        score += 10
    elif (has_summary and has_contact) or (has_summary and has_projects):
        score += 7
    elif has_summary or has_contact:
        score += 5
    
    return min(100, max(0, score))  # Clamp to 0-100


def flatten_resume_to_text(resume: Dict[str, Any]) -> str:
    """Flatten resume JSON to text representation."""
    parts = []
    
    # Summary
    summary = resume.get("personal_info", {}).get("summary", "")
    if summary and summary.lower() not in ["unknown", "not provided"]:
        parts.append(f"Summary: {summary}")
    
    # Experience
    experiences = resume.get("experience", [])
    for exp in experiences:
        title = exp.get("title", "")
        company = exp.get("company", "")
        responsibilities = exp.get("responsibilities", [])
        
        if title and company:
            parts.append(f"Experience: {title} at {company}")
            for resp in responsibilities[:3]:  # Top 3 responsibilities
                if resp and resp.lower() not in ["unknown", "not provided"]:
                    parts.append(f"  - {resp}")
    
    # Skills
    skills = extract_skills(resume)
    if skills:
        parts.append(f"Skills: {', '.join(skills[:20])}")  # Top 20 skills
    
    # Education
    education_list = resume.get("education", [])
    for edu in education_list:
        degree = edu.get("degree", {})
        level = degree.get("level", "")
        field = degree.get("field", "")
        institution = edu.get("institution", {}).get("name", "")
        
        if level:
            edu_str = f"Education: {level}"
            if field:
                edu_str += f" in {field}"
            if institution:
                edu_str += f" from {institution}"
            parts.append(edu_str)
    
    # Projects
    projects = resume.get("projects", [])
    for proj in projects[:3]:  # Top 3 projects
        name = proj.get("name", "")
        description = proj.get("description", "")
        if name and name.lower() not in ["unknown", "not provided"]:
            parts.append(f"Project: {name}")
            if description and description.lower() not in ["unknown", "not provided"]:
                parts.append(f"  {description}")
    
    return "\n".join(parts)


def transform_resume(resume: Dict[str, Any]) -> Dict[str, Any]:
    """Transform a single resume JSON to training example."""
    skills = extract_skills(resume)
    experience_summary = extract_experience_summary(resume)
    education_level = extract_education_level(resume)
    experience_years = calculate_experience_years(resume)
    score = calculate_quality_score(resume, skills, experience_years, education_level)
    text = flatten_resume_to_text(resume)
    
    return {
        "text": text,
        "skills": skills,
        "experience_summary": experience_summary,
        "education_level": education_level,
        "experience_years": experience_years,
        "score": score
    }


def main():
    parser = argparse.ArgumentParser(description="Prepare resume dataset for training")
    parser.add_argument("--input", required=True, help="Input JSONL file (master_resumes.jsonl)")
    parser.add_argument("--output", required=True, help="Output training JSONL file")
    parser.add_argument("--val_output", required=True, help="Output validation JSONL file")
    parser.add_argument("--val_split", type=float, default=0.2, help="Validation split ratio (default: 0.2)")
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"Error: Input file {args.input} not found")
        return
    
    print(f"Reading resumes from {args.input}...")
    examples = []
    
    with open(args.input, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            
            try:
                resume = json.loads(line)
                transformed = transform_resume(resume)
                
                # Skip if text is too short or missing critical info
                if len(transformed["text"].strip()) < 50:
                    continue
                
                examples.append(transformed)
                
                if line_num % 100 == 0:
                    print(f"Processed {line_num} resumes...")
            except json.JSONDecodeError as e:
                print(f"Warning: Skipping line {line_num} due to JSON error: {e}")
                continue
            except Exception as e:
                print(f"Warning: Skipping line {line_num} due to error: {e}")
                continue
    
    print(f"Total examples: {len(examples)}")
    
    # Split train/val
    split_idx = int(len(examples) * (1 - args.val_split))
    train_examples = examples[:split_idx]
    val_examples = examples[split_idx:]
    
    print(f"Train examples: {len(train_examples)}")
    print(f"Val examples: {len(val_examples)}")
    
    # Write training set
    print(f"Writing training set to {args.output}...")
    with open(args.output, "w", encoding="utf-8") as f:
        for ex in train_examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    
    # Write validation set
    print(f"Writing validation set to {args.val_output}...")
    with open(args.val_output, "w", encoding="utf-8") as f:
        for ex in val_examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    
    # Print statistics
    scores = [ex["score"] for ex in examples]
    skill_counts = [len(ex["skills"]) for ex in examples]
    
    print("\nDataset Statistics:")
    print(f"  Average score: {sum(scores) / len(scores):.1f}")
    print(f"  Score range: {min(scores)} - {max(scores)}")
    print(f"  Average skills per resume: {sum(skill_counts) / len(skill_counts):.1f}")
    print(f"  Max skills: {max(skill_counts)}")
    print("Done!")


if __name__ == "__main__":
    main()




