/**
 * Score Calculator Utility
 * Quantifies feedback from AI and calculates various performance metrics
 */

export interface FeedbackScore {
  overall: number; // 0-100 overall score
  categories: {
    technical: number; // 0-100 technical knowledge
    communication: number; // 0-100 communication skills
    problemSolving: number; // 0-100 problem solving ability
    confidence: number; // 0-100 confidence level
  };
  breakdown: {
    accuracy: number; // 0-100 answer accuracy
    completeness: number; // 0-100 answer completeness
    clarity: number; // 0-100 answer clarity
    relevance: number; // 0-100 answer relevance
  };
}

export interface AIFeedback {
  score: number; // 0-100 raw score from AI
  feedback: string; // Detailed feedback text
  suggestions: string[]; // Improvement suggestions
  keywords: string[]; // Key terms mentioned
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface InterviewSession {
  id: string;
  questions: Array<{
    id: string;
    question: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  answers: Array<{
    questionId: string;
    answer: string;
    aiFeedback: AIFeedback;
    score: FeedbackScore;
  }>;
  metadata: {
    jobTitle: string;
    duration: number; // in minutes
    mode: 'text' | 'voice';
    timestamp: Date;
  };
}

/**
 * Calculate overall score from AI feedback
 */
export const calculateFeedbackScore = (aiFeedback: AIFeedback): FeedbackScore => {
  const baseScore = aiFeedback.score;
  
  // Calculate category scores based on feedback content
  const technicalScore = calculateTechnicalScore(aiFeedback);
  const communicationScore = calculateCommunicationScore(aiFeedback);
  const problemSolvingScore = calculateProblemSolvingScore(aiFeedback);
  const confidenceScore = calculateConfidenceScore(aiFeedback);
  
  // Calculate breakdown scores
  const accuracy = calculateAccuracyScore(aiFeedback);
  const completeness = calculateCompletenessScore(aiFeedback);
  const clarity = calculateClarityScore(aiFeedback);
  const relevance = calculateRelevanceScore(aiFeedback);
  
  return {
    overall: Math.round(baseScore),
    categories: {
      technical: Math.round(technicalScore),
      communication: Math.round(communicationScore),
      problemSolving: Math.round(problemSolvingScore),
      confidence: Math.round(confidenceScore)
    },
    breakdown: {
      accuracy: Math.round(accuracy),
      completeness: Math.round(completeness),
      clarity: Math.round(clarity),
      relevance: Math.round(relevance)
    }
  };
};

/**
 * Calculate technical knowledge score based on feedback keywords
 */
const calculateTechnicalScore = (feedback: AIFeedback): number => {
  const technicalKeywords = [
    'technical', 'knowledge', 'expertise', 'skills', 'proficiency',
    'understanding', 'concept', 'implementation', 'architecture',
    'algorithm', 'data structure', 'framework', 'technology'
  ];
  
  const technicalMentions = technicalKeywords.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const keywordScore = Math.min(technicalMentions * 10, 30);
  return Math.min(feedback.score + keywordScore, 100);
};

/**
 * Calculate communication skills score
 */
const calculateCommunicationScore = (feedback: AIFeedback): number => {
  const communicationKeywords = [
    'clear', 'concise', 'well-explained', 'articulate', 'communication',
    'explanation', 'presentation', 'clarity', 'structure', 'organized'
  ];
  
  const communicationMentions = communicationKeywords.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const keywordScore = Math.min(communicationMentions * 8, 25);
  return Math.min(feedback.score + keywordScore, 100);
};

/**
 * Calculate problem solving ability score
 */
const calculateProblemSolvingScore = (feedback: AIFeedback): number => {
  const problemSolvingKeywords = [
    'problem-solving', 'approach', 'methodology', 'strategy', 'solution',
    'analysis', 'critical thinking', 'logical', 'systematic', 'step-by-step'
  ];
  
  const problemSolvingMentions = problemSolvingKeywords.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const keywordScore = Math.min(problemSolvingMentions * 8, 25);
  return Math.min(feedback.score + keywordScore, 100);
};

/**
 * Calculate confidence level score
 */
const calculateConfidenceScore = (feedback: AIFeedback): number => {
  const confidenceKeywords = [
    'confident', 'assured', 'certain', 'definitive', 'authoritative',
    'hesitant', 'uncertain', 'unsure', 'tentative', 'doubtful'
  ];
  
  const positiveConfidence = ['confident', 'assured', 'certain', 'definitive', 'authoritative'];
  const negativeConfidence = ['hesitant', 'uncertain', 'unsure', 'tentative', 'doubtful'];
  
  const positiveMentions = positiveConfidence.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const negativeMentions = negativeConfidence.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const confidenceAdjustment = (positiveMentions - negativeMentions) * 5;
  return Math.max(0, Math.min(100, feedback.score + confidenceAdjustment));
};

/**
 * Calculate accuracy score based on feedback sentiment and content
 */
const calculateAccuracyScore = (feedback: AIFeedback): number => {
  const accuracyKeywords = [
    'correct', 'accurate', 'right', 'proper', 'valid',
    'incorrect', 'wrong', 'inaccurate', 'mistake', 'error'
  ];
  
  const positiveAccuracy = ['correct', 'accurate', 'right', 'proper', 'valid'];
  const negativeAccuracy = ['incorrect', 'wrong', 'inaccurate', 'mistake', 'error'];
  
  const positiveMentions = positiveAccuracy.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const negativeMentions = negativeAccuracy.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const accuracyAdjustment = (positiveMentions - negativeMentions) * 8;
  return Math.max(0, Math.min(100, feedback.score + accuracyAdjustment));
};

/**
 * Calculate completeness score
 */
const calculateCompletenessScore = (feedback: AIFeedback): number => {
  const completenessKeywords = [
    'complete', 'comprehensive', 'thorough', 'detailed', 'extensive',
    'incomplete', 'missing', 'lacking', 'brief', 'superficial'
  ];
  
  const positiveCompleteness = ['complete', 'comprehensive', 'thorough', 'detailed', 'extensive'];
  const negativeCompleteness = ['incomplete', 'missing', 'lacking', 'brief', 'superficial'];
  
  const positiveMentions = positiveCompleteness.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const negativeMentions = negativeCompleteness.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const completenessAdjustment = (positiveMentions - negativeMentions) * 8;
  return Math.max(0, Math.min(100, feedback.score + completenessAdjustment));
};

/**
 * Calculate clarity score
 */
const calculateClarityScore = (feedback: AIFeedback): number => {
  const clarityKeywords = [
    'clear', 'clear', 'understandable', 'well-explained', 'lucid',
    'unclear', 'confusing', 'vague', 'ambiguous', 'unclear'
  ];
  
  const positiveClarity = ['clear', 'understandable', 'well-explained', 'lucid'];
  const negativeClarity = ['unclear', 'confusing', 'vague', 'ambiguous'];
  
  const positiveMentions = positiveClarity.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const negativeMentions = negativeClarity.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const clarityAdjustment = (positiveMentions - negativeMentions) * 8;
  return Math.max(0, Math.min(100, feedback.score + clarityAdjustment));
};

/**
 * Calculate relevance score
 */
const calculateRelevanceScore = (feedback: AIFeedback): number => {
  const relevanceKeywords = [
    'relevant', 'pertinent', 'appropriate', 'suitable', 'applicable',
    'irrelevant', 'off-topic', 'unrelated', 'inappropriate', 'tangential'
  ];
  
  const positiveRelevance = ['relevant', 'pertinent', 'appropriate', 'suitable', 'applicable'];
  const negativeRelevance = ['irrelevant', 'off-topic', 'unrelated', 'inappropriate', 'tangential'];
  
  const positiveMentions = positiveRelevance.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const negativeMentions = negativeRelevance.filter(keyword =>
    feedback.feedback.toLowerCase().includes(keyword)
  ).length;
  
  const relevanceAdjustment = (positiveMentions - negativeMentions) * 8;
  return Math.max(0, Math.min(100, feedback.score + relevanceAdjustment));
};

/**
 * Calculate session summary statistics
 */
export const calculateSessionSummary = (session: InterviewSession) => {
  const scores = session.answers.map(answer => answer.score);
  
  const averageOverall = scores.reduce((sum, score) => sum + score.overall, 0) / scores.length;
  
  const categoryAverages = {
    technical: scores.reduce((sum, score) => sum + score.categories.technical, 0) / scores.length,
    communication: scores.reduce((sum, score) => sum + score.categories.communication, 0) / scores.length,
    problemSolving: scores.reduce((sum, score) => sum + score.categories.problemSolving, 0) / scores.length,
    confidence: scores.reduce((sum, score) => sum + score.categories.confidence, 0) / scores.length
  };
  
  const breakdownAverages = {
    accuracy: scores.reduce((sum, score) => sum + score.breakdown.accuracy, 0) / scores.length,
    completeness: scores.reduce((sum, score) => sum + score.breakdown.completeness, 0) / scores.length,
    clarity: scores.reduce((sum, score) => sum + score.breakdown.clarity, 0) / scores.length,
    relevance: scores.reduce((sum, score) => sum + score.breakdown.relevance, 0) / scores.length
  };
  
  return {
    totalQuestions: session.questions.length,
    answeredQuestions: session.answers.length,
    averageScore: Math.round(averageOverall),
    categoryScores: {
      technical: Math.round(categoryAverages.technical),
      communication: Math.round(categoryAverages.communication),
      problemSolving: Math.round(categoryAverages.problemSolving),
      confidence: Math.round(categoryAverages.confidence)
    },
    breakdownScores: {
      accuracy: Math.round(breakdownAverages.accuracy),
      completeness: Math.round(breakdownAverages.completeness),
      clarity: Math.round(breakdownAverages.clarity),
      relevance: Math.round(breakdownAverages.relevance)
    },
    performance: getPerformanceLevel(averageOverall)
  };
};

/**
 * Get performance level based on score
 */
export const getPerformanceLevel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 50) return 'Needs Improvement';
  return 'Poor';
};

