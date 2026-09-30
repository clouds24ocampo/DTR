// src/api/workplace/workplace.api.ts
import axiosInstance from "../../axios/axiosInstance";
import { handleError } from "../../axios/errorHandler";
import {
  AssignToWorkstationBodyInput,
  CreateWorkplaceBodyInput,
  IWorkplace,
  UpdateWorkplaceBodyInput,
  UpdateWorkstationBodyInput,
  WorkplaceDayView,
} from "../../types/workforce/workplace/workplace.type";

const BASE = "api/workplaces";

// --- helpers
const toStringArray = (val: unknown): string[] => {
  if (Array.isArray(val))
    return val.filter((v): v is string => typeof v === "string");
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
};

const sanitizeStationName = (name?: string) =>
  typeof name === "string" ? name.trim() || undefined : undefined;

// --- APIs
export const createWorkplaceApi = async (
  payload: CreateWorkplaceBodyInput
): Promise<IWorkplace> => {
  try {
    const { data } = await axiosInstance.post<{ message: string; data: IWorkplace }>(
      `${BASE}/create`,
      payload
    );
    // Extract the workplace from the response wrapper
    return data.data || data as unknown as IWorkplace;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const assignToWorkstationApi = async (
  workplaceId: string,
  payload: AssignToWorkstationBodyInput
): Promise<{ message: string; result: any; meta?: { assignedDate: string; workplaceName: string; stationName: string } }> => {
  try {
    const normalized: AssignToWorkstationBodyInput = {
      ...payload,
      stationName: sanitizeStationName(payload.stationName),
      startMealTime: toStringArray(payload.startMealTime),
    };

    if (process.env.NODE_ENV === "development") {
      console.log("🔴 workplace.api - assignToWorkstationApi called:", {
        url: `${BASE}/${workplaceId}/assign`,
        workplaceId,
        payload: normalized,
      });
    }

    const { data } = await axiosInstance.post<{ message: string; result: any; meta?: { assignedDate: string; workplaceName: string; stationName: string } }>(
      `${BASE}/${workplaceId}/assign`,
      normalized
    );
    
    if (process.env.NODE_ENV === "development") {
      console.log("🟢 workplace.api - assignToWorkstationApi response:", {
        workplaceId,
        response: data,
        meta: data.meta,
      });
    }
    
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const updateWorkplaceApi = async (
  workplaceId: string,
  payload: UpdateWorkplaceBodyInput
): Promise<IWorkplace> => {
  try {
    const { data } = await axiosInstance.put<{ message: string; data: IWorkplace }>(
      `${BASE}/${workplaceId}`,
      payload
    );
    // Extract the workplace from the response wrapper
    return data.data || data as unknown as IWorkplace;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const updateWorkstationApi = async (
  workplaceId: string,
  workstationId: string,
  payload: UpdateWorkstationBodyInput
): Promise<IWorkplace> => {
  try {
    const { data } = await axiosInstance.put<IWorkplace>(
      `${BASE}/${workplaceId}/workstations/${workstationId}`,
      { ...payload, stationName: sanitizeStationName(payload.stationName)! }
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getWorkplaceByDateApi = async (
  workplaceId: string,
  date: string
): Promise<WorkplaceDayView> => {
  try {
    const { data } = await axiosInstance.get<WorkplaceDayView>(
      `${BASE}/${workplaceId}/day/${encodeURIComponent(date)}`
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const viewAllWorkplaceApi = async (): Promise<IWorkplace[]> => {
  try {
    const { data } = await axiosInstance.get<IWorkplace[]>(BASE);
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  } catch (error: unknown) {
    const axiosError = error as any;
    const status = axiosError?.response?.status;
    const message = axiosError?.response?.data?.message ?? "";
    // 404: no workplaces found - return empty array
    if (status === 404 && (message.includes("No workplaces found") || message.includes("workplaces"))) {
      return [];
    }
    // 403: insufficient permissions (e.g. Intern role) - return empty array so schedule page still works
    if (status === 403 || message.toLowerCase().includes("insufficient permissions") || message.toLowerCase().includes("forbidden")) {
      return [];
    }
    return handleError(error);
  }
};

export const unassignUserApi = async (
  workplaceId: string,
  workstationId: string,
  date: string,
  userId: string
): Promise<void> => {
  try {
    await axiosInstance.delete(
      `${BASE}/${workplaceId}/workstations/${workstationId}/${encodeURIComponent(
        date
      )}/unassign/${userId}`
    );
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const deleteWorkplaceApi = async (
  workplaceId: string
): Promise<void> => {
  try {
    await axiosInstance.delete(`${BASE}/${workplaceId}`);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const deleteWorkstationApi = async (
  workplaceId: string,
  workstationId: string
): Promise<void> => {
  try {
    await axiosInstance.delete(
      `${BASE}/${workplaceId}/workstations/${workstationId}`
    );
  } catch (error: unknown) {
    return handleError(error);
  }
};

export interface SelfAssignToStationBodyInput {
  date: string;
  stationName: string;
  label?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  startMealTime?: string[];
}

export interface SelfAssignToStationResponse {
  message: string;
  result: any;
  meta: {
    workplaceName: string;
    stationName: string;
    assignedDate: string;
  };
}

export const selfAssignToStationApi = async (
  workplaceId: string,
  payload: SelfAssignToStationBodyInput
): Promise<SelfAssignToStationResponse> => {
  try {
    const normalized: SelfAssignToStationBodyInput = {
      ...payload,
      date: payload.date.trim(),
      stationName: payload.stationName.trim(),
      label: payload.label?.trim(),
      startMealTime: payload.startMealTime ? toStringArray(payload.startMealTime) : undefined,
    };

    const { data } = await axiosInstance.post<SelfAssignToStationResponse>(
      `${BASE}/${workplaceId}/self-assign`,
      normalized
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export interface SelfUnassignFromStationResponse {
  message: string;
}

export const selfUnassignFromStationApi = async (
  workplaceId: string,
  date: string
): Promise<SelfUnassignFromStationResponse> => {
  try {
    const { data } = await axiosInstance.delete<SelfUnassignFromStationResponse>(
      `${BASE}/${workplaceId}/self-unassign/${encodeURIComponent(date.trim())}`
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};