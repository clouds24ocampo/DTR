// src/controllers/dtr.controller.ts
import { Request, Response } from "express";
import type {
  CreateDTRBodyInput,
  EndDTRItemBodyInput,
  StartDTRItemBodyInput,
} from "src/types/global/dtr/dtr.type";
import { ServiceError } from "src/utils/global/error";
import { getUserFromCookie } from "src/utils/global/getCookie";
import UserModel from "../../../models/workforce/user.model";
import { assertClockAuth } from "../../../utils/global/clockAuth";
import {
  createDTRService,
  endDTRItemService,
  getAllDTRsService,
  getDTRsByDateService,
  getDTRsByUserAndDateService,
  getDTRsByUserIdService,
  getMyDTRByDateService,
  startDTRItemService,
} from "../../../services/global/dtr/dtr.service";

/**
 * Helper function to convert idNumber to MongoDB _id
 * If the input is already a valid MongoDB ObjectId, returns it as-is
 * Otherwise, looks up the user by idNumber and returns their _id
 */
async function resolveUserId(input: string): Promise<string> {
  // Request bodies are JSON: reject objects like {"$ne": null} (NoSQL injection).
  if (typeof input !== "string" || !input.trim()) {
    throw new ServiceError("A valid employee ID is required.", 400);
  }
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  let user;

  if (objectIdPattern.test(input)) {
    user = await UserModel.findById(input);
  } else {
    user = await UserModel.findOne({ idNumber: input.trim() });
  }

  if (!user) {
    throw new ServiceError(
      `Employee with ID "${input}" not found.`,
      404
    );
  }

  if (user.archived) {
    throw new ServiceError(
      "Your account is currently inactive. Please contact the HR department for assistance.",
      403
    );
  }

  return user._id.toString();
}

/* -------------------------------------------------------------------------- */
/*                                   CREATE                                   */
/* -------------------------------------------------------------------------- */
/**
 * POST /api/dtr/create
 * Body: { userId?: string, date?: "YYYY-MM-DD" }
 * - Uses cookie user id if userId not provided
 */
