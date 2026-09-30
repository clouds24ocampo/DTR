// src/controllers/report/report.controller.ts
import { Request, Response } from "express";
import { ServiceError } from "src/utils/global/error";
import { getUserFromCookie } from "src/utils/global/getCookie";
import {
  addReportService,
  getAllReportsService,
  getReportsByEmployeeIdService,
  getReportsByStatusService,
  updateReportService,
} from "../../../services/global/report/report.service";
import type {
  NewReportDTO,
  ReportStatus,
  UpdateReportDTO,
} from "../../../types/global/report/report.types";
import { REPORT_DEFAULT_ASSIGNEE } from "../../../types/global/report/report.types";

/** DB-safe fallback when client omits priority (UI may show "Not set"). */
const SERVER_FALLBACK_PRIORITY: "low" = "low";

/* -------------------------------------------------------------------------- */
/*                                CREATE (BODY)                               */
/* -------------------------------------------------------------------------- */
/**
 * Accepts employeeId & employeeName from the request body.
 * Priority is optional (defaults to low). Assignee defaults to "Not yet assigned".
 */
export const createReportFromBody = async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<NewReportDTO>;

    const required: Array<keyof NewReportDTO> = [
      "employeeId",
      "employeeName",
      "type",
      "title",
      "description",
    ];
    const missing = required.filter((k) => !body[k]);
    if (missing.length) {
      throw new ServiceError(
        `Missing required fields: ${missing.join(", ")}`,
        400
      );
    }

    const payload: NewReportDTO = {
      employeeId: body.employeeId!,
      employeeName: body.employeeName!,
      type: body.type!,
      title: body.title!,
      description: body.description!,
      priority: body.priority ?? SERVER_FALLBACK_PRIORITY,
      status: body.status ?? "open",
      assignedTo:
        (body.assignedTo && String(body.assignedTo).trim()) ||
        REPORT_DEFAULT_ASSIGNEE,
    };

    const report = await addReportService(payload);
    return res
      .status(201)
      .json({ message: "Report created successfully", report });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("createReportFromBody error:", err);
    return res.status(500).json({ message: "Failed to create report" });
  }
};

/* -------------------------------------------------------------------------- */
/*                               CREATE (COOKIE)                              */
/* -------------------------------------------------------------------------- */
export const createReportFromCookie = async (req: Request, res: Response) => {
  try {
    const me = getUserFromCookie(req);

    // tolerate different shapes
    const userId: string | undefined = me?.id ?? me?._id ?? me?.userId;
    const nameFromFields = [me?.firstName, me?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const employeeName: string | undefined =
      me?.name || nameFromFields || me?.fullName || me?.email;

    if (!userId) throw new ServiceError("Not authenticated", 401);
    if (!employeeName)
      throw new ServiceError("Unable to resolve user name", 400);

    const body = req.body as Partial<NewReportDTO>;
    const required: Array<keyof NewReportDTO> = [
      "type",
      "title",
      "description",
    ];
    const missing = required.filter((k) => !body[k]);
    if (missing.length) {
      throw new ServiceError(
        `Missing required fields: ${missing.join(", ")}`,
        400
      );
    }

    const payload: NewReportDTO = {
      employeeId: userId,
      employeeName,
      type: body.type!,
      title: body.title!,
      description: body.description!,
      priority: body.priority ?? SERVER_FALLBACK_PRIORITY,
      status: body.status ?? "open",
      assignedTo:
        (body.assignedTo && String(body.assignedTo).trim()) ||
        REPORT_DEFAULT_ASSIGNEE,
    };

    const report = await addReportService(payload);
    return res
      .status(201)
      .json({ message: "Report created successfully", report });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("createReportFromCookie error:", err);
    return res.status(500).json({ message: "Failed to create report" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                    READ                                    */
/* -------------------------------------------------------------------------- */

export const getAllReports = async (_req: Request, res: Response) => {
  try {
    const reports = await getAllReportsService();
    return res
      .status(200)
      .json({ message: "Reports retrieved successfully", reports });
  } catch (err) {
    console.error("Error fetching reports:", err);
    return res.status(500).json({ message: "Failed to retrieve reports" });
  }
};

export const getReportsByEmployeeId = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params as { employeeId?: string };
    if (!employeeId)
      return res.status(400).json({ message: "Employee ID is required" });

    const reports = await getReportsByEmployeeIdService(employeeId);
    return res
      .status(200)
      .json({ message: "Reports retrieved successfully", reports });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching reports by employeeId:", err);
    return res
      .status(500)
      .json({ message: "Failed to retrieve reports by employeeId" });
  }
};

export const getReportsByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.params as { status?: ReportStatus };
    if (!status) return res.status(400).json({ message: "Status is required" });

    const reports = await getReportsByStatusService(status);
    return res
      .status(200)
      .json({ message: "Reports retrieved successfully", reports });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching reports by status:", err);
    return res
      .status(500)
      .json({ message: "Failed to retrieve reports by status" });
  }
};

export const getMyReports = async (req: Request, res: Response) => {
  try {
    const me = getUserFromCookie(req);
    if (!me?.id) return res.status(401).json({ message: "Not authenticated" });

    const reports = await getReportsByEmployeeIdService(me.id);
    console.log("Reports retrieved successfully", reports);
    return res
      .status(200)
      .json({ message: "Reports retrieved successfully", reports });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching my reports:", err);
    return res.status(500).json({ message: "Failed to retrieve my reports" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   UPDATE                                   */
/* -------------------------------------------------------------------------- */

export const updateReport = async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params as { reportId?: string };
    const { patch } = req.body as { patch?: UpdateReportDTO };

    if (!reportId) {
      return res.status(400).json({ message: "Report ID is required" });
    }
    if (!patch || typeof patch !== "object") {
      return res.status(400).json({ message: "Patch payload is required" });
    }

    // Optional guard: require authentication
    const me = getUserFromCookie(req);
    if (!me?.id) return res.status(401).json({ message: "Not authenticated" });

    const report = await updateReportService(reportId, patch);
    return res
      .status(200)
      .json({ message: "Report updated successfully", report });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error updating report:", err);
    return res.status(500).json({ message: "Failed to update report" });
  }
};
