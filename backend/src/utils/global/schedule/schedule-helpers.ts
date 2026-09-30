import moment from "moment";
import type { ISession } from "../../../types/global/schedule/schedule.type";
import { isTime, lt, overlaps } from "./validation.utils";

export type FullSchedBlock = ISession["fullSched"][number];

export type GeneratedSchedule = {
  schedule: FullSchedBlock[];
  workCredits: string;
  breakCredits: string;
  mealCredits: string;
  breakCount: number;
  mealCount: number;
};

/* ------------------------------ Small utils ------------------------------ */

export function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function normalizeMealStarts(mealStartTimes: unknown): string[] {
  if (!Array.isArray(mealStartTimes)) return [];
  const valid = mealStartTimes
    .filter((x) => typeof x === "string" && isTime(x))
    .map((s: string) => moment(s, "HH:mm"))
    .map((m) => m.format("HH:mm"));
  return Array.from(new Set(valid)).sort();
}

export function deriveFirstMealStart(fullSched: FullSchedBlock[] = []): string {
  const firstMeal = fullSched.find((b) => b.type === "meal");
  return firstMeal ? firstMeal.start : "00:00";
}

export function assertValidTime(t: string, label = "time"): void {
  if (!isTime(t)) throw new Error(`Invalid ${label} (expected HH:mm): "${t}"`);
}

export function assertStartBeforeEnd(start: string, end: string): void {
  assertValidTime(start, "start");
  assertValidTime(end, "end");
  if (start === end) {
    throw new Error(
      `Start time (${start}) cannot be equal to end time (${end}).`
    );
  }
}

const BREAK_INTERVAL_MIN = 120;
const BREAK_DURATION_MIN = 15;
const MEAL_DURATION_MIN = 60;

/**
 * Builds work periods with breaks using a fixed schedule pattern for standard hours (08:00-17:00)
 * or dynamic breaks for other schedules.
 * 
 * Fixed pattern for standard 08:00-17:00 schedule with meal at 12:00:
 * - Morning (08:00-12:00): Work 08:00-10:00, Break 10:00-10:15, Work 10:15-12:00
 * - Afternoon (13:00-17:00): Work 13:00-15:00, Break 15:00-15:15, Work 15:15-17:00
 * 
 * For other schedules, breaks are added dynamically every 2 hours.
 */
function buildWorkWithBreaks(
  windowStart: string,
  windowEnd: string
): FullSchedBlock[] {
  const out: FullSchedBlock[] = [];
  const start = moment(windowStart, "HH:mm");
  let end = moment(windowEnd, "HH:mm");
  if (end.isSameOrBefore(start)) end.add(1, "day");

  // Morning shift pattern (pre-lunch): 05:00-11:00
  // Work 05:00-07:00, Break 07:00-07:15, Work 07:15-09:00, Break 09:00-09:15, Work 09:15-11:00
  if (windowStart === "05:00" && windowEnd === "11:00") {
    out.push(
      { type: "work", start: "05:00", end: "07:00" },
      { type: "break", start: "07:00", end: "07:15" },
      { type: "work", start: "07:15", end: "09:00" },
      { type: "break", start: "09:00", end: "09:15" },
      { type: "work", start: "09:15", end: "11:00" }
    );
    return out;
  }

  // Standard morning pattern: 08:00-12:00
  // Work 08:00-10:00, Break 10:00-10:15, Work 10:15-12:00
  if (windowStart === "08:00" && windowEnd === "12:00") {
    out.push(
      { type: "work", start: "08:00", end: "10:00" },
      { type: "break", start: "10:00", end: "10:15" },
      { type: "work", start: "10:15", end: "12:00" }
    );
    return out;
  }

  // Standard afternoon pattern: 13:00-17:00
  // Work 13:00-15:00, Break 15:00-15:15, Work 15:15-17:00
  if (windowStart === "13:00" && windowEnd === "17:00") {
    out.push(
      { type: "work", start: "13:00", end: "15:00" },
      { type: "break", start: "15:00", end: "15:15" },
      { type: "work", start: "15:15", end: "17:00" }
    );
    return out;
  }

  // For other schedules, use dynamic break intervals (every 2 hours)
  let cur = start.clone();
  while (cur.isBefore(end)) {
    const nextBreakStart = cur.clone().add(BREAK_INTERVAL_MIN, "minutes");

    if (nextBreakStart.isSameOrAfter(end)) {
      out.push({
        type: "work",
        start: cur.format("HH:mm"),
        end: end.format("HH:mm"),
      });
      break;
    }

    out.push({
      type: "work",
      start: cur.format("HH:mm"),
      end: nextBreakStart.format("HH:mm"),
    });

    const breakEnd = moment.min(
      nextBreakStart.clone().add(BREAK_DURATION_MIN, "minutes"),
      end
    );
    if (breakEnd.isAfter(nextBreakStart)) {
      out.push({
        type: "break",
        start: nextBreakStart.format("HH:mm"),
        end: breakEnd.format("HH:mm"),
      });
    }

    cur = breakEnd;
  }

  return out;
}

