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

export interface INotification {
  _id: string;
  userId: string;
  type: NOTIFICATION_TYPES;
  title: string;
  body: string;
  fromName?: string;
  fromId?: string;
  priority?: NOTIFICATION_PRIORITIES;
  read: boolean;
  readAt?: string;
  link?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
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

export interface UnreadCountResponse {
  count: number;
}

