// Mirror of backend src/config/work-policy.ts (single source of truth there).
// Used only for UI gating on the public clock — the backend always re-checks.
// Keep in sync with backend FLEXIBLE_POSITIONS.
export const FLEXIBLE_TIME_POSITIONS: string[] = ["Software Engineer"];

export function isFlexibleTimePosition(positions: unknown): boolean {
  const held = (Array.isArray(positions) ? positions : [positions])
    .map((p) => String(p ?? "").toLowerCase().trim())
    .filter(Boolean);
  if (held.length === 0) return false;
  return FLEXIBLE_TIME_POSITIONS.some((flex) =>
    held.includes(flex.toLowerCase().trim())
  );
}