/**
 * Generate improvement suggestions based on scores
 */
export const generateImprovementSuggestions = (scores: FeedbackScore): string[] => {
  const suggestions: string[] = [];
  
  if (scores.categories.technical < 70) {
    suggestions.push('Focus on strengthening your technical knowledge and understanding of core concepts.');
  }
  
  if (scores.categories.communication < 70) {
    suggestions.push('Work on clearly articulating your thoughts and explaining complex concepts simply.');
  }
  
  if (scores.categories.problemSolving < 70) {
    suggestions.push('Practice breaking down problems into smaller steps and explaining your approach.');
  }
  
  if (scores.categories.confidence < 70) {
    suggestions.push('Build confidence by practicing more and preparing thoroughly for common questions.');
  }
  
  if (scores.breakdown.accuracy < 70) {
    suggestions.push('Double-check your answers for accuracy and verify technical details.');
  }
  
  if (scores.breakdown.completeness < 70) {
    suggestions.push('Provide more comprehensive answers that cover all aspects of the question.');
  }
  
  if (scores.breakdown.clarity < 70) {
    suggestions.push('Structure your answers clearly with a logical flow and use examples when possible.');
  }
  
  if (scores.breakdown.relevance < 70) {
    suggestions.push('Ensure your answers directly address the question asked.');
  }
  
  return suggestions.length > 0 ? suggestions : ['Great job! Keep practicing to maintain your strong performance.'];
}; 