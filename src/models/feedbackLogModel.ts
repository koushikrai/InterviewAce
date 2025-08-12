import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedbackLog extends Document {
  sessionId: mongoose.Types.ObjectId;
  question: string;
  userAnswer: string;
  aiFeedback: string;
  score: number;
  timestamp: Date;
}

const FeedbackLogSchema = new Schema<IFeedbackLog>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'InterviewSession', required: true },
  question: { type: String, required: true },
  userAnswer: { type: String, required: true },
  aiFeedback: { type: String },
  score: { type: Number },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IFeedbackLog>('FeedbackLog', FeedbackLogSchema); 