type OverlapOptions<T = any> = {
  groupBy?: (s: T) => string | undefined | null;
  ignoreUnkeyed?: boolean;
};

function inferDateStationKey(s: any): string | undefined {
  const date =
    s?.date ?? s?.sessionDate ?? s?.day ?? s?.scheduleDate ?? undefined;
  const station =
    s?.workstationId ??
    s?.stationId ??
    s?.stationName ??
    s?.workstationName ??
    undefined;
  if (!date || !station) return undefined;
  return `${String(date)}|${String(station)}`;
}

export function assertNoSessionOverlaps(
  sessions: Array<ISession & { [k: string]: any }>,
  opts?: OverlapOptions
): void {
  if (!Array.isArray(sessions) || sessions.length <= 1) return;

  const groupBy =
    opts?.groupBy ??
    ((s: any) => {
      return inferDateStationKey(s);
    });

  const buckets = new Map<string, Array<ISession & { [k: string]: any }>>();
  const unkeyed: Array<ISession & { [k: string]: any }> = [];
  let anyKey = false;

  for (const s of sessions) {
    const key = groupBy?.(s) ?? undefined;
    if (key) {
      anyKey = true;
      const arr = buckets.get(key) ?? [];
      arr.push(s);
      buckets.set(key, arr);
    } else {
      unkeyed.push(s);
    }
  }

  const ignoreUnkeyed = opts?.ignoreUnkeyed ?? (anyKey ? true : false);

  const checkBucket = (
    arr: Array<ISession & { [k: string]: any }>,
    label?: string
  ) => {
    if (arr.length <= 1) return;

    const sorted = [...arr].sort((a, b) =>
      a.scheduledStartTime.localeCompare(b.scheduledStartTime)
    );

    for (let i = 0; i < sorted.length; i++) {
      const A = sorted[i];
      assertValidTime(A.scheduledStartTime, "scheduledStartTime");
      assertValidTime(A.scheduledEndTime, "scheduledEndTime");
      assertStartBeforeEnd(A.scheduledStartTime, A.scheduledEndTime);

      for (let j = i + 1; j < sorted.length; j++) {
        const B = sorted[j];
        if (!lt(B.scheduledStartTime, A.scheduledEndTime)) break;

        if (
          overlaps(
            A.scheduledStartTime,
            A.scheduledEndTime,
            B.scheduledStartTime,
            B.scheduledEndTime
          )
        ) {
          const aId = (A as any)._id ? String((A as any)._id) : `#${i + 1}`;
          const bId = (B as any)._id ? String((B as any)._id) : `#${j + 1}`;
          const scope = label ? ` within ${label}` : "";
          throw new Error(
            `Session overlap${scope}: ${aId} [${A.scheduledStartTime}–${A.scheduledEndTime}] ` +
              `vs ${bId} [${B.scheduledStartTime}–${B.scheduledEndTime}]`
          );
        }
      }
    }
  };

  if (anyKey) {
    for (const [key, arr] of buckets.entries()) {
      checkBucket(arr, key);
    }
    if (!ignoreUnkeyed && unkeyed.length > 0) {
      checkBucket(unkeyed, "unkeyed");
    }
    return;
  }

  checkBucket(sessions);
}

