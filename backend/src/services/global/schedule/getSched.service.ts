import mongoose from "mongoose";
import Schedule from "src/models/global/schedule.model";
import { ServiceError } from "src/utils/global/error";
import { ISchedule } from "../../../types/global/schedule/schedule.type";

/** Normalize userId for query: Schedule may store ObjectId from user._id. */
function normalizeUserIdForQuery(userId: string): string | mongoose.Types.ObjectId {
  const s = (userId ?? "").toString().trim();
  return mongoose.Types.ObjectId.isValid(s) && String(new mongoose.Types.ObjectId(s)) === s
    ? new mongoose.Types.ObjectId(s)
    : s;
}

export const getAllSchedulesService = async (): Promise<ISchedule[]> => {
  try {
    return await Schedule.find({});
  } catch {
    throw new ServiceError("Failed to fetch schedules", 500);
  }
};

export const getSchedulesByUserIdService = async (
  userId: string
): Promise<ISchedule[]> => {
  try {
    return await Schedule.find({ userId });
  } catch {
    throw new ServiceError("Failed to fetch schedules for user", 500);
  }
};

export const getSchedulesByDateService = async (
  date: string
): Promise<ISchedule[]> => {
  try {
    return await Schedule.find({ date });
  } catch {
    throw new ServiceError("Failed to fetch schedules for date", 500);
  }
};

export const getSchedulesByUserAndDateService = async (
  userId: string,
  date: string
): Promise<ISchedule[]> => {
  try {
    // Normalize date to YYYY-MM-DD format
    const normalizedDate = date.trim();
    console.log(`[getSchedulesByUserAndDateService] Querying - userId: "${userId}", date: "${normalizedDate}"`);

    const schedules = await Schedule.find({ userId, date: normalizedDate });
    console.log(`[getSchedulesByUserAndDateService] Found ${schedules.length} schedule(s)`);

    // If no exact match, try without date normalization (in case date format differs)
    if (schedules.length === 0) {
      console.log(`[getSchedulesByUserAndDateService] No exact match, trying alternative query...`);
      const altSchedules = await Schedule.find({ userId });
      console.log(`[getSchedulesByUserAndDateService] Found ${altSchedules.length} total schedule(s) for userId, checking dates...`);
      if (altSchedules.length > 0) {
        console.log(`[getSchedulesByUserAndDateService] Available dates: ${altSchedules.map(s => s.date).join(', ')}`);
      }
    }

    return schedules;
  } catch (error) {
    console.error(`[getSchedulesByUserAndDateService] Error:`, error);
    throw new ServiceError("Failed to fetch schedules for user and date", 500);
  }
};

/**
 * Fetch all schedules for a user within a date range (inclusive).
 * Used for historical data when deriving next schedule (auto-scheduling).
 */
export const getSchedulesByUserAndDateRangeService = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<ISchedule[]> => {
  try {
    const start = startDate.trim();
    const end = endDate.trim();
    if (start > end) {
      return [];
    }
    const uid = normalizeUserIdForQuery(userId);
    const schedules = await Schedule.find({
      userId: uid,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: -1 })
      .lean();
    return schedules as ISchedule[];
  } catch (error) {
    console.error(`[getSchedulesByUserAndDateRangeService] Error:`, error);
    throw new ServiceError("Failed to fetch schedules for user and date range", 500);
  }
};
