// src/controllers/schedule.controller.ts
import { Request, Response } from "express";
import { createSchedulesForUsersService, editScheduleService, editSingleSessionService, deleteScheduleService } from "src/services/global/schedule/createSched.service";
import { autoScheduleNextForUser } from "src/services/global/schedule/autoSchedule.service";
import { getAllSchedulesService, getSchedulesByUserIdService, getSchedulesByDateService, getSchedulesByUserAndDateService, getSchedulesByUserAndDateRangeService } from "src/services/global/schedule/getSched.service";
import type { ISession } from "src/types/global/schedule/schedule.type";
import { ServiceError } from "src/utils/global/error";
import { getUserFromCookie } from "src/utils/global/getCookie";
import UserModel from "../../../models/workforce/user.model";
import { DEFAULT_FLEX_SESSION, isFlexibleTimePosition } from "src/config/work-policy";

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
    const cleanedInput = input.trim().replace(/[,\s]+$/, "");
    user = await UserModel.findOne({ idNumber: cleanedInput });

    if (!user) {
      user = await UserModel.findOne({
        idNumber: {
          $regex: new RegExp(
            `^${cleanedInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[,\\s]*$`,
            "i"
          ),
        },
      });
    }
  }

  if (!user) {
    throw new ServiceError(`Employee with ID "${input}" not found.`, 404);
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
/*                              CREATE (BULK USERS)                           */
/* -------------------------------------------------------------------------- */

export const createSchedulesForUsers = async (
  req: Request,
  _res: Response
): Promise<{ status: number; body: any }> => {
  try {
    const { userIds, date, sessions } = req.body as {
      userIds: string[];
      date: string;
      sessions: Array<{
        label: string;
        scheduledStartTime: string;
        scheduledEndTime: string;
        startMealTime?: string[];
      }>;
    };

    // Ensure requester is logged in (throws if invalid)
    getUserFromCookie(req);

    const { message, result } = await createSchedulesForUsersService({
      userIds,
      date,
      sessions,
    });

    return { status: 201, body: { message, result } };
  } catch (err) {
    if (err instanceof ServiceError) {
      return { status: err.status, body: { message: err.message } };
    }
    console.error("createSchedulesForUsers error:", err);
    return {
      status: 500,
      body: { message: "Failed to create schedules for users" },
    };
  }
};

/* -------------------------------------------------------------------------- */
/*                                   READ                                     */
/* -------------------------------------------------------------------------- */

export const getAllSchedules = async (_req: Request, res: Response) => {
  try {
    const schedules = await getAllSchedulesService();
    return res
      .status(200)
      .json({ message: "Schedules retrieved successfully", schedules });
  } catch (err) {
    console.error("Error fetching schedules:", err);
    return res.status(500).json({ message: "Failed to retrieve schedules" });
  }
};

export const getSchedulesByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const schedules = await getSchedulesByUserIdService(userId);
    return res
      .status(200)
      .json({ message: "Schedules retrieved successfully", schedules });
  } catch (err) {
    console.error("Error fetching schedules by userId:", err);
    return res
      .status(500)
      .json({ message: "Failed to retrieve schedules by userId" });
  }
};

export const getSchedulesByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    if (!date) return res.status(400).json({ message: "Date is required" });

    const schedules = await getSchedulesByDateService(date);
    return res
      .status(200)
      .json({ message: "Schedules retrieved successfully", schedules });
  } catch (err) {
    console.error("Error fetching schedules by date:", err);
    return res
      .status(500)
      .json({ message: "Failed to retrieve schedules by date" });
  }
};

/**
 * Public clock-page lookup (no login). Returns only what the clock needs to run
 * and to let a person confirm "this is me": schedule sessions, the flexible-time
 * flag, first name + last initial, position, and whether the account is inactive.
 * No photo, full name, contact, location, department, pay or schedule metadata.
 */
async function kioskSchedules(userId: string, date: string) {
  const user = (await UserModel.findById(userId)
    .select("firstName lastName position archived")
    .lean()) as
    | { firstName?: string; lastName?: string; position?: unknown; archived?: boolean }
    | null;
  if (!user) return [];

  const flexible = isFlexibleTimePosition(user.position);
  const employee = {
    firstName: user.firstName ?? "",
    lastName: user.lastName ? `${user.lastName.charAt(0)}.` : "",
    position: user.position,
    archived: Boolean(user.archived),
  };
  const found = await getSchedulesByUserAndDateService(userId, date);
  const sessions = found.length
    ? found.map((s) => (s as any).toObject().sessions)
    : flexible
      ? [[{ ...DEFAULT_FLEX_SESSION }]] // preview only; first clock-in persists it
      : [];
  return sessions.map((sessionList) => ({ userId, date, sessions: sessionList, flexible, employee }));
}

