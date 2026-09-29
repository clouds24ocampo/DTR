import User from "src/models/workforce/user.model";
import { ServiceError } from "src/utils/global/error";
import Report from "../../../models/global/report.model";
import {
  Report as IReport,
  NewReportDTO,
  REPORT_DEFAULT_ASSIGNEE,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  REPORT_TYPES,
  UpdateReportDTO,
} from "../../../types/global/report/report.types";
import { createNotificationService } from "../notification/notification.service";

/* ----------------------------- Small shared utils ----------------------------- */

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const assertInEnum = <T extends readonly string[]>(
  value: string,
  allowed: T,
  fieldName: string
) => {
  if (!allowed.includes(value)) {
    throw new ServiceError(
      `${fieldName} must be one of: ${allowed.join(", ")}`,
      400
    );
  }
};

const toSafeReport = (raw: any): IReport => ({
  id: String(raw.id ?? raw._id ?? ""),
  employeeId: raw.employeeId,
  employeeName: raw.employeeName,
  type: raw.type,
  title: raw.title,
  description: raw.description,
  priority: raw.priority,
  status: raw.status,
  assignedTo: raw.assignedTo ?? undefined,
  createdAt: new Date(raw.createdAt ?? Date.now()).toISOString(),
  updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : undefined,
});

/* --------------------------------- Validators --------------------------------- */

const validateNewReport = (payload: NewReportDTO) => {
  if (!isNonEmptyString(payload.employeeId))
    throw new ServiceError("employeeId is required", 400);
  if (!isNonEmptyString(payload.employeeName))
    throw new ServiceError("employeeName is required", 400);
  if (!isNonEmptyString(payload.title))
    throw new ServiceError("title is required", 400);
  if (!isNonEmptyString(payload.description))
    throw new ServiceError("description is required", 400);

  assertInEnum(payload.type, REPORT_TYPES, "type");

  if (payload.priority)
    assertInEnum(payload.priority, REPORT_PRIORITIES, "priority");

  if (payload.status) assertInEnum(payload.status, REPORT_STATUSES, "status");

  if (
    payload.assignedTo !== undefined &&
    payload.assignedTo !== null &&
    !isNonEmptyString(payload.assignedTo)
  ) {
    throw new ServiceError(
      "assignedTo must be a non-empty string if provided",
      400
    );
  }
};

/* --------------------------------- Create report --------------------------------- */

const SERVER_FALLBACK_PRIORITY: (typeof REPORT_PRIORITIES)[number] = "low";

export const addReportService = async (
  payload: NewReportDTO
): Promise<IReport> => {
  try {
    validateNewReport(payload);

    const reporter = await User.findById(payload.employeeId).lean();
    if (!reporter) throw new ServiceError("Reporter user not found", 404);

    const status = payload.status ?? "open";
    const priority = payload.priority ?? SERVER_FALLBACK_PRIORITY;
    const assignedTo =
      (typeof payload.assignedTo === "string" && payload.assignedTo.trim()) ||
      REPORT_DEFAULT_ASSIGNEE;

    const created = await Report.create({
      employeeId: payload.employeeId,
      employeeName: payload.employeeName,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      priority,
      status,
      assignedTo,
    });

    // Notify assigned person about new report
    if (assignedTo && assignedTo !== REPORT_DEFAULT_ASSIGNEE) {
      const assignedUser = await User.findById(assignedTo).lean();
      if (assignedUser) {
        createNotificationService({
          userId: assignedTo,
          type: "report_assigned",
          title: "New Report Assigned",
          body: `${payload.employeeName} has submitted a ${payload.type} report: ${payload.title}`,
          fromName: payload.employeeName,
          fromId: payload.employeeId,
          priority: (priority as string) === "urgent" ? "urgent" : priority === "high" ? "high" : "medium",
          link: "/reports",
          metadata: {
            reportId: created._id.toString(),
            employeeId: payload.employeeId,
            type: payload.type,
          },
        }).catch((err) => {
          console.error("Error creating report assignment notification:", err);
        });
      }
    }

    return toSafeReport(created);
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to add report", 500);
  }
};

