/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from "../../../axios/axiosInstance";
import { handleError } from "../../../axios/errorHandler";
import type {
  CreateSchedulesForUsersBodyInput,
  EditScheduleBodyInput,
  GetSchedulesByUserAndDateBodyInput,
  IScheduleDoc,
  ISession,
} from "../../../types/global/schedule/schedule.type";

const BASE = "/api/schedule";

function unwrapArray(maybe: any): any[] {
  if (Array.isArray(maybe)) return maybe;
  if (Array.isArray(maybe?.data)) return maybe.data;
  if (Array.isArray(maybe?.schedules)) return maybe.schedules;
  if (Array.isArray(maybe?.result)) return maybe.result;
  if (Array.isArray(maybe?.payload)) return maybe.payload;
  
  // Log warning if we can't find the array
  if (maybe !== null && maybe !== undefined) {
    console.warn("unwrapArray: Could not find array in response:", {
      keys: Object.keys(maybe || {}),
      type: typeof maybe,
      value: maybe,
    });
  }
  
  return [];
}

export type CreateSchedulesResultItem = {
  userId: string;
  scheduleAction: "created" | "appended";
  dtrAction: "created" | "appended";
  sessionsAdded: number;
};

const toStringArray = (val: unknown): string[] => {
  if (Array.isArray(val))
    return val.filter((v): v is string => typeof v === "string");
  if (typeof val === "string" && val.trim()) return [val.trim()];
  return [];
};

const trimOrThrow = (name: string, value?: string) => {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
};

const normalizeCreatePayload = (
  payload: CreateSchedulesForUsersBodyInput
): CreateSchedulesForUsersBodyInput => {
  return {
    ...payload,
    sessions: payload.sessions.map((s) => ({
      ...s,
      label: trimOrThrow("label", (s as any).label),
      startMealTime: toStringArray(s.startMealTime),
      scheduledStartTime: s.scheduledStartTime,
      scheduledEndTime: s.scheduledEndTime,
    })),
  };
};

export const getSchedulesByUserAndDateApi = async (
  payload: GetSchedulesByUserAndDateBodyInput
): Promise<IScheduleDoc[]> => {
  try {
    const res = await axiosInstance.post(`${BASE}/filtered`, payload);
    console.log("getSchedulesByUserAndDateApi response:", res.data);
    const schedules = unwrapArray(res.data) as IScheduleDoc[];
    console.log("getSchedulesByUserAndDateApi unwrapped:", schedules);
    return schedules;
  } catch (error: unknown) {
    console.error("getSchedulesByUserAndDateApi error:", error);
    return handleError(error);
  }
};

export const getMySchedulesByDateApi = async (
  date: string
): Promise<IScheduleDoc[]> => {
  try {
    const res = await axiosInstance.get(
      `${BASE}/me/date/${encodeURIComponent(date)}`
    );
    console.log("getMySchedulesByDateApi response:", res.data);
    const schedules = unwrapArray(res.data) as IScheduleDoc[];
    console.log("getMySchedulesByDateApi unwrapped:", schedules);
    return schedules;
  } catch (error: unknown) {
    console.error("getMySchedulesByDateApi error:", error);
    return handleError(error);
  }
};

export const getAllSchedulesApi = async (): Promise<IScheduleDoc[]> => {
  try {
    const res = await axiosInstance.get(`${BASE}`);
    console.log("getAllSchedulesApi response:", res.data);
    const schedules = unwrapArray(res.data) as IScheduleDoc[];
    console.log("getAllSchedulesApi unwrapped:", schedules);
    return schedules;
  } catch (error: unknown) {
    console.error("getAllSchedulesApi error:", error);
    return handleError(error);
  }
};

export const getSchedulesByUserIdApi = async (
  userId: string
): Promise<IScheduleDoc[]> => {
  try {
    const res = await axiosInstance.get(`${BASE}/user/${userId}`);
    console.log("getSchedulesByUserIdApi response:", res.data);
    const schedules = unwrapArray(res.data) as IScheduleDoc[];
    console.log("getSchedulesByUserIdApi unwrapped:", schedules);
    return schedules;
  } catch (error: unknown) {
    console.error("getSchedulesByUserIdApi error:", error);
    return handleError(error);
  }
};

export const getSchedulesByDateApi = async (
  date: string
): Promise<IScheduleDoc[]> => {
  try {
    const res = await axiosInstance.get(
      `${BASE}/date/${encodeURIComponent(date)}`
    );
    console.log("getSchedulesByDateApi response:", res.data);
    const schedules = unwrapArray(res.data) as IScheduleDoc[];
    console.log("getSchedulesByDateApi unwrapped:", schedules);
    return schedules;
  } catch (error: unknown) {
    console.error("getSchedulesByDateApi error:", error);
    return handleError(error);
  }
};

export const editScheduleApi = async (
  payload: EditScheduleBodyInput
): Promise<IScheduleDoc> => {
  try {
    const res = await axiosInstance.put<{
      message: string;
      schedule: IScheduleDoc;
    }>(`${BASE}/edit`, {
      scheduleId: payload.scheduleId,
      sessions: payload.sessions.map((s) => ({
        ...s,
        label: s.label.trim(), // 🔑 extra safety
      })),
    });

    return res.data.schedule;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const editSingleSessionApi = async (
  scheduleId: string,
  sessionId: string,
  patch: Partial<ISession>,
  note?: string
): Promise<IScheduleDoc> => {
  try {
    const res = await axiosInstance.patch(
      `${BASE}/${encodeURIComponent(scheduleId)}/sessions/${encodeURIComponent(
        sessionId
      )}`,
      { patch, note }
    );
    return (res.data?.schedule ?? res.data) as IScheduleDoc;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const createSchedulesApi = async (
  payload: CreateSchedulesForUsersBodyInput
): Promise<CreateSchedulesResultItem[]> => {
  try {
    const ready = normalizeCreatePayload(payload);

    const res = await axiosInstance.post(`${BASE}/create`, ready);
    const { result } = res.data ?? {};
    return (
      Array.isArray(result) ? result : unwrapArray(res.data)
    ) as CreateSchedulesResultItem[];
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const deleteScheduleApi = async (scheduleId: string): Promise<void> => {
  try {
    await axiosInstance.delete(
      `${BASE}/${encodeURIComponent(scheduleId)}/delete`
    );
  } catch (error: unknown) {
    return handleError(error);
  }
};

/** Response from POST /api/schedule/auto-schedule */
export type AutoScheduleResult = {
  scheduled: boolean;
  nextDate: string;
  message: string;
};

/**
 * Trigger auto-scheduling for the next day from historical pattern.
 * Optional: pass userId (or idNumber) and triggerDate; otherwise uses logged-in user and today.
 * Used when session ends (timeout); can also be called manually from Schedule Management.
 */
export const triggerAutoScheduleApi = async (payload?: {
  userId?: string;
  triggerDate?: string;
}): Promise<AutoScheduleResult> => {
  try {
    const res = await axiosInstance.post<AutoScheduleResult>(
      `${BASE}/auto-schedule`,
      payload ?? {}
    );
    return res.data;
  } catch (error: unknown) {
    return handleError(error);
  }
};
