import moment from "moment";
import { Types } from "mongoose";
import Leave from "src/models/global/leave.model";
import Schedule from "src/models/global/schedule.model";
import User from "src/models/workforce/user.model";
import {
  CreateLeaveRequestBodyInput,
  EditLeaveRequestBodyInput,
  ILeaveRequest,
  LeaveStatus,
  UpdateLeaveStatusBodyInput,
} from "src/types/global/leave/leave.type";
import type { ISession } from "src/types/global/schedule/schedule.type";
import { ServiceError } from "src/utils/global/error";
import { ensureDTRSync } from "src/utils/global/schedule/schedTime.utils";
import { createNotificationService } from "../notification/notification.service";

/* ----------------------------- Constants ----------------------------- */

const LEAVE_TYPES = ["sick", "vacation", "personal", "emergency"] as const;
const LEAVE_STATUSES = ["pending", "approved", "rejected", "canceled"] as const;

type SafeLeave = ILeaveRequest & { id: string; idNumber: string };
type LeaveLeanDoc = ILeaveRequest & { _id: Types.ObjectId | string };

/* ----------------------------- Helpers ----------------------------- */

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const assertInEnum = <T extends readonly string[]>(
  value: string,
  allowed: T,
  fieldName: string
) => {
  if (!allowed.includes(value as any)) {
    throw new ServiceError(
      `${fieldName} must be one of: ${allowed.join(", ")}`,
      400
    );
  }
};

const toSafeLeave = (raw: any): SafeLeave => ({
  id: String(raw.id ?? raw._id ?? ""),
  employeeId: raw.employeeId,
  employeeName: raw.employeeName,
  idNumber: raw.idNumber ?? "",
  type: raw.type,
  startDate: raw.startDate,
  endDate: raw.endDate,
  reason: raw.reason,
  status: raw.status,
  requestedAt: new Date(raw.requestedAt ?? Date.now()).toISOString(),
  review: raw.review && {
    reviewedById: raw.review.reviewedById,
    reviewedByName: raw.review.reviewedByName,
    reviewedAt: new Date(raw.review.reviewedAt).toISOString(),
    note: raw.review.note,
  },
  approvedBy: raw.approvedBy && {
    userId: raw.approvedBy.userId,
    userName: raw.approvedBy.userName,
    approvedAt: new Date(raw.approvedBy.approvedAt).toISOString(),
  },
  teamId: raw.teamId ?? undefined,
  workstationId: raw.workstationId ?? undefined,
  attachmentUrls: raw.attachmentUrls ?? undefined,
  halfDay: raw.halfDay ?? undefined,
  approvals: raw.approvals,
  rejectionReason: raw.rejectionReason,
});

/** Enrich leave docs with employee idNumber when missing (e.g. legacy docs). */
const enrichWithIdNumber = async (rawDocs: any[]): Promise<any[]> => {
  if (!rawDocs.length) return rawDocs;
  const ids = [...new Set(rawDocs.map((d) => d.employeeId).filter(Boolean))];
  if (!ids.length) return rawDocs;
  const users = await User.find({ _id: { $in: ids } })
    .select("_id idNumber")
    .lean();
  const map = new Map(users.map((u: any) => [String(u._id), u.idNumber ?? ""]));
  return rawDocs.map((d) => ({
    ...d,
    idNumber: d.idNumber ?? map.get(d.employeeId) ?? "",
  }));
};

/** iterate all Y-M-D in [start, end] */
const eachDate = (startYMD: string, endYMD: string): string[] => {
  const s = moment(startYMD, "YYYY-MM-DD", true);
  const e = moment(endYMD, "YYYY-MM-DD", true);
  if (!s.isValid() || !e.isValid()) return [];
  const out: string[] = [];
  for (let d = s.clone(); d.isSameOrBefore(e, "day"); d.add(1, "day")) {
    out.push(d.format("YYYY-MM-DD"));
  }
  return out;
};

const placeholderSession = (leaveTypeLabel: string): ISession => ({
  label: leaveTypeLabel,
  workCredits: "00:00",
  breakCredits: "00:00",
  breakCount: 0,
  mealCredits: "00:00",
  mealCount: 0,
  scheduledStartTime: "00:00",
  scheduledEndTime: "00:00",
  startMealTime: [],
  fullSched: [],
});

