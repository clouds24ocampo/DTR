import mongoose from "mongoose";
import { ServiceError } from "src/utils/global/error";
import ScheduleSchema from "../../../models/global/schedule.model";
import User from "../../../models/workforce/user.model";
import Workplace from "../../../models/workforce/workplace.model";
import { createSchedulesForUsersService } from "../../global/schedule/createSched.service";
import { prepareAssignmentService } from "./workplaceAssign.service";
import { isBeforeWorkStarts } from "../../../utils/global/time.utils";
import { isDate, isTime, lt } from "../../../utils/global/schedule/validation.utils";

export interface SelfAssignToStationInput {
  userId: string;
  workplaceId: string;
  date: string;
  stationName: string;
  label?: string; // Optional - will use schedule's label if not provided
  scheduledStartTime?: string; // Optional - will use schedule's time if not provided
  scheduledEndTime?: string; // Optional - will use schedule's time if not provided
  startMealTime?: string[]; // Optional - will use schedule's meal times if not provided
}

export async function selfAssignToStationService(
  input: SelfAssignToStationInput
): Promise<{
  message: string;
  result: any;
  meta: {
    workplaceName: string;
    stationName: string;
    assignedDate: string;
  };
}> {
  const {
    userId,
    workplaceId,
    date,
    stationName,
    label,
    scheduledStartTime,
    scheduledEndTime,
    startMealTime,
  } = input;

  // 1. Validate user role
  const user = await User.findById(userId);
  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  const allowedRoles = ["Frontline / Agent Roles", "Specialized Agent Roles"];
  if (!allowedRoles.includes(user.position)) {
    throw new ServiceError(
      "Only Frontline/Agent and Specialized Agent roles can self-assign to stations",
      403
    );
  }

  // 2. Validate inputs
  if (!isDate(date)) {
    throw new ServiceError("Invalid date format (YYYY-MM-DD)", 400);
  }

  if (scheduledStartTime && !isTime(scheduledStartTime)) {
    throw new ServiceError("Invalid scheduledStartTime format (HH:mm)", 400);
  }

  if (scheduledEndTime && !isTime(scheduledEndTime)) {
    throw new ServiceError("Invalid scheduledEndTime format (HH:mm)", 400);
  }

  if (
    scheduledStartTime &&
    scheduledEndTime &&
    !lt(scheduledStartTime, scheduledEndTime)
  ) {
    throw new ServiceError(
      "scheduledEndTime must be later than scheduledStartTime",
      400
    );
  }

  if (!stationName || !stationName.trim()) {
    throw new ServiceError("stationName is required", 400);
  }

  // 3. Check if user has a schedule for this date (required for self-assignment)
  const existingSchedule = await ScheduleSchema.findOne({
    userId,
    date: date.trim(),
  });

  if (!existingSchedule || !existingSchedule.sessions || existingSchedule.sessions.length === 0) {
    throw new ServiceError(
      "You must have a schedule for this date before you can assign yourself to a station",
      400
    );
  }

  // 4. Validate that work has not started yet (allows advance assignment)
  const firstSession = existingSchedule.sessions[0];
  if (!isBeforeWorkStarts(firstSession.scheduledStartTime, date.trim())) {
    throw new ServiceError(
      "You can only assign yourself to a station before your work starts. Work has already begun.",
      400
    );
  }

  // Use the schedule's times (not the provided ones, as they should match)
  const scheduleStartTime = firstSession.scheduledStartTime;
  const scheduleEndTime = firstSession.scheduledEndTime;
  const scheduleLabel = firstSession.label;
  const scheduleMealTimes = firstSession.startMealTime || [];

  // 5. Prepare assignment (checks for conflicts) - use schedule times
  const prepared = await prepareAssignmentService({
    workplaceId,
    date: date.trim(),
    label: scheduleLabel,
    scheduledStartTime: scheduleStartTime,
    scheduledEndTime: scheduleEndTime,
    stationName: stationName.trim(),
    startMealTime: scheduleMealTimes,
  });

  // 6. Check for station conflicts (first come, first served)
  const hasOverlap = await prepared.checkDateHasOverlap(
    date.trim(),
    scheduleStartTime,
    scheduleEndTime
  );

  if (hasOverlap) {
    throw new ServiceError(
      "Station already assigned to another user for this time slot",
      409
    );
  }

  // 7. Update existing schedule with new workstationId
  existingSchedule.workstationId = prepared.workstationId;
  await existingSchedule.save();
  
  const scheduleResult = {
    userId,
    scheduleAction: "updated" as const,
    dtrAction: "no_change" as const,
    sessionsAdded: 0,
  };

  // 8. Commit to workplace assignment
  await prepared.commit(userId);

  return {
    message: "Successfully assigned to station",
    result: scheduleResult,
    meta: {
      workplaceName: prepared.workplaceName,
      stationName: prepared.stationNameResolved,
      assignedDate: date.trim(),
    },
  };
}

