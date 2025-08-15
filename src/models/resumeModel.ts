import mongoose, { Schema, Document } from 'mongoose';

export interface IResume extends Document {
  userId?: mongoose.Types.ObjectId;
  originalFile: string;
  parsedData: any;
  resumeScore: number;
  suggestions: string[];
}

const ResumeSchema = new Schema<IResume>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  originalFile: { type: String, required: true },
  parsedData: { type: Schema.Types.Mixed },
  resumeScore: { type: Number },
  suggestions: [{ type: String }],
});

export default mongoose.model<IResume>('Resume', ResumeSchema); 