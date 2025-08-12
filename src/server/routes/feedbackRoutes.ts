import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Feedback logs endpoint' });
});

export default router; 