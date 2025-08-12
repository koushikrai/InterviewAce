import mongoose, { Schema, Document } from 'mongoose';

export interface IJobDescription extends Document {
  title: string;
  content: string;
  parsedSkills: string[];
  uploadedBy: mongoose.Types.ObjectId;
}

const JobDescriptionSchema = new Schema<IJobDescription>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  parsedSkills: [{ type: String }],
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.model<IJobDescription>('JobDescription', JobDescriptionSchema); 