export function assertNoOverlapsSameStationDate(
  sessions: Array<ISession & { [k: string]: any }>
): void {
  return assertNoSessionOverlaps(sessions, {
    groupBy: inferDateStationKey,
    ignoreUnkeyed: true,
  });
}

export function generateFullSchedule(
  start: string,
  end: string,
  mealStartTimes: string[] = []
): GeneratedSchedule {
  assertStartBeforeEnd(start, end);

  const s = moment(start, "HH:mm");
  let e = moment(end, "HH:mm");
  if (e.isSameOrBefore(s)) e.add(1, "day");

  // Normalize & clamp meal starts inside [start, end)
  const meals = normalizeMealStarts(mealStartTimes)
    .map((t) => {
      let m = moment(t, "HH:mm");
      if (m.isBefore(s)) m.add(1, "day");
      return m;
    })
    .filter((m) => m.isSameOrAfter(s) && m.isBefore(e))
    .sort((a, b) => a.diff(b));

  const schedule: FullSchedBlock[] = [];
  let cursor = s.clone();

  for (const mealStart of meals) {
    if (cursor.isBefore(mealStart)) {
      schedule.push(
        ...buildWorkWithBreaks(
          cursor.format("HH:mm"),
          mealStart.format("HH:mm")
        )
      );
    }

    const mealEnd = moment.min(
      mealStart.clone().add(MEAL_DURATION_MIN, "minutes"),
      e
    );
    if (mealEnd.isAfter(mealStart)) {
      schedule.push({
        type: "meal",
        start: mealStart.format("HH:mm"),
        end: mealEnd.format("HH:mm"),
      });
    }
    cursor = mealEnd;

    if (!cursor.isBefore(e)) break;
  }

  if (cursor.isBefore(e)) {
    schedule.push(
      ...buildWorkWithBreaks(cursor.format("HH:mm"), e.format("HH:mm"))
    );
  }

  let workMin = 0,
    breakMin = 0,
    mealMin = 0,
    breakCount = 0,
    mealCount = 0;
  for (const b of schedule) {
    const ms = moment(b.start, "HH:mm");
    let me = moment(b.end, "HH:mm");
    if (me.isSameOrBefore(ms)) me.add(1, "day");
    
    const mins = Math.max(0, me.diff(ms, "minutes"));
    if (b.type === "work") workMin += mins;
    if (b.type === "break") {
      breakMin += mins;
      breakCount += 1;
    }
    if (b.type === "meal") {
      mealMin += mins;
      mealCount += 1;
    }
  }

  return {
    schedule,
    workCredits: toHHMM(workMin),
    breakCredits: toHHMM(breakMin),
    mealCredits: toHHMM(mealMin),
    breakCount,
    mealCount,
  };
}

export function recomputeSessionDerivedFields(session: ISession): ISession {
  const mealStarts = normalizeMealStarts(session.startMealTime ?? []);
  const gen = generateFullSchedule(
    session.scheduledStartTime,
    session.scheduledEndTime,
    mealStarts
  );

  return {
    ...session,
    workCredits: gen.workCredits,
    breakCredits: gen.breakCredits,
    mealCredits: gen.mealCredits,
    breakCount: gen.breakCount,
    mealCount: gen.mealCount,
    startMealTime: mealStarts,
    fullSched: gen.schedule,
  };
}

