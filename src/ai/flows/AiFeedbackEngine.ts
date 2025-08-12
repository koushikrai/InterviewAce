import { generateStructuredContent } from '../genkit';
import { AIFeedback, FeedbackScore } from '../../utils/scoreCalculator';

export interface FeedbackRequest {
  question: string;
  answer: string;
  jobTitle: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface FeedbackResponse {
  success: boolean;
  aiFeedback: AIFeedback;
  score: FeedbackScore;
  error?: string;
}

/**
 * AI Feedback Engine using genai
 * Analyzes interview responses and provides comprehensive feedback
 */
export class AiFeedbackEngine {
  
  /**
   * Analyze a user's answer and provide feedback
   */
  static async analyzeAnswer(request: FeedbackRequest): Promise<FeedbackResponse> {
    try {
      const prompt = `
        Evaluate this interview answer for a ${request.jobTitle} position.
        
        Question: ${request.question}
        Question Category: ${request.category}
        Difficulty: ${request.difficulty}
        Candidate's Answer: ${request.answer}
        
        Provide a comprehensive evaluation with the following JSON structure:
        {
          "score": 0-100,
          "feedback": "detailed feedback on the answer",
          "suggestions": ["specific improvement suggestions"],
          "keywords": ["key terms mentioned"],
          "sentiment": "positive|neutral|negative"
        }
        
        Consider:
        - Technical accuracy for technical questions
        - Communication clarity and structure
        - Problem-solving approach
        - Confidence and assertiveness
        - Relevance to the question asked
        - Completeness of the answer
        - Difficulty level appropriateness
      `;

      const fallbackFeedback: AIFeedback = {
        score: 50,
        feedback: "Unable to evaluate answer due to technical issues.",
        suggestions: ["Try to provide more specific examples."],
        keywords: [],
        sentiment: "neutral"
      };

      const aiFeedback = await generateStructuredContent<AIFeedback>(prompt, fallbackFeedback);

      // Calculate detailed score breakdown
      const score = this.calculateDetailedScore(aiFeedback);

      return {
        success: true,
        aiFeedback,
        score
      };

    } catch (error) {
      console.error('Error in AiFeedbackEngine:', error);
      return {
        success: false,
        aiFeedback: {
          score: 0,
          feedback: "Error occurred during evaluation.",
          suggestions: ["Please try again."],
          keywords: [],
          sentiment: "neutral"
        },
        score: {
          overall: 0,
          categories: { technical: 0, communication: 0, problemSolving: 0, confidence: 0 },
          breakdown: { accuracy: 0, completeness: 0, clarity: 0, relevance: 0 }
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate detailed score breakdown based on AI feedback
   */
  private static calculateDetailedScore(aiFeedback: AIFeedback): FeedbackScore {
    const baseScore = aiFeedback.score;
    
    // Calculate category scores based on feedback content
    const technicalScore = this.calculateTechnicalScore(aiFeedback);
    const communicationScore = this.calculateCommunicationScore(aiFeedback);
    const problemSolvingScore = this.calculateProblemSolvingScore(aiFeedback);
    const confidenceScore = this.calculateConfidenceScore(aiFeedback);
    
    // Calculate breakdown scores
    const accuracy = this.calculateAccuracyScore(aiFeedback);
    const completeness = this.calculateCompletenessScore(aiFeedback);
    const clarity = this.calculateClarityScore(aiFeedback);
    const relevance = this.calculateRelevanceScore(aiFeedback);
    
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
  }

  private static calculateTechnicalScore(feedback: AIFeedback): number {
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
  }

  private static calculateCommunicationScore(feedback: AIFeedback): number {
    const communicationKeywords = [
      'clear', 'concise', 'well-explained', 'articulate', 'communication',
      'explanation', 'presentation', 'clarity', 'structure', 'organized'
    ];
    
    const communicationMentions = communicationKeywords.filter(keyword =>
      feedback.feedback.toLowerCase().includes(keyword)
    ).length;
    
    const keywordScore = Math.min(communicationMentions * 8, 25);
    return Math.min(feedback.score + keywordScore, 100);
  }

  private static calculateProblemSolvingScore(feedback: AIFeedback): number {
    const problemSolvingKeywords = [
      'problem-solving', 'approach', 'methodology', 'strategy', 'solution',
      'analysis', 'critical thinking', 'logical', 'systematic', 'step-by-step'
    ];
    
    const problemSolvingMentions = problemSolvingKeywords.filter(keyword =>
      feedback.feedback.toLowerCase().includes(keyword)
    ).length;
    
    const keywordScore = Math.min(problemSolvingMentions * 8, 25);
    return Math.min(feedback.score + keywordScore, 100);
  }

  private static calculateConfidenceScore(feedback: AIFeedback): number {
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
  }

  private static calculateAccuracyScore(feedback: AIFeedback): number {
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
  }

  private static calculateCompletenessScore(feedback: AIFeedback): number {
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
  }

  private static calculateClarityScore(feedback: AIFeedback): number {
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
  }

  private static calculateRelevanceScore(feedback: AIFeedback): number {
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
  }
}
