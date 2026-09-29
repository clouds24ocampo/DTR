// src/api/global/progress/progress.api.ts

import axios from "axios";
import type {
    NewProgressReportDTO,
    NewProgressReportFromCookieDTO,
    ProgressReport,
    ProgressReportQueryParams,
    ProgressStatus,
    ReviewProgressReportDTO,
    UpdateProgressReportDTO,
} from "../../../types/global/progress/progress.types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5005";
const BASE_PATH = `${API_BASE_URL}/api/progress`;

// Axios instance with credentials
const apiClient = axios.create({
    baseURL: BASE_PATH,
    withCredentials: true,
});

/* ===========================
 * Document Type (from API)
 * =========================== */

export interface IProgressReportDoc extends Omit<ProgressReport, "id"> {
    _id: string;
}

/* ===========================
 * Query Operations
 * =========================== */

/**
 * Get all progress reports (HR/Admin only)
 */
export async function getAllProgressReportsApi(
    params?: ProgressReportQueryParams
): Promise<IProgressReportDoc[]> {
    const { data } = await apiClient.get("/", { params });
    return data.data || data;
}

/**
 * Get my progress reports (authenticated user from cookie)
 */
export async function getMyProgressReportsApi(
    params?: ProgressReportQueryParams
): Promise<IProgressReportDoc[]> {
    const { data } = await apiClient.get("/my-reports", { params });
    return data.data || data;
}

/**
 * Get progress reports by employee ID
 */
export async function getProgressReportsByEmployeeIdApi(
    employeeId: string,
    params?: ProgressReportQueryParams
): Promise<IProgressReportDoc[]> {
    const { data } = await apiClient.get(`/employee/${employeeId}`, { params });
    return data.data || data;
}

/**
 * Get progress reports by status
 */
export async function getProgressReportsByStatusApi(
    status: ProgressStatus,
    params?: Omit<ProgressReportQueryParams, "status">
): Promise<IProgressReportDoc[]> {
    const { data } = await apiClient.get("/status", {
        params: { ...params, status },
    });
    return data.data || data;
}

/**
 * Get progress reports by date
 */
export async function getProgressReportsByDateApi(
    date: string,
    params?: Omit<ProgressReportQueryParams, "date">
): Promise<IProgressReportDoc[]> {
    const { data } = await apiClient.get("/date", {
        params: { ...params, date },
    });
    return data.data || data;
}

/**
 * Get a single progress report by ID
 */
export async function getProgressReportByIdApi(
    reportId: string
): Promise<IProgressReportDoc> {
    const { data } = await apiClient.get(`/${reportId}`);
    return data.data || data;
}

/* ===========================
 * Mutation Operations
 * =========================== */

/**
 * Create a progress report with full body
 */
export async function createProgressReportFromBodyApi(
    payload: NewProgressReportDTO
): Promise<IProgressReportDoc> {
    const { data } = await apiClient.post("/", payload);
    return data.data || data;
}

/**
 * Create a progress report (employee info from cookie)
 */
export async function createProgressReportFromCookieApi(
    payload: NewProgressReportFromCookieDTO
): Promise<IProgressReportDoc> {
    const { data } = await apiClient.post("/create", payload);
    return data.data || data;
}

/**
 * Update a progress report
 */
export async function updateProgressReportApi(
    reportId: string,
    patch: UpdateProgressReportDTO
): Promise<IProgressReportDoc> {
    const { data } = await apiClient.patch(`/${reportId}`, patch);
    return data.data || data;
}

/**
 * Review a progress report (HR only)
 */
export async function reviewProgressReportApi(
    reportId: string,
    review: ReviewProgressReportDTO
): Promise<IProgressReportDoc> {
    const { data } = await apiClient.patch(`/${reportId}/review`, review);
    return data.data || data;
}

/**
 * Delete a progress report
 */
export async function deleteProgressReportApi(
    reportId: string
): Promise<void> {
    await apiClient.delete(`/${reportId}`);
}

/**
 * Check if report exists for employee on specific date/period
 */
export async function checkProgressReportExistsApi(
    employeeId: string,
    date: string,
    period: string
): Promise<boolean> {
    const { data } = await apiClient.get("/check-exists", {
        params: { employeeId, date, period },
    });
    return data.exists || false;
}
