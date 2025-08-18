import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import { checkAIServiceHealth } from './services/aiService.js';
import { connectDB } from './db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - configurable via env
const defaultOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000'];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Helmet configuration - less restrictive for development
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for development
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory rate limiter
type Counter = { count: number; ts: number };
const rateStore = new Map<string, Counter>();
const WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60_000);
const MAX_REQ = Number(process.env.RATE_MAX || 120);
function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.ip || 'global';
  const now = Date.now();
  const existing = rateStore.get(key);
  if (!existing || now - existing.ts > WINDOW_MS) {
    rateStore.set(key, { count: 1, ts: now });
    return next();
  }
  existing.count += 1;
  if (existing.count > MAX_REQ) {
    return res.status(429).json({ message: 'Too many requests. Please slow down.' });
  }
  return next();
}

// Optional auth guard for protected routes
const enforceAuth = (process.env.ENFORCE_AUTH === 'true') || (process.env.NODE_ENV === 'production');
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!enforceAuth) return next();
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'Unauthorized' });
  // TODO: verify token; for now, presence check only
  return next();
}

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'InterviewAce API is running!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// AI Services Health Check (New endpoint)
app.get('/health/ai', async (req, res) => {
  try {
    const aiHealth = await checkAIServiceHealth();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      aiServices: aiHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Failed to check AI services health'
    });
  }
});

// API Routes
app.use('/auth', authRoutes);
app.use('/interview', rateLimit, requireAuth, interviewRoutes);
app.use('/resume', rateLimit, resumeRoutes);
app.use('/progress', rateLimit, requireAuth, progressRoutes); // New progress analytics routes

// Error handling middleware
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error((err as Error).stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 InterviewAce Backend Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🤖 AI Services health: http://localhost:${PORT}/health/ai`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
