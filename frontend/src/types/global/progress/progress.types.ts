// src/types/global/progress/progress.types.ts

/* ===========================
 * Progress Report Domain Types
 * =========================== */

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
    id?: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    completionPercentage?: number;
    notes?: string;
}

/** Attachment in a progress report */
export interface ProgressAttachment {
    name: string;
    url: string;
    type: string;
    size: number;
}

/** Single progress report entity */
export interface ProgressReport {
    id: string; // UI-friendly id (maps to _id on Mongo)
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
    submittedAt?: string; // ISO datetime string
    reviewedBy?: string; // Reviewer name
    reviewedAt?: string; // ISO datetime string
    reviewNotes?: string;
    createdAt: string; // ISO datetime string
    updatedAt?: string; // ISO datetime string
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
    status?: ProgressStatus; // defaults to "submitted"
}

/** Payload to create a report when employee identity comes from cookie/session */
export type NewProgressReportFromCookieDTO = Omit<
    NewProgressReportDTO,
    "employeeId" | "employeeName"
>;

/* ===========================
 * Edit/Update Types
 * =========================== */

/** Utility: require at least one key on a Partial<T> */
type AtLeastOne<T> = Partial<T> &
    { [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>> }[keyof T];

/** Fields that can be edited on a progress report */
export type ProgressReportEditableFields = Pick<
    ProgressReport,
    "tasks" | "accomplishments" | "challenges" | "planForNext" | "status" | "attachments"
>;

/** Minimal shape for updates (server-side PATCH/PUT) */
export type UpdateProgressReportDTO = AtLeastOne<ProgressReportEditableFields>;

/** Payload for HR to review a progress report */
export interface ReviewProgressReportDTO {
    reviewedBy: string;
    reviewNotes?: string;
    status: "reviewed" | "archived";
}

/* ===========================
 * Query & Filter Types
 * =========================== */

/** Query parameters for fetching progress reports */
export interface ProgressReportQueryParams {
    employeeId?: string;
    date?: string; // YYYY-MM-DD
    period?: ProgressPeriod;
    status?: ProgressStatus;
    startDate?: string; // For date range queries
    endDate?: string;
}

/* ===========================
 * UI Helper Types
 * =========================== */

/** Helper for client-side form values in modal */
export interface ProgressReportFormValues {
    date: string;
    period: ProgressPeriod;
    tasks: ProgressTask[];
    accomplishments: string;
    challenges?: string;
    planForNext?: string;
    attachments: ProgressAttachment[];
}

/** Summary statistics for progress reports */
export interface ProgressReportSummary {
    totalReports: number;
    submittedToday: number;
    pending: number;
    reviewed: number;
    completionRate: number; // Average task completion %
}
