import { Request, Response } from 'express';
import InterviewSession from '../../models/interviewModel.js';
import FeedbackLog from '../../models/feedbackLogModel.js';
import { generateInterviewQuestions, getAnswerFeedback } from '../services/aiService.js';

export const startInterview = async (req: Request, res: Response) => {
  try {
    const { jobTitle, mode, difficulty = 'medium', numQuestions = 5, resumeData, userId: bodyUserId } = req.body as any;

    if (!jobTitle || !mode) {
      return res.status(400).json({ message: 'Job title and mode are required' });
    }

    // Generate interview questions using AI service
    const questionsResponse = await generateInterviewQuestions(jobTitle, resumeData, difficulty, numQuestions);
    
    if (!(questionsResponse as any).success) {
      return res.status(500).json({ message: 'Failed to generate interview questions' });
    }

    // Create interview session with enhanced tracking
    const session = new InterviewSession({
      userId: (req as any).userId || bodyUserId,
      jobTitle,
      mode,
      sessionAnalytics: {
        totalQuestions: (questionsResponse as any).questions.length,
        answeredQuestions: 0,
        averageResponseTime: 0,
        difficultyDistribution: (questionsResponse as any).metadata?.difficultyDistribution || {
          easy: 0,
          medium: (questionsResponse as any).questions.length,
          hard: 0
        },
        categoryPerformance: {
          technical: 0,
          behavioral: 0,
          situational: 0,
          general: 0
        }
      },
      performanceMetrics: {
        overallScore: 0,
        communicationScore: 0,
        technicalScore: 0,
        behavioralScore: 0,
        confidenceScore: 0,
        improvementRate: 0
      },
      progressInsights: {
        strengths: [],
        weaknesses: [],
        improvementAreas: [],
        nextSteps: [],
        confidenceTrend: 'stable',
        skillGaps: [],
        recommendations: []
      },
      learningPath: {
        currentLevel: 'beginner',
        targetLevel: 'intermediate',
        estimatedTimeToTarget: '4-6 weeks',
        focusAreas: [],
        practiceExercises: []
      }
    });

    await session.save();

    res.json({
      sessionId: session._id,
      questions: (questionsResponse as any).questions,
      metadata: (questionsResponse as any).metadata,
      message: 'Interview session started successfully'
    });
  } catch (error) {
    console.error('startInterview error:', error);
    res.status(500).json({ message: 'Failed to start interview session' });
  }
};

