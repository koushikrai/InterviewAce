import { Router } from 'express';
import { getSession, startInterview, submitAnswer } from '../controllers/interviewController.js';

const router = Router();

router.post('/start', startInterview);
router.post('/answer', submitAnswer);
router.get('/:sessionId', getSession);

export default router;