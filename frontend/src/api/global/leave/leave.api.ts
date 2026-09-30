import axiosInstance from "../../../axios/axiosInstance";
import { handleError } from "../../../axios/errorHandler";
import type {
  CreateLeaveRequestBodyInput,
  EditLeaveRequestBodyInput,
  ILeaveRequest,
  LeaveStatus,
  UpdateLeaveStatusBodyInput,
} from "../../../types/global/leave/leave.type";

const BASE = "/api/leave";

function unwrapArray<T = any>(maybe: any): T[] {
  if (Array.isArray(maybe)) return maybe;
  if (Array.isArray(maybe?.data)) return maybe.data;
  if (Array.isArray(maybe?.leaves)) return maybe.leaves;
  if (Array.isArray(maybe?.result)) return maybe.result;
  if (Array.isArray(maybe?.payload)) return maybe.payload;
  return [];
}

function unwrapOne<T = any>(maybe: any): T {
  if (maybe?.leave) return maybe.leave as T;
  if (maybe?.data && !Array.isArray(maybe.data)) return maybe.data as T;
  return (maybe as T) ?? ({} as T);
}

function assertNonEmptyId(id: unknown, fieldName = "leaveId"): string {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error(`${fieldName} is required and must be a non-empty string`);
  }
  return id.trim();
}

export const createLeaveApi = async (
  payload: CreateLeaveRequestBodyInput
): Promise<ILeaveRequest> => {
  try {
    const res = await axiosInstance.post(`${BASE}/create`, payload);
    return unwrapOne<ILeaveRequest>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getAllLeavesApi = async (): Promise<ILeaveRequest[]> => {
  try {
    const res = await axiosInstance.get(`${BASE}`);
    return unwrapArray<ILeaveRequest>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getLeavesByEmployeeIdApi = async (
  employeeId: string
): Promise<ILeaveRequest[]> => {
  try {
    const safeId = assertNonEmptyId(employeeId, "employeeId");
    const res = await axiosInstance.get(
      `${BASE}/employee/${encodeURIComponent(safeId)}`
    );
    return unwrapArray<ILeaveRequest>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getLeavesByStatusApi = async (
  status: LeaveStatus
): Promise<ILeaveRequest[]> => {
  try {
    const res = await axiosInstance.get(
      `${BASE}/status/${encodeURIComponent(status)}`
    );
    return unwrapArray<ILeaveRequest>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const editLeaveApi = async (
  leaveId: string,
  patch: EditLeaveRequestBodyInput,
  editorId?: string
): Promise<ILeaveRequest> => {
  try {
    const safeId = assertNonEmptyId(leaveId);
    const res = await axiosInstance.put(
      `${BASE}/${encodeURIComponent(safeId)}`,
      patch,
      editorId ? { headers: { "x-editor-id": editorId } } : undefined
    );
    return unwrapOne<ILeaveRequest>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const updateLeaveStatusApi = async (
  leaveId: string,
  payload: UpdateLeaveStatusBodyInput
): Promise<ILeaveRequest> => {
  try {
    const safeId = assertNonEmptyId(leaveId);
    const res = await axiosInstance.patch(
      `${BASE}/${encodeURIComponent(safeId)}/status`,
      payload
    );
    return unwrapOne<ILeaveRequest>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export type { ILeaveRequest };
