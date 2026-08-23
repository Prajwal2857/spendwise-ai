import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  billingCycle: "monthly" | "yearly" | "weekly" | "quarterly";
  renewalDate: Date;
  category: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  billingCycle: { type: String, enum: ["monthly", "yearly", "weekly", "quarterly"], default: "monthly" },
  renewalDate: { type: Date, required: true },
  category: { type: String, default: "Subscriptions" },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

SubscriptionSchema.index({ userId: 1, isActive: 1 });

export default mongoose.models.Subscription || mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
