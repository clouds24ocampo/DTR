import mongoose from "mongoose";
import { ServiceError } from "src/utils/global/error";
import ScheduleSchema from "../../../models/global/schedule.model";
import Workplace from "../../../models/workforce/workplace.model";
import type { WorkplaceDayView } from "../../../types/workforce/workplace/workplace.type";
import { overlaps } from "../../../utils/global/schedule/validation.utils";
import { deleteScheduleService } from "../../global/schedule/createSched.service";

export async function prepareAssignmentService(args: {
  workplaceId: string;
  date: string;
  label: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  stationName?: string;
  startMealTime?: string[];
}) {
  const {
    workplaceId,
    date,
    label,
    scheduledStartTime,
    scheduledEndTime,
    stationName,
    startMealTime,
  } = args;

  // Normalize date to YYYY-MM-DD format
  // The date should already be in YYYY-MM-DD format from the controller
  const toYMD = (d: string) => {
    // If already in YYYY-MM-DD format, validate and return
    const ymdPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (ymdPattern.test(d.trim())) {
      return d.trim();
    }
    
    // Otherwise, try to parse it
    const dt = new Date(d);
    if (isNaN(dt.getTime())) {
      throw new Error(`Invalid date format: "${d}". Expected YYYY-MM-DD.`);
    }
    return new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
    )
      .toISOString()
      .slice(0, 10);
  };
  
  // Log for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("prepareAssignmentService - received date:", date, "normalized:", toYMD(date));
  }
  
  const dateYMD = toYMD(date);

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log("🟡 prepareAssignmentService - starting:", {
      workplaceId,
      date: dateYMD,
      stationName,
    });
  }

  const wp: any = await Workplace.findById(workplaceId);
  if (!wp) throw new ServiceError("Workplace not found", 404);

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log("🟢 prepareAssignmentService - workplace found:", {
      workplaceId,
      workplaceName: wp.name,
      workstationCount: wp.workstations?.length || 0,
      workstations: wp.workstations?.map((w: any) => ({
        id: String(w._id),
        name: String(w.stationName),
      })) || [],
    });
  }

  const stationNorm = (stationName ?? "").trim().toLowerCase();
  const target = (wp.workstations ?? []).find(
    (w: any) => String(w.stationName).trim().toLowerCase() === stationNorm
  );
  
  if (!target) {
    const availableStations = (wp.workstations ?? []).map((w: any) => String(w.stationName));
    if (process.env.NODE_ENV === "development") {
      console.error("❌ prepareAssignmentService - workstation not found:", {
        workplaceId,
        workplaceName: wp.name,
        requestedStationName: stationName,
        normalizedStationName: stationNorm,
        availableStations,
      });
    }
    throw new ServiceError(
      `Target workstation "${stationName}" not found in workplace "${wp.name}". Available stations: ${availableStations.join(", ")}`,
      400
    );
  }

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log("✅ prepareAssignmentService - workstation found:", {
      workplaceId,
      workplaceName: wp.name,
      workstationId: String(target._id),
      stationName: String(target.stationName),
      requestedStationName: stationName,
    });
  }

  // Note: We don't check for overlaps here because we don't have the userId yet.
  // The overlap check (including duplicate detection) will be done in commit()
  // where we have the userId and can distinguish between same-user duplicates
  // and overlaps with other users' assignments.

  const normalizedMeals: string[] = Array.isArray(startMealTime)
    ? startMealTime.map(String)
    : [];

  // Helper function to check if a date has time overlaps for the given workstation
  const checkDateHasOverlap = async (
    checkDate: string,
    checkStartTime: string,
    checkEndTime: string
  ): Promise<boolean> => {
    const checkDateYMD = toYMD(checkDate);
    const fresh: any = await Workplace.findById(workplaceId);
    if (!fresh) return false;

    const wsIdx = (fresh.workstations ?? []).findIndex(
      (w: any) => String(w.stationName).trim().toLowerCase() === stationNorm
    );
    if (wsIdx < 0) return false;

    const ws = fresh.workstations[wsIdx] ?? { dates: [] };
    const dates: any[] = Array.isArray(ws.dates) ? ws.dates : [];
    const dateIdx = dates.findIndex((d: any) => String(d.date) === checkDateYMD);

    if (dateIdx === -1) return false; // No assignments on this date, so no overlap

    const day = dates[dateIdx];
    const prevUsers: any[] = Array.isArray(day.assignedUsers)
      ? day.assignedUsers
      : [];

    // Check if any existing assignment overlaps with the proposed time
    return prevUsers.some((existing: any) => {
      return overlaps(
        checkStartTime,
        checkEndTime,
        existing.scheduledStartTime,
        existing.scheduledEndTime
      );
    });
  };

  const commit = async (userId: string) => {
    const fresh: any = await Workplace.findById(workplaceId);
    if (!fresh) throw new ServiceError("Workplace not found", 404);

    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("🟣 prepareAssignmentService.commit - workplace found:", {
        workplaceId,
        workplaceName: fresh.name,
        workstationCount: fresh.workstations?.length || 0,
      });
    }

    const wsIdx = (fresh.workstations ?? []).findIndex(
      (w: any) => String(w.stationName).trim().toLowerCase() === stationNorm
    );
    
    if (wsIdx < 0) {
      const availableStations = (fresh.workstations ?? []).map((w: any) => String(w.stationName));
      if (process.env.NODE_ENV === "development") {
        console.error("❌ prepareAssignmentService.commit - workstation not found:", {
          workplaceId,
          workplaceName: fresh.name,
          requestedStationName: stationName,
          normalizedStationName: stationNorm,
          availableStations,
        });
      }
      throw new ServiceError(
        `Target workstation "${stationName}" not found in workplace "${fresh.name}" during commit. Available stations: ${availableStations.join(", ")}`,
        404
      );
    }

    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log("✅ prepareAssignmentService.commit - workstation found:", {
        workplaceId,
        workplaceName: fresh.name,
        workstationIndex: wsIdx,
        workstationId: String(fresh.workstations[wsIdx]._id),
        stationName: String(fresh.workstations[wsIdx].stationName),
      });
    }

    const ws = fresh.workstations[wsIdx] ?? {
      dates: [],
      stationName: target.stationName,
    };
    const dates: any[] = Array.isArray(ws.dates) ? ws.dates : [];

    const assign = {
      userId: mongoose.isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(userId)
        : String(userId),
      label: String(label || "regular work"),
      scheduledStartTime: String(scheduledStartTime),
      scheduledEndTime: String(scheduledEndTime),
      startMealTime: normalizedMeals.map(String),
    };

    const dateIdx = dates.findIndex((d: any) => String(d.date) === dateYMD);
    
    // Check for exact duplicate (same user, same time, same label)
    if (dateIdx !== -1) {
      const day = dates[dateIdx];
      const prevUsers: any[] = Array.isArray(day.assignedUsers)
        ? day.assignedUsers
        : [];
      
      const userIdStr = String(userId);
      const isDuplicate = prevUsers.some((existing: any) => {
        const existingUserId = String(existing.userId);
        return (
          existingUserId === userIdStr &&
          existing.scheduledStartTime === assign.scheduledStartTime &&
          existing.scheduledEndTime === assign.scheduledEndTime &&
          existing.label === assign.label
        );
      });
      
      // If it's an exact duplicate, skip adding (idempotent operation)
      if (isDuplicate) {
        return; // No error, just silently skip
      }
      
      // Check for overlaps (with any user, including same user with different times)
      // Note: We already checked for exact duplicates above, so any overlap here is a conflict
      const hasOverlap = prevUsers.some((existing: any) => {
        return overlaps(
          assign.scheduledStartTime,
          assign.scheduledEndTime,
          existing.scheduledStartTime,
          existing.scheduledEndTime
        );
      });
      
      if (hasOverlap) {
        throw new ServiceError(
          "Time window overlaps with an existing assignment on this workstation and date.",
          409
        );
      }
    }

    let nextDates: any[];

    if (dateIdx === -1) {
      nextDates = [...dates, { date: dateYMD, assignedUsers: [assign] }];
    } else {
      const day = dates[dateIdx];
      const prevUsers: any[] = Array.isArray(day.assignedUsers)
        ? day.assignedUsers
        : [];
      const nextDay = { ...day, assignedUsers: [...prevUsers, assign] };
      nextDates = dates.map((d: any, i: number) =>
        i === dateIdx ? nextDay : d
      );
    }

    const nextWorkstations = fresh.workstations.map((w: any, i: number) =>
      i === wsIdx ? { ...(w.toObject?.() ?? w), dates: nextDates } : w
    );

    fresh.workstations = nextWorkstations;
    fresh.markModified("workstations");
    
    // Final validation before save: Ensure we're saving to the correct workplace
    if (process.env.NODE_ENV === "development") {
      console.log("🟢 prepareAssignmentService.commit - saving assignment:", {
        workplaceId,
        workplaceName: fresh.name,
        workplaceIdFromDB: String(fresh._id),
        workstationIndex: wsIdx,
        workstationId: String(fresh.workstations[wsIdx]._id),
        stationName: String(fresh.workstations[wsIdx].stationName),
        userId,
        date: dateYMD,
        validation: {
          workplaceIdMatches: String(fresh._id) === String(workplaceId),
          workstationFound: wsIdx >= 0,
        },
      });
    }
    
    // Validate workplace ID matches before saving
    if (String(fresh._id) !== String(workplaceId)) {
      const errorMsg = `Workplace ID mismatch during commit: Expected "${workplaceId}" but found "${String(fresh._id)}"`;
      console.error("❌ prepareAssignmentService.commit - Workplace ID mismatch:", errorMsg);
      throw new ServiceError(errorMsg, 500);
    }
    
    await fresh.save();
  };

  // Get workstation ID for schedule creation
  const workstationId = String(target._id);

  // Final validation: Ensure we're working with the correct workplace
  if (process.env.NODE_ENV === "development") {
    console.log("✅ prepareAssignmentService - returning result:", {
      workplaceId,
      workplaceName: String(wp.name),
      workstationId,
      stationName: String(target.stationName),
    });
  }

  return {
    commit,
    workplaceName: String(wp.name),
    stationNameResolved: String(target.stationName),
    workstationId, // Return workstation ID for schedule creation
    checkDateHasOverlap,
  };
}

