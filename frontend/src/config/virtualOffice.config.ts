/**
 * Virtual Office – single source of truth
 * Aligned with: Clock In/Out actions, office zones, and movement logic.
 *
 * Requirements (from prompts):
 * - Time In: spawn at entrance → walk to assigned desk → sit (Working)
 * - Break: walk to cafeteria/lounge → sit (On Break)
 * - Meal: walk to cafeteria → sit + eating (Meal Break)
 * - Bio Break: walk to restroom (Bio Break)
 * - Clinic Break: walk to clinic → sit (Clinic Break)
 * - On Trip: walk to exit → disappear (On Trip)
 * - Time Out: stand → walk to exit → leave (Offline)
 */

export type OfficeAction =
  | "work"
  | "break"
  | "meal"
  | "bio-break"
  | "clinic-break"
  | "on-trip"
  | "timeout";

export type ZoneId =
  | "entrance"
  | "work-area"
  | "cafeteria"
  | "lounge"
  | "restroom"
  | "clinic"
  | "meeting"
  | "outside";

export type AvatarBehavior = "idle" | "walking" | "sitting" | "eating";

export type TilePoint = { x: number; y: number };

/** Display label for each action (for UI and status) */
export const OFFICE_ACTION_LABELS: Record<OfficeAction, string> = {
  work: "Time In",
  break: "Break",
  meal: "Meal",
  "bio-break": "Bio Break",
  "clinic-break": "Clinic Break",
  "on-trip": "On Trip",
  timeout: "Time Out",
};

/** Status text shown above avatar */
export const OFFICE_STATUS_LABELS: Record<OfficeAction, string> = {
  work: "Working",
  break: "On Break",
  meal: "Meal Break",
  "bio-break": "Bio Break",
  "clinic-break": "Clinic Break",
  "on-trip": "On Trip",
  timeout: "Offline",
};

/** Map: action → zone, behavior, and visibility */
export const ACTION_TO_ZONE: Record<
  OfficeAction,
  { zone: ZoneId; behavior: AvatarBehavior; visible: boolean }
> = {
  work: { zone: "work-area", behavior: "sitting", visible: true },
  break: { zone: "cafeteria", behavior: "sitting", visible: true },
  meal: { zone: "cafeteria", behavior: "eating", visible: true },
  "bio-break": { zone: "restroom", behavior: "idle", visible: true },
  "clinic-break": { zone: "clinic", behavior: "sitting", visible: true },
  "on-trip": { zone: "outside", behavior: "idle", visible: false },
  timeout: { zone: "outside", behavior: "idle", visible: false },
};

/** Map dimensions */
export const TILE_SIZE = 16;
export const MAP_WIDTH = 30;
export const MAP_HEIGHT = 22;

/** Assigned desk seats (work-area). Index by employee hash. */
export const DESK_TILES: TilePoint[] = [
  { x: 8, y: 9 },
  { x: 10, y: 9 },
  { x: 12, y: 9 },
  { x: 14, y: 9 },
  { x: 8, y: 12 },
  { x: 10, y: 12 },
  { x: 12, y: 12 },
  { x: 14, y: 12 },
];

/** Zone definitions: label + target tiles (where avatar stands/sits) */
export const OFFICE_ZONES: Record<
  ZoneId,
  { label: string; targetTiles: TilePoint[]; defaultBehavior: AvatarBehavior }
> = {
  entrance: {
    label: "Entrance",
    targetTiles: [{ x: 2, y: 20 }, { x: 3, y: 20 }],
    defaultBehavior: "idle",
  },
  "work-area": {
    label: "Work Area",
    targetTiles: DESK_TILES,
    defaultBehavior: "sitting",
  },
  cafeteria: {
    label: "Cafeteria",
    targetTiles: [{ x: 23, y: 17 }, { x: 25, y: 17 }, { x: 24, y: 18 }],
    defaultBehavior: "sitting",
  },
  lounge: {
    label: "Lounge",
    targetTiles: [{ x: 4, y: 19 }, { x: 5, y: 19 }],
    defaultBehavior: "sitting",
  },
  restroom: {
    label: "Restroom",
    targetTiles: [{ x: 2, y: 3 }, { x: 3, y: 3 }],
    defaultBehavior: "idle",
  },
  clinic: {
    label: "Clinic",
    targetTiles: [{ x: 26, y: 4 }, { x: 27, y: 4 }],
    defaultBehavior: "sitting",
  },
  meeting: {
    label: "Meeting",
    targetTiles: [{ x: 4, y: 19 }, { x: 5, y: 19 }],
    defaultBehavior: "sitting",
  },
  outside: {
    label: "Outside",
    targetTiles: [{ x: 1, y: 20 }],
    defaultBehavior: "idle",
  },
};

/** Normalize API/socket action string to OfficeAction */
export function normalizeAction(value: string | undefined): OfficeAction {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "work" || raw === "time in" || raw === "timein") return "work";
  if (raw === "break") return "break";
  if (raw === "meal") return "meal";
  if (raw === "bio-break" || raw === "bio break") return "bio-break";
  if (raw === "clinic-break" || raw === "clinic break") return "clinic-break";
  if (raw === "on-trip" || raw === "on trip") return "on-trip";
  if (raw === "timeout" || raw === "time out" || raw === "time-out") return "timeout";
  return "work";
}

/** Normalize zone string; fallback from action */
export function normalizeZone(value: string | undefined, action: OfficeAction): ZoneId {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw.includes("entrance")) return "entrance";
  if (raw.includes("work")) return "work-area";
  if (raw.includes("cafeteria")) return "cafeteria";
  if (raw.includes("lounge")) return "lounge";
  if (raw.includes("restroom")) return "restroom";
  if (raw.includes("clinic")) return "clinic";
  if (raw.includes("meeting")) return "meeting";
  if (raw.includes("outside") || raw.includes("exit")) return "outside";
  return ACTION_TO_ZONE[action].zone;
}

/** Stable index from employee id for desk/seat assignment */
export function hashId(value: string): number {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/** Get status label for an action */
export function getStatusForAction(action: OfficeAction): string {
  return OFFICE_STATUS_LABELS[action];
}

/** Pick destination tile for a zone (and optional employeeId for work-area desk) */
export function pickDestinationTile(
  zone: ZoneId,
  employeeId?: string
): TilePoint {
  if (zone === "work-area" && employeeId != null) {
    return DESK_TILES[hashId(employeeId) % DESK_TILES.length];
  }
  const tiles = OFFICE_ZONES[zone].targetTiles;
  const idx = employeeId != null ? hashId(employeeId) % tiles.length : 0;
  return tiles[idx];
}
