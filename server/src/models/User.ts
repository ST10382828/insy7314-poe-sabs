import mongoose, { Schema, Document, Model } from "mongoose";
import { PasswordHistoryEntry, AccountLockoutInfo } from "../utils/passwordSecurity";

export interface IUser extends Document {
  username: string;
  fullName: string;
  idNumber: string;
  accountNumber: string;
  email: string;
  passwordHash: string;
  passwordHistory: PasswordHistoryEntry[];
  lockoutInfo: AccountLockoutInfo;
  lastPasswordChange: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordHistorySchema = new Schema({
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const LockoutInfoSchema = new Schema({
  failedAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  lastAttempt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    idNumber: { type: String, required: true },
    accountNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    passwordHistory: [PasswordHistorySchema],
    lockoutInfo: { type: LockoutInfoSchema, default: () => ({
      failedAttempts: 0,
      lockoutUntil: null,
      lastAttempt: new Date()
    })} as any,
    lastPasswordChange: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for performance
UserSchema.index({ username: 1, accountNumber: 1 });
UserSchema.index({ email: 1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
