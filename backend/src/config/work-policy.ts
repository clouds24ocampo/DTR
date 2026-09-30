// Single source of truth for position-based work policies.
// To change which positions get flexible time, set the FLEXIBLE_POSITIONS
// env var (comma-separated, e.g. "Software Engineer,Lead Developer").
// Frontend mirrors the default list in src/config/workPolicy.ts — keep in sync.

const DEFAULT_FLEXIBLE_TIME_POSITIONS = ["Software Engineer"];

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const envList = parseList(process.env.FLEXIBLE_POSITIONS);

export const FLEXIBLE_TIME_POSITIONS: string[] =
  envList.length > 0 ? envList : DEFAULT_FLEXIBLE_TIME_POSITIONS;

export function isFlexibleTimePosition(positions: unknown): boolean {
  const held = (Array.isArray(positions) ? positions : [positions])
    .map((p) => String(p ?? "").toLowerCase().trim())
    .filter(Boolean);
  if (held.length === 0) return false;
  return FLEXIBLE_TIME_POSITIONS.some((flex) =>
    held.includes(flex.toLowerCase().trim())
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
