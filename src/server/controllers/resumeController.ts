import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Resume from '../../models/resumeModel.js';
import { parseResume } from '../services/aiService.js';

export const uploadResume = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Ensure uploads directory exists
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Persist a record (userId optional for MVP)
    const resume = await Resume.create({
      userId: (req as any).userId,
      originalFile: file.path,
      parsedData: {},
      resumeScore: 0,
      suggestions: [],
    });

    return res.status(201).json({ resumeId: resume._id.toString() });
  } catch (error) {
    console.error('uploadResume error:', error);
    return res.status(500).json({ message: 'Failed to upload resume' });
  }
};

export const analyzeResume = async (req: Request, res: Response) => {
  try {
    const { resumeId, jobDescription } = req.body as { resumeId: string; jobDescription?: string };
    if (!resumeId) {
      return res.status(400).json({ message: 'resumeId is required' });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Basic parse and scoring heuristic (MVP)
    const parsed = await parseResume(resume.originalFile);
    const strengths: string[] = [];
    const improvements: string[] = [];
    const suggestions: string[] = [];

    const skills = Array.isArray((parsed as any)?.skills) ? (parsed as any).skills as string[] : [];
    const hasProjects = Boolean((parsed as any)?.projects?.length);
    const hasEducation = Boolean((parsed as any)?.education);

    if (skills.length >= 5) strengths.push('Comprehensive skills section');
    if (hasProjects) strengths.push('Projects listed with practical experience');
    if (hasEducation) strengths.push('Education included');
    if (skills.length < 3) improvements.push('Add more relevant technical and soft skills');
    if (!hasProjects) improvements.push('Include 1–2 strong projects with outcomes');

    if (jobDescription) {
      const jd = String(jobDescription).toLowerCase();
      const matchCount = skills.filter((s) => jd.includes(String(s).toLowerCase())).length;
      const keywordMatch = Math.round((matchCount / Math.max(skills.length || 1, 5)) * 100);
      if (keywordMatch < 60) {
        suggestions.push('Add more keywords from the job description to improve ATS match');
      }
      // Update doc and respond with full payload
      resume.parsedData = parsed as any;
      resume.resumeScore = Math.min(95, 50 + (skills.length * 10) + (hasProjects ? 10 : 0));
      resume.suggestions = suggestions;
      await resume.save();

      return res.json({
        score: resume.resumeScore,
        strengths,
        improvements,
        keywordMatch,
        suggestions,
      });
    }

    // No JD provided, compute a generic score
    resume.parsedData = parsed as any;
    resume.resumeScore = Math.min(95, 55 + (skills.length * 8) + (hasProjects ? 10 : 0));
    resume.suggestions = suggestions;
    await resume.save();

    return res.json({
      score: resume.resumeScore,
      strengths,
      improvements,
      suggestions,
    });
  } catch (error) {
    console.error('analyzeResume error:', error);
    return res.status(500).json({ message: 'Failed to analyze resume' });
  }
};

export const getResume = async (req: Request, res: Response) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    return res.json({ resume });
  } catch (error) {
    console.error('getResume error:', error);
    return res.status(500).json({ message: 'Failed to get resume' });
  }
};

export const deleteResume = async (req: Request, res: Response) => {
  try {
    await Resume.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Resume deleted' });
  } catch (error) {
    console.error('deleteResume error:', error);
    return res.status(500).json({ message: 'Failed to delete resume' });
  }
};