/* --------------------------------- Simple getters --------------------------------- */

export const getAllReportsService = async (): Promise<IReport[]> => {
  try {
    const docs = await Report.find({}).sort({ createdAt: -1 }).lean();
    return docs.map(toSafeReport);
  } catch {
    throw new ServiceError("Failed to fetch reports", 500);
  }
};

export const getReportsByEmployeeIdService = async (
  employeeId: string
): Promise<IReport[]> => {
  try {
    if (!isNonEmptyString(employeeId))
      throw new ServiceError("employeeId is required", 400);

    const docs = await Report.find({ employeeId })
      .sort({ createdAt: -1 })
      .lean();

    return docs.map(toSafeReport);
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to fetch reports by employee", 500);
  }
};

export const getReportsByStatusService = async (
  status: IReport["status"]
): Promise<IReport[]> => {
  try {
    assertInEnum(status, REPORT_STATUSES, "status");
    const docs = await Report.find({ status }).sort({ createdAt: -1 }).lean();
    return docs.map(toSafeReport);
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to fetch reports by status", 500);
  }
};

/* --------------------------------- Update report --------------------------------- */

export const updateReportService = async (
  reportId: string,
  patch: UpdateReportDTO
): Promise<IReport> => {
  try {
    if (!reportId) throw new ServiceError("reportId is required", 400);
    if (!patch || typeof patch !== "object")
      throw new ServiceError("Patch payload is required", 400);

    const allowed: (keyof UpdateReportDTO)[] = [
      "title",
      "description",
      "type",
      "priority",
      "status",
      "assignedTo",
    ];
    const update: Record<string, any> = {};
    for (const k of allowed) {
      if (k in patch) (update as any)[k] = (patch as any)[k];
    }

    if (update.type) assertInEnum(update.type, REPORT_TYPES, "type");
    if (update.priority)
      assertInEnum(update.priority, REPORT_PRIORITIES, "priority");
    if (update.status) assertInEnum(update.status, REPORT_STATUSES, "status");
    if (update.assignedTo !== undefined && update.assignedTo !== null) {
      if (typeof update.assignedTo !== "string" || !update.assignedTo.trim()) {
        throw new ServiceError(
          "assignedTo must be a non-empty string if provided",
          400
        );
      }
    }

    const existing = await Report.findById(reportId).lean();
    if (!existing) throw new ServiceError("Report not found", 404);

    const doc = await Report.findByIdAndUpdate(
      reportId,
      { $set: update },
      { new: true, runValidators: true, lean: true }
    );
    if (!doc) throw new ServiceError("Report not found", 404);

    // Notify when report is assigned to someone new
    if (update.assignedTo && update.assignedTo !== existing.assignedTo) {
      const assignedUser = await User.findById(update.assignedTo).lean();
      if (assignedUser) {
        createNotificationService({
          userId: update.assignedTo,
          type: "report_assigned",
          title: "Report Assigned to You",
          body: `A ${doc.type} report "${doc.title}" has been assigned to you`,
          fromName: "System",
          priority: (doc.priority as string) === "urgent" ? "urgent" : doc.priority === "high" ? "high" : "medium",
          link: "/reports",
          metadata: {
            reportId: reportId,
            type: doc.type,
          },
        }).catch((err) => {
          console.error("Error creating report assignment notification:", err);
        });
      }
    }

    // Notify reporter when report is resolved
    if (update.status === "resolved" && existing.status !== "resolved") {
      createNotificationService({
        userId: doc.employeeId,
        type: "report_resolved",
        title: "Report Resolved",
        body: `Your ${doc.type} report "${doc.title}" has been resolved`,
        fromName: "System",
        priority: "medium",
        link: "/reports",
        metadata: {
          reportId: reportId,
          type: doc.type,
        },
      }).catch((err) => {
        console.error("Error creating report resolved notification:", err);
      });
    }

    return toSafeReport(doc);
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to update report", 500);
  }
};

export default {
  addReportService,
  getAllReportsService,
  getReportsByEmployeeIdService,
  getReportsByStatusService,
  updateReportService,
};
