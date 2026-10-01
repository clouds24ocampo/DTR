import type { DTRDocLite } from "../../types/global/dtr/dtr.type";

/** "HH:mm" -> minutes ("" / bad input -> 0). */
export const toMin = (hhmm?: string): number => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** minutes -> "4h 30m" ("—" when zero). */
export const fmtDuration = (min: number): string =>
  min <= 0 ? "—" : `${Math.floor(min / 60)}h ${min % 60}m`;

export type DaySummary = {
  date: string;
  timeIn?: string;
  timeOut?: string;
  active: boolean;
  workMin: number;
  breakMin: number;
  late: boolean;
  overtime: boolean;
  hasEntries: boolean;
};

/** Collapse one DTR document into the numbers the UI shows. `nowHHMM` adds the running work segment. */
export function summarizeDay(d: DTRDocLite, nowHHMM?: string): DaySummary {
  const entries = d.sessions.flatMap((s) => s.fullDTR ?? []);
  const work = entries.filter((e) => (e.type || "").toLowerCase() === "work");
  const running = work.find((e) => e.status === "active");
  const last = [...work].reverse().find((e) => e.endTime);

  let workMin = d.sessions.reduce((n, s) => n + toMin(s.DTRTotalWork), 0);
  if (running && nowHHMM) workMin += Math.max(0, toMin(nowHHMM) - toMin(running.startTime));

  return {
    date: d.date,
    timeIn: work[0]?.startTime,
    timeOut: last?.endTime,
    active: Boolean(running),
    workMin,
    breakMin: d.sessions.reduce((n, s) => n + toMin(s.DTRTotalBreak) + toMin(s.DTRTotalMeal), 0),
    late: entries.some((e) => e.startTag?.toLowerCase().includes("late")),
    overtime: entries.some((e) => e.endTag?.toLowerCase().includes("overtime")),
    hasEntries: entries.length > 0,
  };
}
