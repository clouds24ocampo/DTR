// src/types/leave/leave.type.ts

export type LeaveType = "sick" | "vacation" | "personal" | "emergency";
export type LeaveStatus = "pending" | "approved" | "rejected" | "canceled";

/** --- Optional metadata for approvals/rejections --- */
export interface ILeaveReviewMeta {
  reviewedById: string; // user id of reviewer
  reviewedByName?: string; // snapshot of reviewer name
  reviewedAt: string; // ISO datetime string
  note?: string;
}

/** --- Main entity (no id here; see DTO types below) --- */
export interface ILeaveRequest {
  employeeId: string;
  employeeName: string;
  type: LeaveType;

  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"

  reason: string;

  status: LeaveStatus;
  requestedAt: string; // ISO datetime

  /** Reviewer info */
  review?: ILeaveReviewMeta;

  /** Explicit approvedBy field for clarity */
  approvedBy?: {
    userId: string;
    userName?: string;
    approvedAt: string; // ISO datetime
  };

  teamId?: string;
  workstationId?: string;

  attachmentUrls?: string[];
  halfDay?: boolean;

  approvals?: ILeaveApprovals;
  rejectionReason?: string;
}

export interface ILeaveApproval {
  status: "pending" | "approved" | "rejected";
  date?: string;
  userId?: string;
  userName?: string;
  note?: string;
}

export interface ILeaveApprovals {
  hr: ILeaveApproval;
  workforce: ILeaveApproval;
  teamLeader: ILeaveApproval;
}

/** --- API DTOs (what the backend returns) --- */
/** Preferred shape: backend maps _id → id in toSafeLeave */
export type ILeaveRequestDTO = ILeaveRequest & {
  idNumber: string; // <-- use this in the UI (e.g., editLeaveApi(id, ...))
  _id?: string; // optional for backward compatibility
  id?: string; // some backends / toSafeLeave expose _id as id
};

/** If you keep a list typed with the DTO */
export type ILeaveRequestDoc = ILeaveRequestDTO;

export interface ILeaveBalancePerType {
  type: LeaveType;
  allocated: number;
  used: number;
  remaining: number;
}

export interface ILeaveBalance {
  employeeId: string;
  year: number;
  totals: ILeaveBalancePerType[];
  lastComputedAt?: string;
}

/* ------------------- Payload DTOs for API calls ------------------- */

export interface CreateLeaveRequestBodyInput {
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  reason: string;
  teamId?: string;
  workstationId?: string;
  attachmentUrls?: string[];
  halfDay?: boolean;
}

export interface UpdateLeaveStatusBodyInput {
  status: Extract<LeaveStatus, "approved" | "rejected" | "canceled">;
  reviewerId: string; // typically filled from auth on the server; kept for now
  reviewerName?: string; // optional display name
  note?: string;
}

export interface EditLeaveRequestBodyInput {
  type?: LeaveType;
  startDate?: string;
  endDate?: string;
  reason?: string;
  attachmentUrls?: string[];
  halfDay?: boolean;
  note?: string;
}

export interface GetLeaveRequestsFilterInput {
  employeeId?: string;
  teamId?: string;
  status?: LeaveStatus;
  type?: LeaveType;
  startDate?: string;
  endDate?: string;
  dateField?: "requestedAt" | "leaveWindow";
  page?: number;
  pageSize?: number;
}

/* ------------------- Standardized API envelopes ------------------- */

export type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export type LeaveListResponse = ApiEnvelope<{
  items: ILeaveRequestDoc[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type LeaveBalancesResponse = ApiEnvelope<ILeaveBalance>;
