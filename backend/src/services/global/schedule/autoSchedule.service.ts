/**
 * Auto-scheduling service: derives the next schedule configuration from
 * an employee's historical schedule data (shift pattern, time blocks) and
 * creates the next day's schedule when triggered (e.g. on session timeout).
 * Preserves shift type (morning, midshift, regular, etc.) by preferring
 * the current day's schedule first, then same weekday, then most recent.
 *
 * When auto-schedule runs, it also updates the Workplace document in the database:
 * - For the relevant workstation, adds the target date to workstations[].dates[]
 * - Pushes the assigned user (userId, label, scheduledStartTime, scheduledEndTime,
 *   startMealTime) into that date's assignedUsers so Workplace Management can preview
 *   dates and assigned users. This is done via syncAutoScheduleToWorkplace (and
 *   createSchedulesForUsersService when workstationId is provided).
 */

import mongoose from "mongoose";
import moment from "moment";
import Schedule from "src/models/global/schedule.model";
import User from "src/models/workforce/user.model";
import Workplace from "src/models/workforce/workplace.model";
import { getSchedulesByUserAndDateRangeService } from "./getSched.service";
import { createSchedulesForUsersService } from "./createSched.service";
import { prepareAssignmentService } from "src/services/workforce/workplace/workplaceAssign.service";
import { sendScheduleConfirmationEmail } from "src/utils/global/mail/scheduleConfirmationEmail";
import type { ISchedule, ISession } from "src/types/global/schedule/schedule.type";

const DEFAULT_HISTORY_DAYS = 30;
const MAX_HISTORY_DAYS = 90;

export type DerivedSessionInput = {
  label: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  startMealTime?: string[];
};

/**
 * Get weekday (0 = Sunday, 6 = Saturday) for a YYYY-MM-DD string.
 */
function getWeekday(dateStr: string): number {
  const m = moment(dateStr, "YYYY-MM-DD", true);
  return m.isValid() ? m.day() : -1;
}

/**
 * Add days to a YYYY-MM-DD date string.
 */
function addDays(dateStr: string, days: number): string {
  return moment(dateStr, "YYYY-MM-DD", true).add(days, "days").format("YYYY-MM-DD");
}

/**
 * Fetch historical schedules for a user: all schedules with date in
 * (endDate - limitDays, endDate] (endDate exclusive in "past" sense),
 * ordered by date descending (most recent first).
 */
export async function getHistoricalSchedulesForUser(
  userId: string,
  beforeOrOnDate: string,
  limitDays: number = DEFAULT_HISTORY_DAYS
): Promise<ISchedule[]> {
  const end = beforeOrOnDate.trim();
  const days = Math.min(Math.max(1, limitDays), MAX_HISTORY_DAYS);
  const start = addDays(end, -days);
  return getSchedulesByUserAndDateRangeService(userId, start, end);
}

/**
 * Derive the next schedule's session configuration from historical schedules.
 * Preserves shift type (morning, midshift, regular, etc.) by preferring:
 * 1. Current day's schedule (triggerDate) – the schedule that just ended
 * 2. Same weekday – e.g. last Monday for next Monday
 * 3. Most recent schedule by date
 * Returns sessions in the format expected by createSchedulesForUsersService.
 */
export function deriveNextSessionsFromHistory(
  historicalSchedules: ISchedule[],
  targetDate: string,
  triggerDate: string
): DerivedSessionInput[] {
  const targetWeekday = getWeekday(targetDate);
  if (historicalSchedules.length === 0) return [];

  // 1) Prefer current day (triggerDate) – same shift type as the one that just ended
  const currentDaySchedule = historicalSchedules.find(
    (s) => s.date === triggerDate
  );
  if (currentDaySchedule?.sessions?.length) {
    const sessions = currentDaySchedule.sessions;
    return sessions.map((s: ISession) => ({
      label: s.label || "Session",
      scheduledStartTime: s.scheduledStartTime,
      scheduledEndTime: s.scheduledEndTime,
      startMealTime: Array.isArray(s.startMealTime) ? s.startMealTime : undefined,
    }));
  }

  // 2) Same weekday (recurrence by weekday)
  const sameWeekday = historicalSchedules.filter(
    (s) => getWeekday(s.date) === targetWeekday
  );
  const source = sameWeekday.length > 0 ? sameWeekday[0] : historicalSchedules[0];
  const sessions = source.sessions || [];

  return sessions.map((s: ISession) => ({
    label: s.label || "Session",
    scheduledStartTime: s.scheduledStartTime,
    scheduledEndTime: s.scheduledEndTime,
    startMealTime: Array.isArray(s.startMealTime) ? s.startMealTime : undefined,
  }));
}

