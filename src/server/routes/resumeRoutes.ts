import { Router } from 'express';

const router = Router();

router.post('/upload', (req, res) => {
  res.json({ message: 'Resume upload endpoint' });
});

router.get('/:id', (req, res) => {
  res.json({ message: `Get resume ${req.params.id}` });
});

router.delete('/:id', (req, res) => {
  res.json({ message: `Delete resume ${req.params.id}` });
});

export default router; 