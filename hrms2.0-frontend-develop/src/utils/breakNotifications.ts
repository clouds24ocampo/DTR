import { DTRType } from "../types/global/dtr/dtr.type";

export type BreakNotificationEvent = {
  type: DTRType;
  timestamp: number;
  elapsedSeconds: number;
};

export type BreakNotificationOptions = {
  mealTotalSeconds?: number;
};

export const isDev = () => process.env.NODE_ENV === "development";

export const toSeconds = (hhmm: string): number => {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr || 0);
  const m = Number(mStr || 0);
  return h * 3600 + m * 60;
};

export const secondsSinceStart = (startHHMM: string, now: Date = new Date()): number => {
  const [hStr, mStr] = startHHMM.split(":");
  const startH = Number(hStr || 0);
  const startM = Number(mStr || 0);
  const start = new Date(now);
  start.setHours(startH, startM, 0, 0);
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
};

export const shouldNotifyForBreak = (
  type: DTRType,
  elapsedSeconds: number,
  opts: BreakNotificationOptions = {}
): boolean => {
  if (elapsedSeconds < 0) return false;
  // "breaktime" → type === "break"
  if (type === "break") {
    // Only when elapsed ≥ 14 min and every 20s
    if (elapsedSeconds < 14 * 60) return false;
    return elapsedSeconds % 20 === 0;
  }
  // "lunch break" → type === "meal"
  if (type === "meal") {
    const total = opts.mealTotalSeconds ?? 0;
    if (total <= 0) return false;
    // Only during final 5 minutes and every 60s
    const windowStart = total - 5 * 60;
    if (elapsedSeconds < windowStart || elapsedSeconds >= total) return false;
    return elapsedSeconds % 60 === 0;
  }
  // Other break types: bio-break, clinic break → every 120s
  if (type === "bio-break" || type === "clinic break") {
    return elapsedSeconds % 120 === 0;
  }
  // Non-break actions do not notify
  return false;
};

export const getNextNotificationDelay = (
  type: DTRType,
  elapsedSeconds: number,
  opts: BreakNotificationOptions = {}
): number | null => {
  if (elapsedSeconds < 0) return null;
  if (type === "break") {
    if (elapsedSeconds < 14 * 60) {
      return (14 * 60 - elapsedSeconds) * 1000;
    }
    const remainder = elapsedSeconds % 20;
    return (20 - remainder) * 1000;
  }
  if (type === "meal") {
    const total = opts.mealTotalSeconds ?? 0;
    if (total <= 0) return null;
    const windowStart = total - 5 * 60;
    if (elapsedSeconds >= total) return null;
    if (elapsedSeconds < windowStart) {
      return (windowStart - elapsedSeconds) * 1000;
    }
    const remainder = elapsedSeconds % 60;
    return (60 - remainder) * 1000;
  }
  if (type === "bio-break" || type === "clinic break") {
    const remainder = elapsedSeconds % 120;
    return (120 - remainder) * 1000;
  }
  return null;
};

export type BreakSchedulerParams = {
  type: DTRType | null;
  startHHMM?: string;
  isActive: boolean;
  mealTotalSeconds?: number;
  onNotify: () => void;
  onLog?: (e: BreakNotificationEvent) => void;
};

export class BreakNotificationTimer {
  private timerId: number | null = null;
  clear() {
    if (this.timerId != null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
  schedule(delayMs: number, fn: () => void) {
    this.clear();
    this.timerId = (setTimeout(fn, delayMs) as unknown) as number;
  }
}

export const focusWindow = () => {
  try {
    window.focus();
  } catch {}
};