/* ----------------------------- Schedule sync ----------------------------- */

const upsertLeavePlaceholderSchedule = async (
  userId: string,
  date: string,
  leaveTypeLabel: string
) => {
  const sched = await Schedule.findOne({ userId, date });
  const session = placeholderSession(leaveTypeLabel);

  if (sched) {
    const exists = sched.sessions.some(
      (s: any) =>
        s.label === leaveTypeLabel &&
        s.scheduledStartTime === "00:00" &&
        s.scheduledEndTime === "00:00"
    );
    if (!exists) sched.sessions.push(session);
    await sched.save();
    await ensureDTRSync(userId, date, sched.sessions as any);
  } else {
    const created = await Schedule.create({
      userId,
      date,
      sessions: [session],
    });
    await ensureDTRSync(userId, date, created.sessions as any);
  }
};

const removeLeavePlaceholderSchedule = async (
  userId: string,
  date: string,
  leaveTypeLabel: string
) => {
  const sched = await Schedule.findOne({ userId, date });
  if (!sched) return;
  const next = sched.sessions.filter(
    (s: any) =>
      !(
        s.label === leaveTypeLabel &&
        s.scheduledStartTime === "00:00" &&
        s.scheduledEndTime === "00:00"
      )
  );
  if (next.length !== sched.sessions.length) {
    sched.sessions = next as any;
    await sched.save();
  }
};

const syncLeaveSchedules = async (
  employeeId: string,
  type: string,
  startDate: string,
  endDate: string,
  action: "add" | "remove"
) => {
  const dates = eachDate(startDate, endDate);
  for (const ymd of dates) {
    if (action === "add") {
      await upsertLeavePlaceholderSchedule(employeeId, ymd, type);
    } else {
      await removeLeavePlaceholderSchedule(employeeId, ymd, type);
    }
  }
};

/* ----------------------------- Validation ----------------------------- */

const validateNewLeave = (p: CreateLeaveRequestBodyInput) => {
  ["employeeId", "employeeName", "reason", "startDate", "endDate"].forEach(
    (f) => {
      if (!isNonEmptyString((p as any)[f]))
        throw new ServiceError(`${f} is required`, 400);
    }
  );
  assertInEnum(p.type, LEAVE_TYPES, "type");
};

const validateEditLeave = (p: EditLeaveRequestBodyInput) => {
  if (p.type) assertInEnum(p.type, LEAVE_TYPES, "type");
  if (p.startDate && !isNonEmptyString(p.startDate))
    throw new ServiceError("startDate must be a non-empty string", 400);
  if (p.endDate && !isNonEmptyString(p.endDate))
    throw new ServiceError("endDate must be a non-empty string", 400);
  if (p.reason && !isNonEmptyString(p.reason))
    throw new ServiceError("reason must be a non-empty string", 400);
};

const validateStatusPayload = (p: UpdateLeaveStatusBodyInput) => {
  assertInEnum(p.status, ["approved", "rejected", "canceled"], "status");
  if (!isNonEmptyString(p.reviewerId))
    throw new ServiceError("reviewerId is required", 400);
};

/* ----------------------------- Error Wrapper ----------------------------- */

const wrapService = async <T>(
  fn: () => Promise<T>,
  defaultMsg: string
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError(defaultMsg, 500);
  }
};

/* ----------------------------- Services ----------------------------- */

export const addLeaveService = (payload: CreateLeaveRequestBodyInput) =>
  wrapService(async () => {
    validateNewLeave(payload);
    const employee = await User.findById(payload.employeeId).lean();
    if (!employee) throw new ServiceError("Employee not found", 404);

    const created = await Leave.create({
      ...payload,
      idNumber: (employee as any).idNumber ?? "",
      status: "pending",
      requestedAt: new Date().toISOString(),
    });

    // Notify HR and managers about new leave request
    const managers = await User.find({
      position: { $in: ["HR", "Workforce", "Team Leader", "Operation Manager"] },
      archived: false,
    }).lean();

    const leaveTypeLabels: Record<string, string> = {
      sick: "Sick Leave",
      vacation: "Vacation Leave",
      personal: "Personal Leave",
      emergency: "Emergency Leave",
    };

    const notificationPromises = managers.map((manager: any) =>
      createNotificationService({
        userId: manager._id.toString(),
        type: "leave_request",
        title: "New Leave Request",
        body: `${payload.employeeName} has requested a ${leaveTypeLabels[payload.type] || payload.type} from ${payload.startDate} to ${payload.endDate}`,
        fromName: payload.employeeName,
        fromId: payload.employeeId,
        priority: "medium",
        link: "/leave",
        metadata: {
          leaveId: created._id.toString(),
          employeeId: payload.employeeId,
          type: payload.type,
        },
      })
    );

    // Don't await notifications - fire and forget
    Promise.all(notificationPromises).catch((err) => {
      console.error("Error creating leave request notifications:", err);
    });

    return toSafeLeave(created);
  }, "Failed to create leave request");

