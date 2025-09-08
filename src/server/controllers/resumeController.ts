/* eslint-disable @typescript-eslint/no-explicit-any */
// import type { Request, Response } from 'express';
// import fs from 'fs';
// import path from 'path';
// import Resume from '../../models/resumeModel.js';
// import { parseResume } from '../services/aiService.js';

// export const uploadResume = async (req: Request, res: Response) => {
//   try {
//     const file = (req as any).file as Express.Multer.File | undefined;  
//     if (!file) {
//       return res.status(400).json({ message: 'No file uploaded' });
//     }

//     // Ensure uploads directory exists
//     const uploadsDir = path.resolve(process.cwd(), 'uploads');
//     if (!fs.existsSync(uploadsDir)) {
//       fs.mkdirSync(uploadsDir, { recursive: true });
//     }

//     // Persist a record (userId optional for MVP)
//     const resume = await Resume.create({
//       userId: (req as any).userId,
//       originalFile: file.path,
//       parsedData: {},
//       resumeScore: 0,
//       suggestions: [],
//     });

//     return res.status(201).json({ resumeId: resume._id.toString() });
//   } catch (error) {
//     console.error('uploadResume error:', error);
//     return res.status(500).json({ message: 'Failed to upload resume' });
//   }
// };

// export const analyzeResume = async (req: Request, res: Response) => {
//   try {
//     const { resumeId, jobDescription, jobTitle } = req.body as { resumeId: string; jobDescription?: string; jobTitle?: string };
//     if (!resumeId) {
//       return res.status(400).json({ message: 'resumeId is required' });
//     }

//     const resume = await Resume.findById(resumeId);
//     if (!resume) {
//       return res.status(404).json({ message: 'Resume not found' });
//     }

//     // Parse resume using AI service (optionally pass job title for role-guided analysis)
//     const parsed = await parseResume(resume.originalFile, { jobTitle });
//     const strengths: string[] = [];
//     const improvements: string[] = [];
//     const suggestions: string[] = [];
//     const skillGaps: string[] = [];
//     const atsScore = { overall: 0, technical: 0, soft: 0, formatting: 0 };

//     // Extract data from parsed resume
//     const skills = Array.isArray((parsed as any)?.skills) ? (parsed as any).skills as string[] : [];
//     const experience = Array.isArray((parsed as any)?.experience) ? (parsed as any).experience as any[] : [];
//     const education = (parsed as any)?.education || {};
//     const projects = Array.isArray((parsed as any)?.projects) ? (parsed as any).projects as any[] : [];
//     const certifications = Array.isArray((parsed as any)?.certifications) ? (parsed as any).certifications as string[] : [];

//     // Basic scoring
//     let baseScore = 50;
    
//     // Skills analysis
//     if (skills.length >= 8) {
//       strengths.push('Comprehensive skills section with diverse technical capabilities');
//       baseScore += 15;
//       atsScore.technical = 85;
//     } else if (skills.length >= 5) {
//       strengths.push('Good range of skills covering key areas');
//       baseScore += 10;
//       atsScore.technical = 75;
//     } else if (skills.length >= 3) {
//       strengths.push('Basic skills foundation present');
//       baseScore += 5;
//       atsScore.technical = 60;
//     } else {
//       improvements.push('Add more relevant technical and soft skills');
//       atsScore.technical = 40;
//     }

//     // Experience analysis
//     if (experience.length >= 3) {
//       strengths.push('Strong work experience with multiple roles');
//       baseScore += 15;
//     } else if (experience.length >= 1) {
//       strengths.push('Work experience included');
//       baseScore += 8;
//     } else {
//       improvements.push('Include relevant work experience or internships');
//     }

//     // Projects analysis
//     if (projects.length >= 2) {
//       strengths.push('Multiple projects demonstrating practical skills');
//       baseScore += 10;
//     } else if (projects.length >= 1) {
//       strengths.push('Project experience included');
//       baseScore += 5;
//     } else {
//       improvements.push('Include 1-2 strong projects with measurable outcomes');
//     }

//     // Education analysis
//     if (education.degree && education.institution) {
//       strengths.push('Education credentials clearly stated');
//       baseScore += 5;
//     }

//     // Certifications analysis
//     if (certifications.length > 0) {
//       strengths.push('Professional certifications enhance credibility');
//       baseScore += 5;
//     }

//     // ATS Formatting Score
//     atsScore.formatting = 80; // Assuming good formatting for now
//     atsScore.soft = Math.min(90, 60 + (skills.length * 2));

//     // Job Description Comparison (Enhanced)
//     if (jobDescription) {
//       const jd = String(jobDescription).toLowerCase();
//       const jdWords = jd.split(/\s+/).filter(word => word.length > 3);
      
//       // Extract key requirements from job description
//       const requiredSkills = extractRequiredSkills(jd);
//       const requiredExperience = extractRequiredExperience(jd);
//       const requiredEducation = extractRequiredEducation(jd);
      
//       // Skill matching analysis
//       const matchedSkills = skills.filter(skill => 
//         jd.includes(skill.toLowerCase()) || 
//         requiredSkills.some(req => req.toLowerCase().includes(skill.toLowerCase()))
//       );
      
//       const keywordMatch = Math.round((matchedSkills.length / Math.max(skills.length || 1, 1)) * 100);
      
//       // Identify skill gaps
//       const missingSkills = requiredSkills.filter(reqSkill => 
//         !skills.some(skill => 
//           skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
//           reqSkill.toLowerCase().includes(skill.toLowerCase())
//         )
//       );
      
