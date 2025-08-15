import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const RESUME_PARSER_URL = process.env.RESUME_PARSER_URL || 'http://localhost:8001';
const INTERVIEW_GENERATOR_URL = process.env.INTERVIEW_GENERATOR_URL || 'http://localhost:8002';
const ANSWER_FEEDBACK_URL = process.env.ANSWER_FEEDBACK_URL || 'http://localhost:8003';

export const parseResume = async (filePathOrData: string | Record<string, unknown>) => {
  try {
    // If a file path is provided and the resume parser service is available, send the file
    if (typeof filePathOrData === 'string' && fs.existsSync(filePathOrData)) {
      const url = `${RESUME_PARSER_URL}/parse`;
      const form = new FormData();
      form.append('file', fs.createReadStream(path.resolve(filePathOrData)));
      const response = await axios.post(url, form, { headers: form.getHeaders(), timeout: 15000 });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    }
  } catch (error) {
    // Fall through to dummy
  }
  // Fallback simple parse result
  return { name: 'John Doe', skills: ['Communication', 'Problem Solving'], projects: [], education: {} };
};

export const generateInterviewQuestions = async (resume: any, jobTitle: string) => {
  try {
    const url = `${INTERVIEW_GENERATOR_URL}/generate`;
    const response = await axios.post(url, {
      jobTitle,
      resume,
      difficulty: 'medium',
      numQuestions: 4,
    }, { timeout: 15000 });
    if (response.data?.success && Array.isArray(response.data?.questions) && response.data.questions.length) {
      // Map to simple string list for controller consumption
      return response.data.questions.map((q: any) => q?.question || '');
    }
  } catch (error) {
    // Fall through to dummy
  }
  return [
    'Tell me about yourself.',
    'Describe a challenging project you worked on and how you overcame obstacles.',
    'What are your greatest strengths and how do they apply to this position?',
    'Where do you see yourself in 5 years?',
  ];
};

export const getAnswerFeedback = async (question: string, answer: string) => {
  try {
    const url = `${ANSWER_FEEDBACK_URL}/feedback`;
    const response = await axios.post(url, {
      question,
      answer,
    }, { timeout: 15000 });
    if (response.data?.success) {
      return {
        feedback: response.data.feedback ?? 'Good answer.',
        score: typeof response.data.score === 'number' ? response.data.score : 8,
      };
    }
  } catch (error) {
    // Fall through to dummy
  }
  return { feedback: 'Good answer.', score: 8 };
};