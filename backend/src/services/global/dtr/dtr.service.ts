import moment from "moment";
import DTR, { IFullDTR } from "src/models/global/dtr.model";
import Schedule from "src/models/global/schedule.model";
import { ServiceError } from "src/utils/global/error";

import {
  assertNotNull,
  computeExpectedEnd,
  deriveMealStartTime,
  endTagText,
  findContainingBlock,
  formatTimeTo12Hour,
  pickSessionIndexForNow,
  shouldTag,
  startTagText,
} from "src/utils/global/dtr/dtr-helper";

import User from "src/models/workforce/user.model";
import type {
  CreateDTRBodyInput,
  DTRDocLite,
  DTRSessionComputed,
  DTRStatus,
  EndDTRItemBodyInput,
  NormalizedScheduleSession,
  ScheduleBlock,
  ScheduleDocLite,
  StartableType,
  StartDTRItemBodyInput,
} from "src/types/global/dtr/dtr.type";
import {
  addHHMM,
  diffMin,
  durationMinBetween,
  hhmmToMin,
  minToHHMM,
  normalizeDate,
  nowHHMM,
} from "src/utils/global/time.utils";
import { addReportService } from "../report/report.service";
import { io } from "../../../index";
import {
  DEFAULT_FLEX_SESSION,
  isFlexibleTimePosition,
} from "src/config/work-policy";

const ALLOWED_TYPES: Readonly<StartableType[]> = [
  "work",
  "break",
  "meal",
  "bio-break",
  "system issue",
  "clinic break",
  "on trip",
];

const HHMM_RE = /^(?:[01]?\d|2[0-3]):[0-5]\d$/;
const START_FALLBACK = "00:00";

const isKnownStatus = (s: any): s is DTRStatus =>
  s === "active" || s === "done" || s === "skipped";

const ensureStartForCalc = (entry: IFullDTR): string => {
  if (entry.status === "skipped") {
    if (!entry.startTime) entry.startTime = START_FALLBACK;
    if (!entry.startTag) entry.startTag = "--";
    if (!entry.duration) entry.duration = "00:00";
    return START_FALLBACK;
  }
  return entry.startTime ?? START_FALLBACK;
};

function sanitizeFullDTR(list: IFullDTR[] = []): IFullDTR[] {
  const out: IFullDTR[] = [];
  for (const raw of list) {
    if (!raw) continue;
    if (!ALLOWED_TYPES.includes(raw.type as StartableType)) continue;
    if (!isKnownStatus(raw.status)) continue;

    if (raw.status === "skipped") {
      out.push({
        ...raw,
        startTag: raw.startTag ?? "--",
        duration: raw.duration ?? "00:00",
      } as IFullDTR);
      continue;
    }

    const st = (raw as any).startTime;
    if (typeof st !== "string" || !HHMM_RE.test(st)) continue;

    const startTag =
      (raw as any).startTag ??
      (shouldTag(raw.type as StartableType) ? "good" : "--");

    out.push({
      ...(raw as any),
      startTag,
      duration: (raw as any).duration ?? "00:00",
    });
  }
  return out;
}

type UserNamePick = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
};

async function getEmployeeName(userId: string): Promise<string> {
  const reporter = await User.findById(userId)
    .select("firstName middleName lastName")
    .lean<UserNamePick | null>()
    .exec();

  if (!reporter) return "Unknown";
  const { firstName, middleName, lastName } = reporter;
  return (
    [firstName, middleName, lastName].filter(Boolean).join(" ") || "Unknown"
  );
}

/**
 * Load the user's schedule for a date, auto-provisioning a default shift
 * for flexible-time positions (e.g. Software Engineer) on first clock-in.
 * Everyone else still requires an HR-assigned schedule (404).
 */
