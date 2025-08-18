import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewSession extends Document {
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  jobTitle: string;
  mode: string;
  scoreSummary: string;
  feedbackLogIds: mongoose.Types.ObjectId[];
  
  // Enhanced progress tracking
  performanceMetrics: {
    overallScore: number;
    communicationScore: number;
    technicalScore: number;
    behavioralScore: number;
    confidenceScore: number;
    improvementRate: number;
  };
  
  // Session analytics
  sessionAnalytics: {
    totalQuestions: number;
    answeredQuestions: number;
    averageResponseTime: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
    categoryPerformance: {
      technical: number;
      behavioral: number;
      situational: number;
      general: number;
    };
  };
  
  // Progress insights
  progressInsights: {
    strengths: string[];
    weaknesses: string[];
    improvementAreas: string[];
    nextSteps: string[];
    confidenceTrend: 'improving' | 'stable' | 'declining';
    skillGaps: string[];
    recommendations: string[];
  };
  
  // Learning path
  learningPath: {
    currentLevel: string;
    targetLevel: string;
    estimatedTimeToTarget: string;
    focusAreas: string[];
    practiceExercises: string[];
  };
}

const InterviewSessionSchema = new Schema<IInterviewSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' }, // add the "required : true" when everything is working perfectly
  createdAt: { type: Date, default: Date.now },
  jobTitle: { type: String, required: true },
  mode: { type: String, enum: ['text', 'voice'], required: true },
  scoreSummary: { type: String },
  feedbackLogIds: [{ type: Schema.Types.ObjectId, ref: 'FeedbackLog' }],
  
  // Enhanced progress tracking
  performanceMetrics: {
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    communicationScore: { type: Number, min: 0, max: 100, default: 0 },
    technicalScore: { type: Number, min: 0, max: 100, default: 0 },
    behavioralScore: { type: Number, min: 0, max: 100, default: 0 },
    confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
    improvementRate: { type: Number, min: 0, max: 100, default: 0 }
  },
  
  // Session analytics
  sessionAnalytics: {
    totalQuestions: { type: Number, default: 0 },
    answeredQuestions: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 },
    difficultyDistribution: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 }
    },
    categoryPerformance: {
      technical: { type: Number, min: 0, max: 100, default: 0 },
      behavioral: { type: Number, min: 0, max: 100, default: 0 },
      situational: { type: Number, min: 0, max: 100, default: 0 },
      general: { type: Number, min: 0, max: 100, default: 0 }
    }
  },
  
  // Progress insights
  progressInsights: {
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    improvementAreas: [{ type: String }],
    nextSteps: [{ type: String }],
    confidenceTrend: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' },
    skillGaps: [{ type: String }],
    recommendations: [{ type: String }]
  },
  
  // Learning path
  learningPath: {
    currentLevel: { type: String, default: 'beginner' },
    targetLevel: { type: String, default: 'intermediate' },
    estimatedTimeToTarget: { type: String, default: '4-6 weeks' },
    focusAreas: [{ type: String }],
    practiceExercises: [{ type: String }]
  }
});

export default mongoose.model<IInterviewSession>('InterviewSession', InterviewSessionSchema); 