import moment from "moment";

export const isDate = (date: string): boolean =>
  moment(date, "YYYY-MM-DD", true).isValid();

export const isTime = (time: string): boolean =>
  moment(time, "HH:mm", true).isValid();

export const lt = (time1: string, time2: string): boolean => {
  if (!isTime(time1) || !isTime(time2)) return false;
  const t1 = moment(time1, "HH:mm", true);
  const t2 = moment(time2, "HH:mm", true);
  return t1.isBefore(t2);
};

export const overlaps = (
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean => {
  if (
    !isTime(startTime1) ||
    !isTime(endTime1) ||
    !isTime(startTime2) ||
    !isTime(endTime2)
  ) {
    return false;
  }
  const start1 = moment(startTime1, "HH:mm", true);
  let end1 = moment(endTime1, "HH:mm", true);
  const start2 = moment(startTime2, "HH:mm", true);
  let end2 = moment(endTime2, "HH:mm", true);

  // Handle overnight shifts (if end < start, assume next day)
  if (end1.isBefore(start1)) end1.add(1, "day");
  if (end2.isBefore(start2)) end2.add(1, "day");

  return start1.isBefore(end2) && start2.isBefore(end1);
};

export const toYMD = (d: string | Date): string => {
  const m =
    typeof d === "string" ? moment(d, moment.ISO_8601, true) : moment(d);
  const safe = m.isValid() ? m : moment(d as string, "YYYY-MM-DD", true);
  const utc = safe.utc();
  return utc.isValid() ? utc.format("YYYY-MM-DD") : "";
};

const normalizeStation = (s?: string): string => (s ?? "").trim().toLowerCase();

export const overlapsIfSameStationAndDate = (args: {
  startA: string;
  endA: string;
  dateA: string | Date;
  stationA?: string;
  startB: string;
  endB: string;
  dateB: string | Date;
  stationB?: string;
}): boolean => {
  const dateA = toYMD(args.dateA);
  const dateB = toYMD(args.dateB);
  if (!dateA || !dateB || dateA !== dateB) return false;

  const stA = normalizeStation(args.stationA);
  const stB = normalizeStation(args.stationB);
  if (!stA || stA !== stB) return false;

  return overlaps(args.startA, args.endA, args.startB, args.endB);
};
