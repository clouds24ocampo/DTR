// src/stores/report.store.ts
import { AxiosError } from "axios";
import { create } from "zustand";

import {
  createReportFromBodyApi,
  createReportFromCookieApi,
  getAllReportsApi,
  getMyReportsApi,
  getReportsByEmployeeIdApi,
  getReportsByStatusApi,
  updateReportApi,
  updateReportStatusApi,
  type IReportDoc,
} from "../../../api/global/report/report.api";

import type {
  NewReportDTO,
  NewReportFromCookieDTO,
  ReportStatus,
  UpdateReportDTO,
} from "../../../types/global/report/report.types";

/* ----------------------------- Helpers ----------------------------- */

function extractErrorMessage(error: unknown): string {
  if ((error as AxiosError)?.isAxiosError) {
    const e = error as AxiosError<{ message?: string }>;
    return e.response?.data?.message || e.message || "Request failed";
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

function upsertReport(list: IReportDoc[], item: IReportDoc): IReportDoc[] {
  // Ensure item has an id field (transform _id to id if needed)
  const itemId = item.id || (item as any)._id || String((item as any)._id || "");
  const normalizedItem = { ...item, id: itemId };

  const idx = list.findIndex((x) => {
    const xId = x.id || (x as any)._id || String((x as any)._id || "");
    return xId === itemId;
  });

  if (idx >= 0) {
    const next = list.slice();
    next[idx] = normalizedItem;
    return next;
  }
  return [normalizedItem, ...list];
}

/* ------------------------------- Store ------------------------------ */

type ReportStore = {
  // Data
  reports: IReportDoc[];

  // Loading flags
  fetchAllLoading: boolean;
  fetchMineLoading: boolean;
  fetchByEmployeeLoading: boolean;
  fetchByStatusLoading: boolean;
  createLoading: boolean;
  updateLoading: boolean;

  // Error
  error: string | null;

  // Setters
  clearError: () => void;

  // Queries
  fetchAllReports: () => Promise<IReportDoc[]>;
  fetchMyReports: () => Promise<IReportDoc[]>;
  fetchReportsByEmployeeId: (employeeId: string) => Promise<IReportDoc[]>;
  fetchReportsByStatus: (status: ReportStatus) => Promise<IReportDoc[]>;

  // Mutations
  createReportFromBody: (payload: NewReportDTO) => Promise<IReportDoc>;
  createReportFromCookie: (
    payload: NewReportFromCookieDTO
  ) => Promise<IReportDoc>;
  updateReport: (
    reportId: string,
    patch: UpdateReportDTO
  ) => Promise<IReportDoc>;
  updateReportStatus: (
    reportId: string,
    status: ReportStatus
  ) => Promise<IReportDoc>;
};

export const useReportStore = create<ReportStore>((set) => ({
  // Data
  reports: [],

  // Loading flags
  fetchAllLoading: false,
  fetchMineLoading: false,
  fetchByEmployeeLoading: false,
  fetchByStatusLoading: false,
  createLoading: false,
  updateLoading: false,

  // Error
  error: null,

  // Setters
  clearError: () => set({ error: null }),

  /* ------------------------------ Queries ------------------------------ */

  fetchAllReports: async () => {
    set({ fetchAllLoading: true, error: null });
    try {
      const data = await getAllReportsApi();
      set({ reports: data });
      return data;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchAllLoading: false });
    }
  },

  fetchMyReports: async () => {
    set({ fetchMineLoading: true, error: null });
    try {
      const data = await getMyReportsApi();
      set({ reports: data });
      return data;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchMineLoading: false });
    }
  },

  fetchReportsByEmployeeId: async (employeeId) => {
    set({ fetchByEmployeeLoading: true, error: null });
    try {
      const data = await getReportsByEmployeeIdApi(employeeId);
      set({ reports: data });
      return data;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchByEmployeeLoading: false });
    }
  },

  fetchReportsByStatus: async (status) => {
    set({ fetchByStatusLoading: true, error: null });
    try {
      const data = await getReportsByStatusApi(status);
      set({ reports: data });
      return data;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ fetchByStatusLoading: false });
    }
  },

  /* ----------------------------- Mutations ----------------------------- */

  createReportFromBody: async (payload) => {
    set({ createLoading: true, error: null });
    try {
      const created = await createReportFromBodyApi(payload);
      set((s) => ({ reports: upsertReport(s.reports, created) }));
      return created;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ createLoading: false });
    }
  },

  createReportFromCookie: async (payload) => {
    set({ createLoading: true, error: null });
    try {
      const created = await createReportFromCookieApi(payload);
      set((s) => ({ reports: upsertReport(s.reports, created) }));
      return created;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ createLoading: false });
    }
  },

  updateReport: async (reportId, patch) => {
    set({ updateLoading: true, error: null });
    try {
      const updated = await updateReportApi(reportId, patch);
      set((s) => ({ reports: upsertReport(s.reports, updated) }));
      return updated;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ updateLoading: false });
    }
  },

  updateReportStatus: async (reportId, status) => {
    set({ updateLoading: true, error: null });
    try {
      const updated = await updateReportStatusApi(reportId, status);
      set((s) => ({ reports: upsertReport(s.reports, updated) }));
      return updated;
    } catch (e) {
      const msg = extractErrorMessage(e);
      set({ error: msg });
      throw e;
    } finally {
      set({ updateLoading: false });
    }
  },
}));
