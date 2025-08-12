import { generateStructuredContent } from '../genkit';
import { ParsedResume } from '../../utils/resumeParser';

export interface JobDescription {
  title: string;
  content: string;
  requirements: string[];
  skills: string[];
  experience: string;
}

export interface ResumeAnalysis {
  matchScore: number; // 0-100
  skillMatch: {
    matched: string[];
    missing: string[];
    score: number;
  };
  experienceMatch: {
    score: number;
    analysis: string;
  };
  suggestions: string[];
  overallFit: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ResumeAnalysisRequest {
  resume: ParsedResume;
  jobDescription: JobDescription;
}

/**
 * Resume Analyser using genai
 * Parses resumes and matches them against job descriptions
 */
export class ResumeAnalyser {
  
  /**
   * Analyze resume against job description
   */
  static async analyzeResume(request: ResumeAnalysisRequest): Promise<ResumeAnalysis> {
    try {
      const prompt = `
        Analyze this resume against the job description and provide a comprehensive match analysis.
        
        Job Title: ${request.jobDescription.title}
        Job Requirements: ${request.jobDescription.requirements.join(', ')}
        Job Skills: ${request.jobDescription.skills.join(', ')}
        Job Experience: ${request.jobDescription.experience}
        
        Resume Skills: ${request.resume.skills.join(', ')}
        Resume Experience: ${JSON.stringify(request.resume.experience)}
        Resume Education: ${JSON.stringify(request.resume.education)}
        
        Provide analysis with the following JSON structure:
        {
          "matchScore": 0-100,
          "skillMatch": {
            "matched": ["skills that match"],
            "missing": ["skills that are missing"],
            "score": 0-100
          },
          "experienceMatch": {
            "score": 0-100,
            "analysis": "detailed analysis of experience match"
          },
          "suggestions": ["specific improvement suggestions"],
          "overallFit": "excellent|good|fair|poor"
        }
        
        Consider:
        - Skill alignment and gaps
        - Experience level match
        - Education relevance
        - Overall fit for the role
        - Specific areas for improvement
      `;

      const fallbackAnalysis: ResumeAnalysis = {
        matchScore: 50,
        skillMatch: {
          matched: [],
          missing: [],
          score: 50
        },
        experienceMatch: {
          score: 50,
          analysis: "Unable to analyze experience match."
        },
        suggestions: ["Unable to provide suggestions due to technical issues."],
        overallFit: "fair"
      };

      const analysis = await generateStructuredContent<ResumeAnalysis>(prompt, fallbackAnalysis);

      return analysis;

    } catch (error) {
      console.error('Error in ResumeAnalyser:', error);
      return {
        matchScore: 0,
        skillMatch: {
          matched: [],
          missing: [],
          score: 0
        },
        experienceMatch: {
          score: 0,
          analysis: "Error occurred during analysis."
        },
        suggestions: ["Please try again."],
        overallFit: "poor"
      };
    }
  }

  /**
   * Extract skills from resume text using genai
   */
  static async extractSkills(resumeText: string): Promise<string[]> {
    try {
      const prompt = `
        Extract technical skills and competencies from this resume text.
        Return a JSON array of skills only.
        
        Resume text:
        ${resumeText}
      `;

      const fallbackSkills: string[] = [];
      const skills = await generateStructuredContent<string[]>(prompt, fallbackSkills);

      return skills || fallbackSkills;

    } catch (error) {
      console.error('Error extracting skills:', error);
      return [];
    }
  }

  /**
   * Generate resume improvement suggestions
   */
  static async generateSuggestions(resume: ParsedResume, jobDescription: JobDescription): Promise<string[]> {
    try {
      const prompt = `
        Generate specific suggestions to improve this resume for the ${jobDescription.title} position.
        
        Current resume skills: ${resume.skills.join(', ')}
        Job requirements: ${jobDescription.requirements.join(', ')}
        
        Provide actionable suggestions in a JSON array format.
        Focus on:
        - Missing skills to acquire
        - Experience gaps to address
        - Resume format improvements
        - Specific achievements to highlight
      `;

      const fallbackSuggestions: string[] = ["Focus on relevant experience and skills."];
      const suggestions = await generateStructuredContent<string[]>(prompt, fallbackSuggestions);

      return suggestions || fallbackSuggestions;

    } catch (error) {
      console.error('Error generating suggestions:', error);
      return ["Unable to generate suggestions due to technical issues."];
    }
  }

  /**
   * Calculate skill match percentage
   */
  static calculateSkillMatch(resumeSkills: string[], jobSkills: string[]): {
    matched: string[];
    missing: string[];
    score: number;
  } {
    const resumeSkillsLower = resumeSkills.map(skill => skill.toLowerCase());
    const jobSkillsLower = jobSkills.map(skill => skill.toLowerCase());

    const matched = jobSkills.filter(skill => 
      resumeSkillsLower.some(resumeSkill => 
        resumeSkill.includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(resumeSkill)
      )
    );

    const missing = jobSkills.filter(skill => 
      !matched.includes(skill)
    );

    const score = jobSkills.length > 0 ? (matched.length / jobSkills.length) * 100 : 0;

    return {
      matched,
      missing,
      score: Math.round(score)
    };
  }

  /**
   * Get overall fit assessment
   */
  static getOverallFit(matchScore: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (matchScore >= 85) return 'excellent';
    if (matchScore >= 70) return 'good';
    if (matchScore >= 50) return 'fair';
    return 'poor';
  }
}
