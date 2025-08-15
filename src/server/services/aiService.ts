import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const RESUME_PARSER_URL = process.env.RESUME_PARSER_URL || 'http://localhost:8001';
const INTERVIEW_GENERATOR_URL = process.env.INTERVIEW_GENERATOR_URL || 'http://localhost:8002';
const ANSWER_FEEDBACK_URL = process.env.ANSWER_FEEDBACK_URL || 'http://localhost:8003';

// Configuration for retry logic
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeout: 15000, // 15 seconds
};

// Enhanced logging utility
const logAIServiceEvent = (service: string, event: string, details: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info') => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    service,
    event,
    details,
    level,
  };
  
  // Console logging with structured format
  const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  logMethod(`[AI Service - ${service}] ${event}:`, JSON.stringify(logEntry, null, 2));
  
  // You can extend this to send to external logging services like Winston, Bunyan, etc.
  return logEntry;
};

// Retry logic with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  serviceName: string,
  maxRetries: number = RETRY_CONFIG.maxRetries
): Promise<T> => {
  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      
      if (attempt === maxRetries) {
        const errorDetails = error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : {
          message: 'Unknown error',
          error: String(error),
        };
        
        const axiosError = error as { response?: { status?: number; statusText?: string } };
        
        logAIServiceEvent(serviceName, 'FINAL_RETRY_FAILED', {
          attempt,
          maxRetries,
          ...errorDetails,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
        }, 'error');
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
        RETRY_CONFIG.maxDelay
      );
      
      const errorDetails = error instanceof Error ? {
        message: error.message,
      } : {
        message: 'Unknown error',
        error: String(error),
      };
      
      const axiosError = error as { response?: { status?: number; statusText?: string } };
      
      logAIServiceEvent(serviceName, 'RETRY_ATTEMPT', {
        attempt,
        maxRetries,
        delay,
        ...errorDetails,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
      }, 'warn');
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Health check for AI services
export const checkAIServiceHealth = async () => {
  const healthStatus = {
    resumeParser: false,
    interviewGenerator: false,
    answerFeedback: false,
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Check resume parser
    try {
      const response = await axios.get(`${RESUME_PARSER_URL}/health`, { timeout: 5000 });
      healthStatus.resumeParser = response.status === 200;
    } catch (error: unknown) {
      logAIServiceEvent('RESUME_PARSER', 'HEALTH_CHECK_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: (error as { response?: { status?: number } }).response?.status,
      }, 'warn');
    }
    
    // Check interview generator
    try {
      const response = await axios.get(`${INTERVIEW_GENERATOR_URL}/health`, { timeout: 5000 });
      healthStatus.interviewGenerator = response.status === 200;
    } catch (error: unknown) {
      logAIServiceEvent('INTERVIEW_GENERATOR', 'HEALTH_CHECK_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: (error as { response?: { status?: number } }).response?.status,
      }, 'warn');
    }
    
    // Check answer feedback
    try {
      const response = await axios.get(`${ANSWER_FEEDBACK_URL}/health`, { timeout: 5000 });
      healthStatus.answerFeedback = response.status === 200;
    } catch (error: unknown) {
      logAIServiceEvent('ANSWER_FEEDBACK', 'HEALTH_CHECK_FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: (error as { response?: { status?: number } }).response?.status,
      }, 'warn');
    }
    
    logAIServiceEvent('HEALTH_CHECK', 'COMPLETED', healthStatus);
    return healthStatus;
  } catch (error: unknown) {
    logAIServiceEvent('HEALTH_CHECK', 'FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'error');
    return healthStatus;
  }
};

