import express from 'express';
import { startInterview, submitAnswer, getInterviewResults } from '../controllers/interviewController.js';
import multer from 'multer';
import { speechToText } from '../services/googleSpeech.js';

const router = express.Router();

// Start a new interview session
router.post('/start', startInterview);

// Submit an answer and get feedback
router.post('/submit-answer', submitAnswer);

// Get interview results and analytics
router.get('/results/:sessionId', getInterviewResults);

// Voice: speech-to-text endpoint (multipart/form-data with 'audio')
const upload = multer({ storage: multer.memoryStorage() });
router.post('/stt', upload.single('audio'), async (req, res) => {
  try {
    const audioBuffer = req.file?.buffer;
    if (!audioBuffer) return res.status(400).json({ message: 'No audio provided' });
    const result = await speechToText(audioBuffer);
    res.json({ success: true, transcript: result.transcript || '' });
  } catch (err) {
    console.error('STT error:', err);
    res.status(500).json({ success: false, message: 'Speech-to-text failed' });
  }
});

export default router;