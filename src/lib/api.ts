import axios from 'axios';

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
      config.headers.Authorization = `Bearer ${token}`;
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
  analyze: (resumeId: string, jobDescription: string) =>
    api.post('/resume/analyze', { resumeId, jobDescription }),
};

export const interviewAPI = {
  start: (data: { jobTitle: string; mode: 'text' | 'voice' }) =>
    api.post('/interview/start', data),
  answer: (data: { sessionId: string; questionId: string; userAnswer: string }) =>
    api.post('/interview/answer', data),
  getSession: (sessionId: string) => api.get(`/interview/${sessionId}`),
};

export default api; 