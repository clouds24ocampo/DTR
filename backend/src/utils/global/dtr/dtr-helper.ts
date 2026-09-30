import moment from "moment";
import {
  DTRType,
  ScheduleBlock,
  SessionTimingLike,
} from "src/types/global/dtr/dtr.type";
import { addHHMM, diffMin, pad2 } from "../time.utils";

export function assertNotNull<T>(
  val: T | null | undefined,
  msg: string
): asserts val is T {
  if (val === null || val === undefined) throw new Error(msg);
}

// Helper function to format minutes to readable format (e.g., "1 hours and 23 minutes" or "23 minutes")
const formatMinutesToReadable = (minutes: number): string => {
  const absMinutes = Math.abs(minutes);
  if (absMinutes < 60) {
    return `${absMinutes} minute${absMinutes !== 1 ? "s" : ""}`;
  }
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""} and ${mins} minute${mins !== 1 ? "s" : ""}`;
};

// Helper function to convert 24-hour time (HH:mm) to 12-hour format (h:mm AM/PM)
export const formatTimeTo12Hour = (hhmm: string): string => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? "AM" : "PM";
  const mins = minutes.toString().padStart(2, "0");
  return `${hour12}:${mins} ${ampm}`;
};

export const startTagText = (actual: string, anchor: string) => {
  const d = diffMin(actual, anchor);
  if (d === 0) return "good";
  const absMinutes = Math.abs(d);
  if (d < 0) return `Early ${formatMinutesToReadable(absMinutes)}`;
  return `Late ${formatMinutesToReadable(absMinutes)}`;
};

export const endTagText = (actualEnd: string, expectedEnd: string) => {
  const d = diffMin(actualEnd, expectedEnd);
  if (d === 0) return "good";
  const absMinutes = Math.abs(d);
  if (d < 0) return `Undertime ${formatMinutesToReadable(absMinutes)}`;
  return `Overtime ${formatMinutesToReadable(absMinutes)}`;
};

export const TAGGED_TYPES: DTRType[] = ["work", "break", "meal"];
export const shouldTag = (t: DTRType) => TAGGED_TYPES.includes(t);

export const pickSessionIndexForNow = (schedule: any, now: moment.Moment) => {
  const idx = schedule.sessions.findIndex((s: any) => {
    const a = moment(s.scheduledStartTime, "HH:mm");
    const b = moment(s.scheduledEndTime, "HH:mm");
    return now.isBetween(a, b, undefined, "[]");
  });
  return idx >= 0 ? idx : Math.max(0, schedule.sessions.length - 1);
};

export const deriveMealStartTime = (sess: any): string => {
  const meal = (sess.fullSched || []).find((x: any) => x.type === "meal");
  return meal ? moment(meal.start, "HH:mm").format("HH:mm") : "00:00";
};

export const findContainingBlock = (
  fullSched: ScheduleBlock[] = [],
  type: string,
  timeHHMM: string
): ScheduleBlock | null => {
  const t = moment(timeHHMM, "HH:mm");
  for (const block of fullSched) {
    if (block.type !== type) continue;
    const s = moment(block.start, "HH:mm");
    const e = moment(block.end, "HH:mm");
    if (t.isBetween(s, e, undefined, "[]")) return block;
  }
  return null;
};

export const computeExpectedEnd = (
  type: DTRType,
  startTime: string,
  session: SessionTimingLike,
  fullSched?: ScheduleBlock[] | null
): string => {
  const block = fullSched
    ? findContainingBlock(fullSched, type, startTime)
    : null;
  if (block) return block.end;

  switch (type) {
    case "work": {
      const isBeforeOrAtMeal = diffMin(startTime, session.startMealTime) <= 0;
      return isBeforeOrAtMeal
        ? session.startMealTime
        : session.scheduledEndTime;
    }
    case "meal": {
      return addHHMM(session.startMealTime, session.mealCredits);
    }
    case "break":
    case "bio-break":
    case "system issue":
    case "clinic break":
    case "on trip": {
      return addHHMM(startTime, session.breakCredits);
    }
    default:
      return addHHMM(startTime, "00:00");
  }
};
