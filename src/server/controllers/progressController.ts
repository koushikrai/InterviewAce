import { Request, Response } from 'express';
import InterviewSession from '../../models/interviewModel.js';
import FeedbackLog from '../../models/feedbackLogModel.js';
import Resume from '../../models/resumeModel.js';
import { generateProgressAnalytics } from '../services/aiService.js';

export const getUserProgress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { timeRange = '30d' } = req.query;

    // Get user's interview sessions
    const sessions = await InterviewSession.find({ userId }).sort({ createdAt: -1 });
    
    if (sessions.length === 0) {
      return res.json({
        overallProgress: {
          totalInterviews: 0,
          averageScore: 0,
          improvementRate: 0,
          confidenceTrend: 'stable'
        },
        skillBreakdown: {
          technical: { score: 0, trend: 'stable', focusAreas: [] },
          communication: { score: 0, trend: 'stable', focusAreas: [] },
          behavioral: { score: 0, trend: 'stable', focusAreas: [] }
        },
        recentSessions: [],
        recommendations: [
          "Start your first interview to begin tracking progress",
          "Upload your resume for personalized insights",
          "Practice with different question categories"
        ],
        learningPath: {
          currentLevel: 'beginner',
          targetLevel: 'intermediate',
          estimatedTime: '4-6 weeks',
          milestones: []
        }
      });
    }

    // Calculate overall progress metrics
    const totalSessions = sessions.length;
    const totalQuestions = sessions.reduce((sum, session) => sum + session.sessionAnalytics.totalQuestions, 0);
    const answeredQuestions = sessions.reduce((sum, session) => sum + session.sessionAnalytics.answeredQuestions, 0);
    const completionRate = Math.round((answeredQuestions / totalQuestions) * 100);

    // Calculate average scores
    const overallScores = sessions.map(s => s.performanceMetrics.overallScore).filter(score => score > 0);
    const averageScore = overallScores.length > 0 ? Math.round(overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length) : 0;

    // Calculate improvement rate (compare first half vs second half of sessions)
    const sortedSessions = sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const midPoint = Math.ceil(sortedSessions.length / 2);
    const firstHalfAvg = sortedSessions.slice(0, midPoint).reduce((sum, session) => sum + session.performanceMetrics.overallScore, 0) / midPoint;
    const secondHalfAvg = sortedSessions.slice(midPoint).reduce((sum, session) => sum + session.performanceMetrics.overallScore, 0) / (sortedSessions.length - midPoint);
    const improvementRate = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);

    // Determine confidence trend
    const confidenceTrend = determineOverallConfidenceTrend(sessions);

    // Calculate skill breakdown
    const skillBreakdown = calculateSkillBreakdown(sessions);

    // Get recent sessions with key metrics
    const recentSessions = sessions.slice(0, 5).map(session => ({
      id: session._id,
      jobTitle: session.jobTitle,
      date: session.createdAt,
      overallScore: session.performanceMetrics.overallScore,
      completionRate: Math.round((session.sessionAnalytics.answeredQuestions / session.sessionAnalytics.totalQuestions) * 100),
      strengths: session.progressInsights.strengths.slice(0, 3),
      improvements: session.progressInsights.improvements.slice(0, 3)
    }));

    // Generate AI-powered recommendations
    const recommendations = await generateAIRecommendations(sessions, skillBreakdown);

    // Generate learning path
    const learningPath = generateLearningPath(averageScore, skillBreakdown);

    res.json({
      overallProgress: {
        totalInterviews: totalSessions,
        totalQuestions,
        answeredQuestions,
        completionRate,
        averageScore,
        improvementRate,
        confidenceTrend
      },
      skillBreakdown,
      recentSessions,
      recommendations,
      learningPath,
      timeRange
    });

  } catch (error) {
    console.error('getUserProgress error:', error);
    res.status(500).json({ message: 'Failed to get user progress' });
  }
};