export const parseResume = async (filePathOrData: string | Record<string, unknown>) => {
  logAIServiceEvent('RESUME_PARSER', 'STARTED', {
    inputType: typeof filePathOrData,
    hasFile: typeof filePathOrData === 'string' && fs.existsSync(filePathOrData as string),
  });
  
  try {
    // If a file path is provided and the resume parser service is available, send the file
    if (typeof filePathOrData === 'string' && fs.existsSync(filePathOrData)) {
      const url = `${RESUME_PARSER_URL}/parse`;
      
      // Create FormData with proper file handling
      const form = new FormData();
      const fileStream = fs.createReadStream(path.resolve(filePathOrData));
      form.append('file', fileStream, path.basename(filePathOrData));
      
      const result = await retryWithBackoff(async () => {
        const response = await axios.post(url, form, { 
          headers: {
            ...form.getHeaders(),
            'Content-Type': 'multipart/form-data'
          }, 
          timeout: RETRY_CONFIG.timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        
        if (response.data?.success && response.data?.data) {
          logAIServiceEvent('RESUME_PARSER', 'SUCCESS', {
            responseStatus: response.status,
            dataKeys: Object.keys(response.data.data || {}),
          });
          return response.data.data;
        } else {
          throw new Error('Invalid response format from resume parser service');
        }
      }, 'RESUME_PARSER');
      
      return result;
    }
  } catch (error: unknown) {
    logAIServiceEvent('RESUME_PARSER', 'FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: (error as { response?: { status?: number; statusText?: string } }).response?.status,
      statusText: (error as { response?: { status?: number; statusText?: string } }).response?.statusText,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'error');
  }
  
  // Fallback simple parse result
  logAIServiceEvent('RESUME_PARSER', 'FALLBACK_USED', {
    reason: 'Service unavailable or failed',
    fallbackData: { name: 'John Doe', skills: ['Communication', 'Problem Solving'], projects: [], education: {} },
  }, 'warn');
  
  return { name: 'John Doe', skills: ['Communication', 'Problem Solving'], projects: [], education: {} };
};

export const generateInterviewQuestions = async (resume: Record<string, unknown> | null, jobTitle: string) => {
  logAIServiceEvent('INTERVIEW_GENERATOR', 'STARTED', {
    jobTitle,
    resumeType: typeof resume,
    resumeKeys: resume ? Object.keys(resume) : [],
  });
  
  try {
    const url = `${INTERVIEW_GENERATOR_URL}/generate`;
    
    const result = await retryWithBackoff(async () => {
      const response = await axios.post(url, {
        jobTitle,
        resume,
        difficulty: 'medium',
        numQuestions: 4,
      }, { timeout: RETRY_CONFIG.timeout });
      
      if (response.data?.success && Array.isArray(response.data?.questions) && response.data.questions.length) {
        const questions = response.data.questions.map((q: Record<string, unknown>) => (q?.question as string) || '');
        logAIServiceEvent('INTERVIEW_GENERATOR', 'SUCCESS', {
          responseStatus: response.status,
          questionsGenerated: questions.length,
          questions: questions,
        });
        return questions;
      } else {
        throw new Error('Invalid response format from interview generator service');
      }
    }, 'INTERVIEW_GENERATOR');
    
    return result;
  } catch (error: unknown) {
    logAIServiceEvent('INTERVIEW_GENERATOR', 'FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: (error as { response?: { status?: number; statusText?: string } }).response?.status,
      statusText: (error as { response?: { status?: number; statusText?: string } }).response?.statusText,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'error');
  }
  
  // Fallback questions
  const fallbackQuestions = [
    'Tell me about yourself.',
    'Describe a challenging project you worked on and how you overcame obstacles.',
    'What are your greatest strengths and how do they apply to this position?',
    'Where do you see yourself in 5 years?',
  ];
  
  logAIServiceEvent('INTERVIEW_GENERATOR', 'FALLBACK_USED', {
    reason: 'Service unavailable or failed',
    fallbackQuestions,
  }, 'warn');
  
  return fallbackQuestions;
};

export const getAnswerFeedback = async (question: string, answer: string) => {
  logAIServiceEvent('ANSWER_FEEDBACK', 'STARTED', {
    questionLength: question.length,
    answerLength: answer.length,
    question: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
  });
  
  try {
    const url = `${ANSWER_FEEDBACK_URL}/feedback`;
    
    const result = await retryWithBackoff(async () => {
      const response = await axios.post(url, {
        question,
        answer,
      }, { timeout: RETRY_CONFIG.timeout });
      
      if (response.data?.success) {
        const feedback = {
          feedback: response.data.feedback ?? 'Good answer.',
          score: typeof response.data.score === 'number' ? response.data.score : 8,
        };
        
        logAIServiceEvent('ANSWER_FEEDBACK', 'SUCCESS', {
          responseStatus: response.status,
          feedback: feedback.feedback,
          score: feedback.score,
        });
        
        return feedback;
      } else {
        throw new Error('Invalid response format from answer feedback service');
      }
    }, 'ANSWER_FEEDBACK');
    
    return result;
  } catch (error: unknown) {
    logAIServiceEvent('ANSWER_FEEDBACK', 'FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: (error as { response?: { status?: number; statusText?: string } }).response?.status,
      statusText: (error as { response?: { status?: number; statusText?: string } }).response?.statusText,
      stack: error instanceof Error ? error.stack : undefined,
    }, 'error');
  }
  
  // Fallback feedback
  const fallbackFeedback = { feedback: 'Good answer.', score: 8 };
  
  logAIServiceEvent('ANSWER_FEEDBACK', 'FALLBACK_USED', {
    reason: 'Service unavailable or failed',
    fallbackFeedback,
  }, 'warn');
  
  return fallbackFeedback;
};