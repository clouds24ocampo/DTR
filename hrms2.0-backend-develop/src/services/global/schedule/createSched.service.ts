import DTR from "src/models/global/dtr.model";
import Schedule from "src/models/global/schedule.model";
import User from "src/models/workforce/user.model";
import Workplace from "src/models/workforce/workplace.model";
import { ServiceError } from "src/utils/global/error";
import { createNotificationService } from "../notification/notification.service";
import {
  clampMealStartsToWindow,
  ensureDTRSync,
} from "src/utils/global/schedule/schedTime.utils";
import {
  assertNoSessionOverlaps,
  assertStartBeforeEnd,
  assertValidFullSched,
  deriveMealStartsFromFull,
  fitWindowToFullSched,
  generateFullSchedule,
  recomputeDerivedFromFullSched,
  sortFullSchedByStart,
} from "src/utils/global/schedule/schedule-helpers";
import { isTime, lt } from "src/utils/global/schedule/validation.utils";
import {
  IFullSched,
  ISchedule,
  ISession,
} from "../../../types/global/schedule/schedule.type";

/* ----------------------------- CREATE ----------------------------- */

export async function createSchedulesForUsersService(input: {
  userIds: string[];
  date: string;
  workstationId?: string; // Optional workstation ID for workplace assignments
  sessions: Array<{
    label: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    startMealTime?: string[];
  }>;
}): Promise<{
  message: string;
  result: Array<{
    userId: string;
    scheduleAction: "created" | "appended";
    dtrAction: "created" | "appended";
    sessionsAdded: number;
  }>;
}> {
  const { userIds, date, workstationId, sessions } = input;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ServiceError("userIds must be a non-empty array", 400);
  }
  if (!date || typeof date !== "string") {
    throw new ServiceError("date must be a string", 400);
  }
  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new ServiceError("sessions must be a non-empty array", 400);
  }

  const invalid = sessions.find((s) => {
    const badTime =
      !isTime(s.scheduledStartTime) ||
      !isTime(s.scheduledEndTime) ||
      s.scheduledStartTime === s.scheduledEndTime;
    const badLabel =
      !s.label || typeof s.label !== "string" || s.label.trim() === "";
    return badTime || badLabel;
  });
  if (invalid) {
    throw new ServiceError(
      "One or more sessions have invalid start/end times or missing/empty label",
      400
    );
  }

  const users = await User.find({ _id: { $in: userIds } });
  if (users.length !== userIds.length) {
    throw new ServiceError("Some users not found", 404);
  }

  const result: {
    userId: string;
    scheduleAction: "created" | "appended";
    dtrAction: "created" | "appended";
    sessionsAdded: number;
  }[] = [];

  for (const user of users) {
    // When workstationId is provided, find schedule by userId, date, AND workstationId
    // This allows same user to have separate schedules for different workstations
    const scheduleQuery: any = {
      userId: user._id,
      date,
    };
    if (workstationId) {
      scheduleQuery.workstationId = workstationId;
    }
    const existingSchedule = await Schedule.findOne(scheduleQuery);

    const derivedSessions: ISession[] = sessions.map((session) => {
      const { label, scheduledStartTime, scheduledEndTime, startMealTime } =
        session;

      assertStartBeforeEnd(scheduledStartTime, scheduledEndTime);

      const startsWithin = clampMealStartsToWindow(
        startMealTime ?? [],
        scheduledStartTime,
        scheduledEndTime
      );

      const {
        schedule: fullSched,
        workCredits,
        breakCredits,
        breakCount,
        mealCredits,
        mealCount,
      } = generateFullSchedule(
        scheduledStartTime,
        scheduledEndTime,
        startsWithin
      );

      const formattedFullSched: IFullSched[] = fullSched.map((sched) => ({
        type: sched.type as "work" | "meal" | "break",
        start: sched.start,
        end: sched.end,
      }));

      return {
        label: label.trim(),
        workCredits,
        breakCredits,
        breakCount,
        mealCredits,
        mealCount,
        scheduledStartTime,
        scheduledEndTime,
        startMealTime: startsWithin,
        fullSched: formattedFullSched,
      };
    });

    // Filter out duplicate sessions (same time range and label) if they already exist
    let sessionsToAdd = derivedSessions;
    if (existingSchedule) {
      const existingSessions = (existingSchedule.sessions as any[]).map((s) =>
        s.toObject ? s.toObject() : s
      );
      sessionsToAdd = derivedSessions.filter((newSession) => {
        // Check if there's already a session with the same time range and label
        const isDuplicate = existingSessions.some(
          (existing) => {
            const existingStart = existing.scheduledStartTime;
            const existingEnd = existing.scheduledEndTime;
            const existingLabel = existing.label;
            return (
              existingStart &&
              existingEnd &&
              existingLabel &&
              existingStart === newSession.scheduledStartTime &&
              existingEnd === newSession.scheduledEndTime &&
              existingLabel === newSession.label
            );
          }
        );
        return !isDuplicate;
      });
    }

    // If all sessions are duplicates, skip this user
    if (sessionsToAdd.length === 0) {
      result.push({
        userId: String(user._id),
        scheduleAction: "appended",
        dtrAction: "appended",
        sessionsAdded: 0,
      });
      continue;
    }

    // Add date and workstation context to sessions for overlap checking
    // Group by workstationId so overlaps are only checked within same workstation
    const sessionsToAddWithContext = sessionsToAdd.map((s) => ({
      ...s,
      date,
      scheduleDate: date,
      workstationId: workstationId || undefined, // Include workstation context
    }));

    // Only check overlaps within the same workstation (if workstationId provided)
    // This allows same user to work at different workstations with overlapping times
    assertNoSessionOverlaps(sessionsToAddWithContext as any, {
      groupBy: workstationId 
        ? (s: any) => {
            const sDate = s?.date ?? s?.scheduleDate;
            const sWorkstation = s?.workstationId ?? undefined;
            if (sDate && sWorkstation) {
              return `${sDate}|${sWorkstation}`;
            }
            return sDate ? sDate : undefined;
          }
        : undefined, // If no workstationId, check globally (backward compatible)
    });

    let scheduleAction: "created" | "appended" = "created";
    let dtrAction: "created" | "appended" = "created";
    const sessionsAdded = sessionsToAdd.length;

    if (existingSchedule) {
      // Convert Mongoose documents to plain objects and filter out invalid sessions
      const existingSessions = (existingSchedule.sessions as any[])
        .map((s) => {
          // Convert Mongoose subdocument to plain object if needed
          const plain = s.toObject ? s.toObject() : s;
          // Validate that required fields exist
          if (
            !plain.scheduledStartTime ||
            !plain.scheduledEndTime ||
            !isTime(plain.scheduledStartTime) ||
            !isTime(plain.scheduledEndTime)
          ) {
            return null;
          }
          return {
            ...plain,
            date: existingSchedule.date,
            scheduleDate: existingSchedule.date,
            workstationId: existingSchedule.workstationId || undefined,
          };
        })
        .filter((s): s is ISession & { date: string; scheduleDate: string } => s !== null);

      // Add workstation context to existing sessions if workstationId is provided
      const existingSessionsWithContext = existingSessions.map((s) => ({
        ...s,
        workstationId: existingSchedule.workstationId || undefined,
      }));

      const combined = [
        ...existingSessionsWithContext,
        ...sessionsToAddWithContext,
      ];
      
      // Check overlaps with workstation grouping
      // Only check overlaps within the same workstation
      const currentWorkstationId = workstationId || existingSchedule.workstationId;
      assertNoSessionOverlaps(combined as any, {
        groupBy: currentWorkstationId
          ? (s: any) => {
              const sDate = s?.date ?? s?.scheduleDate;
              const sWorkstation = s?.workstationId ?? undefined;
              if (sDate && sWorkstation) {
                return `${sDate}|${sWorkstation}`;
              }
              return sDate ? sDate : undefined;
            }
          : undefined,
      });

      // Ensure workstationId is set if provided (for existing schedules)
      if (workstationId && !existingSchedule.workstationId) {
        existingSchedule.workstationId = workstationId;
      }
      
      existingSchedule.sessions.push(...sessionsToAdd);
      await existingSchedule.save();
      await ensureDTRSync(
        String(user._id),
        date,
        existingSchedule.sessions as any
      );
      scheduleAction = "appended";
      dtrAction = "appended";
      
      // Notify user about schedule update
      const userDoc = await User.findById(user._id).lean();
      if (userDoc) {
        createNotificationService({
          userId: String(user._id),
          type: "schedule_update",
          title: "Schedule Updated",
          body: `Your schedule for ${date} has been updated with ${sessionsAdded} new session(s)`,
          fromName: "System",
          priority: "medium",
          link: "/dtr",
          metadata: {
            date: date,
            sessionsAdded: sessionsAdded,
          },
        }).catch((err) => {
          console.error("Error creating schedule update notification:", err);
        });
      }
    } else {
      const newSchedule = new Schedule({
        userId: user._id,
        date,
        workstationId: workstationId || undefined, // Store workstationId if provided
        sessions: sessionsToAdd,
      });
      await newSchedule.save();
      await ensureDTRSync(String(user._id), date, sessionsToAdd);
      
      // Notify user about new schedule
      const userDoc = await User.findById(user._id).lean();
      if (userDoc) {
        createNotificationService({
          userId: String(user._id),
          type: "schedule_update",
          title: "New Schedule Created",
          body: `Your schedule for ${date} has been created with ${sessionsToAdd.length} session(s)`,
          fromName: "System",
          priority: "medium",
          link: "/dtr",
          metadata: {
            date: date,
            sessionsCount: sessionsToAdd.length,
          },
        }).catch((err) => {
          console.error("Error creating schedule notification:", err);
        });
      }
    }

    // When workstationId is provided, sync the date to the workplace so management can preview assignments
    if (workstationId && sessionsAdded > 0) {
      const wp: any = await Workplace.findOne({
        "workstations._id": workstationId,
      }).lean();
      if (wp) {
        const ws = (wp.workstations ?? []).find(
          (w: any) => String(w._id) === String(workstationId)
        );
        if (ws?.stationName) {
          const { prepareAssignmentService } = await import(
            "src/services/workforce/workplace/workplaceAssign.service"
          );
          for (const session of sessionsToAdd) {
            try {
              const prepared = await prepareAssignmentService({
                workplaceId: String(wp._id),
                date,
                label: session.label ?? "Session",
                scheduledStartTime: session.scheduledStartTime,
                scheduledEndTime: session.scheduledEndTime,
                stationName: String(ws.stationName),
                startMealTime: session.startMealTime,
              });
              await prepared.commit(String(user._id));
            } catch (err) {
              console.error(
                "[createSchedulesForUsersService] Failed to sync schedule to workplace:",
                err
              );
            }
          }
        }
      }
    }

    result.push({
      userId: String(user._id),
      scheduleAction,
      dtrAction,
      sessionsAdded,
    });
  }

  return { message: "Schedules created/updated and DTRs synced.", result };
}

