import mongoose, { Schema, Document } from "mongoose";

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountName: string;
  accountType: "bank" | "credit_card" | "debit_card" | "cash" | "upi" | "other";
  balance: number;
  institution?: string;
  color?: string;
  createdAt: Date;
}

const AccountSchema = new Schema<IAccount>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  accountName: { type: String, required: true, trim: true },
  accountType: { type: String, enum: ["bank", "credit_card", "debit_card", "cash", "upi", "other"], required: true },
  balance: { type: Number, default: 0 },
  institution: { type: String },
  color: { type: String },
  createdAt: { type: Date, default: Date.now },
});

AccountSchema.index({ userId: 1 });

export default mongoose.models.Account || mongoose.model<IAccount>("Account", AccountSchema);