//       if (missingSkills.length > 0) {
//         skillGaps.push(...missingSkills.slice(0, 5)); // Top 5 missing skills
//         suggestions.push(`Add these key skills: ${missingSkills.slice(0, 3).join(', ')}`);
//       }
      
//       // Experience level matching
//       if (requiredExperience && experience.length < requiredExperience) {
//         skillGaps.push(`${requiredExperience - experience.length}+ years of experience needed`);
//         suggestions.push(`Highlight relevant experience and quantify achievements`);
//       }
      
//       // Education matching
//       if (requiredEducation && !education.degree?.toLowerCase().includes(requiredEducation.toLowerCase())) {
//         skillGaps.push(`Education: ${requiredEducation} preferred`);
//       }
      
//       // ATS Score adjustment based on JD match
//       if (keywordMatch >= 80) {
//         atsScore.overall = Math.min(95, baseScore + 20);
//         strengths.push('Excellent keyword match with job requirements');
//       } else if (keywordMatch >= 60) {
//         atsScore.overall = Math.min(90, baseScore + 15);
//         strengths.push('Good alignment with job requirements');
//       } else {
//         atsScore.overall = Math.max(50, baseScore - 10);
//         suggestions.push('Significantly improve keyword matching for better ATS score');
//       }
      
//       // Update resume with enhanced analysis
//       resume.parsedData = parsed as any;
//       resume.resumeScore = atsScore.overall;
//       resume.suggestions = suggestions;
//       resume.skillGaps = skillGaps;
//       resume.keywordMatch = keywordMatch;
//       await resume.save();

//       return res.json({
//         score: atsScore.overall,
//         strengths,
//         improvements,
//         suggestions,
//         keywordMatch,
//         skillGaps,
//         atsScore,
//         jobMatch: {
//           skillsMatch: keywordMatch,
//           experienceMatch: experience.length >= (requiredExperience || 1),
//           educationMatch: !requiredEducation || education.degree?.toLowerCase().includes(requiredEducation.toLowerCase()),
//           overallMatch: keywordMatch >= 70
//         }
//       });
//     }

//     // No JD provided - generic analysis
//     atsScore.overall = Math.min(95, baseScore);
    
//     resume.parsedData = parsed as any;
//     resume.resumeScore = atsScore.overall;
//     resume.suggestions = suggestions;
//     await resume.save();

//     return res.json({
//       score: atsScore.overall,
//       strengths,
//       improvements,
//       suggestions,
//       atsScore,
//       note: 'Add a job description for targeted analysis and skill gap identification'
//     });
//   } catch (error) {
//     console.error('analyzeResume error:', error);
//     return res.status(500).json({ message: 'Failed to analyze resume' });
//   }
// };

// // Helper functions for extracting requirements from job description
// const extractRequiredSkills = (jd: string): string[] => {
//   const skillKeywords = [
//     'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws', 'docker',
//     'kubernetes', 'machine learning', 'ai', 'data analysis', 'agile', 'scrum',
//     'project management', 'leadership', 'communication', 'problem solving'
//   ];
  
//   return skillKeywords.filter(skill => jd.toLowerCase().includes(skill.toLowerCase()));
// };

// const extractRequiredExperience = (jd: string): number => {
//   const experiencePatterns = [
//     /(\d+)\+?\s*years?\s*of\s*experience/gi,
//     /experience:\s*(\d+)\+?\s*years?/gi,
//     /(\d+)\+?\s*years?\s*in\s*the\s*field/gi
//   ];
  
//   for (const pattern of experiencePatterns) {
//     const match = pattern.exec(jd);
//     if (match) {
//       return parseInt(match[1], 10);
//     }
//   }
  
//   return 1; // Default minimum
// };

// const extractRequiredEducation = (jd: string): string => {
//   const educationKeywords = ['bachelor', 'master', 'phd', 'degree', 'diploma'];
  
//   for (const keyword of educationKeywords) {
//     if (jd.toLowerCase().includes(keyword.toLowerCase())) {
//       return keyword;
//     }
//   }
  
//   return '';
// };

// export const getResume = async (req: Request, res: Response) => {
//   try {
//     const resume = await Resume.findById(req.params.id);
//     if (!resume) {
//       return res.status(404).json({ message: 'Resume not found' });
//     }
//     return res.json({ resume });
//   } catch (error) {
//     console.error('getResume error:', error);
//     return res.status(500).json({ message: 'Failed to get resume' });
//   }
// };

// export const deleteResume = async (req: Request, res: Response) => {
//   try {
//     await Resume.findByIdAndDelete(req.params.id);
//     return res.json({ message: 'Resume deleted' });
//   } catch (error) {
//     console.error('deleteResume error:', error);
//     return res.status(500).json({ message: 'Failed to delete resume' });
//   }
// }; 

import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Resume, { IResume } from '../../models/resumeModel.js'; // <-- 1. Import IResume
import { parseResume } from '../services/aiService.js';

export const uploadResume = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // ... (code for creating uploads directory)

    // Persist a record
    const resume: IResume = await Resume.create({ // <-- 2. Add the IResume type
      userId: (req as any).userId,
      originalFile: file.path,
      parsedData: {},
      resumeScore: 0,
      suggestions: [],
    });

    // This line will now work correctly
    return res.status(201).json({ resumeId: resume._id.toString() });
  } catch (error) {
    console.error('uploadResume error:', error);
    return res.status(500).json({ message: 'Failed to upload resume' });
  }
};

// ... (rest of the file remains the same)