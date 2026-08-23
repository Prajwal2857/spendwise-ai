import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  profileImage?: string;
  currency: string;
  role: "user" | "admin";
  onboardingCompleted: boolean;
  monthlyIncome?: number;
  preferredCategories?: string[];
  notificationPreferences: {
    budgetWarnings: boolean;
    subscriptionReminders: boolean;
    spendingAlerts: boolean;
    savingsMilestones: boolean;
  };
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  profileImage: { type: String },
  currency: { type: String, default: "INR" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  onboardingCompleted: { type: Boolean, default: false },
  monthlyIncome: { type: Number },
  preferredCategories: [{ type: String }],
  notificationPreferences: {
    budgetWarnings: { type: Boolean, default: true },
    subscriptionReminders: { type: Boolean, default: true },
    spendingAlerts: { type: Boolean, default: true },
    savingsMilestones: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ email: 1 });

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