/**
 * Get the source schedule used for derivation (for workplace sync).
 * Same order as deriveNextSessionsFromHistory: current day, same weekday, most recent.
 */
function getSourceScheduleForNextDay(
  historicalSchedules: ISchedule[],
  triggerDate: string,
  targetDate: string
): ISchedule | null {
  if (historicalSchedules.length === 0) return null;
  const current = historicalSchedules.find((s) => s.date === triggerDate);
  if (current?.sessions?.length) return current;
  const targetWeekday = getWeekday(targetDate);
  const sameWeekday = historicalSchedules.filter(
    (s) => getWeekday(s.date) === targetWeekday
  );
  return sameWeekday.length > 0 ? sameWeekday[0] : historicalSchedules[0];
}

/**
 * Normalize workstationId from schedule (string or ObjectId).
 */
function normalizeWorkstationId(ws: any): string | null {
  if (ws == null) return null;
  const s = typeof ws === "string" ? ws : (ws?.toString?.() ?? String(ws));
  return s.trim() || null;
}

/**
 * Find workplace id, workstation id, and station name for a user on a given date
 * by scanning Workplace documents (fallback when Schedule has no workstationId).
 */
async function findWorkplaceAssignmentForUserOnDate(
  userId: string,
  date: string
): Promise<{ workplaceId: string; workstationId: string; stationName: string } | null> {
  const uid = String(userId).trim();
  const dateYMD = date.trim();
  const workplaces: any[] = await Workplace.find({}).lean();
  for (const wp of workplaces) {
    for (const ws of wp.workstations ?? []) {
      const day = (ws.dates ?? []).find((d: any) => String(d.date) === dateYMD);
      const hasUser = (day?.assignedUsers ?? []).some(
        (a: any) => String(a.userId) === uid
      );
      if (hasUser) {
        return {
          workplaceId: String(wp._id),
          workstationId: String(ws._id),
          stationName: String(ws.stationName || ""),
        };
      }
    }
  }
  return null;
}

/**
 * Update the Workplace document in the database: add the target date and assigned user
 * to the correct workstation's dates[] so Workplace Management can show assignments.
 * Resolves workplace + workstation from source schedule's workstationId, or from
 * findWorkplaceAssignmentForUserOnDate(triggerDate) when no workstationId is stored.
 * Returns workplace name and station name for use in schedule confirmation email.
 */
async function syncAutoScheduleToWorkplace(
  userId: string,
  nextDate: string,
  sessions: DerivedSessionInput[],
  sourceSchedule: ISchedule,
  triggerDate: string
): Promise<{ workplaceName: string; stationName: string } | undefined> {
  let workplaceId: string;
  let stationName: string;
  let workplaceName: string;

  let workstationId = normalizeWorkstationId((sourceSchedule as any).workstationId);
  if (workstationId) {
    const wsId = mongoose.Types.ObjectId.isValid(workstationId)
      ? new mongoose.Types.ObjectId(workstationId)
      : workstationId;
    const wp: any = await Workplace.findOne({
      "workstations._id": wsId,
    }).lean();
    if (!wp) return undefined;

    const workstation = (wp.workstations ?? []).find(
      (ws: any) => String(ws._id) === String(workstationId)
    );
    if (!workstation?.stationName) return undefined;

    workplaceId = String(wp._id);
    stationName = String(workstation.stationName);
    workplaceName = String(wp.name ?? "Workplace");
  } else {
    const fallback = await findWorkplaceAssignmentForUserOnDate(userId, triggerDate);
    if (!fallback) return undefined;
    workplaceId = fallback.workplaceId;
    stationName = fallback.stationName;
    const wp: any = await Workplace.findById(workplaceId).select("name").lean();
    workplaceName = wp?.name ? String(wp.name) : "Workplace";
  }

  for (const session of sessions) {
    try {
      const prepared = await prepareAssignmentService({
        workplaceId,
        date: nextDate,
        label: session.label || "Session",
        scheduledStartTime: session.scheduledStartTime,
        scheduledEndTime: session.scheduledEndTime,
        stationName,
        startMealTime: session.startMealTime,
      });
      await prepared.commit(userId);
      // commit() writes to the workplace document: workstations[].dates[] gets
      // an entry { date: nextDate, assignedUsers: [..., { userId, label, times }] }
    } catch (err) {
      console.error(
        "[autoSchedule] Failed to sync session to workplace:",
        err
      );
    }
  }

  return { workplaceName, stationName };
}

