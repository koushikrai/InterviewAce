import express from 'express';
import { getUserProgress, getSessionAnalytics, getComparativeAnalysis } from '../controllers/progressController.js';

const router = express.Router();

// Get user's overall progress and analytics
router.get('/user/:userId', getUserProgress);

// Get detailed analytics for a specific session
router.get('/session/:sessionId', getSessionAnalytics);

// Get comparative analysis between time periods
router.get('/compare/:userId', getComparativeAnalysis);

export default router;