export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { sessionId, question, answer, questionCategory = 'general', difficulty = 'medium' } = req.body;

    if (!sessionId || !question || !answer) {
      return res.status(400).json({ message: 'Session ID, question, and answer are required' });
    }

    // Get AI feedback for the answer
    const feedbackResponse = await getAnswerFeedback(question, answer, 'Software Engineer', questionCategory);
    
    if (!(feedbackResponse as any).success) {
      return res.status(500).json({ message: 'Failed to get answer feedback' });
    }

    // Create detailed feedback log
    const feedbackLog = new FeedbackLog({
      sessionId, question, userAnswer: answer, aiFeedback: (feedbackResponse as any).feedback,
      score: (feedbackResponse as any).score, detailedFeedback: (feedbackResponse as any).detailedFeedback,
      improvementAreas: (feedbackResponse as any).improvementAreas || [], nextSteps: (feedbackResponse as any).nextSteps || [],
      confidenceLevel: (feedbackResponse as any).confidenceLevel || 'medium', questionCategory, difficulty,
      expectedKeywords: (feedbackResponse as any).expectedKeywords || [], userKeywords: (feedbackResponse as any).userKeywords || [],
      keywordMatch: (feedbackResponse as any).keywordMatch || 0
    });

    await feedbackLog.save();

    // Update interview session with feedback
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    // Ensure userId is set if possible (sticky)
    if (!session.userId && (req as any).userId) {
      session.userId = (req as any).userId;
    }

    // Add feedback log to session
    session.feedbackLogIds.push(feedbackLog._id);
    session.sessionAnalytics.answeredQuestions += 1;

    // Update performance metrics
    const currentMetrics = session.performanceMetrics;
    const newScore = (feedbackResponse as any).score as number;
    
    // Calculate running averages
    const totalScores = session.feedbackLogIds.length;
    session.performanceMetrics.overallScore = Math.round(
      ((currentMetrics.overallScore * (totalScores - 1)) + newScore) / totalScores
    );

    // Update category-specific scores
    if ((feedbackResponse as any).detailedFeedback) {
      const commScore = (feedbackResponse as any).detailedFeedback.communication.overall;
      const techScore = (feedbackResponse as any).detailedFeedback.technical.overall;
      const behavScore = (feedbackResponse as any).detailedFeedback.behavioral.overall;

      session.performanceMetrics.communicationScore = Math.round(
        ((currentMetrics.communicationScore * (totalScores - 1)) + commScore) / totalScores
      );
      session.performanceMetrics.technicalScore = Math.round(
        ((currentMetrics.technicalScore * (totalScores - 1)) + techScore) / totalScores
      );
      session.performanceMetrics.behavioralScore = Math.round(
        ((currentMetrics.behavioralScore * (totalScores - 1)) + behavScore) / totalScores
      );
      session.performanceMetrics.confidenceScore = Math.round(
        ((currentMetrics.confidenceScore * (totalScores - 1)) + behavScore) / totalScores
      );
    }

    // Update category performance
    if (questionCategory === 'technical') {
      session.sessionAnalytics.categoryPerformance.technical = Math.round(
        ((session.sessionAnalytics.categoryPerformance.technical * (totalScores - 1)) + newScore) / totalScores
      );
    } else if (questionCategory === 'behavioral') {
      session.sessionAnalytics.categoryPerformance.behavioral = Math.round(
        ((session.sessionAnalytics.categoryPerformance.behavioral * (totalScores - 1)) + newScore) / totalScores
      );
    }

    // Generate progress insights
    await generateProgressInsights(session);

    await session.save();

    res.json({
      feedback: feedbackResponse,
      sessionUpdate: {
        performanceMetrics: session.performanceMetrics,
        sessionAnalytics: session.sessionAnalytics,
        progressInsights: session.progressInsights
      },
      message: 'Answer submitted and feedback generated successfully'
    });
  } catch (error) {
    console.error('submitAnswer error:', error);
    res.status(500).json({ message: 'Failed to submit answer' });
  }
};

export const getInterviewResults = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findById(sessionId).populate('feedbackLogIds');
    if (!session) {
      return res.status(404).json({ message: 'Interview session not found' });
    }

    // Calculate final insights
    const finalInsights = await calculateFinalInsights(session);

    res.json({
      session,
      finalInsights,
      message: 'Interview results retrieved successfully'
    });
  } catch (error) {
    console.error('getInterviewResults error:', error);
    res.status(500).json({ message: 'Failed to get interview results' });
  }
};

// Helper function to generate progress insights
async function generateProgressInsights(session: any) {
  try {
    const feedbackLogs = await FeedbackLog.find({ _id: { $in: session.feedbackLogIds } });
    
    if (feedbackLogs.length === 0) return;

    // Analyze strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvementAreas: string[] = [];

    feedbackLogs.forEach((log) => {
      if ((log as any).detailedFeedback?.overall?.strengths) {
        strengths.push(...(log as any).detailedFeedback.overall.strengths);
      }
      if ((log as any).detailedFeedback?.overall?.improvements) {
        weaknesses.push(...(log as any).detailedFeedback.overall.improvements);
        improvementAreas.push(...(log as any).detailedFeedback.overall.improvements);
      }
    });

    // Identify skill gaps
    const skillGaps = [...new Set(weaknesses)];
    
    // Generate recommendations
    const recommendations = generateRecommendations(session, feedbackLogs as any[]);
    
    // Determine confidence trend
    const confidenceTrend = determineConfidenceTrend(feedbackLogs as any[]);
    
    // Update progress insights
    session.progressInsights = {
      strengths: [...new Set(strengths)].slice(0, 5),
      weaknesses: [...new Set(weaknesses)].slice(0, 5),
      improvementAreas: [...new Set(improvementAreas)].slice(0, 5),
      nextSteps: recommendations.slice(0, 3),
      confidenceTrend,
      skillGaps: skillGaps.slice(0, 5),
      recommendations: recommendations.slice(0, 5)
    };

    // Update learning path
    session.learningPath = generateLearningPath(session, skillGaps as string[]);
    
  } catch (error) {
    console.error('Error generating progress insights:', error);
  }
}

