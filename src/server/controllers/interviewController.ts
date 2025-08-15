import type { Request, Response } from 'express';
import InterviewSession from '../../models/interviewModel.js';
import FeedbackLog from '../../models/feedbackLogModel.js';
import { generateInterviewQuestions, getAnswerFeedback } from '../services/aiService.js';

export const startInterview = async (req: Request, res: Response) => {
  try {
    const { jobTitle, mode } = req.body as { jobTitle: string; mode: 'text' | 'voice' };
    if (!jobTitle || !mode) {
      return res.status(400).json({ message: 'jobTitle and mode are required' });
    }

    const questions = await generateInterviewQuestions({}, jobTitle);

    const session = await InterviewSession.create({
      userId: (req as any).userId || undefined,
      jobTitle,
      mode,
      scoreSummary: '',
      feedbackLogIds: [],
    } as any);

    return res.status(201).json({ sessionId: session._id.toString(), questions: questions.map((q, i) => ({
      id: `${i + 1}`,
      question: q,
      type: 'behavioral',
      expectedDuration: '2-3 minutes',
    })) });
  } catch (error) {
    console.error('startInterview error:', error);
    return res.status(500).json({ message: 'Failed to start interview' });
  }
};

export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { sessionId, questionId, userAnswer } = req.body as { sessionId: string; questionId: string; userAnswer: string };
    if (!sessionId || !questionId || !userAnswer) {
      return res.status(400).json({ message: 'sessionId, questionId and userAnswer are required' });
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const feedback = await getAnswerFeedback(`Q${questionId}`, userAnswer);

    const log = await FeedbackLog.create({
      sessionId: session._id,
      question: `Q${questionId}`,
      userAnswer,
      aiFeedback: (feedback as any)?.feedback ?? 'Good answer.',
      score: (feedback as any)?.score ?? 7,
    } as any);

    session.feedbackLogIds.push(log._id);
    await session.save();

    return res.json({ feedback: log.aiFeedback, score: log.score });
  } catch (error) {
    console.error('submitAnswer error:', error);
    return res.status(500).json({ message: 'Failed to submit answer' });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const session = await InterviewSession.findById(sessionId).populate('feedbackLogIds');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    return res.json({ session });
  } catch (error) {
    console.error('getSession error:', error);
    return res.status(500).json({ message: 'Failed to get session' });
  }
};