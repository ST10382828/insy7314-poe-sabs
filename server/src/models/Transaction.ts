import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  provider: string;
  payeeAccountInfo: string;
  swiftCode: string;
  status: "pending" | "verified" | "submitted" | "completed" | "failed";
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  declinedBy?: mongoose.Types.ObjectId;
  declinedAt?: Date;
  declineReason?: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true, enum: ["USD", "EUR", "GBP", "ZAR"] },
    provider: { type: String, required: true, enum: ["SWIFT"] },
    payeeAccountInfo: { type: String, required: true },
    swiftCode: { type: String, required: true },
    status: { 
      type: String, 
      required: true, 
      enum: ["pending", "verified", "submitted", "completed", "failed"],
      default: "pending"
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    declinedBy: { type: Schema.Types.ObjectId, ref: "User" },
    declinedAt: Date,
    declineReason: { type: String, maxlength: 500 },
    submittedAt: Date,
  },
  { timestamps: true }
);

export const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);

