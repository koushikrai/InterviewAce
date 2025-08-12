import { Router } from 'express';

const router = Router();

router.post('/start', (req, res) => {
  res.json({ message: 'Interview start endpoint' });
});

router.post('/answer', (req, res) => {
  res.json({ message: 'Interview answer endpoint' });
});

router.get('/:sessionId', (req, res) => {
  res.json({ message: `Get interview session ${req.params.sessionId}` });
});

export default router; 