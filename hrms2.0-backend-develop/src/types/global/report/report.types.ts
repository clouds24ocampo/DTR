// src/types/report.types.ts

/* ===========================
 * Report Domain Types
 * =========================== */

/** Allowed categories of reports. */
export type ReportType = "issue" | "suggestion" | "complaint" | "other";
export const REPORT_TYPES = [
  "issue",
  "suggestion",
  "complaint",
  "other",
] as const;

/** Business priority levels. */
export type ReportPriority = "low" | "medium" | "high";
export const REPORT_PRIORITIES = ["low", "medium", "high"] as const;

/** UI label when priority is not chosen in the form. */
export const REPORT_DEFAULT_PRIORITY_LABEL = "Not set" as const;
export type ReportPriorityLabel =
  | ReportPriority
  | typeof REPORT_DEFAULT_PRIORITY_LABEL;

/** Lifecycle status for a report. */
export type ReportStatus = "open" | "in-progress" | "resolved" | "closed";
export const REPORT_STATUSES = [
  "open",
  "in-progress",
  "resolved",
  "closed",
] as const;

/** UI label when assignee is not selected in the form. */
export const REPORT_DEFAULT_ASSIGNEE = "Not yet assigned" as const;

/** Single report entity as used across the app. */
export interface Report {
  id: string; // UI-friendly id (maps to _id on Mongo)
  employeeId: string; // Reporter user id
  employeeName: string; // Reporter display name
  type: ReportType;
  title: string;
  description: string;
  priority: ReportPriority; // stored priority value (form may omit)
  status: ReportStatus;
  assignedTo?: string; // Optional: assignee name (e.g., team leader)
  createdAt: string; // ISO datetime string
  updatedAt?: string; // ISO datetime string
}

/** Payload to create a new report (body-based). Status defaults to "open" if omitted.
 *  Priority is optional to support the simple self-report form.
 */
export interface NewReportDTO {
  employeeId: string;
  employeeName: string;
  type: ReportType;
  title: string;
  description: string;
  priority?: ReportPriority; // ← optional so the form can skip it
  status?: ReportStatus;
  assignedTo?: string; // may be omitted; UI shows "Not yet assigned"
}

/** Payload to create a report when reporter identity comes from cookie/session. */
export type NewReportFromCookieDTO = Omit<
  NewReportDTO,
  "employeeId" | "employeeName"
>;

/** Minimal shape for updates (server-side PATCH/PUT). */
export type UpdateReportDTO = Partial<
  Pick<
    Report,
    "title" | "description" | "type" | "priority" | "status" | "assignedTo"
  >
>;

/** Helper for client-side form values in your modal (full form). */
export interface ReportCreateFormValues {
  employeeId: string; // selected from dropdown
  type: ReportType;
  priority?: ReportPriority; // optional in UI
  title: string;
  description: string;
  assignedTo?: string; // workforce role may choose an assignee
}

/** Helper for simple self-report form (no priority, no assignee). */
export interface ReportCreateFormValuesMinimal {
  type: ReportType;
  title: string;
  description: string;
}
