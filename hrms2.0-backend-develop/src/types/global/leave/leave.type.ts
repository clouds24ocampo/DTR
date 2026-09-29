import { Types } from "mongoose";

export type LeaveType = "sick" | "vacation" | "personal" | "emergency";
export type LeaveStatus = "pending" | "approved" | "rejected" | "canceled";

export interface ILeaveReviewMeta {
  reviewedById: string;
  reviewedByName?: string;
  reviewedAt: string;
  note?: string;
}
export interface ILeaveRequest {
  employeeId: string;
  employeeName: string;
  idNumber?: string;
  type: LeaveType;

  startDate: string;
  endDate: string;

  reason: string;

  status: LeaveStatus;
  requestedAt: string;

  review?: ILeaveReviewMeta;

  approvedBy?: {
    userId: string;
    userName?: string;
    approvedAt: string;
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

export type ILeaveRequestDoc = ILeaveRequest & { _id: Types.ObjectId | string };

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

export interface CreateLeaveRequestBodyInput {
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  teamId?: string;
  workstationId?: string;
  attachmentUrls?: string[];
  halfDay?: boolean;
}

export interface UpdateLeaveStatusBodyInput {
  status: Extract<LeaveStatus, "approved" | "rejected" | "canceled">;
  reviewerId: string;
  reviewerName?: string;
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

export type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export type LeaveListResponse = ApiEnvelope<{
  items: ILeaveRequestDoc[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type LeaveBalancesResponse = ApiEnvelope<ILeaveBalance>;
