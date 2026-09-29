import mongoose, { Document, Schema } from "mongoose";

export interface LateDetail {
  date: string;
  session: string;
  lateMinutes: number;
  deductionHours: number;
  actualTime: string;
  scheduledTime: string;
}

export interface IPayroll extends Document {
  employee: mongoose.Schema.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  regularHours: number;
  overtimeHours: number;
  lateCount: number; // Number of times late >= 30 mins
  lateHours: number; // Total hours deducted
  lateDeductionAmount: number;
  lateDetails?: LateDetail[]; // Detailed breakdown of each late occurrence
  hourlyRate: number;
  grossPay: number;
  netPay: number;
  status: "draft" | "finalized" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

const LateDetailSchema: Schema = new Schema({
  date: { type: String, required: true },
  session: { type: String, required: true },
  lateMinutes: { type: Number, required: true },
  deductionHours: { type: Number, required: true },
  actualTime: { type: String, required: true },
  scheduledTime: { type: String, required: true },
}, { _id: false });

const PayrollSchema: Schema = new Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    regularHours: { type: Number, default: 0 },
    untaggedExcessHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    lateHours: { type: Number, default: 0 },
    lateDeductionAmount: { type: Number, default: 0 },
    lateDetails: { type: [LateDetailSchema], default: [] },
    hourlyRate: { type: Number, required: true },
    grossPay: { type: Number, required: true },
    netPay: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "finalized", "paid"],
      default: "draft",
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate payrolls for the same employee in the same period
PayrollSchema.index({ employee: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

const Payroll = mongoose.models.Payroll || mongoose.model<IPayroll>("Payroll", PayrollSchema);
export default Payroll;
