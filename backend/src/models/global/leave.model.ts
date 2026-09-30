import mongoose, { Schema } from "mongoose";
import { ILeaveRequest, ILeaveReviewMeta } from "../../types/global/leave/leave.type";

const LeaveReviewMetaSchema = new Schema<ILeaveReviewMeta>(
  {
    reviewedById: { type: String, required: true },
    reviewedByName: { type: String },
    reviewedAt: { type: String, required: true },
    note: { type: String },
  },
  { _id: false }
);

const ApprovedBySchema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String },
    approvedAt: { type: String, required: true },
  },
  { _id: false }
);

const LeaveApprovalSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    date: { type: String },
    userId: { type: String },
    userName: { type: String },
    note: { type: String },
  },
  { _id: false }
);

const LeaveApprovalsSchema = new Schema(
  {
    hr: { type: LeaveApprovalSchema, default: () => ({}) },
    workforce: { type: LeaveApprovalSchema, default: () => ({}) },
    teamLeader: { type: LeaveApprovalSchema, default: () => ({}) },
  },
  { _id: false }
);

const LeaveSchema = new Schema<ILeaveRequest>(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    idNumber: { type: String },

    type: {
      type: String,
      enum: ["sick", "vacation", "personal", "emergency"],
      required: true,
    },

    startDate: { type: String, required: true },
    endDate: { type: String, required: true },

    reason: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "canceled"],
      default: "pending",
      required: true,
    },

    requestedAt: { type: String, required: true },

    review: { type: LeaveReviewMetaSchema },
    approvedBy: { type: ApprovedBySchema },

    approvals: {
      type: LeaveApprovalsSchema,
      default: () => ({
        hr: {},
        workforce: {},
        teamLeader: {},
      }),
    },
    rejectionReason: { type: String },

    teamId: { type: String },
    workstationId: { type: String },

    attachmentUrls: [{ type: String }],
    halfDay: { type: Boolean },
  },
  { timestamps: true }
);

export default mongoose.model<ILeaveRequest>("Leave", LeaveSchema);
