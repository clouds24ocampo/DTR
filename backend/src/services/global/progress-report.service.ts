import { ServiceError } from "../../utils/global/error";
import ProgressReport from "../../models/global/progress-report.model";
import {
  NewProgressReportDTO,
  UpdateProgressReportDTO,
  ReviewProgressReportDTO,
  ProgressReportQueryParams,
} from "../../types/global/progress/progress.types";

export const createProgressReportService = async (payload: NewProgressReportDTO) => {
  try {
    const existing = await ProgressReport.findOne({
      employeeId: payload.employeeId,
      date: payload.date,
      period: payload.period,
    });

    if (existing) {
      throw new ServiceError(
        `A report for ${payload.date} (${payload.period}) already exists.`,
        400
      );
    }

    const report = await ProgressReport.create({
      ...payload,
      submittedAt: payload.status === "submitted" ? new Date() : undefined,
    });
    return report;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("Failed to create progress report", 500);
  }
};

export const getAllProgressReportsService = async (params: ProgressReportQueryParams) => {
  try {
    const query: any = {};
    if (params.employeeId) query.employeeId = params.employeeId;
    if (params.status) query.status = params.status;
    if (params.period) query.period = params.period;
    if (params.date) query.date = params.date;
    if (params.startDate && params.endDate) {
      query.date = { $gte: params.startDate, $lte: params.endDate };
    }

    return await ProgressReport.find(query).sort({ date: -1, createdAt: -1 });
  } catch (error) {
    throw new ServiceError("Failed to fetch progress reports", 500);
  }
};

export const getProgressReportByIdService = async (id: string) => {
  try {
    const report = await ProgressReport.findById(id);
    if (!report) throw new ServiceError("Progress report not found", 404);
    return report;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("Failed to fetch progress report", 500);
  }
};

export const updateProgressReportService = async (id: string, payload: UpdateProgressReportDTO) => {
  try {
    const report = await ProgressReport.findById(id);
    if (!report) throw new ServiceError("Progress report not found", 404);

    if (report.status === "reviewed" || report.status === "archived") {
      throw new ServiceError("Cannot edit a reviewed or archived report", 400);
    }

    Object.assign(report, payload);
    if (payload.status === "submitted" && !report.submittedAt) {
      report.submittedAt = new Date();
    }

    return await report.save();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("Failed to update progress report", 500);
  }
};

export const reviewProgressReportService = async (id: string, payload: ReviewProgressReportDTO) => {
  try {
    const report = await ProgressReport.findById(id);
    if (!report) throw new ServiceError("Progress report not found", 404);

    report.status = payload.status;
    report.reviewNotes = payload.reviewNotes;
    report.reviewedBy = payload.reviewedBy;
    report.reviewedAt = new Date();

    return await report.save();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("Failed to review progress report", 500);
  }
};

export const deleteProgressReportService = async (id: string) => {
  try {
    const report = await ProgressReport.findById(id);
    if (!report) throw new ServiceError("Progress report not found", 404);
    
    // Only allow deleting drafts or submitted (maybe HR only for submitted)
    // For now, let's just delete it as requested by the CRUD logic
    await ProgressReport.findByIdAndDelete(id);
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("Failed to delete progress report", 500);
  }
};

export const checkProgressReportExistsService = async (employeeId: string, date: string, period: string) => {
  try {
    const exists = await ProgressReport.exists({ employeeId, date, period });
    return !!exists;
  } catch (error) {
    throw new ServiceError("Failed to check progress report existence", 500);
  }
};

