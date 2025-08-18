import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedbackLog extends Document {
  sessionId: mongoose.Types.ObjectId;
  question: string;
  userAnswer: string;
  aiFeedback: string;
  score: number;
  timestamp: Date;
  
  // Enhanced feedback analysis
  detailedFeedback: {
    communication: {
      clarity: number;
      articulation: number;
      structure: number;
      overall: number;
    };
    technical: {
      accuracy: number;
      depth: number;
      relevance: number;
      overall: number;
    };
    behavioral: {
      confidence: number;
      examples: number;
      storytelling: number;
      overall: number;
    };
    overall: {
      score: number;
      strengths: string[];
      improvements: string[];
      sentiment: 'positive' | 'neutral' | 'negative';
    };
  };
  
  // Progress tracking
  improvementAreas: string[];
  nextSteps: string[];
  confidenceLevel: 'low' | 'medium' | 'high';
  
  // Question metadata
  questionCategory: string;
  difficulty: string;
  expectedKeywords: string[];
  userKeywords: string[];
  keywordMatch: number;
}

const FeedbackLogSchema = new Schema<IFeedbackLog>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'InterviewSession', required: true },
  question: { type: String, required: true },
  userAnswer: { type: String, required: true },
  aiFeedback: { type: String },
  score: { type: Number },
  timestamp: { type: Date, default: Date.now },
  
  // Enhanced feedback analysis
  detailedFeedback: {
    communication: {
      clarity: { type: Number, min: 0, max: 100, default: 0 },
      articulation: { type: Number, min: 0, max: 100, default: 0 },
      structure: { type: Number, min: 0, max: 100, default: 0 },
      overall: { type: Number, min: 0, max: 100, default: 0 }
    },
    technical: {
      accuracy: { type: Number, min: 0, max: 100, default: 0 },
      depth: { type: Number, min: 0, max: 100, default: 0 },
      relevance: { type: Number, min: 0, max: 100, default: 0 },
      overall: { type: Number, min: 0, max: 100, default: 0 }
    },
    behavioral: {
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      examples: { type: Number, min: 0, max: 100, default: 0 },
      storytelling: { type: Number, min: 0, max: 100, default: 0 },
      overall: { type: Number, min: 0, max: 100, default: 0 }
    },
    overall: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      strengths: [{ type: String }],
      improvements: [{ type: String }],
      sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
    }
  },
  
  // Progress tracking
  improvementAreas: [{ type: String }],
  nextSteps: [{ type: String }],
  confidenceLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  
  // Question metadata
  questionCategory: { type: String, default: 'general' },
  difficulty: { type: String, default: 'medium' },
  expectedKeywords: [{ type: String }],
  userKeywords: [{ type: String }],
  keywordMatch: { type: Number, min: 0, max: 100, default: 0 }
});

export default mongoose.model<IFeedbackLog>('FeedbackLog', FeedbackLogSchema); 