import { ServiceError } from "src/utils/global/error";
import ScheduleSchema from "../../../models/global/schedule.model";
import User from "../../../models/workforce/user.model";
import Workplace from "../../../models/workforce/workplace.model";
import { createSchedulesForUsersService } from "../../global/schedule/createSched.service";
import { isDate } from "../../../utils/global/schedule/validation.utils";

export interface AssignToWorkplaceInput {
  userId: string;
  workplaceId: string;
  date: string;
  label: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  startMealTime?: string[];
}

/**
 * Assigns a user to a workplace (without specific station)
 * Used for Frontline/Agent and Specialized Agent roles who will self-assign to stations
 */
export async function assignToWorkplaceService(
  input: AssignToWorkplaceInput
): Promise<{
  message: string;
  result: any;
  meta: {
    workplaceName: string;
    assignedDate: string;
  };
}> {
  const {
    userId,
    workplaceId,
    date,
    label,
    scheduledStartTime,
    scheduledEndTime,
    startMealTime,
  } = input;

  // 1. Validate user exists and is Frontline/Agent or Specialized Agent
  const user = await User.findById(userId);
  if (!user) {
    throw new ServiceError("User not found", 404);
  }

  const allowedRoles = ["Frontline / Agent Roles", "Specialized Agent Roles"];
  if (!allowedRoles.includes(user.position)) {
    throw new ServiceError(
      "This assignment method is only for Frontline/Agent and Specialized Agent roles",
      403
    );
  }

  // 2. Validate date
  if (!isDate(date)) {
    throw new ServiceError("Invalid date format (YYYY-MM-DD)", 400);
  }

  const dateYMD = date.trim();

  // 3. Validate workplace exists
  const wp: any = await Workplace.findById(workplaceId);
  if (!wp) {
    throw new ServiceError("Workplace not found", 404);
  }

  // 4. Check if schedule already exists
  const existingSchedule = await ScheduleSchema.findOne({
    userId,
    date: dateYMD,
  });

  // 5. Create or update schedule (without workstationId - agent will self-assign later)
  let scheduleResult;
  if (existingSchedule) {
    // Update existing schedule (keep workstationId as undefined if not set)
    // Don't overwrite if agent already self-assigned
    if (!existingSchedule.workstationId) {
      // Schedule exists but no station assigned yet - update times if needed
      const response = await createSchedulesForUsersService({
        userIds: [userId],
        date: dateYMD,
        // No workstationId - workplace level assignment
        sessions: [
          {
            label: label.trim(),
            scheduledStartTime,
            scheduledEndTime,
            startMealTime: startMealTime || [],
          },
        ],
      });
      scheduleResult = response.result[0];
    } else {
      // Agent already self-assigned to a station - just update schedule times
      const response = await createSchedulesForUsersService({
        userIds: [userId],
        date: dateYMD,
        workstationId: existingSchedule.workstationId, // Keep existing station
        sessions: [
          {
            label: label.trim(),
            scheduledStartTime,
            scheduledEndTime,
            startMealTime: startMealTime || [],
          },
        ],
      });
      scheduleResult = response.result[0];
    }
  } else {
    // Create new schedule without workstationId
    const response = await createSchedulesForUsersService({
      userIds: [userId],
      date: dateYMD,
      // No workstationId - agent will self-assign later
      sessions: [
        {
          label: label.trim(),
          scheduledStartTime,
          scheduledEndTime,
          startMealTime: startMealTime || [],
        },
      ],
    });
    scheduleResult = response.result[0];
  }

  return {
    message: "User assigned to workplace. Agent can now self-assign to a station.",
    result: scheduleResult,
    meta: {
      workplaceName: String(wp.name),
      assignedDate: dateYMD,
    },
  };
}

