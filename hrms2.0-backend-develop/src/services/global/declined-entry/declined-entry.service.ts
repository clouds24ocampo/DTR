import DeclinedEntry from "src/models/global/declined-entry.model";
import User from "src/models/workforce/user.model";
import Schedule from "src/models/global/schedule.model";
import { ServiceError } from "src/utils/global/error";
import { normalizeDate } from "src/utils/global/time.utils";
import type {
  CreateDeclinedEntryBodyInput,
  DeclinedEntryDocLite,
  GetDeclinedEntriesByUserAndDateBodyInput,
} from "src/types/global/declined-entry/declined-entry.type";

/* ------------------------------ CREATE ---------------------------------- */

export async function createDeclinedEntryService(
  input: CreateDeclinedEntryBodyInput
): Promise<{
  message: string;
  declinedEntry: DeclinedEntryDocLite;
}> {
  const { userId, coordinates, actionType } = input;
  const targetDate = normalizeDate(input.date);

  if (!userId) throw new ServiceError("userId is required", 400);
  if (!coordinates?.lat || !coordinates?.lng) {
    throw new ServiceError("Coordinates (lat, lng) are required", 400);
  }
  if (!actionType) {
    throw new ServiceError("actionType is required", 400);
  }

  // Get employee info if not provided
  let employeeInfo = input.employeeInfo;
  if (!employeeInfo) {
    const user: any = await User.findById(userId)
      .select("idNumber firstName middleName lastName position profilePicture")
      .lean();
    if (user) {
      const fullName = [
        user.firstName,
        user.middleName,
        user.lastName,
      ]
        .filter(Boolean)
        .join(" ");
      employeeInfo = {
        idNumber: user.idNumber || undefined,
        name: fullName || undefined,
        position: user.position || undefined,
        profilePicture: user.profilePicture || undefined,
      };
    }
  }

  // Get schedule info if not provided
  let scheduleInfo = input.scheduleInfo;
  if (!scheduleInfo) {
    const schedule = await Schedule.findOne({ userId, date: targetDate })
      .select("sessions")
      .lean();
    if (schedule && schedule.sessions && schedule.sessions.length > 0) {
      const firstSession = schedule.sessions[0];
      scheduleInfo = {
        scheduledStartTime: firstSession.scheduledStartTime,
        scheduledEndTime: firstSession.scheduledEndTime,
      };
    }
  }

  const declinedEntry = new DeclinedEntry({
    userId,
    date: targetDate,
    actionType,
    coordinates: {
      lat: coordinates.lat,
      lng: coordinates.lng,
    },
    timestamp: new Date(),
    scheduleInfo,
    employeeInfo,
  });

  await declinedEntry.save();

  return {
    message: "Declined entry created successfully",
    declinedEntry: declinedEntry.toObject() as DeclinedEntryDocLite,
  };
}

/* ------------------------------ READ ---------------------------------- */

export async function getDeclinedEntriesByUserAndDateService(
  input: GetDeclinedEntriesByUserAndDateBodyInput
): Promise<{
  message: string;
  declinedEntries: DeclinedEntryDocLite[];
}> {
  const { userId, date } = input;
  const targetDate = normalizeDate(date);

  if (!userId) throw new ServiceError("userId is required", 400);
  if (!targetDate) throw new ServiceError("date is required", 400);

  const declinedEntries = await DeclinedEntry.find({
    userId,
    date: targetDate,
  })
    .sort({ timestamp: -1 })
    .lean();

  return {
    message: "Declined entries retrieved successfully",
    declinedEntries: (declinedEntries as unknown) as DeclinedEntryDocLite[],
  };
}

