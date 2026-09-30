import axiosInstance from "../../../axios/axiosInstance";
import { handleError } from "../../../axios/errorHandler";
import type {
  Report as IReportDoc,
  NewReportDTO,
  NewReportFromCookieDTO,
  ReportStatus,
  UpdateReportDTO,
} from "../../../types/global/report/report.types";

const BASE = "api/report";

/**
 * Transform a report object from backend format (_id) to frontend format (id)
 */
function transformReport(report: any): any {
  if (!report) return report;

  return {
    ...report,
    id: report.id || report._id || String(report._id || ""),
    // Ensure all required fields are present
    employeeId: report.employeeId || "",
    employeeName: report.employeeName || "",
    type: report.type || "other",
    title: report.title || "",
    description: report.description || "",
    priority: report.priority || "low",
    status: report.status || "open",
    assignedTo: report.assignedTo || "Not yet assigned",
    createdAt: report.createdAt || new Date().toISOString(),
    updatedAt: report.updatedAt || undefined,
  };
}

function unwrapArray(maybe: any): any[] {
  let array: any[] = [];
  if (Array.isArray(maybe)) array = maybe;
  else if (Array.isArray(maybe?.data)) array = maybe.data;
  else if (Array.isArray(maybe?.reports)) array = maybe.reports;
  else if (Array.isArray(maybe?.result)) array = maybe.result;
  else if (Array.isArray(maybe?.payload)) array = maybe.payload;

  // Transform each report
  return array.map(transformReport);
}

function unwrapOne<T = any>(maybe: any): T {
  let report: any = null;
  if (maybe?.report) report = maybe.report;
  else if (maybe?.data && !Array.isArray(maybe.data)) report = maybe.data;
  else report = maybe;

  return transformReport(report) as T;
}

export const createReportFromBodyApi = async (
  payload: NewReportDTO
): Promise<IReportDoc> => {
  try {
    const res = await axiosInstance.post(`${BASE}/create`, payload);
    return unwrapOne<IReportDoc>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const createReportFromCookieApi = async (
  payload: NewReportFromCookieDTO
): Promise<IReportDoc> => {
  try {
    const res = await axiosInstance.post(`${BASE}/create/self`, payload);
    return unwrapOne<IReportDoc>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getAllReportsApi = async (): Promise<IReportDoc[]> => {
  try {
    const res = await axiosInstance.get(`${BASE}`);
    return unwrapArray(res.data) as IReportDoc[];
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getMyReportsApi = async (): Promise<IReportDoc[]> => {
  try {
    const res = await axiosInstance.get(`${BASE}/`);
    return unwrapArray(res.data) as IReportDoc[];
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getReportsByEmployeeIdApi = async (
  employeeId: string
): Promise<IReportDoc[]> => {
  try {
    const res = await axiosInstance.get(
      `${BASE}/employee/${encodeURIComponent(employeeId)}`
    );
    return unwrapArray(res.data) as IReportDoc[];
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const getReportsByStatusApi = async (
  status: ReportStatus
): Promise<IReportDoc[]> => {
  try {
    const res = await axiosInstance.get(
      `${BASE}/status/${encodeURIComponent(status)}`
    );
    return unwrapArray(res.data) as IReportDoc[];
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const updateReportApi = async (
  reportId: string,
  patch: UpdateReportDTO
): Promise<IReportDoc> => {
  try {
    const res = await axiosInstance.patch(
      `${BASE}/${encodeURIComponent(reportId)}`,
      { patch }
    );
    return unwrapOne<IReportDoc>(res.data);
  } catch (error: unknown) {
    return handleError(error);
  }
};

export const updateReportStatusApi = async (
  reportId: string,
  status: ReportStatus
): Promise<IReportDoc> => updateReportApi(reportId, { status });

export type { IReportDoc };
