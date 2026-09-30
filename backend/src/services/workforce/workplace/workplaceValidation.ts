import { ServiceError } from "../../../utils/global/error";
import { isDate, isTime } from "../../../utils/global/schedule/validation.utils";

/** Roles that may be assigned at workplace level (no fixed station). */
export const AGENT_ROLES = ["Frontline / Agent Roles", "Specialized Agent Roles"];

/** `position` is a role array (legacy records may hold a single string). */
export const hasAgentRole = (position: unknown): boolean =>
  ([] as unknown[]).concat(position ?? []).some((p) => AGENT_ROLES.includes(String(p)));

/** Returns the trimmed YYYY-MM-DD date or throws a 400. */
export const requireDate = (date: unknown): string => {
  if (typeof date !== "string" || !date.trim()) {
    throw new ServiceError("Date must be a non-empty string in YYYY-MM-DD format", 400);
  }
  const trimmed = date.trim();
  if (!isDate(trimmed)) {
    throw new ServiceError(`Valid date (YYYY-MM-DD) required. Received: "${trimmed}"`, 400);
  }
  return trimmed;
};

/** Overnight shifts are allowed (start > end); only zero-length shifts are rejected. */
export const assertTimeRange = (start: unknown, end: unknown): void => {
  if (typeof start !== "string" || typeof end !== "string" || !isTime(start) || !isTime(end)) {
    throw new ServiceError("Invalid time format (HH:mm)", 400);
  }
  if (start === end) {
    throw new ServiceError("scheduledEndTime cannot be equal to scheduledStartTime", 400);
  }
};

/** Validates meal start times against the shift window; returns them de-duplicated and sorted. */
export const parseMealTimes = (meals: unknown, start: string, end: string): string[] => {
  if (typeof meals === "undefined") return [];
  if (!Array.isArray(meals)) {
    throw new ServiceError("startMealTime must be an array of HH:mm strings", 400);
  }
  if (!meals.every((t) => typeof t === "string" && isTime(t))) {
    throw new ServiceError("Invalid startMealTime entries (HH:mm)", 400);
  }
  const sorted = Array.from(new Set(meals.map(String))).sort();
  const overnight = start > end;
  const bad = sorted.find((t) =>
    overnight ? !(t >= start || t < end) : !(t >= start && t < end)
  );
  if (bad) {
    throw new ServiceError(
      `Meal time ${bad} must be within the scheduled window (${start}–${end})`,
      400
    );
  }
  return sorted;
};
