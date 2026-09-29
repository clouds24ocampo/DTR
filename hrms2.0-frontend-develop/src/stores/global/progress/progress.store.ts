// src/stores/global/progress/progress.store.ts

import { AxiosError } from "axios";
import { create } from "zustand";

import {
    createProgressReportFromBodyApi,
    createProgressReportFromCookieApi,
    deleteProgressReportApi,
    getAllProgressReportsApi,
    getMyProgressReportsApi,
    getProgressReportsByDateApi,
    getProgressReportsByEmployeeIdApi,
    getProgressReportsByStatusApi,
    reviewProgressReportApi,
    updateProgressReportApi,
    type IProgressReportDoc,
} from "../../../api/global/progress/progress.api";

import type {
    NewProgressReportDTO,
    NewProgressReportFromCookieDTO,
    ProgressReportQueryParams,
    ProgressStatus,
    ReviewProgressReportDTO,
    UpdateProgressReportDTO,
} from "../../../types/global/progress/progress.types";

/* ----------------------------- Helpers ----------------------------- */

function extractErrorMessage(error: unknown): string {
    if ((error as AxiosError)?.isAxiosError) {
        const e = error as AxiosError<{ message?: string }>;
        return e.response?.data?.message || e.message || "Request failed";
    }
    if (error instanceof Error) return error.message;
    return "Unexpected error";
}

function upsertProgressReport(
    list: IProgressReportDoc[],
    item: IProgressReportDoc
): IProgressReportDoc[] {
    const itemId = item._id || (item as any).id || String((item as any)._id || "");
    const normalizedItem = { ...item, _id: itemId };

    const idx = list.findIndex((x) => {
        const xId = x._id || (x as any).id || String((x as any)._id || "");
        return xId === itemId;
    });

    if (idx >= 0) {
        const next = list.slice();
        next[idx] = normalizedItem;
        return next;
    }
    return [normalizedItem, ...list];
}

function removeProgressReport(
    list: IProgressReportDoc[],
    reportId: string
): IProgressReportDoc[] {
    return list.filter((x) => {
        const xId = x._id || (x as any).id || String((x as any)._id || "");
        return xId !== reportId;
    });
}

/* ------------------------------- Store ------------------------------ */

type ProgressReportStore = {
    // Data
    progressReports: IProgressReportDoc[];

    // Loading flags
    fetchAllLoading: boolean;
    fetchMineLoading: boolean;
    fetchByEmployeeLoading: boolean;
    fetchByStatusLoading: boolean;
    fetchByDateLoading: boolean;
    createLoading: boolean;
    updateLoading: boolean;
    deleteLoading: boolean;
    reviewLoading: boolean;

    // Error
    error: string | null;

    // Setters
    clearError: () => void;

    // Queries
    fetchAllProgressReports: (
        params?: ProgressReportQueryParams
    ) => Promise<IProgressReportDoc[]>;
    fetchMyProgressReports: (
        params?: ProgressReportQueryParams
    ) => Promise<IProgressReportDoc[]>;
    fetchProgressReportsByEmployeeId: (
        employeeId: string,
        params?: ProgressReportQueryParams
    ) => Promise<IProgressReportDoc[]>;
    fetchProgressReportsByStatus: (
        status: ProgressStatus,
        params?: Omit<ProgressReportQueryParams, "status">
    ) => Promise<IProgressReportDoc[]>;
    fetchProgressReportsByDate: (
        date: string,
        params?: Omit<ProgressReportQueryParams, "date">
    ) => Promise<IProgressReportDoc[]>;

    // Mutations
    createProgressReportFromBody: (
        payload: NewProgressReportDTO
    ) => Promise<IProgressReportDoc>;
    createProgressReportFromCookie: (
        payload: NewProgressReportFromCookieDTO
    ) => Promise<IProgressReportDoc>;
    updateProgressReport: (
        reportId: string,
        patch: UpdateProgressReportDTO
    ) => Promise<IProgressReportDoc>;
    reviewProgressReport: (
        reportId: string,
        review: ReviewProgressReportDTO
    ) => Promise<IProgressReportDoc>;
    deleteProgressReport: (reportId: string) => Promise<void>;
};

export const useProgressReportStore = create<ProgressReportStore>((set) => ({
    // Data
    progressReports: [],

    // Loading flags
    fetchAllLoading: false,
    fetchMineLoading: false,
    fetchByEmployeeLoading: false,
    fetchByStatusLoading: false,
    fetchByDateLoading: false,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
    reviewLoading: false,

    // Error
    error: null,

    // Setters
    clearError: () => set({ error: null }),

    /* ------------------------------ Queries ------------------------------ */

    fetchAllProgressReports: async (params) => {
        set({ fetchAllLoading: true, error: null });
        try {
            const data = await getAllProgressReportsApi(params);
            set({ progressReports: data });
            return data;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ fetchAllLoading: false });
        }
    },

    fetchMyProgressReports: async (params) => {
        set({ fetchMineLoading: true, error: null });
        try {
            const data = await getMyProgressReportsApi(params);
            set({ progressReports: data });
            return data;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ fetchMineLoading: false });
        }
    },

    fetchProgressReportsByEmployeeId: async (employeeId, params) => {
        set({ fetchByEmployeeLoading: true, error: null });
        try {
            const data = await getProgressReportsByEmployeeIdApi(employeeId, params);
            set({ progressReports: data });
            return data;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ fetchByEmployeeLoading: false });
        }
    },

    fetchProgressReportsByStatus: async (status, params) => {
        set({ fetchByStatusLoading: true, error: null });
        try {
            const data = await getProgressReportsByStatusApi(status, params);
            set({ progressReports: data });
            return data;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ fetchByStatusLoading: false });
        }
    },

    fetchProgressReportsByDate: async (date, params) => {
        set({ fetchByDateLoading: true, error: null });
        try {
            const data = await getProgressReportsByDateApi(date, params);
            set({ progressReports: data });
            return data;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ fetchByDateLoading: false });
        }
    },

    /* ----------------------------- Mutations ----------------------------- */

    createProgressReportFromBody: async (payload) => {
        set({ createLoading: true, error: null });
        try {
            const created = await createProgressReportFromBodyApi(payload);
            set((s) => ({ progressReports: upsertProgressReport(s.progressReports, created) }));
            return created;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ createLoading: false });
        }
    },

    createProgressReportFromCookie: async (payload) => {
        set({ createLoading: true, error: null });
        try {
            const created = await createProgressReportFromCookieApi(payload);
            set((s) => ({ progressReports: upsertProgressReport(s.progressReports, created) }));
            return created;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ createLoading: false });
        }
    },

    updateProgressReport: async (reportId, patch) => {
        set({ updateLoading: true, error: null });
        try {
            const updated = await updateProgressReportApi(reportId, patch);
            set((s) => ({ progressReports: upsertProgressReport(s.progressReports, updated) }));
            return updated;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ updateLoading: false });
        }
    },

    reviewProgressReport: async (reportId, review) => {
        set({ reviewLoading: true, error: null });
        try {
            const updated = await reviewProgressReportApi(reportId, review);
            set((s) => ({ progressReports: upsertProgressReport(s.progressReports, updated) }));
            return updated;
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ reviewLoading: false });
        }
    },

    deleteProgressReport: async (reportId) => {
        set({ deleteLoading: true, error: null });
        try {
            await deleteProgressReportApi(reportId);
            set((s) => ({ progressReports: removeProgressReport(s.progressReports, reportId) }));
        } catch (e) {
            const msg = extractErrorMessage(e);
            set({ error: msg });
            throw e;
        } finally {
            set({ deleteLoading: false });
        }
    },
}));
