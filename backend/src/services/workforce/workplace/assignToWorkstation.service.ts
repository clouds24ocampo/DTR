import User from "../../../models/workforce/user.model";
import type { AssignToWorkstationBodyInput } from "../../../types/workforce/workplace/workplace.type";
import { ServiceError } from "../../../utils/global/error";
import { sendScheduleConfirmationEmail } from "../../../utils/global/mail/scheduleConfirmationEmail";
import { createSchedulesForUsersService } from "../../global/schedule/createSched.service";
import { prepareAssignmentService } from "./workplaceAssign.service";
import { assignToWorkplaceService } from "./workplaceLevelAssign.service";
import {
  assertTimeRange,
  hasAgentRole,
  parseMealTimes,
  requireDate,
} from "./workplaceValidation";

interface AssignInput {
  workplaceId: string;
  /** Authenticated caller; used when the body does not name a user. */
  callerId?: string;
  body: AssignToWorkstationBodyInput;
}

export interface AssignResult {
  message: string;
  result: unknown;
  meta: { workplaceName: string; stationName: string | null; assignedDate: string };
}

/**
 * Assigns a user to a workstation (or to the workplace itself for agent roles)
 * and creates the matching schedule. Throws ServiceError on invalid input/conflicts.
 */
export const assignToWorkstationService = async ({
  workplaceId,
  callerId,
  body,
}: AssignInput): Promise<AssignResult> => {
  const { date, stationName, user, label, scheduledStartTime, scheduledEndTime, startMealTime } = body;

  if (typeof label !== "string" || label.trim() === "") {
    throw new ServiceError("label is required", 400);
  }
  const userId = user?.id ?? callerId;
  if (!userId) throw new ServiceError("Not authenticated", 401);

  const assignmentDate = requireDate(date);
  assertTimeRange(scheduledStartTime, scheduledEndTime);

  const targetUser = await User.findById(userId);
  const isAgent = hasAgentRole(targetUser?.position);
  const station = stationName?.trim();

  // Agent roles may be assigned at workplace level; everyone else needs a station.
  if (!isAgent && !station) {
    throw new ServiceError("stationName is required for this user role", 400);
  }

  const meals = parseMealTimes(startMealTime, scheduledStartTime, scheduledEndTime);
  const cleanLabel = label.trim();

  const notify = (workplaceName: string, stationLabel: string | null, assignedDate: string) => {
    if (!targetUser?.email) return;
    sendScheduleConfirmationEmail({
      email: targetUser.email,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      workplaceName,
      stationName: stationLabel,
      date: assignedDate,
      scheduledStartTime,
      scheduledEndTime,
      startMealTime: meals,
      label: cleanLabel,
    }).catch((err) => console.error("Failed to send schedule confirmation email:", err));
  };

  try {
    if (isAgent && !station) {
      const result = await assignToWorkplaceService({
        userId,
        workplaceId,
        date: assignmentDate,
        label: cleanLabel,
        scheduledStartTime,
        scheduledEndTime,
        startMealTime: meals.length > 0 ? meals : undefined,
      });
      notify(result.meta.workplaceName, null, result.meta.assignedDate);
      return {
        message: result.message,
        result: result.result,
        meta: {
          workplaceName: result.meta.workplaceName,
          stationName: null,
          assignedDate: result.meta.assignedDate,
        },
      };
    }

    // Overlap-checked preparation, then the schedule, then commit to the workplace.
    const prepared = await prepareAssignmentService({
      workplaceId,
      date: assignmentDate,
      label: cleanLabel,
      scheduledStartTime,
      scheduledEndTime,
      stationName: station as string,
      startMealTime: meals,
    });

    const response = await createSchedulesForUsersService({
      userIds: [userId],
      date: assignmentDate,
      workstationId: prepared.workstationId,
      sessions: [{ label: cleanLabel, scheduledStartTime, scheduledEndTime, startMealTime: meals }],
    });
    if (!response.result || response.result.length === 0) {
      throw new ServiceError("Schedule creation returned no result", 502);
    }

    await prepared.commit(userId);
    notify(prepared.workplaceName, prepared.stationNameResolved, assignmentDate);

    return {
      message: "Assignment created",
      result: response.result,
      meta: {
        workplaceName: prepared.workplaceName,
        stationName: prepared.stationNameResolved,
        assignedDate: assignmentDate,
      },
    };
  } catch (err) {
    // Surface conflicts clearly instead of silently moving the user's chosen date.
    if (err instanceof ServiceError && err.status === 409) {
      throw new ServiceError(
        `Assignment cannot be created on ${assignmentDate}: ${err.message}. Please select a different date or time.`,
        409
      );
    }
    throw err;
  }
};
