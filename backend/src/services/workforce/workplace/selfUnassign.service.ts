import { ServiceError } from "src/utils/global/error";
import ScheduleSchema from "../../../models/global/schedule.model";
import User from "../../../models/workforce/user.model";
import Workplace from "../../../models/workforce/workplace.model";
import { isBeforeWorkStarts } from "../../../utils/global/time.utils";
import { isDate } from "../../../utils/global/schedule/validation.utils";

export interface SelfUnassignFromStationInput {
  userId: string;
  workplaceId: string;
  date: string;
}

export async function selfUnassignFromStationService(
  input: SelfUnassignFromStationInput
): Promise<{ message: string }> {
  const { userId, workplaceId, date } = input;

  // 1. Validate user role
  const user = await User.findById(userId);
  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  const allowedRoles = ["Frontline / Agent Roles", "Specialized Agent Roles"];
  if (!allowedRoles.includes(user.position)) {
    throw new ServiceError(
      "Only Frontline/Agent and Specialized Agent roles can self-unassign from stations",
      403
    );
  }

  // 2. Validate date
  if (!isDate(date)) {
    throw new ServiceError("Invalid date format (YYYY-MM-DD)", 400);
  }

  const dateYMD = date.trim();

  // 3. Check if user has a schedule for this date
  const schedule = await ScheduleSchema.findOne({
    userId,
    date: dateYMD,
  });

  if (!schedule) {
    throw new ServiceError("No schedule found for this date", 404);
  }

  // 4. Validate that work has not started yet (allows advance unassignment)
  if (schedule.sessions && schedule.sessions.length > 0) {
    const firstSession = schedule.sessions[0];
    if (!isBeforeWorkStarts(firstSession.scheduledStartTime, dateYMD)) {
      throw new ServiceError(
        "You can only unassign yourself from a station before your work starts. Work has already begun.",
        400
      );
    }
  } else {
    throw new ServiceError("Schedule has no sessions", 400);
  }

  // 5. Find the workplace and workstation
  const wp: any = await Workplace.findById(workplaceId);
  if (!wp) {
    throw new ServiceError("Workplace not found", 404);
  }

  // Find which workstation the user is assigned to
  let workstationFound = false;
  let workstationId: string | null = null;

  for (const ws of wp.workstations || []) {
    const day = (ws.dates || []).find((d: any) => String(d.date) === dateYMD);
    if (day) {
      const userIndex = (day.assignedUsers || []).findIndex(
        (u: any) => String(u.userId) === String(userId)
      );
      if (userIndex !== -1) {
        workstationFound = true;
        workstationId = String(ws._id);
        
        // Remove user from assignment
        day.assignedUsers.splice(userIndex, 1);
        
        // If no more users on this day, we could remove the day entry, but let's keep it for now
        break;
      }
    }
  }

  if (!workstationFound) {
    throw new ServiceError("You are not assigned to any station on this date", 404);
  }

  // 6. Save workplace changes
  await wp.save();

  // 7. Update schedule - remove workstationId but keep the schedule
  if (schedule.workstationId) {
    schedule.workstationId = undefined;
    await schedule.save();
  }

  return {
    message: "Successfully unassigned from station",
  };
}