export const editScheduleService = async (
  scheduleId: string,
  updatedSessions: ISession[]
): Promise<ISchedule> => {
  try {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw new ServiceError("Schedule not found", 404);

    const rebuilt: ISession[] = updatedSessions.map((s) => {
      // Validate start/end
      assertStartBeforeEnd(s.scheduledStartTime, s.scheduledEndTime);

      // Clamp meal starts
      const startsWithin = clampMealStartsToWindow(
        s.startMealTime ?? [],
        s.scheduledStartTime,
        s.scheduledEndTime
      );

      // 🔑 Rebuild exactly like in createSchedulesForUsersService
      const {
        schedule: fullSched,
        workCredits,
        breakCredits,
        breakCount,
        mealCredits,
        mealCount,
      } = generateFullSchedule(
        s.scheduledStartTime,
        s.scheduledEndTime,
        startsWithin
      );

      const formattedFullSched: IFullSched[] = fullSched.map((sched) => ({
        type: sched.type as "work" | "meal" | "break",
        start: sched.start,
        end: sched.end,
      }));

      return {
        label: s.label.trim(),
        workCredits,
        breakCredits,
        breakCount,
        mealCredits,
        mealCount,
        scheduledStartTime: s.scheduledStartTime,
        scheduledEndTime: s.scheduledEndTime,
        startMealTime: startsWithin,
        fullSched: formattedFullSched,
      };
    });

    assertNoSessionOverlaps(rebuilt as any);

    schedule.sessions = rebuilt as any;
    await schedule.save();

    await ensureDTRSync(String(schedule.userId), schedule.date, rebuilt);

    // Notify user about schedule edit
    const userDoc = await User.findById(schedule.userId).lean();
    if (userDoc) {
      createNotificationService({
        userId: String(schedule.userId),
        type: "schedule_update",
        title: "Schedule Updated",
        body: `Your schedule for ${schedule.date} has been updated`,
        fromName: "System",
        priority: "medium",
        link: "/dtr",
        metadata: {
          date: schedule.date,
          scheduleId: scheduleId,
        },
      }).catch((err) => {
        console.error("Error creating schedule edit notification:", err);
      });
    }

    return schedule.toObject();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("Failed to edit schedule", 500);
  }
};

