import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { analyzeResume, deleteResume, getResume, uploadResume } from '../controllers/resumeController.js';

const router = Router();

// Ensure uploads directory exists before using as destination
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '';
    cb(null, `resume-${unique}${ext}`);
  },
});

const upload = multer({ storage });

router.post('/upload', upload.single('resume'), uploadResume);
router.post('/analyze', analyzeResume);
router.get('/:id', getResume);
router.delete('/:id', deleteResume);

export default router;