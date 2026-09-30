import { Request, Response } from "express";
import type {
  CreateDeclinedEntryBodyInput,
  GetDeclinedEntriesByUserAndDateBodyInput,
} from "src/types/global/declined-entry/declined-entry.type";
import { ServiceError } from "src/utils/global/error";
import UserModel from "../../../models/workforce/user.model";
import {
  createDeclinedEntryService,
  getDeclinedEntriesByUserAndDateService,
} from "../../../services/global/declined-entry/declined-entry.service";

/**
 * Helper function to convert idNumber to MongoDB _id
 * If the input is already a valid MongoDB ObjectId, returns it as-is
 * Otherwise, looks up the user by idNumber and returns their _id
 */
async function resolveUserId(input: string): Promise<string> {
  // Check if input is a valid MongoDB ObjectId (24 hex characters)
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (objectIdPattern.test(input)) {
    // It's already a MongoDB ObjectId, return as-is
    return input;
  }

  // Otherwise, treat it as idNumber and look up the user
  const user = await UserModel.findOne({ idNumber: input.trim() });
  if (!user) {
    throw new ServiceError(
      `Employee with ID Number "${input}" not found.`,
      404
    );
  }

  return user._id.toString();
}

/* -------------------------------------------------------------------------- */
/*                                   CREATE                                   */
/* -------------------------------------------------------------------------- */
/**
 * POST /api/declined-entry/create
 * Body: { userId: string, date?: "YYYY-MM-DD", actionType, coordinates: { lat, lng }, scheduleInfo?, employeeInfo? }
 */
export const createDeclinedEntry = async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateDeclinedEntryBodyInput;
    if (!body.userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Convert idNumber to _id if needed
    body.userId = await resolveUserId(body.userId);

    const { message, declinedEntry } = await createDeclinedEntryService(body);
    return res.status(201).json({ message, declinedEntry });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("createDeclinedEntry error:", err);
    return res.status(500).json({ message: "Failed to create declined entry" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                     READ                                   */
/* -------------------------------------------------------------------------- */
/**
 * POST /api/declined-entry/filtered
 * Body: { userId: string; date: "YYYY-MM-DD" }
 */
export const getDeclinedEntriesByUserAndDate = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, date } = req.body as GetDeclinedEntriesByUserAndDateBodyInput;

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });
    if (!date) return res.status(400).json({ message: "Date is required" });

    // (optional) quick YYYY-MM-DD guard
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "Date must be YYYY-MM-DD" });
    }

    // Convert idNumber to _id if needed
    const resolvedUserId = await resolveUserId(userId);

    const result = await getDeclinedEntriesByUserAndDateService({
      userId: resolvedUserId,
      date,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error fetching declined entries:", err);
    return res
      .status(500)
      .json({ message: "Failed to retrieve declined entries" });
  }
};

