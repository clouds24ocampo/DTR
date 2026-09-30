import mongoose, { Schema, Document } from "mongoose";
import {
  ProgressReport as IProgressReport,
  PROGRESS_PERIODS,
  PROGRESS_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../../types/global/progress/progress.types";

export interface IProgressReportDocument extends IProgressReport, Document {}

const ProgressTaskSchema = new Schema({
  description: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: TASK_STATUSES,
    default: "not-started",
  },
  priority: {
    type: String,
    enum: TASK_PRIORITIES,
    default: "medium",
  },
  completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  notes: { type: String, trim: true },
});

const AttachmentSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
});

const ProgressReportSchema = new Schema<IProgressReportDocument>(
  {
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    period: {
      type: String,
      enum: PROGRESS_PERIODS,
      required: true,
    },
    tasks: [ProgressTaskSchema],
    accomplishments: { type: String, required: true, trim: true },
    challenges: { type: String, trim: true },
    planForNext: { type: String, trim: true },
    attachments: [AttachmentSchema],
    status: {
      type: String,
      enum: PROGRESS_STATUSES,
      default: "submitted",
      index: true,
    },
    submittedAt: { type: Date },
    reviewedBy: { type: String, trim: true },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate reports for same employee, date, and period
ProgressReportSchema.index({ employeeId: 1, date: 1, period: 1 }, { unique: true });

// Add text index for efficient search
ProgressReportSchema.index({
  accomplishments: "text",
  challenges: "text",
  planForNext: "text",
  employeeName: "text",
});

export default mongoose.model<IProgressReportDocument>(
  "ProgressReport",
  ProgressReportSchema
);
