import mongoose, { Schema, Document } from "mongoose";

export interface IBudget extends Document {
  userId: mongoose.Types.ObjectId;
  category: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

const BudgetSchema = new Schema<IBudget>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  period: { type: String, enum: ["weekly", "monthly", "yearly"], default: "monthly" },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

BudgetSchema.index({ userId: 1, category: 1 });

export default mongoose.models.Budget || mongoose.model<IBudget>("Budget", BudgetSchema);
