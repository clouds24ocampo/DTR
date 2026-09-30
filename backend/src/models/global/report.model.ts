import mongoose, { Schema } from "mongoose";
import {
  Report as IReport,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  REPORT_TYPES,
} from "../../types/global/report/report.types";

const ReportSchema = new Schema<IReport>(
  {
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    type: { type: String, enum: REPORT_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: REPORT_PRIORITIES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      required: true,
      default: "open",
      index: true,
    },
    assignedTo: { type: String, trim: true },
  },
  { timestamps: true }
);

ReportSchema.index({ employeeId: 1, createdAt: -1 });
ReportSchema.index({ status: 1, priority: 1, createdAt: -1 });
// Add text index for efficient search
ReportSchema.index({
  title: "text",
  description: "text",
  employeeName: "text",
});

ReportSchema.methods.updateReport = function (changes: Partial<IReport>) {
  Object.assign(this, changes);
  return this.save();
};

export default mongoose.model<IReport>("Report", ReportSchema);
