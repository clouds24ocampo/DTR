// src/utils/dtr.utils.ts
import {
  Clock,
  Coffee,
  MapPin,
  Pause,
  Play,
  StopCircle,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/** Canonicalize variants so mappings stay simple */
export const normalizeDtrType = (type?: string): string => {
  const t = (type || "").toLowerCase().trim();
  if (t === "system issue") return "system-issue";
  if (t === "clinic break") return "bio-break";
  if (t === "on trip") return "on-trip";
  return t;
};

/** Parse HH:mm to minutes since midnight */
export const hhmmToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map((n) => Number(n) || 0);
  return h * 60 + m;
};

/** Duration in minutes from start to end; if end < start, treats as cross-midnight (e.g. 16:00 → 00:17). */
export const durationMinutesBetween = (startHHMM: string, endHHMM: string): number => {
  const startMin = hhmmToMinutes(startHHMM);
  const endMin = hhmmToMinutes(endHHMM);
  if (endMin >= startMin) return endMin - startMin;
  return 24 * 60 - startMin + endMin;
};

/** Format total minutes as HH:mm */
export const minutesToHHMM = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** 'HH:mm' -> 'xh ym' or '0 min' */
export const formatDuration = (duration?: string): string => {
  if (!duration || duration === "00:00") return "0 min";
  const [h, m] = duration.split(":").map((n) => Number(n) || 0);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const pluralize = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

/** Tailwind classes per DTR entry type */
export const getDtrTypeClasses = (type?: string): string => {
  switch (normalizeDtrType(type)) {
    case "work":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "break":
      return "bg-yellow-50 text-yellow-800 border-yellow-200";
    case "meal":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "bio-break":
      return "bg-orange-50 text-orange-800 border-orange-200";
    case "system-issue":
      return "bg-red-50 text-red-800 border-red-200";
    case "on-trip":
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    default:
      return "bg-gray-50 text-gray-800 border-gray-200";
  }
};

/** Icon per DTR entry type (returns a component, not JSX) */
export const getDtrIcon = (type?: string): LucideIcon => {
  switch (normalizeDtrType(type)) {
    case "work":
      return Play;
    case "break":
      return Coffee;
    case "meal":
      return Utensils;
    case "bio-break":
      return Pause;
    case "system-issue":
      return StopCircle;
    case "on-trip":
      return MapPin;
    default:
      return Clock;
  }
};