async function ensureScheduleForUser(
  userId: string,
  targetDate: string
): Promise<{ scheduleDoc: ScheduleDocLite; flexible: boolean }> {
  const existing = await Schedule.findOne({ userId, date: targetDate });
  if (existing) {
    const user = await User.findById(userId).select("position").lean();
    return {
      scheduleDoc: existing as unknown as ScheduleDocLite,
      flexible: isFlexibleTimePosition(
        (user as { position?: unknown } | null)?.position
      ),
    };
  }

  const user = await User.findById(userId).select("position").lean();
  const flexible = isFlexibleTimePosition(
    (user as { position?: unknown } | null)?.position
  );
  if (!flexible) {
    throw new ServiceError(
      "Schedule not found for this user on the given date.",
      404
    );
  }

  const created = await Schedule.create({
    userId,
    date: targetDate,
    teamName: "Flexible",
    sessions: [{ ...DEFAULT_FLEX_SESSION }],
  });
  return { scheduleDoc: created as unknown as ScheduleDocLite, flexible: true };
}

/** First usable session for flexible-time staff (ignores clock time). */
function firstValidSessionIndex(scheduleDoc: ScheduleDocLite): number {
  const idx = scheduleDoc.sessions.findIndex(
    (s) => s?.scheduledStartTime && s.scheduledStartTime !== "00:00"
  );
  return idx >= 0 ? idx : 0;
}

function mapScheduleToDTRSessions(
  scheduleDoc: ScheduleDocLite
): DTRSessionComputed[] {
  return scheduleDoc.sessions.map(
    (session: NormalizedScheduleSession): DTRSessionComputed => {
      const {
        label,
        workCredits,
        breakCredits,
        breakCount,
        mealCredits,
        mealCount,
        scheduledStartTime,
        scheduledEndTime,
      } = session;

      const startMealTime = deriveMealStartTime(session);

      return {
        label: (label ?? "").trim() || "regular work",
        workCredits,
        breakCredits,
        breakCount,
        mealCredits,
        mealCount,
        DTRTotalWork: "00:00",
        DTRTotalBreak: "00:00",
        DTRTotalMeal: "00:00",
        scheduledStartTime: moment(scheduledStartTime, "HH:mm").format("HH:mm"),
        scheduledEndTime: moment(scheduledEndTime, "HH:mm").format("HH:mm"),
        startMealTime,
        fullDTR: [],
      };
    }
  );
}

const strictIntervalsOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) => {
  const as = hhmmToMin(aStart);
  const ae = hhmmToMin(aEnd);
  const bs = hhmmToMin(bStart);
  const be = hhmmToMin(bEnd);
  return as < be && bs < ae;
};

function shouldMarkContinuedWork(
  nowTime: string,
  session: DTRSessionComputed,
  schedSession: NormalizedScheduleSession
): boolean {
  const fullSched = (schedSession.fullSched || []) as ScheduleBlock[];
  const curBlock = findContainingBlock(fullSched, "work", nowTime);
  if (!curBlock) return false;

  const blockStart = curBlock.start;
  const blockEnd = curBlock.end;

  for (const item of session.fullDTR) {
    if (
      item.type === "work" &&
      item.status === "done" &&
      item.startTime &&
      item.endTime &&
      strictIntervalsOverlap(item.startTime, item.endTime, blockStart, blockEnd)
    ) {
      return true;
    }
  }
  return false;
}

const findNextBlockOfType = (
  fullSched: ScheduleBlock[] = [],
  type: "work" | "break" | "meal",
  nowHHMM: string
): ScheduleBlock | null => {
  const nowMin = hhmmToMin(nowHHMM);
  let best: ScheduleBlock | null = null;
  for (const b of fullSched) {
    if (b.type !== type) continue;
    const sMin = hhmmToMin(b.start);
    if (sMin > nowMin && (!best || sMin < hhmmToMin(best.start))) {
      best = b;
    }
  }
  return best;
};

