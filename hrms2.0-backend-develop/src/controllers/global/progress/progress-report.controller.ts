import { Request, Response } from "express";
import { ServiceError } from "../../../utils/global/error";
import { getUserFromCookie } from "../../../utils/global/getCookie";
import * as ProgressReportService from "../../../services/global/progress-report.service";

export const createReport = async (req: Request, res: Response) => {
  try {
    const report = await ProgressReportService.createProgressReportService(req.body);
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const createReportFromCookie = async (req: Request, res: Response) => {
  try {
    const user = getUserFromCookie(req);
    if (!user) throw new ServiceError("Unauthorized", 401);

    const employeeId = user.id || user._id;
    const employeeName = `${user.firstName} ${user.lastName}`.trim();

    const report = await ProgressReportService.createProgressReportService({
      ...req.body,
      employeeId,
      employeeName,
    });
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const getAllReports = async (req: Request, res: Response) => {
  try {
    const reports = await ProgressReportService.getAllProgressReportsService(req.query);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyReports = async (req: Request, res: Response) => {
  try {
    const user = getUserFromCookie(req);
    if (!user) throw new ServiceError("Unauthorized", 401);

    const employeeId = user.id || user._id;
    const reports = await ProgressReportService.getAllProgressReportsService({
      ...req.query,
      employeeId,
    });
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const getReportById = async (req: Request, res: Response) => {
  try {
    const report = await ProgressReportService.getProgressReportByIdService(req.params.id);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const updateReport = async (req: Request, res: Response) => {
  try {
    const report = await ProgressReportService.updateProgressReportService(
      req.params.id,
      req.body
    );
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const reviewReport = async (req: Request, res: Response) => {
  try {
    const report = await ProgressReportService.reviewProgressReportService(
      req.params.id,
      req.body
    );
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    await ProgressReportService.deleteProgressReportService(req.params.id);
    res.status(200).json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    if (error instanceof ServiceError) {
      res.status(error.status).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

export const checkExists = async (req: Request, res: Response) => {
  try {
    const { employeeId, date, period } = req.query as {
      employeeId: string;
      date: string;
      period: string;
    };

    if (!employeeId || !date || !period) {
      return res.status(400).json({ message: "Missing required query parameters" });
    }

    const exists = await ProgressReportService.checkProgressReportExistsService(
      employeeId,
      date,
      period
    );
    res.status(200).json({ success: true, exists });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

