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

    const { message, dtr } = await createDTRService(body);
    return res.status(201).json({ message, dtr });
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

export const getAllDTRs = async (_req: Request, res: Response) => {
  try {
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
export const getDTRsByUserAndDate = async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.body as { userId?: string; date?: string };

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });
    if (!date) return res.status(400).json({ message: "Date is required" });

    // (optional) quick YYYY-MM-DD guard
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Date must be YYYY-MM-DD" });
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
