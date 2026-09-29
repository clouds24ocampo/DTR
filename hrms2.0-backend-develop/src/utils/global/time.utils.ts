import moment, { Moment } from "moment";

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const hhmmToMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const minToHHMM = (mins: number) => {
  const total = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad2(h)}:${pad2(m)}`;
};

export const diffMin = (aHHMM: string, bHHMM: string) =>
  hhmmToMin(aHHMM) - hhmmToMin(bHHMM);

/**
 * Duration in minutes from startHHMM to endHHMM.
 * When end is earlier than start in clock terms (e.g. 16:00 → 00:17),
 * treats the span as crossing midnight and returns the positive duration.
 * Use for DTR entry duration when shift spans two calendar days.
 */
export const durationMinBetween = (startHHMM: string, endHHMM: string): number => {
  const startMin = hhmmToMin(startHHMM);
  const endMin = hhmmToMin(endHHMM);
  if (endMin >= startMin) return endMin - startMin;
  return 24 * 60 - startMin + endMin;
};

export const addHHMM = (a: string, b: string) =>
  minToHHMM(hhmmToMin(a) + hhmmToMin(b));

export function normalizeDate(date?: string): string {
  return typeof date === "string" && date
    ? moment(date, "YYYY-MM-DD", true).format("YYYY-MM-DD")
    : moment().format("YYYY-MM-DD");
}

export function nowHHMM(now?: string): { now: Moment; hhmm: string } {
  const m = now ? moment(now, "HH:mm", true) : moment();
  return { now: m, hhmm: m.format("HH:mm") };
}

/**
 * Checks if current time is within 1 hour before the work start time
 * @param startTime - Work start time in HH:mm format
 * @param date - Work date in YYYY-MM-DD format
 * @returns true if current time is within 1 hour before work starts
 */
export function isWithinOneHourBefore(startTime: string, date: string): boolean {
  const workStartDateTime = moment(`${date}T${startTime}`, "YYYY-MM-DDTHH:mm", true);
  if (!workStartDateTime.isValid()) {
    return false;
  }
  
  const oneHourBefore = workStartDateTime.clone().subtract(1, "hour");
  const now = moment();
  
  // Must be at least 1 hour before work starts, but not after work starts
  return now.isSameOrAfter(oneHourBefore) && now.isBefore(workStartDateTime);
}

/**
 * Gets the number of minutes until work starts
 * @param startTime - Work start time in HH:mm format
 * @param date - Work date in YYYY-MM-DD format
 * @returns Number of minutes until work starts (negative if work has already started)
 */
export function getTimeUntilWorkStart(startTime: string, date: string): number {
  const workStartDateTime = moment(`${date}T${startTime}`, "YYYY-MM-DDTHH:mm", true);
  if (!workStartDateTime.isValid()) {
    return Infinity;
  }
  
  const now = moment();
  return workStartDateTime.diff(now, "minutes");
}

/**
 * Checks if work has already started
 * @param startTime - Work start time in HH:mm format
 * @param date - Work date in YYYY-MM-DD format
 * @returns true if current time is after or equal to work start time
 */
export function hasWorkStarted(startTime: string, date: string): boolean {
  const workStartDateTime = moment(`${date}T${startTime}`, "YYYY-MM-DDTHH:mm", true);
  if (!workStartDateTime.isValid()) {
    return false;
  }
  
  const now = moment();
  return now.isSameOrAfter(workStartDateTime);
}

/**
 * Checks if current time is before work starts (allows advance assignment)
 * @param startTime - Work start time in HH:mm format
 * @param date - Work date in YYYY-MM-DD format
 * @returns true if current time is before work starts
 */
export function isBeforeWorkStarts(startTime: string, date: string): boolean {
  const workStartDateTime = moment(`${date}T${startTime}`, "YYYY-MM-DDTHH:mm", true);
  if (!workStartDateTime.isValid()) {
    return false;
  }
  
  const now = moment();
  return now.isBefore(workStartDateTime);
}

/**
 * Calculates the number of working days (Mon-Fri) in the month of the given date.
 * @param dateInput - Date string or Moment object
 * @returns Number of working days in that month
 */
export function getWorkingDaysInMonth(dateInput: string | Moment): number {
  const date = moment(dateInput);
  const start = date.clone().startOf("month");
  const end = date.clone().endOf("month");
  let workingDays = 0;

  const current = start.clone();
  while (current.isSameOrBefore(end)) {
    const dayOfWeek = current.day();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    current.add(1, "day");
  }
  return workingDays;
}