async function ensureDTRForDate(params: {
  userId: string;
  date: string;
  scheduleDoc: ScheduleDocLite;
}): Promise<DTRDocLite> {
  const { userId, date, scheduleDoc } = params;

  const existing = await DTR.findOne({ userId, date });
  if (existing) return existing as unknown as DTRDocLite;

  const sessions = mapScheduleToDTRSessions(scheduleDoc);
  const dtr = await DTR.findOneAndUpdate(
    { userId, date },
    { $setOnInsert: { userId, date, sessions } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  assertNotNull(dtr, "Failed to create DTR document");
  return dtr as unknown as DTRDocLite;
}

function computeEndTagForActive(
  active: IFullDTR,
  session: DTRSessionComputed,
  schedSession: NormalizedScheduleSession,
  endHHMM: string
): string {
  if (active.status === "skipped" || !shouldTag(active.type as StartableType)) {
    return "--";
  }

  const expectedEnd = computeExpectedEnd(
    active.type as StartableType,
    ensureStartForCalc(active),
    {
      startMealTime: session.startMealTime,
      scheduledEndTime: session.scheduledEndTime,
      breakCredits: session.breakCredits,
      mealCredits: session.mealCredits,
    },
    (schedSession.fullSched || []) as ScheduleBlock[]
  );

  return endTagText(endHHMM, expectedEnd);
}

function applyDurationAndTotals(
  active: IFullDTR,
  session: DTRSessionComputed,
  endHHMM: string,
  endTag: string
): number {
  const MAX_PAID_BREAK_MINUTES = 30;
  const start = ensureStartForCalc(active);

  if (active.status === "skipped") {
    active.endTime = endHHMM;
    active.endTag = "--";
    return 0;
  }

  // Use durationMinBetween so shifts crossing midnight (e.g. 16:00 → 00:17) compute correctly
  const durMin = Math.max(0, durationMinBetween(start, endHHMM));
  const duration = minToHHMM(durMin);

  active.endTime = endHHMM;
  active.endTag = endTag;
  active.duration = duration;
  active.status = "done";

  if (active.type === "work") {
    session.DTRTotalWork = minToHHMM(hhmmToMin(session.DTRTotalWork) + durMin);
  } else if (active.type === "meal") {
    session.DTRTotalMeal = minToHHMM(hhmmToMin(session.DTRTotalMeal) + durMin);
  } else {
    // For breaks (and other non-work, non-meal types grouped here),
    // always accumulate the full break duration in DTRTotalBreak.
    const prevBreakTotalMin = hhmmToMin(session.DTRTotalBreak);
    const newBreakTotalMin = prevBreakTotalMin + durMin;
    session.DTRTotalBreak = minToHHMM(newBreakTotalMin);

    // At the same time, treat break time as compensated work
    // up to a total cap of 30 minutes per session.
    const prevPaidBreakMin = Math.min(prevBreakTotalMin, MAX_PAID_BREAK_MINUTES);
    const newPaidBreakMin = Math.min(newBreakTotalMin, MAX_PAID_BREAK_MINUTES);
    const deltaPaidBreakMin = newPaidBreakMin - prevPaidBreakMin;

    if (deltaPaidBreakMin > 0) {
      session.DTRTotalWork = minToHHMM(
        hhmmToMin(session.DTRTotalWork) + deltaPaidBreakMin
      );
    }
  }
  return durMin;
}

/* ------------------------------ CREATE ---------------------------------- */

export async function createDTRService(input: CreateDTRBodyInput): Promise<{
  message: string;
  dtr: DTRDocLite;
}> {
  const { userId } = input;
  const targetDate = normalizeDate(input.date);

  if (!userId) throw new ServiceError("userId is required", 400);

  const existingDTR = await DTR.findOne({ userId, date: targetDate });
  if (existingDTR) {
    throw new ServiceError(
      "DTR already exists for this user on the given date.",
      400
    );
  }

  const { scheduleDoc } = await ensureScheduleForUser(userId, targetDate);
  const sessions = mapScheduleToDTRSessions(scheduleDoc);

  const dtr = await DTR.findOneAndUpdate(
    { userId, date: targetDate },
    { $setOnInsert: { userId, date: targetDate, sessions } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  assertNotNull(dtr, "Failed to create DTR document");
  return { message: "DTR created.", dtr: dtr as unknown as DTRDocLite };
}

/* ------------------------------ START ITEM ------------------------------ */

export async function startDTRItemService(
  input: StartDTRItemBodyInput & { now?: string }
): Promise<{
  message: string;
  startTime: string;
  startTag: string;
  endTag?: string;
}> {
  const {
    userId,
    type,
    issue,
    reason,
    tripType,
    tripReason,
    tripCategory,
    halfDayType,
  } = input;
  const targetDate = normalizeDate(input.date);
  const { now: nowM, hhmm: nowTime } = nowHHMM(input.now);

  if (!userId) throw new ServiceError("userId is required", 400);
  if (!type || !ALLOWED_TYPES.includes(type)) {
    throw new ServiceError("Valid type is required", 400);
  }

  if (type === "system issue") {
    try {
      const employeeName = await getEmployeeName(userId);
      await addReportService({
        employeeId: userId,
        employeeName,
        type: "issue",
        title: String(issue),
        description: String(reason).trim(),
      });
    } catch (e) {
      console.error("[DTR] Failed to auto-create system issue report:", e);
    }
  } else if (type === "clinic break") {
    if (!reason || String(reason).trim() === "") {
      throw new ServiceError("Reason is required for clinic break.", 400);
    }
    if (issue) {
      throw new ServiceError(
        "Issue must not be provided for clinic break.",
        400
      );
    }
    if (reason) {
      throw new ServiceError(
        "Reason allowed only for system issue or clinic break.",
        400
      );
    }
  } else if (type === "on trip") {
    if (!tripType || String(tripType).trim() === "") {
      throw new ServiceError("Trip type is required for on trip.", 400);
    }
    if (!tripReason || String(tripReason).trim() === "") {
      throw new ServiceError("Trip reason is required for on trip.", 400);
    }
    if (!tripCategory) {
      throw new ServiceError("Trip category is required for on trip.", 400);
    }
    if (tripCategory === "Half day" && !halfDayType) {
      throw new ServiceError(
        "Half day type (Morning/Afternoon) is required.",
        400
      );
    }
    if (issue) {
      throw new ServiceError("Issue allowed only for system issue.", 400);
    }
  } else {
    if (issue)
      throw new ServiceError("Issue allowed only for system issue.", 400);
    if (reason) {
      throw new ServiceError(
        "Reason allowed only for system issue or clinic break.",
        400
      );
    }
    if (tripType || tripReason) {
      throw new ServiceError(
        "Trip details allowed only for on trip.",
        400
      );
    }
  }

  const { scheduleDoc, flexible } = await ensureScheduleForUser(
    userId,
    targetDate
  );

  let dtr = (await DTR.findOne({ userId, date: targetDate })) as any;
  if (!dtr)
    dtr = await ensureDTRForDate({ userId, date: targetDate, scheduleDoc });
  assertNotNull(dtr, "Failed to retrieve or create DTR document.");

  const dtrDoc = dtr as unknown as DTRDocLite;

  // Flexible-time staff may clock in at any hour: use the first valid
  // session instead of matching the current time to a shift window.
  const sessionIdx = flexible
    ? firstValidSessionIndex(scheduleDoc)
    : pickSessionIndexForNow(scheduleDoc, nowM);
  if (!dtrDoc.sessions[sessionIdx]) {
    throw new ServiceError("No matching session for current time.", 404);
  }

  const session = dtrDoc.sessions[sessionIdx];
  const schedSession = scheduleDoc.sessions[sessionIdx];

  if (
    !schedSession ||
    !schedSession.scheduledStartTime ||
    schedSession.scheduledStartTime === "00:00"
  ) {
    throw new ServiceError(
      "Cannot time in. You don't have a valid work schedule today.",
      400
    );
  }

  session.fullDTR = sanitizeFullDTR(session.fullDTR);

  const activeIndex = [...session.fullDTR]
    .map((_, idx) => idx)
    .reverse()
    .find((i) => session.fullDTR[i].status === "active");

  let autoEndedType: string | undefined;
  let autoEndedEndTag: string | undefined;

  if (activeIndex !== undefined) {
    const active = session.fullDTR[activeIndex];

    if (active.type === type) {
      throw new ServiceError(
        `Unable to start: ${type} is already active.`,
        400
      );
    }

    const endTag = computeEndTagForActive(
      active,
      session,
      schedSession,
      nowTime
    );
    applyDurationAndTotals(active, session, nowTime, endTag);

    autoEndedType = active.type;
    autoEndedEndTag = endTag;
  }

  let startTag = "--";
  if (shouldTag(type)) {
    if (type === "work") {
      const fullSched = (schedSession.fullSched || []) as ScheduleBlock[];
      const curWorkBlock = findContainingBlock(fullSched, "work", nowTime);

      if (curWorkBlock) {
        if (shouldMarkContinuedWork(nowTime, session, schedSession)) {
          startTag = "continued";
        } else {
          startTag = startTagText(nowTime, curWorkBlock.start);
        }
      } else {
        const nextWork = findNextBlockOfType(fullSched, "work", nowTime);
        if (nextWork) {
          startTag = startTagText(nowTime, nextWork.start);
        } else {
          const mealEnd = addHHMM(session.startMealTime, session.mealCredits);
          const anchor =
            hhmmToMin(nowTime) < hhmmToMin(mealEnd)
              ? session.scheduledStartTime
              : mealEnd;
          startTag = startTagText(nowTime, anchor);
        }
      }
    } else if (type === "meal") {
      startTag = startTagText(nowTime, session.startMealTime);
    } else {
      startTag = "good";
    }
  }

  const newEntry: IFullDTR = {
    type,
    startTime: nowTime,
    startTag,
    status: "active",
    duration: "00:00",
    ...(type === "system issue" ? { issue, reason } : {}),
    ...(type === "clinic break" ? { reason } : {}),
    ...(type === "on trip"
      ? {
        tripType,
        tripReason,
        tripCategory,
        halfDayType,
        approvalStatus: "pending",
      }
      : {}),
  };

  session.fullDTR.push(newEntry);

  session.fullDTR = sanitizeFullDTR(session.fullDTR);
  await (dtr as any).save();

  // Emit real-time update
  io.emit("dtr:update", { dtr: dtr as unknown as DTRDocLite });

  const message = `start ${type} successfully${autoEndedType ? ` and auto end ${autoEndedType}` : ""
    }`;

  return {
    message,
    startTime: nowTime,
    startTag,
    ...(autoEndedEndTag ? { endTag: autoEndedEndTag } : {}),
  };
}

/* ------------------------------ END ITEM -------------------------------- */
export async function endDTRItemService(
  input: EndDTRItemBodyInput & { now?: string }
): Promise<{ message: string; endedCount: number }> {
  const { userId, isSystemTimeout } = input;
  const targetDate = normalizeDate(input.date);
  const { hhmm: endTime } = nowHHMM(input.now);

  if (!userId) throw new ServiceError("userId is required", 400);

  const dtr = (await DTR.findOne({ userId, date: targetDate })) as any;
  if (!dtr) throw new ServiceError("DTR record not found for given date.", 404);

  const schedule = await Schedule.findOne({ userId, date: targetDate });
  if (!schedule)
    throw new ServiceError("Schedule not found for given date.", 404);

  const dtrDoc = dtr as unknown as DTRDocLite;
  const scheduleDoc = schedule as unknown as ScheduleDocLite;

  let endedCount = 0;

  for (let i = 0; i < dtrDoc.sessions.length; i++) {
    const session = dtrDoc.sessions[i];

    const activeIdx = [...session.fullDTR]
      .map((_, idx) => idx)
      .reverse()
      .find((idx) => session.fullDTR[idx].status === "active");

    if (activeIdx == null) continue;

    const active = session.fullDTR[activeIdx];
    const schedSession = scheduleDoc.sessions[i];

    // If system timeout, use special endTag, otherwise compute normally
    const endTag = isSystemTimeout
      ? `Auto-Ended at ${formatTimeTo12Hour(endTime)}`
      : computeEndTagForActive(
        active,
        session,
        schedSession,
        endTime
      );
    applyDurationAndTotals(active, session, endTime, endTag);
    endedCount++;
  }

  if (endedCount === 0) {
    throw new ServiceError("No active DTR session found to end.", 404);
  }

  for (const s of dtrDoc.sessions) {
    s.fullDTR = sanitizeFullDTR(s.fullDTR);
  }

  await (dtr as any).save();

  // Emit real-time update
  io.emit("dtr:update", { dtr: dtrDoc });

  // Trigger auto-scheduling for next day on session end (user timeout, system timeout, or auto timeout)
  const { autoScheduleNextForUser } = await import(
    "../schedule/autoSchedule.service"
  );
  autoScheduleNextForUser(userId, targetDate).catch((err) => {
    console.error("[endDTRItemService] Auto-schedule after timeout failed:", err);
  });

  return { message: "DTR session(s) ended successfully.", endedCount };
}

/* ----------------------- AUTO END ITEM SERVICE (with logs) ------------------------- */
export async function autoEndDTRItemService(input: {
  userId: string;
  date: string;
  now?: string;
}): Promise<{ message: string; autoEndedCount: number }> {
  const { userId } = input;
  if (!userId) throw new ServiceError("userId is required", 400);

  const targetDate = normalizeDate(input.date);
  const { hhmm: currentTime } = nowHHMM(input.now);
  const currentMin = hhmmToMin(currentTime);

  // Load DTR
  const dtr = await DTR.findOne({ userId, date: targetDate });
  if (!dtr) throw new ServiceError("DTR record not found for given date.", 404);

  let autoEndedCount = 0;


  for (let i = 0; i < dtr.sessions.length; i++) {
    const session = dtr.sessions[i];

    if (!session.scheduledEndTime) {
      console.log(
        `[CRON DEBUG] user=${userId}, session=${i} → No scheduledEndTime`
      );
      continue;
    }

    const schedEndMin = hhmmToMin(session.scheduledEndTime);

    console.log(
      `[CRON DEBUG] user=${userId}, session=${i}, schedEnd=${session.scheduledEndTime} (${schedEndMin}), current=${currentTime} (${currentMin})`
    );

    // REVISED LOGIC: "Auto-timeout 15 mins after scheduled end"
    // Use the window [schedEnd + 15, schedEnd + 60] to auto-timeout users
    // 15 minutes after their shift ends, with a 60-minute catch window.

    const startWindow = schedEndMin + 15;
    const endWindow = schedEndMin + 60;

    if (currentMin < startWindow || currentMin > endWindow) {
      // Outside the target window, do not auto-end
      /*
      console.log(
        `[CRON DEBUG] user=${userId}, session=${i} → Outside window [${startWindow}, ${endWindow}] (current=${currentMin})`
      );
      */
      continue;
    }

    const activeIdx = [...session.fullDTR]
      .map((_, idx) => idx)
      .reverse()
      .find((idx) => session.fullDTR[idx].status === "active");

    if (activeIdx == null) {
      console.log(
        `[CRON DEBUG] user=${userId}, session=${i} → No active entry found`
      );
      continue;
    }

    const active = session.fullDTR[activeIdx];

    console.log(
      `[CRON DEBUG] user=${userId}, session=${i} → Found active entry started at ${active.startTime}, auto-ending now`
    );

    const endTag = `Auto-Ended at ${formatTimeTo12Hour(currentTime)}`;
    applyDurationAndTotals(active, session, currentTime, endTag);

    active.status = "done";

    session.fullDTR = sanitizeFullDTR(session.fullDTR);
    autoEndedCount++;
  }

  if (autoEndedCount > 0) {
    dtr.markModified("sessions");
    await dtr.save();

    // Emit real-time update
    io.emit("dtr:update", { dtr: dtr as unknown as DTRDocLite });

    // Trigger auto-scheduling for next day on system auto-timeout
    const { autoScheduleNextForUser } = await import(
      "../schedule/autoSchedule.service"
    );
    autoScheduleNextForUser(userId, targetDate).catch((err) => {
      console.error("[autoEndDTRItemService] Auto-schedule after auto-end failed:", err);
    });

    console.log(
      `[CRON DEBUG] user=${userId} → Saved ${autoEndedCount} updates`
    );
  } else {
    console.log(`[CRON DEBUG] user=${userId} → No sessions auto-ended`);
  }

  return {
    message:
      autoEndedCount > 0
        ? `✅ Auto-ended ${autoEndedCount} active session(s) 15 minutes after scheduled end time.`
        : "ℹ️ No active sessions eligible for auto-end yet.",
    autoEndedCount,
  };
}

/* ------------------------------ GETTERS --------------------------------- */

export const getAllDTRsService = async (): Promise<DTRDocLite[]> => {
  try {
    return (await DTR.find({}).lean()) as unknown as DTRDocLite[];
  } catch {
    throw new ServiceError("Failed to fetch DTRs", 500);
  }
};

export const getDTRsByUserIdService = async (
  userId: string
): Promise<DTRDocLite[]> => {
  try {
    return (await DTR.find({ userId }).lean()) as unknown as DTRDocLite[];
  } catch {
    throw new ServiceError("Failed to fetch DTRs for user", 500);
  }
};

export const getDTRsByDateService = async (
  date: string
): Promise<DTRDocLite[]> => {
  try {
    return (await DTR.find({ date }).lean()) as unknown as DTRDocLite[];
  } catch {
    throw new ServiceError("Failed to fetch DTRs for date", 500);
  }
};

export const getDTRsByUserAndDateService = async (
  userId: string,
  date: string
): Promise<DTRDocLite[]> => {
  try {
    return (await DTR.find({ userId, date }).lean()) as unknown as DTRDocLite[];
  } catch {
    throw new ServiceError("Failed to fetch DTRs for user and date", 500);
  }
};

export async function getMyDTRByDateService(
  userId: string,
  date?: string,
  opts: { autoCreate?: boolean } = { autoCreate: true }
): Promise<DTRDocLite> {
  const targetDate = normalizeDate(date);
  if (!userId) throw new ServiceError("userId is required", 400);

  const existing = (await DTR.findOne({ userId, date: targetDate })) as any;
  if (existing) return existing as unknown as DTRDocLite;

  if (!opts.autoCreate) {
    throw new ServiceError("DTR not found for given date.", 404);
  }

  const schedule = await Schedule.findOne({ userId, date: targetDate });
  if (!schedule) {
    throw new ServiceError("Schedule not found for given date.", 404);
  }

  const scheduleDoc = schedule as unknown as ScheduleDocLite;
  const dtr = await ensureDTRForDate({
    userId,
    date: targetDate,
    scheduleDoc,
  });

  return dtr;
}

export async function getPendingTripsService() {
  const dtrs = await DTR.find({
    "sessions.fullDTR": {
      $elemMatch: {
        type: "on trip",
        approvalStatus: "pending",
      },
    },
  }).lean();

  const pendingTrips: any[] = [];

  // Collect all unique user IDs first
  const userIds = new Set<string>();
  dtrs.forEach((dtr: any) => {
    if (dtr.userId) {
      userIds.add(dtr.userId.toString());
    }
  });

  // Fetch all users in one query
  const users = await User.find({ _id: { $in: Array.from(userIds) } })
    .select("_id firstName lastName idNumber position")
    .lean();

  // Create a map for quick lookup
  const userMap = new Map(
    users.map((u: any) => [
      u._id.toString(),
      {
        _id: u._id.toString(),
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        idNumber: u.idNumber || "",
        position: Array.isArray(u.position) ? u.position[0] : u.position || "",
      },
    ])
  );

  dtrs.forEach((dtr: any) => {
    dtr.sessions.forEach((session: any, sessionIndex: number) => {
      session.fullDTR.forEach((entry: any, entryIndex: number) => {
        if (entry.type === "on trip" && entry.approvalStatus === "pending") {
          const userId = dtr.userId?.toString() || dtr.userId;
          const userObj = userMap.get(userId) || null;

          pendingTrips.push({
            dtrId: dtr._id.toString(),
            userId: userId,
            date: dtr.date,
            sessionIndex,
            entryIndex,
            entry: {
              type: entry.type,
              startTime: entry.startTime,
              endTime: entry.endTime,
              tripType: entry.tripType,
              tripReason: entry.tripReason,
              tripCategory: entry.tripCategory,
              halfDayType: entry.halfDayType,
              duration: entry.duration,
              status: entry.status,
              approvalStatus: entry.approvalStatus,
            },
            user: userObj,
          });
        }
      });
    });
  });

  return pendingTrips;
}
export async function updateTripApprovalService(input: {
  dtrId: string;
  sessionIndex: number;
  entryIndex: number;
  approvalStatus: "approved" | "rejected" | "converted";
}) {
  const { dtrId, sessionIndex, entryIndex, approvalStatus } = input;

  const dtr = await DTR.findById(dtrId);
  if (!dtr) {
    throw new ServiceError("DTR not found", 404);
  }

  const session = dtr.sessions[sessionIndex];
  if (!session) {
    throw new ServiceError("Session not found", 404);
  }

  const entry = session.fullDTR[entryIndex];
  if (!entry) {
    throw new ServiceError("Entry not found", 404);
  }

  // Ensure the entry is an "on trip" type if not converting
  if (entry.type !== "on trip" && approvalStatus !== "converted") {
    throw new ServiceError("Entry is not an on trip type", 400);
  }

  if (approvalStatus === "converted" || approvalStatus === "rejected") {
    // Convert to work (Time In)
    entry.type = "work";
    entry.status = "active";
    entry.startTag = approvalStatus === "rejected"
      ? "Trip rejected - Work continued"
      : "On trip cancelled - Work continued";
    delete entry.approvalStatus;
    delete entry.tripType;
    delete entry.tripReason;
    delete entry.tripCategory;
    delete entry.halfDayType;
    // Keep startTime
  } else {
    entry.approvalStatus = approvalStatus;

    if (approvalStatus === "approved") {
      // Calculate duration/credits if approved?
      // For now, simple approval

      // Calculate credit hours if needed
      // Logic from before:
      const creditDuration =
        entry.tripCategory === "Whole day" ? "08:00" : "04:00";

      // If trip has no endTime (pending start), we usually don't set duration yet?
      // But typically trip Credits are fixed.
      // DTR Tracking usually expects duration for stats.
      // Let's assume we set endTime = startTime + creditDuration for calculation?
      // Or just leave it active? 
      // Existing logic seems to imply it stays active or uses credit?
      // If updated via approval, we might want to "complete" it if it's a fixed duration

      if (!entry.endTime) {
        // Assuming startTime is set
        entry.endTime = addHHMM(entry.startTime || "00:00", creditDuration);
        entry.duration = creditDuration;
        entry.status = "done";
      }
    }
  }

  // Recalculate totals
  let totalWorkMin = 0;
  session.fullDTR.forEach((e: IFullDTR) => {
    if (e.type === "work" || e.type === "on trip") {
      if ((e.status === "done" || e.approvalStatus === "approved") && e.duration) {
        totalWorkMin += hhmmToMin(e.duration);
      }
    }
  });
  session.DTRTotalWork = minToHHMM(totalWorkMin);

  dtr.markModified("sessions");
  await dtr.save();

  // Emit real-time update
  io.emit("dtr:update", { dtr: dtr as unknown as DTRDocLite });

  return dtr;
}

export async function cancelTripService(input: {
  userId: string;
  date: string;
  convertToWork?: boolean;
}): Promise<{ message: string; dtr: DTRDocLite }> {
  const { userId, convertToWork } = input;
  const targetDate = normalizeDate(input.date);

  if (!userId) throw new ServiceError("userId is required", 400);

  const dtr = await DTR.findOne({ userId, date: targetDate });
  if (!dtr) {
    throw new ServiceError("DTR not found", 404);
  }

  let modified = false;

  // Iterate sessions
  dtr.sessions.forEach((session) => {
    if (convertToWork) {
      // Find pending trip and convert to work
      session.fullDTR.forEach((entry) => {
        if (entry.type === "on trip" && entry.approvalStatus === "pending") {
          entry.type = "work";
          entry.status = "active"; // Treat as currently timed-in
          entry.startTag = "On trip cancelled - Work continued";
          delete entry.approvalStatus;
          delete entry.tripType;
          delete entry.tripReason;
          delete entry.tripCategory;
          delete entry.halfDayType;
          modified = true;
        }
      });
    } else {
      // Remove pending trips
      const originalLength = session.fullDTR.length;
      session.fullDTR = session.fullDTR.filter(
        (entry) => !(entry.type === "on trip" && entry.approvalStatus === "pending")
      );
      if (session.fullDTR.length < originalLength) {
        modified = true;
      }
    }
  });

  if (!modified) {
    throw new ServiceError("No pending trip request found to processed", 404);
  }

  dtr.markModified("sessions");
  await dtr.save();

  // Emit real-time update
  io.emit("dtr:update", { dtr: dtr as unknown as DTRDocLite });

  return {
    message: convertToWork ? "Trip converted to time in successfully" : "Trip request cancelled successfully",
    dtr: dtr as unknown as DTRDocLite
  };
}