export const createDTR = async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateDTRBodyInput;
    if (!body.userId) {
      const user = getUserFromCookie(req);
      if (!user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      body.userId = user.id;
    } else {
      // Convert idNumber to _id if needed
      body.userId = await resolveUserId(body.userId);
    }
    await assertClockAuth(req, body.userId as string);

    const { message, dtr, created } = await createDTRService(body);
    return res.status(created ? 201 : 200).json({ message, dtr });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("createDTR error:", err);
    return res.status(500).json({ message: "Failed to create DTR" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                 START ITEM                                 */
/* -------------------------------------------------------------------------- */
/**
 * POST /api/dtr/start
 * Body: { userId?: string, type?: StartableType, issue?, reason?, date?, now? }
 * - Uses cookie user id if userId not provided
 * - `now?` is optional injection for tests ("HH:mm")
 */
export const startDTRItem = async (req: Request, res: Response) => {
  try {
    const body = req.body as StartDTRItemBodyInput & { now?: string };
    if (!body.userId) {
      const user = getUserFromCookie(req);
      if (!user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      body.userId = user.id;
    } else {
      // Convert idNumber to _id if needed
      body.userId = await resolveUserId(body.userId);
    }
    await assertClockAuth(req, body.userId as string);

    const result = await startDTRItemService(body);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("startDTRItem error:", err);
    return res.status(500).json({ message: "Unable to start DTR item" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                  END ITEM                                  */
/* -------------------------------------------------------------------------- */
/**
 * POST /api/dtr/end
 * Body: { userId?: string, date?: "YYYY-MM-DD", now?: "HH:mm" }
 * - Uses cookie user id if userId not provided
 * - Ends any active entry across all sessions for that date
 */
export const endDTRItem = async (req: Request, res: Response) => {
  try {
    const body = req.body as EndDTRItemBodyInput & { now?: string };
    if (!body.userId) {
      const user = getUserFromCookie(req);
      if (!user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      body.userId = user.id;
    } else {
      // Convert idNumber to _id if needed
      body.userId = await resolveUserId(body.userId);
    }
    await assertClockAuth(req, body.userId as string);

    const result = await endDTRItemService(body);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("endDTRItem error:", err);
    return res.status(500).json({ message: "Unable to end DTR item" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                     READ                                   */
/* -------------------------------------------------------------------------- */

type AccountReq = Request & { account?: { _id?: unknown; position?: unknown } };

/** Roles that manage attendance (DTR Tracking, exports, dashboards). */
const managesAttendance = (req: Request): boolean =>
  [(req as AccountReq).account?.position]
    .flat()
    .map((p) => String(p ?? "").toLowerCase())
    .some((p) => /^(hr|workforce|operation manager|operations manager)$|team leader/.test(p));

export const getAllDTRs = async (req: Request, res: Response) => {
  try {
    if (!managesAttendance(req))
      return res.status(403).json({ message: "Not allowed." });
    const dtrs = await getAllDTRsService();
    return res
      .status(200)
      .json({ message: "DTRs retrieved successfully", dtrs });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching DTRs:", err);
    return res.status(500).json({ message: "Failed to retrieve DTRs" });
  }
};

export const getDTRsByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as { userId?: string };
    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    // Own records, or a role that manages attendance (DTR Tracking, exports).
    if (String((req as AccountReq).account?._id) !== userId && !managesAttendance(req))
      return res.status(403).json({ message: "You can only view your own DTR." });

    const dtrs = await getDTRsByUserIdService(userId);
    return res
      .status(200)
      .json({ message: "DTRs retrieved successfully", dtrs });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching DTRs by userId:", err);
    return res
      .status(500)
      .json({ message: "Failed to retrieve DTRs by userId" });
  }
};

export const getDTRsByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params as { date?: string };
    if (!date) return res.status(400).json({ message: "Date is required" });
    if (!managesAttendance(req))
      return res.status(403).json({ message: "Not allowed." });

    const dtrs = await getDTRsByDateService(date);
    return res
      .status(200)
      .json({ message: "DTRs retrieved successfully", dtrs });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching DTRs by date:", err);
    return res.status(500).json({ message: "Failed to retrieve DTRs by date" });
  }
};

/**
 * POST /api/dtr/filtered
 * Body: { userId: string; date: "YYYY-MM-DD" }
 * Explicit user input (no cookie fallback).
 */
// Allow-list: the only DTR fields the public clock needs to show today's state.
const KIOSK_SESSION_FIELDS = ["label", "scheduledStartTime", "scheduledEndTime", "DTRTotalWork", "DTRTotalBreak", "DTRTotalMeal"];
const KIOSK_ENTRY_FIELDS = ["type", "status", "startTime", "endTime", "startTag", "endTag", "duration", "approvalStatus", "tripCategory", "halfDayType"];
const pick = (obj: any, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

/** Strip a DTR to what the public clock needs to know the current state. */
function toKioskDTR(dtr: any) {
  const d = typeof dtr?.toObject === "function" ? dtr.toObject() : dtr;
  return {
    date: d.date,
    sessions: (d.sessions ?? []).map((s: any) => ({
      ...pick(s, KIOSK_SESSION_FIELDS),
      fullDTR: (s.fullDTR ?? []).map((item: any) => pick(item, KIOSK_ENTRY_FIELDS)),
    })),
  };
}

export const getDTRsByUserAndDate = async (req: Request, res: Response) => {
  try {
    const { userId, date, kiosk } = req.body as {
      userId?: string;
      date?: string;
      kiosk?: boolean;
    };

    // Strings only: a JSON object here would become a Mongo query operator.
    if (typeof userId !== "string" || !userId)
      return res.status(400).json({ message: "User ID is required" });
    if (typeof date !== "string" || !date)
      return res.status(400).json({ message: "Date is required" });

    // (optional) quick YYYY-MM-DD guard
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Date must be YYYY-MM-DD" });
    }

    if (kiosk) {
      // Public clock page: the employee's own password (or login), today only, allow-listed fields.
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        return res.status(400).json({ message: "User ID is required" });
      }
      await assertClockAuth(req, userId);
      if (Math.abs(Date.parse(`${date}T12:00:00Z`) - Date.now()) > 36 * 3600_000) {
        return res.status(400).json({ message: "Only today's record is available." });
      }
      const dtrs = await getDTRsByUserAndDateService(userId, date);
      return res.status(200).json({
        message: "DTRs retrieved successfully",
        dtrs: dtrs.map(toKioskDTR),
      });
    }

    const dtrs = await getDTRsByUserAndDateService(userId, date);
    return res
      .status(200)
      .json({ message: "DTRs retrieved successfully", dtrs });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching DTRs by userId and date:", err);
    return res
      .status(500)
      .json({ message: "Failed to retrieve DTRs by userId and date" });
  }
};

// + new self-only controller
export const getMyDTRByDate = async (req: Request, res: Response) => {
  try {
    const me = getUserFromCookie(req);
    if (!me?.id) return res.status(401).json({ message: "Not authenticated" });

    const date = (req.params?.date ?? req.query?.date ?? req.body?.date) as
      | string
      | undefined;
    if (!date) return res.status(400).json({ message: "Date is required" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Date must be YYYY-MM-DD" });
    }

    // default autoCreate=true; disable with ?autoCreate=false
    const autoCreate = String(req.query?.autoCreate ?? "true") !== "false";

    const dtr = await getMyDTRByDateService(me.id, date, { autoCreate });
    return res.status(200).json({ message: "DTR retrieved successfully", dtr });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("getMyDTRByDate error:", err);
    return res.status(500).json({ message: "Failed to retrieve DTR" });
  }
};

export const getPendingTripApprovals = async (req: Request, res: Response) => {
  try {
    const me = getUserFromCookie(req);
    if (!me?.id) return res.status(401).json({ message: "Not authenticated" });

    const { getPendingTripsService } = await import("../../../services/global/dtr/dtr.service");
    const pendingTrips = await getPendingTripsService();

    return res.status(200).json({
      message: "Pending trips retrieved successfully",
      pendingTrips
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("getPendingTripApprovals error:", err);
    return res.status(500).json({ message: "Failed to retrieve pending trips" });
  }
};

export const updateTripApproval = async (req: Request, res: Response) => {
  try {
    const me = getUserFromCookie(req);
    if (!me?.id) return res.status(401).json({ message: "Not authenticated" });

    const { dtrId, sessionIndex, entryIndex, approvalStatus } = req.body;

    if (!dtrId || sessionIndex === undefined || entryIndex === undefined || !approvalStatus) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({ message: "Invalid approval status" });
    }

    const { updateTripApprovalService } = await import("../../../services/global/dtr/dtr.service");
    const result = await updateTripApprovalService({
      dtrId,
      sessionIndex,
      entryIndex,
      approvalStatus: approvalStatus as "approved" | "rejected",
    });

    return res.status(200).json({
      message: `Trip ${approvalStatus} successfully`,
      dtr: result
    });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("updateTripApproval error:", err);
    return res.status(500).json({ message: "Failed to update trip approval" });
  }
};

export const cancelTrip = async (req: Request, res: Response) => {
  try {
    const body = req.body as { userId?: string; date?: string };
    if (!body.userId) {
      const user = getUserFromCookie(req);
      if (user?.id) {
        body.userId = user.id;
      }
      // If still no userId, resolveUserId will handle it or service will throw (resolveUserId handles idNumber)
    } else {
      // Convert idNumber to _id if needed
      body.userId = await resolveUserId(body.userId);
    }
    if (!body.userId) return res.status(401).json({ message: "Not authenticated" });
    await assertClockAuth(req, body.userId as string);

    const { cancelTripService } = await import("../../../services/global/dtr/dtr.service");
    const result = await cancelTripService(body as any);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("cancelTrip error:", err);
    return res.status(500).json({ message: "Failed to cancel trip" });
  }
};