export const editSingleSessionService = async (
  scheduleId: string,
  sessionId: string,
  patch: Partial<ISession>,
  editorId: string,
  note?: string
): Promise<ISchedule> => {
  try {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw new ServiceError("Schedule not found", 404);

    const target = (schedule.sessions as any).id(sessionId) as
      | (ISession & { _id: any })
      | null;
    if (!target) throw new ServiceError("Session not found", 404);

    const before: Partial<ISession> = {
      label: target.label,
      workCredits: target.workCredits,
      breakCredits: target.breakCredits,
      breakCount: target.breakCount,
      mealCredits: target.mealCredits,
      mealCount: target.mealCount,
      scheduledStartTime: target.scheduledStartTime,
      scheduledEndTime: target.scheduledEndTime,
      startMealTime: target.startMealTime ?? [],
      fullSched: target.fullSched,
    };

    if (patch.label !== undefined) target.label = patch.label;
    if (patch.scheduledStartTime !== undefined)
      target.scheduledStartTime = patch.scheduledStartTime;
    if (patch.scheduledEndTime !== undefined)
      target.scheduledEndTime = patch.scheduledEndTime;
    if (patch.fullSched !== undefined) target.fullSched = patch.fullSched;

    if (patch.fullSched && patch.fullSched.length) {
      const fitted = fitWindowToFullSched(patch.fullSched);
      if (fitted) {
        target.scheduledStartTime = fitted.start;
        target.scheduledEndTime = fitted.end;
      }
    }

    assertStartBeforeEnd(target.scheduledStartTime, target.scheduledEndTime);

    if (target.fullSched && target.fullSched.length) {
      assertValidFullSched(
        target.fullSched as any,
        target.scheduledStartTime,
        target.scheduledEndTime
      );
      target.fullSched = sortFullSchedByStart(target.fullSched as any) as any;

      const mealStarts = deriveMealStartsFromFull(target.fullSched as any);
      const derived = recomputeDerivedFromFullSched(target.fullSched as any);

      Object.assign(target, derived, { startMealTime: mealStarts });

      (target as any).markModified?.("fullSched");
      (schedule as any).markModified?.("sessions");
    } else {
    }

    assertNoSessionOverlaps(schedule.sessions as any);

    (schedule as any).editHistory = (schedule as any).editHistory ?? [];
    (schedule as any).editHistory.push({
      timestamp: new Date().toISOString(),
      editorId,
      change: "update",
      sessionId: String((target as any)._id),
      note,
      before,
      after: {
        label: target.label,
        workCredits: target.workCredits,
        breakCredits: target.breakCredits,
        breakCount: target.breakCount,
        mealCredits: target.mealCredits,
        mealCount: target.mealCount,
        scheduledStartTime: target.scheduledStartTime,
        scheduledEndTime: target.scheduledEndTime,
        startMealTime: target.startMealTime ?? [],
        fullSched: target.fullSched,
      },
    });

    await schedule.save();

    await ensureDTRSync(
      String(schedule.userId),
      schedule.date,
      schedule.sessions as any
    );

    // Notify user about session update
    const userDoc = await User.findById(schedule.userId).lean();
    if (userDoc) {
      createNotificationService({
        userId: String(schedule.userId),
        type: "schedule_update",
        title: "Schedule Session Updated",
        body: `A session in your schedule for ${schedule.date} has been updated`,
        fromName: "System",
        priority: "low",
        link: "/dtr",
        metadata: {
          date: schedule.date,
          scheduleId: scheduleId,
          sessionId: sessionId,
        },
      }).catch((err) => {
        console.error("Error creating session update notification:", err);
      });
    }

    return schedule.toObject();
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("Failed to edit session", 500);
  }
};

export const deleteScheduleService = async (
  scheduleId: string
): Promise<string> => {
  try {
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw new ServiceError("Schedule not found", 404);

    await Schedule.deleteOne({ _id: scheduleId });
    await DTR.deleteOne({ userId: schedule.userId, date: schedule.date });

    return "Schedule and DTR deleted successfully";
  } catch {
    throw new ServiceError("Failed to delete schedule", 500);
  }
};