export const getSessionAnalytics = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findById(sessionId).populate('feedbackLogIds');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Get detailed feedback logs
    const feedbackLogs = await FeedbackLog.find({ _id: { $in: session.feedbackLogIds } });

    // Calculate detailed analytics
    const analytics = {
      sessionInfo: {
        id: session._id,
        jobTitle: session.jobTitle,
        mode: session.mode,
        date: session.createdAt,
        totalQuestions: session.sessionAnalytics.totalQuestions,
        answeredQuestions: session.sessionAnalytics.answeredQuestions
      },
      performanceMetrics: session.performanceMetrics,
      sessionAnalytics: session.sessionAnalytics,
      progressInsights: session.progressInsights,
      learningPath: session.learningPath,
      detailedFeedback: {
        questionBreakdown: feedbackLogs.map(log => ({
          question: log.question,
          score: log.score,
          category: log.questionCategory,
          difficulty: log.difficulty,
          strengths: log.detailedFeedback?.overall?.strengths || [],
          improvements: log.detailedFeedback?.overall?.improvements || [],
          confidenceLevel: log.confidenceLevel
        })),
        categoryPerformance: calculateCategoryPerformance(feedbackLogs),
        difficultyAnalysis: calculateDifficultyAnalysis(feedbackLogs),
        improvementTrend: calculateImprovementTrend(feedbackLogs)
      }
    };

    res.json(analytics);

  } catch (error) {
    console.error('getSessionAnalytics error:', error);
    res.status(500).json({ message: 'Failed to get session analytics' });
  }
};

export const getComparativeAnalysis = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { compareWith = 'previous_month' } = req.query;

    // Get user's sessions for comparison
    const currentPeriod = getTimeRange(compareWith as string);
    const previousPeriod = getPreviousTimeRange(compareWith as string);

    const currentSessions = await InterviewSession.find({
      userId,
      createdAt: { $gte: currentPeriod.start, $lte: currentPeriod.end }
    });

    const previousSessions = await InterviewSession.find({
      userId,
      createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end }
    });

    // Calculate comparison metrics
    const comparison = {
      currentPeriod: {
        sessions: currentSessions.length,
        averageScore: calculateAverageScore(currentSessions),
        completionRate: calculateCompletionRate(currentSessions),
        skillBreakdown: calculateSkillBreakdown(currentSessions)
      },
      previousPeriod: {
        sessions: previousSessions.length,
        averageScore: calculateAverageScore(previousSessions),
        completionRate: calculateCompletionRate(previousSessions),
        skillBreakdown: calculateSkillBreakdown(previousSessions)
      },
      improvements: calculateImprovements(currentSessions, previousSessions),
      trends: identifyTrends(currentSessions, previousSessions)
    };

    res.json(comparison);

  } catch (error) {
    console.error('getComparativeAnalysis error:', error);
    res.status(500).json({ message: 'Failed to get comparative analysis' });
  }
};

// Helper functions
function determineOverallConfidenceTrend(sessions: any[]) {
  if (sessions.length < 2) return 'stable';

  const sortedSessions = sessions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const firstHalf = sortedSessions.slice(0, Math.ceil(sortedSessions.length / 2));
  const secondHalf = sortedSessions.slice(Math.ceil(sortedSessions.length / 2));

  const firstHalfConfidence = firstHalf.reduce((sum, session) => sum + session.performanceMetrics.confidenceScore, 0) / firstHalf.length;
  const secondHalfConfidence = secondHalf.reduce((sum, session) => sum + session.performanceMetrics.confidenceScore, 0) / secondHalf.length;

  const difference = secondHalfConfidence - firstHalfConfidence;
  if (difference > 10) return 'improving';
  if (difference < -10) return 'declining';
  return 'stable';
}

function calculateSkillBreakdown(sessions: any[]) {
  const technicalScores = sessions.map(s => s.performanceMetrics.technicalScore).filter(score => score > 0);
  const communicationScores = sessions.map(s => s.performanceMetrics.communicationScore).filter(score => score > 0);
  const behavioralScores = sessions.map(s => s.performanceMetrics.behavioralScore).filter(score => score > 0);

  return {
    technical: {
      score: technicalScores.length > 0 ? Math.round(technicalScores.reduce((sum, score) => sum + score, 0) / technicalScores.length) : 0,
      trend: determineTrend(technicalScores),
      focusAreas: getFocusAreas(sessions, 'technical')
    },
    communication: {
      score: communicationScores.length > 0 ? Math.round(communicationScores.reduce((sum, score) => sum + score, 0) / communicationScores.length) : 0,
      trend: determineTrend(communicationScores),
      focusAreas: getFocusAreas(sessions, 'communication')
    },
    behavioral: {
      score: behavioralScores.length > 0 ? Math.round(behavioralScores.reduce((sum, score) => sum + score, 0) / behavioralScores.length) : 0,
      trend: determineTrend(behavioralScores),
      focusAreas: getFocusAreas(sessions, 'behavioral')
    }
  };
}