// Helper function to calculate final insights
async function calculateFinalInsights(session: any) {
  try {
    const feedbackLogs = await FeedbackLog.find({ _id: { $in: session.feedbackLogIds } });
    
    const totalQuestions = session.sessionAnalytics.totalQuestions;
    const answeredQuestions = session.sessionAnalytics.answeredQuestions;
    const completionRate = Math.round((answeredQuestions / totalQuestions) * 100);
    
    // Calculate improvement rate (compare first half vs second half)
    const midPoint = Math.ceil(feedbackLogs.length / 2);
    const firstHalfAvg = feedbackLogs.slice(0, midPoint).reduce((sum, log) => sum + (log as any).score, 0) / Math.max(midPoint, 1);
    const secondHalfAvg = feedbackLogs.slice(midPoint).reduce((sum, log) => sum + (log as any).score, 0) / Math.max((feedbackLogs.length - midPoint), 1);
    
    const improvementRate = isFinite(firstHalfAvg) && firstHalfAvg > 0
      ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
      : 0;
    
    return {
      completionRate,
      improvementRate,
      overallPerformance: session.performanceMetrics.overallScore,
      categoryBreakdown: session.sessionAnalytics.categoryPerformance,
      difficultyAnalysis: session.sessionAnalytics.difficultyDistribution,
      timeAnalysis: {
        totalTime: 'N/A',
        averagePerQuestion: 'N/A'
      }
    };
  } catch (error) {
    console.error('Error calculating final insights:', error);
    return {};
  }
}

// Helper function to generate recommendations
function generateRecommendations(session: any, feedbackLogs: any[]) {
  const recommendations: string[] = [];
  
  // Analyze performance patterns
  const lowScores = feedbackLogs.filter((log) => (log as any).score < 70);
  const highScores = feedbackLogs.filter((log) => (log as any).score > 85);
  
  if (lowScores.length > highScores.length) {
    recommendations.push("Focus on improving weak areas through targeted practice");
    recommendations.push("Review and practice common interview questions");
    recommendations.push("Work on communication clarity and structure");
  } else {
    recommendations.push("Maintain your strong performance in key areas");
    recommendations.push("Challenge yourself with more difficult questions");
    recommendations.push("Help others improve their interview skills");
  }
  
  return recommendations;
}

// Helper function to determine confidence trend
function determineConfidenceTrend(feedbackLogs: any[]) {
  if (feedbackLogs.length < 2) return 'stable';
  
  const midPoint = Math.ceil(feedbackLogs.length / 2);
  const firstHalfConfidence = feedbackLogs.slice(0, midPoint).reduce((sum, log) => sum + ((log as any).detailedFeedback?.behavioral?.confidence || 70), 0) / midPoint;
  const secondHalfConfidence = feedbackLogs.slice(midPoint).reduce((sum, log) => sum + ((log as any).detailedFeedback?.behavioral?.confidence || 70), 0) / (feedbackLogs.length - midPoint);
  
  const difference = secondHalfConfidence - firstHalfConfidence;
  
  if (difference > 10) return 'improving';
  if (difference < -10) return 'declining';
  return 'stable';
}

// Helper function to generate learning path
function generateLearningPath(session: any, skillGaps: string[]) {
  const currentLevel = session.performanceMetrics.overallScore < 60 ? 'beginner' : 
                      session.performanceMetrics.overallScore < 80 ? 'intermediate' : 'advanced';
  
  const targetLevel = currentLevel === 'beginner' ? 'intermediate' : 
                     currentLevel === 'intermediate' ? 'advanced' : 'expert';
  
  const estimatedTime = currentLevel === 'beginner' ? '4-6 weeks' : 
                       currentLevel === 'intermediate' ? '6-8 weeks' : '8-12 weeks';
  
  const focusAreas = skillGaps.slice(0, 3);
  const practiceExercises = [
    "Practice with mock interviews",
    "Record and review responses",
    "Study industry-specific questions"
  ];
  
  return {
    currentLevel,
    targetLevel,
    estimatedTimeToTarget: estimatedTime,
    focusAreas,
    practiceExercises
  };
}