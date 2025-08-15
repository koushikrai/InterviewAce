import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewSession extends Document {
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  jobTitle: string;
  mode: string;
  scoreSummary: string;
  feedbackLogIds: mongoose.Types.ObjectId[];
}

const InterviewSessionSchema = new Schema<IInterviewSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' }, // add the "required : true" when everything is working perfectly
  createdAt: { type: Date, default: Date.now },
  jobTitle: { type: String, required: true },
  mode: { type: String, enum: ['text', 'voice'], required: true },
  scoreSummary: { type: String },
  feedbackLogIds: [{ type: Schema.Types.ObjectId, ref: 'FeedbackLog' }],
});

export default mongoose.model<IInterviewSession>('InterviewSession', InterviewSessionSchema); 