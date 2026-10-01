// Single source of truth for position-based work policies (the frontend asks
// the backend, so there is nothing to keep in sync).
// Flexible time (no schedule / time-in window) applies to any position title
// matching FLEXIBLE_TITLE_PATTERN: developers, engineers, programmers, IT staff.
// To add exact extra titles, set FLEXIBLE_POSITIONS (comma-separated).

const FLEXIBLE_TITLE_PATTERN =
  /developer|engineer|programmer|\bit\b|information technology/i;

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const envList = parseList(process.env.FLEXIBLE_POSITIONS);

export const FLEXIBLE_TIME_POSITIONS: string[] = envList;

export function isFlexibleTimePosition(positions: unknown): boolean {
  const held = (Array.isArray(positions) ? positions : [positions])
    .map((p) => String(p ?? "").toLowerCase().trim())
    .filter(Boolean);
  if (held.length === 0) return false;
  return held.some(
    (p) =>
      FLEXIBLE_TITLE_PATTERN.test(p) ||
      FLEXIBLE_TIME_POSITIONS.some((flex) => flex.toLowerCase().trim() === p)
  );
}

// Default shift auto-provisioned on first clock-in for flexible-time staff.
// Defines work credits only — they may time in/out, break, and meal at any time.
export const DEFAULT_FLEX_SESSION = {
  label: "Day Shift",
  workCredits: "08:00",
  breakCredits: "01:00",
  breakCount: 2,
  mealCredits: "01:00",
  mealCount: 1,
  scheduledStartTime: "08:00",
  scheduledEndTime: "17:00",
  startMealTime: ["12:00"],
  fullSched: [
    { type: "work", start: "08:00", end: "12:00" },
    { type: "meal", start: "12:00", end: "13:00" },
    { type: "work", start: "13:00", end: "17:00" },
  ],
} as const;
