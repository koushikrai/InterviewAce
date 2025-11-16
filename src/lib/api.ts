import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      const existing = (config.headers ?? {}) as Record<string, unknown>;
      const merged = { ...existing, Authorization: `Bearer ${token}` } as unknown as AxiosRequestConfig['headers'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (config as any).headers = merged;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { name: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  me: () => api.get('/auth/me'),
};

export const resumeAPI = {
  upload: (formData: FormData) =>
    api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  get: (id: string) => api.get(`/resume/${id}`),
  analyze: (resumeId: string, jobDescription?: string, jobTitle?: string) =>
    // This endpoint can be long-running (AI analysis). Override the default
    // axios timeout here so the frontend will wait longer before treating
    // the request as failed. Keep default shorter timeouts for other calls.
    api.post('/resume/analyze', { resumeId, jobDescription, jobTitle }, { timeout: 120000 }),
};

export const interviewAPI = {
  start: (data: { jobTitle: string; mode: 'text' | 'voice'; difficulty?: 'easy' | 'medium' | 'hard'; numQuestions?: number; resumeData?: unknown }) =>
    api.post('/interview/start', data),
  submitAnswer: (data: { sessionId: string; question: string; answer: string; questionCategory?: string; difficulty?: 'easy' | 'medium' | 'hard' }) =>
    api.post('/interview/submit-answer', data),
  getResults: (sessionId: string) => api.get(`/interview/results/${sessionId}`),
};

export const progressAPI = {
  getUserProgress: (userId: string, timeRange: '7d' | '30d' | '90d' | '6m' | '1y' = '30d') =>
    api.get(`/progress/user/${userId}`, { params: { timeRange } }),
  getSessionAnalytics: (sessionId: string) =>
    api.get(`/progress/session/${sessionId}`),
};

export default api; 