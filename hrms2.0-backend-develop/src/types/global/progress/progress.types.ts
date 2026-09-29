// src/types/global/progress/progress.types.ts

/** Time period for progress report submission */
export type ProgressPeriod = "morning" | "afternoon";
export const PROGRESS_PERIODS = ["morning", "afternoon"] as const;

/** Status of the progress report */
export type ProgressStatus = "draft" | "submitted" | "reviewed" | "archived";
export const PROGRESS_STATUSES = ["draft", "submitted", "reviewed", "archived"] as const;

/** Priority level for tasks in progress report */
export type TaskPriority = "low" | "medium" | "high";
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

/** Task completion status */
export type TaskStatus = "not-started" | "in-progress" | "completed" | "blocked";
export const TASK_STATUSES = ["not-started", "in-progress", "completed", "blocked"] as const;

/** Individual task in a progress report */
export interface ProgressTask {
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  completionPercentage?: number;
  notes?: string;
}

export interface ProgressAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

/** Single progress report entity */
export interface ProgressReport {
  employeeId: string;
  employeeName: string;
  date: string; // ISO date string (YYYY-MM-DD)
  period: ProgressPeriod; // morning or afternoon
  tasks: ProgressTask[];
  accomplishments: string;
  challenges?: string;
  planForNext?: string; // Plans for next period
  attachments?: ProgressAttachment[];
  status: ProgressStatus;
  submittedAt?: Date;
  reviewedBy?: string; // Reviewer name
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Payload to create a new progress report */
export interface NewProgressReportDTO {
  employeeId: string;
  employeeName: string;
  date: string;
  period: ProgressPeriod;
  tasks: ProgressTask[];
  accomplishments: string;
  challenges?: string;
  planForNext?: string;
  attachments?: ProgressAttachment[];
  status?: ProgressStatus;
}

/** Fields that can be edited on a progress report */
export interface UpdateProgressReportDTO {
  tasks?: ProgressTask[];
  accomplishments?: string;
  challenges?: string;
  planForNext?: string;
  attachments?: ProgressAttachment[];
  status?: ProgressStatus;
}

/** Payload for HR to review a progress report */
export interface ReviewProgressReportDTO {
  reviewedBy: string;
  reviewNotes?: string;
  status: "reviewed" | "archived";
}

/** Query parameters for fetching progress reports */
export interface ProgressReportQueryParams {
  employeeId?: string;
  status?: ProgressStatus;
  period?: ProgressPeriod;
  date?: string;
  startDate?: string;
  endDate?: string;
}