export const getSchedulesByUserAndDate = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, date, startDate, endDate, kiosk } = req.body as {
      userId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      kiosk?: boolean; // clock page: preview the default shift for flexible-time staff
    };

    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    // Convert idNumber to _id if needed
    const resolvedUserId = await resolveUserId(userId);

    if (kiosk) {
      if (!date) return res.status(400).json({ message: "Date is required" });
      return res.status(200).json({
        message: "Schedules retrieved successfully",
        schedules: await kioskSchedules(resolvedUserId, date),
      });
    }

    // Date range: return schedules in [startDate, endDate]
    if (startDate && endDate) {
      const start = startDate.trim();
      const end = endDate.trim();
      if (start > end) {
        return res.status(400).json({ message: "startDate must be before or equal to endDate" });
      }
      const schedules = await getSchedulesByUserAndDateRangeService(resolvedUserId, start, end);
      return res
        .status(200)
        .json({ message: "Schedules retrieved successfully", schedules });
    }

    // Single date
    if (!date) return res.status(400).json({ message: "Date or (startDate and endDate) is required" });

    console.log(`[getSchedulesByUserAndDate] Request - userId: "${userId}", date: "${date}"`);
    console.log(`[getSchedulesByUserAndDate] Resolved userId: "${resolvedUserId}"`);

    const found = await getSchedulesByUserAndDateService(resolvedUserId, date);
    console.log(`[getSchedulesByUserAndDate] Found ${found.length} schedule(s) for userId: "${resolvedUserId}", date: "${date}"`);

    const user = await UserModel.findById(resolvedUserId).select("position").lean();
    const flexible = isFlexibleTimePosition((user as { position?: unknown } | null)?.position);
    const schedules = found.map((s) => ({ ...(s as any).toObject(), flexible }));

    return res
      .status(200)
      .json({ message: "Schedules retrieved successfully", schedules });
  } catch (err) {
    if (err instanceof ServiceError) {
      console.error(`[getSchedulesByUserAndDate] ServiceError: ${err.message}`);
      return res.status(err.status).json({ message: err.message });
    }
    console.error("[getSchedulesByUserAndDate] Error fetching schedules by userId and date:", err);
    return res
      .status(500)
      .json({ message: "Failed to retrieve schedules by userId and date" });
  }
};

export const getMySchedulesByDate = async (req: Request, res: Response) => {
  const me = getUserFromCookie(req);
  if (!me?.id) return res.status(401).json({ message: "Not authenticated" });
  const date = (req.params?.date ?? req.query?.date ?? req.body?.date) as
    | string
    | undefined;
  if (!date) return res.status(400).json({ message: "Date is required" });

  const schedules = await getSchedulesByUserAndDateService(me.id, date);
  return res
    .status(200)
    .json({ message: "Schedules retrieved successfully", schedules });
};

/* -------------------------------------------------------------------------- */
/*                              UPDATE (BULK REPLACE)                          */
/* -------------------------------------------------------------------------- */
/**
 * Bulk replace all sessions of a schedule.
 * Now validated & recomputed in the service; no need for userId here.
 */
export const editSchedule = async (req: Request, res: Response) => {
  try {
    const { scheduleId, sessions } = req.body as {
      scheduleId?: string;
      sessions?: ISession[];
    };

    if (!scheduleId)
      return res.status(400).json({ message: "Schedule ID is required" });
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ message: "Sessions are required" });
    }

    const schedule = await editScheduleService(scheduleId, sessions);
    return res
      .status(200)
      .json({ message: "Schedule edited successfully", schedule });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error editing schedule:", err);
    return res.status(500).json({ message: "Failed to edit schedule" });
  }
};

/* -------------------------------------------------------------------------- */
/*                        UPDATE (SINGLE SESSION PATCH)                        */
/* -------------------------------------------------------------------------- */
/**
 * Edit a single session by subdocument id.
 * Expects:
 * - params: scheduleId, sessionId
 * - body: { patch: Partial<ISession>, note?: string }
 * Uses cookie to identify editor for history entry.
 */
export const editSingleSession = async (req: Request, res: Response) => {
  try {
    const { scheduleId, sessionId } = req.params as {
      scheduleId?: string;
      sessionId?: string;
    };
    const { patch, note } = req.body as {
      patch?: Partial<ISession>;
      note?: string;
    };

    if (!scheduleId)
      return res.status(400).json({ message: "Schedule ID is required" });
    if (!sessionId)
      return res.status(400).json({ message: "Session ID is required" });
    if (!patch || typeof patch !== "object") {
      return res.status(400).json({ message: "Patch payload is required" });
    }

    const user = getUserFromCookie(req);
    const editorId = user?.id;
    if (!editorId)
      return res.status(401).json({ message: "Not authenticated" });

    const schedule = await editSingleSessionService(
      scheduleId,
      sessionId,
      patch,
      editorId,
      note
    );
    return res
      .status(200)
      .json({ message: "Session updated successfully", schedule });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error editing single session:", err);
    return res.status(500).json({ message: "Failed to edit session" });
  }
};

/* -------------------------------------------------------------------------- */
/*                           AUTO-SCHEDULE (NEXT DAY)                          */
/* -------------------------------------------------------------------------- */
/**
 * POST /api/schedule/auto-schedule
 * Body: { userId?: string, triggerDate?: "YYYY-MM-DD" }
 * - Derives next day's schedule from user's historical schedules (same weekday or most recent).
 * - Creates schedule for next day only if one does not exist (transactional consistency).
 * - Session validation: requires auth; userId defaults to logged-in user.
 */
export const triggerAutoSchedule = async (req: Request, res: Response) => {
  try {
    const me = getUserFromCookie(req);
    const { userId: bodyUserId, triggerDate } = req.body as {
      userId?: string;
      triggerDate?: string;
    };

    const userId = bodyUserId?.trim()
      ? await resolveUserId(bodyUserId)
      : me?.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated; userId required or login required." });
    }

    const result = await autoScheduleNextForUser(userId, triggerDate);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("triggerAutoSchedule error:", err);
    return res.status(500).json({ message: "Failed to run auto-schedule" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params as { scheduleId?: string };
    if (!scheduleId)
      return res.status(400).json({ message: "Schedule ID is required" });

    const loggedInUser = getUserFromCookie(req);
    const userId = loggedInUser?.id;
    if (!userId) return res.status(401).json({ message: "User not logged in" });

    const message = await deleteScheduleService(scheduleId);
    return res.status(200).json({ message });
  } catch (err) {
    if (err instanceof ServiceError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error deleting schedule:", err);
    return res.status(500).json({ message: "Failed to delete schedule" });
  }
};
