import mongoose, { Schema, Document, Model } from "mongoose";
import {
  INotification,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
} from "../../types/global/notification/notification.types";

export interface INotificationDocument extends Omit<INotification, "_id">, Document {}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "leave_request",
        "leave_approved",
        "leave_rejected",
        "dtr_reminder",
        "schedule_update",
        "report_assigned",
        "report_resolved",
        "job_application",
        "document_uploaded",
        "message",
        "system",
        "general",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    fromName: {
      type: String,
      trim: true,
    },
    fromId: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    link: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>("Notification", NotificationSchema);

export default Notification;

