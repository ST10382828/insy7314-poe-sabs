import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmployee extends Document {
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true, default: "Payment Processing" },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

export const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);

