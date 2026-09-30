import mongoose, { Document, Schema } from "mongoose";

export interface IPayrollAudit extends Document {
  payrollId: mongoose.Schema.Types.ObjectId;
  action: "CREATE" | "UPDATE" | "DELETE" | "CALCULATE";
  performedBy: mongoose.Schema.Types.ObjectId; // User who performed the action
  details: string; // Description of changes or snapshot
  timestamp: Date;
}

const PayrollAuditSchema: Schema = new Schema(
  {
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: "Payroll", required: false }, // Not required for generic actions or if payroll is deleted
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "CALCULATE"],
      required: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    details: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PayrollAudit = mongoose.models.PayrollAudit || mongoose.model<IPayrollAudit>("PayrollAudit", PayrollAuditSchema);
export default PayrollAudit;