export async function getWorkplaceDayViewService(
  workplaceId: string,
  date: string
): Promise<WorkplaceDayView> {
  const wp: any = await Workplace.findById(workplaceId).lean();
  if (!wp) throw new ServiceError("Workplace not found", 404);

  const stations = (wp.workstations ?? []).map((ws: any) => {
    const day = (ws.dates ?? []).find((d: any) => d.date === date);

    const withMeals = (day?.assignedUsers ?? []).map((a: any) => ({
      userId: String(a.userId),
      label: String(a.label),
      scheduledStartTime: String(a.scheduledStartTime),
      scheduledEndTime: String(a.scheduledEndTime),
      startMealTime: Array.isArray(a.startMealTime)
        ? a.startMealTime.map(String)
        : [],
    }));

    return {
      workstationId: String(ws._id),
      stationName: String(ws.stationName),
      date,
      assignedUsers: withMeals,
    };
  });

  return {
    workplaceId: String(wp._id),
    name: String(wp.name),
    workstationCount: Number(wp.workstationCount),
    stations,
  };
}

export async function unassignUserService(
  workplaceId: string,
  workstationId: string,
  date: string,
  userId: string
): Promise<void> {
  const wp: any = await Workplace.findById(workplaceId);
  if (!wp) throw new ServiceError("Workplace not found", 404);

  const workstation = wp.workstations.find(
    (ws: any) => String(ws._id) === workstationId
  );
  if (!workstation) throw new ServiceError("Workstation not found", 404);

  const day = workstation.dates.find((d: any) => d.date === date);
  if (!day) throw new ServiceError("No assignments found for this date", 404);

  const userIndex = day.assignedUsers.findIndex(
    (user: any) => user.userId === userId
  );
  if (userIndex === -1) throw new ServiceError("User not assigned", 404);

  day.assignedUsers.splice(userIndex, 1);
  await wp.save();

  const schedule = await ScheduleSchema.findOne({ userId, date });
  if (schedule) {
    await deleteScheduleService(schedule._id.toString());
  }
}