export function mapSessionsToDTRSessions(
  sessionData: Array<
    Pick<
      ISession,
      | "label"
      | "workCredits"
      | "breakCredits"
      | "breakCount"
      | "mealCredits"
      | "mealCount"
      | "scheduledStartTime"
      | "scheduledEndTime"
      | "startMealTime"
      | "fullSched"
    >
  >
) {
  return sessionData.map((s) => ({
    label: s.label,
    workCredits: s.workCredits,
    breakCredits: s.breakCredits,
    breakCount: s.breakCount,
    mealCredits: s.mealCredits,
    mealCount: s.mealCount,
    DTRTotalWork: "00:00",
    DTRTotalBreak: "00:00",
    DTRTotalMeal: "00:00",
    scheduledStartTime: s.scheduledStartTime,
    scheduledEndTime: s.scheduledEndTime,
    startMealTime:
      Array.isArray(s.startMealTime) && s.startMealTime.length > 0
        ? s.startMealTime[0]
        : deriveFirstMealStart(s.fullSched),
    fullDTR: [],
  }));
}

export function assertValidFullSched(
  full: FullSchedBlock[] = [],
  winStart?: string,
  winEnd?: string
) {
  const toMin = (t: string) =>
    moment(t, "HH:mm").hours() * 60 + moment(t, "HH:mm").minutes();

  for (const b of full) {
    if (!isTime(b.start) || !isTime(b.end)) {
      throw new Error(
        `Invalid breakdown time: ${b.start}–${b.end} (expect HH:mm)`
      );
    }
    if (b.start === b.end) {
      throw new Error(`Breakdown start cannot be equal to end: ${b.start}–${b.end}`);
    }
    // Note: Overnight blocks allowed (start > end implies overnight)
    
    /* 
    if (winStart && lt(b.start, winStart)) {
      throw new Error(
        `Breakdown starts before session window: ${b.start} < ${winStart}`
      );
    }
    if (winEnd && lt(winEnd, b.end)) {
      throw new Error(
        `Breakdown ends after session window: ${b.end} > ${winEnd}`
      );
    }
    */
  }

  const sorted = [...full].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    const A = sorted[i - 1];
    const B = sorted[i];
    // Overlap check should handle overnight but simplistic here
    if (overlaps(A.start, A.end, B.start, B.end)) {
      throw new Error(
        `Breakdown overlaps: ${A.start}–${A.end} with ${B.start}–${B.end}`
      );
    }
  }
}

export function sortFullSchedByStart(
  full: FullSchedBlock[] = []
): FullSchedBlock[] {
  return [...full].sort((a, b) => a.start.localeCompare(b.start));
}

export function fitWindowToFullSched(
  full: FullSchedBlock[] = []
): { start: string; end: string } | null {
  if (!full.length) return null;
  const starts = full.map((b) => b.start).sort();
  const ends = full.map((b) => b.end).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

export function deriveMealStartsFromFull(
  full: FullSchedBlock[] = []
): string[] {
  return Array.from(
    new Set(
      full
        .filter((b) => b.type === "meal")
        .map((b) => moment(b.start, "HH:mm").format("HH:mm"))
    )
  ).sort();
}

export function recomputeDerivedFromFullSched(
  full: FullSchedBlock[] = []
): Pick<
  ISession,
  "workCredits" | "breakCredits" | "mealCredits" | "breakCount" | "mealCount"
> {
  let work = 0,
    brk = 0,
    meal = 0,
    breakCount = 0,
    mealCount = 0;

  for (const b of full) {
    const start = moment(b.start, "HH:mm");
    const end = moment(b.end, "HH:mm");
    const mins = Math.max(0, end.diff(start, "minutes"));
    if (b.type === "work") work += mins;
    if (b.type === "break") {
      brk += mins;
      breakCount++;
    }
    if (b.type === "meal") {
      meal += mins;
      mealCount++;
    }
  }

  return {
    workCredits: toHHMM(work),
    breakCredits: toHHMM(brk),
    mealCredits: toHHMM(meal),
    breakCount,
    mealCount,
  };
}
