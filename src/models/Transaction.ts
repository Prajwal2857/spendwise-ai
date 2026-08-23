import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  merchant: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  paymentMethod: string;
  date: Date;
  notes?: string;
  recurring: boolean;
  tags?: string[];
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  accountId: { type: Schema.Types.ObjectId, ref: "Account" },
  merchant: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ["income", "expense"], required: true },
  category: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  date: { type: Date, required: true },
  notes: { type: String },
  recurring: { type: Boolean, default: false },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, type: 1 });

export default mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);