/**
 * Run auto-scheduling for the next calendar day after triggerDate.
 * - Loads historical schedules for the user.
 * - Derives next day sessions from history (weekday recurrence or most recent).
 * - If no schedule exists for nextDate, creates one (transactionally safe:
 *   create service handles existing schedule by appending; we skip create
 *   when next day already has a schedule to avoid unnecessary appends).
 *
 * Triggered on: user timeout, system timeout, or auto timeout (DTR end).
 */
export async function autoScheduleNextForUser(
  userId: string,
  triggerDate?: string
): Promise<{ scheduled: boolean; nextDate: string; message: string }> {
  const trigger = triggerDate?.trim() || moment().format("YYYY-MM-DD");
  const nextDate = addDays(trigger, 1);

  const existing = await Schedule.findOne({ userId, date: nextDate });
  if (existing) {
    return {
      scheduled: false,
      nextDate,
      message: "Schedule already exists for next day; skip auto-schedule.",
    };
  }

  const historical = await getHistoricalSchedulesForUser(userId, trigger);
  const sessions = deriveNextSessionsFromHistory(historical, nextDate, trigger);
  if (sessions.length === 0) {
    return {
      scheduled: false,
      nextDate,
      message: "No historical schedules to derive from; skip auto-schedule.",
    };
  }

  const sourceSchedule = getSourceScheduleForNextDay(
    historical,
    trigger,
    nextDate
  );

  const workstationId = sourceSchedule
    ? normalizeWorkstationId((sourceSchedule as any).workstationId)
    : undefined;

  await createSchedulesForUsersService({
    userIds: [userId],
    date: nextDate,
    workstationId: workstationId || undefined,
    sessions,
  });
  // When workstationId is set, createSchedulesForUsersService also updates the
  // workplace document (dates + assigned user) for management preview.

  let workplaceInfo: { workplaceName: string; stationName: string } | undefined;
  if (sourceSchedule) {
    workplaceInfo = await syncAutoScheduleToWorkplace(
      userId,
      nextDate,
      sessions,
      sourceSchedule,
      trigger
    );
    // Ensures workplace is updated when source had no workstationId (fallback
    // from findWorkplaceAssignmentForUserOnDate) or for consistency.
  }

  // Email the user their auto-scheduled shift(s)
  const userDoc = await User.findById(userId)
    .select("email firstName lastName")
    .lean() as { email?: string; firstName?: string; lastName?: string } | null;
  if (userDoc?.email) {
    const workplaceName = workplaceInfo?.workplaceName ?? "Your workplace";
    const stationName = workplaceInfo?.stationName ?? null;
    for (const session of sessions) {
      sendScheduleConfirmationEmail({
        email: userDoc.email,
        firstName: String(userDoc.firstName ?? ""),
        lastName: String(userDoc.lastName ?? ""),
        workplaceName,
        stationName,
        date: nextDate,
        scheduledStartTime: session.scheduledStartTime,
        scheduledEndTime: session.scheduledEndTime,
        startMealTime: session.startMealTime,
        label: session.label || "Session",
      }).catch((err) => {
        console.error("[autoSchedule] Failed to send schedule confirmation email:", err);
      });
    }
  }

  return {
    scheduled: true,
    nextDate,
    message: `Auto-scheduled ${sessions.length} session(s) for ${nextDate} from historical pattern.`,
  };
}
