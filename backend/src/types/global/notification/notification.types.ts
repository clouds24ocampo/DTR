export type NOTIFICATION_TYPES =
  | "leave_request"
  | "leave_approved"
  | "leave_rejected"
  | "dtr_reminder"
  | "schedule_update"
  | "report_assigned"
  | "report_resolved"
  | "job_application"
  | "document_uploaded"
  | "message"
  | "system"
  | "general";

export type NOTIFICATION_PRIORITIES = "low" | "medium" | "high" | "urgent";

// Constant arrays for validation
export const NOTIFICATION_TYPES = [
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
] as const;

export const NOTIFICATION_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export interface INotification {
  _id?: string;
  userId: string;
  type: NOTIFICATION_TYPES;
  title: string;
  body: string;
  fromName?: string;
  fromId?: string;
  priority?: NOTIFICATION_PRIORITIES;
  read: boolean;
  readAt?: Date;
  link?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateNotificationDTO {
  userId: string;
  type: NOTIFICATION_TYPES;
  title: string;
  body: string;
  fromName?: string;
  fromId?: string;
  priority?: NOTIFICATION_PRIORITIES;
  link?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationDTO {
  read?: boolean;
  readAt?: Date;
}

