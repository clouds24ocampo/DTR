/* eslint-disable @typescript-eslint/no-explicit-any */

import axiosInstance from "../../../axios/axiosInstance";
import { handleError } from "../../../axios/errorHandler";
import {
  CreateDTRBodyInput,
  DTRDocLite,
  EndDTRItemBodyInput,
  StartDTRItemBodyInput,
} from "../../../types/global/dtr/dtr.type";

export type CreateDTRResponse = { message: string; dtr: DTRDocLite };
export type StartDTRItemResponse = {
  message: string;
  startTime: string;
  startTag: string;
  endTag?: string;
};
export type EndDTRItemResponse = { message: string; endedCount: number };
export type DTRListResponse = { message: string; dtrs: DTRDocLite[] };
export type DTRSingleResponse = { message: string; dtr: DTRDocLite };

const trimIfString = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const createDTR = async (
  payload: CreateDTRBodyInput
): Promise<CreateDTRResponse> => {
  try {
    const body: CreateDTRBodyInput = {
      ...payload,
      userId: trimIfString(payload.userId) as string | undefined,
      date: trimIfString(payload.date) as string | undefined,
    };
    const { data } = await axiosInstance.post<CreateDTRResponse>(
      "/api/dtr/create",
      body
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const startDTRItem = async (
  payload: StartDTRItemBodyInput & { now?: string }
): Promise<StartDTRItemResponse> => {
  try {
    const body = {
      ...payload,
      userId: trimIfString(payload.userId) as string | undefined,
      type: trimIfString(payload.type) as string | undefined,
      issue: trimIfString(payload.issue) as string | undefined,
      reason: trimIfString(payload.reason) as string | undefined,
      date: trimIfString(payload.date) as string | undefined,
      now: trimIfString((payload as any).now) as string | undefined,
    };
    const { data } = await axiosInstance.post<StartDTRItemResponse>(
      "/api/dtr/start",
      body
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const endDTRItem = async (
  payload: EndDTRItemBodyInput & { now?: string }
): Promise<EndDTRItemResponse> => {
  try {
    const body = {
      ...payload,
      userId: trimIfString(payload.userId) as string | undefined,
      date: trimIfString(payload.date) as string | undefined,
      now: trimIfString((payload as any).now) as string | undefined,
    };
    const { data } = await axiosInstance.post<EndDTRItemResponse>(
      "/api/dtr/end",
      body
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const fetchAllDTRs = async (): Promise<DTRListResponse> => {
  try {
    const { data } = await axiosInstance.get<DTRListResponse>("/api/dtr");
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const fetchDTRsByUserId = async (
  userId: string
): Promise<DTRListResponse> => {
  try {
    const { data } = await axiosInstance.get<DTRListResponse>(
      `/api/dtr/user/${encodeURIComponent(userId)}`
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const fetchDTRsByDate = async (
  date: string
): Promise<DTRListResponse> => {
  try {
    const { data } = await axiosInstance.get<DTRListResponse>(
      `/api/dtr/date/${encodeURIComponent(date)}`
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const fetchMyDTRByDate = async (
  date: string,
  opts?: { autoCreate?: boolean }
): Promise<DTRSingleResponse> => {
  try {
    const { data } = await axiosInstance.get<DTRSingleResponse>(
      `/api/dtr/me/date/${encodeURIComponent(date)}`,
      { params: { autoCreate: opts?.autoCreate ?? true } }
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const fetchDTRsByUserAndDate = async (payload: {
  userId: string;
  date: string;
  kiosk?: boolean; // public clock page: today only, allow-listed fields
  password?: string; // kiosk reads require the employee's password
}): Promise<DTRListResponse> => {
  try {
    const body = {
      userId: trimIfString(payload.userId) as string,
      date: trimIfString(payload.date) as string,
      ...(payload.kiosk ? { kiosk: true, password: payload.password } : {}),
    };
    const { data } = await axiosInstance.post<DTRListResponse>(
      "/api/dtr/filtered",
      body
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const fetchPendingTripApprovals = async (): Promise<{
  message: string;
  pendingTrips: any[];
}> => {
  try {
    const { data } = await axiosInstance.get("/api/dtr/trips/pending");
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const updateTripApproval = async (payload: {
  dtrId: string;
  sessionIndex: number;
  entryIndex: number;
  approvalStatus: "approved" | "rejected" | "converted";
}): Promise<{ message: string; dtr: DTRDocLite }> => {
  try {
    const { data } = await axiosInstance.post("/api/dtr/trips/approve", payload);
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const cancelTrip = async (payload: {
  userId: string;
  date: string;
  convertToWork?: boolean;
  password?: string;
}): Promise<{ message: string }> => {
  try {
    const body = {
      userId: trimIfString(payload.userId) as string,
      date: trimIfString(payload.date) as string,
      convertToWork: payload.convertToWork,
      password: payload.password,
      website_url: "",
      _hp_check: "1",
    };
    const { data } = await axiosInstance.post<{ message: string }>(
      "/api/dtr/trips/cancel",
      body
    );
    return data;
  } catch (error: unknown) {
    return handleError(error);
  }
};