export const getAllLeavesService = () =>
  wrapService(async () => {
    const docs = await Leave.find({}).sort({ createdAt: -1 }).lean();
    const enriched = await enrichWithIdNumber(docs);
    return enriched.map(toSafeLeave);
  }, "Failed to fetch leave requests");

export const getLeavesByEmployeeIdService = (employeeId: string) =>
  wrapService(async () => {
    if (!isNonEmptyString(employeeId))
      throw new ServiceError("employeeId is required", 400);
    const docs = await Leave.find({ employeeId })
      .sort({ createdAt: -1 })
      .lean();
    const enriched = await enrichWithIdNumber(docs);
    return enriched.map(toSafeLeave);
  }, "Failed to fetch leave requests by employee");

export const getLeavesByStatusService = (status: LeaveStatus) =>
  wrapService(async () => {
    assertInEnum(status, LEAVE_STATUSES, "status");
    const docs = await Leave.find({ status }).sort({ createdAt: -1 }).lean();
    const enriched = await enrichWithIdNumber(docs);
    return enriched.map(toSafeLeave);
  }, "Failed to fetch leave requests by status");

export const editLeaveService = (
  leaveId: string,
  editorId: string,
  patch: EditLeaveRequestBodyInput
) =>
  wrapService(async () => {
    if (!isNonEmptyString(leaveId))
      throw new ServiceError("leaveId is required", 400);
    if (!isNonEmptyString(editorId))
      throw new ServiceError("editorId is required", 400);
    if (!patch || typeof patch !== "object")
      throw new ServiceError("Patch payload is required", 400);

    validateEditLeave(patch);

    const doc = await Leave.findById(leaveId).lean();
    if (!doc) throw new ServiceError("Leave request not found", 404);
    if (doc.status !== "pending")
      throw new ServiceError("Only pending requests can be edited", 400);

    const allowed = [
      "type",
      "startDate",
      "endDate",
      "reason",
      "attachmentUrls",
      "halfDay",
      "note",
    ] as const;
    const update = Object.fromEntries(
      allowed.filter((k) => k in patch).map((k) => [k, (patch as any)[k]])
    );

    const updated = await Leave.findByIdAndUpdate(
      leaveId,
      { $set: update },
      { new: true, runValidators: true, lean: true }
    );
    if (!updated) throw new ServiceError("Failed to edit leave request", 500);
    const [enriched] = await enrichWithIdNumber([updated]);
    return toSafeLeave(enriched);
  }, "Failed to edit leave request");