function determineTrend(scores: number[]) {
  if (scores.length < 2) return 'stable';
  
  const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
  const secondHalf = scores.slice(Math.ceil(scores.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
  
  const difference = secondAvg - firstAvg;
  if (difference > 10) return 'improving';
  if (difference < -10) return 'declining';
  return 'stable';
}

function getFocusAreas(sessions: any[], skillType: string) {
  const focusAreas: string[] = [];
  sessions.forEach(session => {
    if (session.progressInsights.improvementAreas) {
      focusAreas.push(...session.progressInsights.improvementAreas);
    }
  });
  
  // Return unique focus areas, limited to 3
  return [...new Set(focusAreas)].slice(0, 3);
}

function calculateCategoryPerformance(feedbackLogs: any[]) {
  const categories = ['technical', 'behavioral', 'situational', 'general'];
  const performance: any = {};
  
  categories.forEach(category => {
    const categoryLogs = feedbackLogs.filter(log => log.questionCategory === category);
    if (categoryLogs.length > 0) {
      const scores = categoryLogs.map(log => log.score);
      performance[category] = {
        count: categoryLogs.length,
        averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
        strengths: getCategoryStrengths(categoryLogs),
        improvements: getCategoryImprovements(categoryLogs)
      };
    } else {
      performance[category] = { count: 0, averageScore: 0, strengths: [], improvements: [] };
    }
  });
  
  return performance;
}

function calculateDifficultyAnalysis(feedbackLogs: any[]) {
  const difficulties = ['easy', 'medium', 'hard'];
  const analysis: any = {};
  
  difficulties.forEach(difficulty => {
    const difficultyLogs = feedbackLogs.filter(log => log.difficulty === difficulty);
    if (difficultyLogs.length > 0) {
      const scores = difficultyLogs.map(log => log.score);
      analysis[difficulty] = {
        count: difficultyLogs.length,
        averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
        performance: scores.reduce((sum, score) => sum + score, 0) / scores.length >= 80 ? 'excellent' :
                    scores.reduce((sum, score) => sum + score, 0) / scores.length >= 70 ? 'good' :
                    scores.reduce((sum, score) => sum + score, 0) / scores.length >= 60 ? 'fair' : 'needs_improvement'
      };
    } else {
      analysis[difficulty] = { count: 0, averageScore: 0, performance: 'no_data' };
    }
  });
  
  return analysis;
}

function calculateImprovementTrend(feedbackLogs: any[]) {
  if (feedbackLogs.length < 2) return 'insufficient_data';
  
  const sortedLogs = feedbackLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const midPoint = Math.ceil(sortedLogs.length / 2);
  const firstHalf = sortedLogs.slice(0, midPoint);
  const secondHalf = sortedLogs.slice(midPoint);
  
  const firstAvg = firstHalf.reduce((sum, log) => sum + log.score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, log) => sum + log.score, 0) / secondHalf.length;
  
  const improvement = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (improvement > 15) return 'significant_improvement';
  if (improvement > 5) return 'moderate_improvement';
  if (improvement > -5) return 'stable';
  if (improvement > -15) return 'slight_decline';
  return 'significant_decline';
}

function getCategoryStrengths(logs: any[]) {
  const strengths: string[] = [];
  logs.forEach(log => {
    if (log.detailedFeedback?.overall?.strengths) {
      strengths.push(...log.detailedFeedback.overall.strengths);
    }
  });
  return [...new Set(strengths)].slice(0, 3);
}

function getCategoryImprovements(logs: any[]) {
  const improvements: string[] = [];
  logs.forEach(log => {
    if (log.detailedFeedback?.overall?.improvements) {
      improvements.push(...log.detailedFeedback.overall.improvements);
    }
  });
  return [...new Set(improvements)].slice(0, 3);
}

function generateLearningPath(averageScore: number, skillBreakdown: any) {
  const currentLevel = averageScore < 60 ? 'beginner' : 
                      averageScore < 80 ? 'intermediate' : 'advanced';
  
  const targetLevel = currentLevel === 'beginner' ? 'intermediate' : 
                     currentLevel === 'intermediate' ? 'advanced' : 'expert';
  
  const estimatedTime = currentLevel === 'beginner' ? '4-6 weeks' : 
                       currentLevel === 'intermediate' ? '6-8 weeks' : '8-12 weeks';
  
  // Identify focus areas based on skill breakdown
  const focusAreas = Object.entries(skillBreakdown)
    .filter(([_, data]: [string, any]) => data.score < 75)
    .map(([skill, _]: [string, any]) => skill)
    .slice(0, 3);
  
  const practiceExercises = [
    "Practice with mock interviews",
    "Record and review responses",
    "Study industry-specific questions",
    "Work on communication clarity",
    "Build confidence through repetition"
  ];
  
  return {
    currentLevel,
    targetLevel,
    estimatedTimeToTarget: estimatedTime,
    focusAreas: focusAreas.length > 0 ? focusAreas : ['general improvement'],
    practiceExercises
  };
}

async function generateAIRecommendations(sessions: any[], skillBreakdown: any) {
  try {
    // This would integrate with AI service for personalized recommendations
    // For now, return intelligent recommendations based on data analysis
    
    const recommendations = [];
    
    // Analyze overall performance
    const averageScore = sessions.reduce((sum, session) => sum + session.performanceMetrics.overallScore, 0) / sessions.length;
    
    if (averageScore < 70) {
      recommendations.push("Focus on fundamental interview techniques and practice regularly");
      recommendations.push("Work on building confidence through mock interviews");
      recommendations.push("Review and practice common behavioral questions");
    } else if (averageScore < 85) {
      recommendations.push("Challenge yourself with more difficult questions");
      recommendations.push("Focus on specific areas for improvement");
      recommendations.push("Practice industry-specific technical questions");
    } else {
      recommendations.push("Maintain your excellent performance");
      recommendations.push("Help others improve their interview skills");
      recommendations.push("Consider advanced interview preparation techniques");
    }
    
    // Add skill-specific recommendations
    Object.entries(skillBreakdown).forEach(([skill, data]: [string, any]) => {
      if (data.score < 70) {
        recommendations.push(`Focus on improving ${skill} skills through targeted practice`);
      }
    });
    
    return recommendations.slice(0, 5);
    
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return [
      "Practice regularly with mock interviews",
      "Focus on areas where you scored lower",
      "Build confidence through repetition"
    ];
  }
}

function getTimeRange(timeRange: string) {
  const now = new Date();
  const start = new Date();
  
  switch (timeRange) {
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case '6m':
      start.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setDate(now.getDate() - 30);
  }
  
  return { start, end: now };
}

function getPreviousTimeRange(timeRange: string) {
  const now = new Date();
  const { start } = getTimeRange(timeRange);
  const duration = now.getTime() - start.getTime();
  
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  
  return { start: previousStart, end: previousEnd };
}

function calculateAverageScore(sessions: any[]) {
  if (sessions.length === 0) return 0;
  const scores = sessions.map(s => s.performanceMetrics.overallScore).filter(score => score > 0);
  return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
}

function calculateCompletionRate(sessions: any[]) {
  if (sessions.length === 0) return 0;
  const totalQuestions = sessions.reduce((sum, session) => sum + session.sessionAnalytics.totalQuestions, 0);
  const answeredQuestions = sessions.reduce((sum, session) => sum + session.sessionAnalytics.answeredQuestions, 0);
  return totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
}

function calculateImprovements(currentSessions: any[], previousSessions: any[]) {
  const currentAvg = calculateAverageScore(currentSessions);
  const previousAvg = calculateAverageScore(previousSessions);
  
  if (previousAvg === 0) return { score: 0, percentage: 0, trend: 'no_previous_data' };
  
  const improvement = currentAvg - previousAvg;
  const percentage = Math.round((improvement / previousAvg) * 100);
  
  return {
    score: improvement,
    percentage,
    trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable'
  };
}

function identifyTrends(currentSessions: any[], previousSessions: any[]) {
  const trends = {
    score: calculateImprovements(currentSessions, previousSessions),
    completion: {
      current: calculateCompletionRate(currentSessions),
      previous: calculateCompletionRate(previousSessions)
    },
    confidence: {
      current: currentSessions.length > 0 ? 
        currentSessions.reduce((sum, s) => sum + s.performanceMetrics.confidenceScore, 0) / currentSessions.length : 0,
      previous: previousSessions.length > 0 ? 
        previousSessions.reduce((sum, s) => sum + s.performanceMetrics.confidenceScore, 0) / previousSessions.length : 0
    }
  };
  
  return trends;
}
