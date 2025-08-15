import mongoose, { Schema, Document } from 'mongoose';

export interface IResume extends Document {
  userId?: mongoose.Types.ObjectId;
  originalFile: string;
  parsedData: any;
  resumeScore: number;
  suggestions: string[];
  skillGaps?: string[];
  keywordMatch?: number;
  atsScore?: {
    overall: number;
    technical: number;
    soft: number;
    formatting: number;
  };
  jobMatch?: {
    skillsMatch: number;
    experienceMatch: boolean;
    educationMatch: boolean;
    overallMatch: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  originalFile: { type: String, required: true },
  parsedData: { type: Schema.Types.Mixed },
  resumeScore: { type: Number, default: 0 },
  suggestions: [{ type: String }],
  skillGaps: [{ type: String }],
  keywordMatch: { type: Number, min: 0, max: 100 },
  atsScore: {
    overall: { type: Number, min: 0, max: 100, default: 0 },
    technical: { type: Number, min: 0, max: 100, default: 0 },
    soft: { type: Number, min: 0, max: 100, default: 0 },
    formatting: { type: Number, min: 0, max: 100, default: 0 }
  },
  jobMatch: {
    skillsMatch: { type: Number, min: 0, max: 100, default: 0 },
    experienceMatch: { type: Boolean, default: false },
    educationMatch: { type: Boolean, default: false },
    overallMatch: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

export default mongoose.model<IResume>('Resume', ResumeSchema); 