export const updateLeaveStatusService = (
  leaveId: string,
  payload: UpdateLeaveStatusBodyInput
) =>
  wrapService(async () => {
    if (!isNonEmptyString(leaveId))
      throw new ServiceError("leaveId is required", 400);
    validateStatusPayload(payload);

    const existing = await Leave.findById(leaveId).lean<LeaveLeanDoc | null>();
    if (!existing) throw new ServiceError("Leave request not found", 404);

    // If status is canceled, allow it regardless of approvals (usually done by requester)
    if (payload.status === "canceled") {
      if (existing.status === "approved") {
        await syncLeaveSchedules(
          existing.employeeId,
          existing.type,
          existing.startDate,
          existing.endDate,
          "remove"
        );
      }
      const updated = await Leave.findByIdAndUpdate(
        leaveId,
        {
          $set: {
            status: "canceled",
            review: {
              reviewedById: payload.reviewerId,
              reviewedByName: payload.reviewerName,
              reviewedAt: new Date().toISOString(),
              note: payload.note,
            },
          },
        },
        { new: true, runValidators: true, lean: true }
      );
      const [enriched] = await enrichWithIdNumber([updated]);
      return toSafeLeave(enriched);
    }

    if (["approved", "rejected", "canceled"].includes(existing.status)) {
      throw new ServiceError(
        `Cannot change status of a ${existing.status} request`,
        400
      );
    }

    const { reviewerId, reviewerName, note, status } = payload;
    const now = new Date().toISOString();

    // Identify approver role
    const reviewer = (await User.findById(reviewerId).lean()) as any;
    if (!reviewer) throw new ServiceError("Reviewer not found", 404);

    // Only Workforce role can approve or reject leave requests.
    const pos = Array.isArray(reviewer.position)
      ? reviewer.position
      : [reviewer.position];
    const posLower = pos.map((p: any) => (p || "").toLowerCase());
    const isWorkforce = posLower.some((p: string) => p.includes("workforce"));

    if (!isWorkforce) {
      throw new ServiceError(
        "Only the Workforce role can approve or reject leave requests",
        403
      );
    }

    const roleKey: "workforce" = "workforce";

    let setOps: Record<string, any> = {};
    let newGlobalStatus: LeaveStatus = existing.status;

    const approvalUpdate = {
      status: status,
      date: now,
      userId: reviewerId,
      userName: reviewerName,
      note: note,
    };

    if (status === "rejected") {
      if (!note) throw new ServiceError("Reason is required for rejection", 400);
      newGlobalStatus = "rejected";
      setOps["status"] = "rejected";
      setOps["rejectionReason"] = note;
      setOps[`approvals.${roleKey}`] = approvalUpdate;

      // Also set review meta for backward compatibility or display
      setOps["review"] = {
        reviewedById: reviewerId,
        reviewedByName: reviewerName,
        reviewedAt: now,
        note: note
      };
    } else if (status === "approved") {
      setOps[`approvals.${roleKey}`] = approvalUpdate;

      setOps["review"] = {
        reviewedById: reviewerId,
        reviewedByName: reviewerName,
        reviewedAt: now,
        note: note
      };

      // Workforce-only approval: one approval sets the request to Approved.
      newGlobalStatus = "approved";
      setOps["status"] = "approved";
      setOps["approvedBy"] = {
        userId: reviewerId,
        userName: reviewerName || "Workforce",
        approvedAt: now
      };

      await syncLeaveSchedules(
        existing.employeeId,
        existing.type,
        existing.startDate,
        existing.endDate,
        "add"
      );
    }

    const updated = await Leave.findByIdAndUpdate(
      leaveId,
      { $set: setOps },
      { new: true, runValidators: true, lean: true }
    );

    if (!updated) throw new ServiceError("Failed to update leave status", 500);

    // Notifications
    // If finally approved or rejected
    if (newGlobalStatus === "approved" || newGlobalStatus === "rejected") {
      const leaveTypeLabels: Record<string, string> = {
        sick: "Sick Leave",
        vacation: "Vacation Leave",
        personal: "Personal Leave",
        emergency: "Emergency Leave",
      };

      createNotificationService({
        userId: existing.employeeId,
        type: newGlobalStatus === "approved" ? "leave_approved" : "leave_rejected",
        title:
          newGlobalStatus === "approved"
            ? "Leave Request Approved"
            : "Leave Request Rejected",
        body:
          newGlobalStatus === "approved"
            ? `Your ${leaveTypeLabels[existing.type] || existing.type} request has been fully approved.`
            : `Your ${leaveTypeLabels[existing.type] || existing.type} request was rejected by ${reviewerName}${note ? `: ${note}` : "."}`,
        fromName: reviewerName || "System",
        fromId: reviewerId,
        priority: "medium", // status === "approved" ? "medium" : "high",
        link: "/leave",
        metadata: {
          leaveId: leaveId,
          status: newGlobalStatus,
          reviewerId: reviewerId,
        },
      }).catch((err) => {
        console.error("Error creating leave status notification:", err);
      });
    }

    const [enriched] = await enrichWithIdNumber([updated]);
    return toSafeLeave(enriched);
  }, "Failed to update leave status");

export default {
  addLeaveService,
  getAllLeavesService,
  getLeavesByEmployeeIdService,
  getLeavesByStatusService,
  editLeaveService,
  updateLeaveStatusService,
};
