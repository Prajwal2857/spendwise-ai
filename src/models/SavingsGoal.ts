import mongoose, { Schema, Document } from "mongoose";

export interface ISavingsGoal extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  icon?: string;
  color?: string;
  createdAt: Date;
}

const SavingsGoalSchema = new Schema<ISavingsGoal>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, default: 0 },
  targetDate: { type: Date },
  icon: { type: String },
  color: { type: String },
  createdAt: { type: Date, default: Date.now },
});

SavingsGoalSchema.index({ userId: 1 });

export default mongoose.models.SavingsGoal || mongoose.model<ISavingsGoal>("SavingsGoal", SavingsGoalSchema);
