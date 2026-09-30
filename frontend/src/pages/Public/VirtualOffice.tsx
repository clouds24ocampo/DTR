/**
 * Virtual Office – React + Phaser + Socket.io
 *
 * Design (from your prompts):
 * - Trigger: "Virtual Office" button on time tracking (PublicClock) → this page.
 * - On action (Time In, Break, Meal, etc.): avatar walks point-to-point to the right zone.
 * - Time In: spawn at entrance → walk to assigned desk → sit (Working).
 * - Break/Meal: walk to cafeteria → sit (On Break / Meal Break with eating animation).
 * - Bio/Clinic: walk to restroom/clinic → idle/sit.
 * - On Trip / Time Out: walk to exit → disappear (Offline/On Trip).
 * - Multiplayer: others see movements in real time; status above each avatar.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";
import { io, type Socket } from "socket.io-client";
import axiosInstance from "../../axios/axiosInstance";
import useAuthStore from "../../stores/auth/auth.store";
import {
  type OfficeAction,
  type ZoneId,
  type AvatarBehavior,
  type TilePoint,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  DESK_TILES,
  OFFICE_ZONES,
  ACTION_TO_ZONE,
  OFFICE_ACTION_LABELS,
  normalizeAction,
  normalizeZone,
  hashId,
  pickDestinationTile,
  getStatusForAction,
} from "../../config/virtualOffice.config";

type PlayerSnapshot = {
  employeeId: string;
  name: string;
  action: OfficeAction;
  status: string;
  zone: ZoneId;
  x: number;
  y: number;
  visible: boolean;
  behavior: AvatarBehavior;
  lastUpdate: number;
};

type OfficeActionEvent = {
  employeeId: string;
  name?: string;
  action: string;
  destinationZone?: string;
};

type OfficeStatusResponse = {
  employeeId: string;
  currentAction?: string;
  currentZone?: string;
};

type OfficePlayerResponse = {
  employeeId: string;
  name?: string;
  currentAction?: string;
  currentZone?: string;
  avatar?: string;
};

const MAP_INDEX = {
  FLOOR: 0,
  WALL: 1,
  DESK: 2,
  ZONE: 3,
} as const;

function toPixels(point: TilePoint): { x: number; y: number } {
  return {
    x: point.x * TILE_SIZE + TILE_SIZE / 2,
    y: point.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

function toTile(x: number, y: number): TilePoint {
  return {
    x: Math.max(0, Math.min(MAP_WIDTH - 1, Math.floor(x / TILE_SIZE))),
    y: Math.max(0, Math.min(MAP_HEIGHT - 1, Math.floor(y / TILE_SIZE))),
  };
}

function buildMapData(): { map: number[][]; walkable: boolean[][] } {
  const map: number[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => MAP_INDEX.WALL)
  );

  const floorRanges: Array<{ y: number; start: number; end: number }> = [
    { y: 1, start: 9, end: 20 },
    { y: 2, start: 2, end: 27 },
    { y: 3, start: 1, end: 28 },
    { y: 4, start: 1, end: 28 },
    { y: 5, start: 1, end: 28 },
    { y: 6, start: 1, end: 28 },
    { y: 7, start: 1, end: 28 },
    { y: 8, start: 1, end: 28 },
    { y: 9, start: 1, end: 28 },
    { y: 10, start: 1, end: 28 },
    { y: 11, start: 1, end: 28 },
    { y: 12, start: 1, end: 28 },
    { y: 13, start: 2, end: 28 },
    { y: 14, start: 2, end: 28 },
    { y: 15, start: 2, end: 28 },
    { y: 16, start: 2, end: 28 },
    { y: 17, start: 2, end: 28 },
    { y: 18, start: 2, end: 28 },
    { y: 19, start: 3, end: 27 },
    { y: 20, start: 4, end: 26 },
  ];

  floorRanges.forEach(({ y, start, end }) => {
    for (let x = start; x <= end; x += 1) {
      if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
        map[y][x] = MAP_INDEX.FLOOR;
      }
    }
  });

  const deskBlocks: TilePoint[] = [
    { x: 6, y: 8 }, { x: 7, y: 8 }, { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 },
    { x: 11, y: 8 }, { x: 12, y: 8 }, { x: 13, y: 8 }, { x: 14, y: 8 }, { x: 15, y: 8 },
    { x: 6, y: 11 }, { x: 7, y: 11 }, { x: 8, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 11 },
    { x: 11, y: 11 }, { x: 12, y: 11 }, { x: 13, y: 11 }, { x: 14, y: 11 }, { x: 15, y: 11 },
    { x: 22, y: 16 }, { x: 23, y: 16 }, { x: 24, y: 16 }, { x: 25, y: 16 }, { x: 26, y: 16 },
    { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 26, y: 3 }, { x: 27, y: 3 },
  ];
  deskBlocks.forEach((point) => {
    map[point.y][point.x] = MAP_INDEX.DESK;
  });

  const zoneMarkers: TilePoint[] = [
    ...OFFICE_ZONES.entrance.targetTiles,
    ...OFFICE_ZONES.cafeteria.targetTiles,
    ...OFFICE_ZONES.restroom.targetTiles,
    ...OFFICE_ZONES.clinic.targetTiles,
    ...OFFICE_ZONES.meeting.targetTiles,
  ];
  zoneMarkers.forEach((point) => {
    map[point.y][point.x] = MAP_INDEX.ZONE;
  });

  const walkable = map.map((row) => row.map((tile) => tile !== MAP_INDEX.WALL && tile !== MAP_INDEX.DESK));
  DESK_TILES.forEach((deskTile) => {
    walkable[deskTile.y][deskTile.x] = true;
  });
  (Object.keys(OFFICE_ZONES) as ZoneId[]).forEach((zoneId) => {
    OFFICE_ZONES[zoneId].targetTiles.forEach((tile) => {
      if (tile.y >= 0 && tile.y < MAP_HEIGHT && tile.x >= 0 && tile.x < MAP_WIDTH) {
        walkable[tile.y][tile.x] = true;
      }
    });
  });

  return { map, walkable };
}

function manhattanDistance(a: TilePoint, b: TilePoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(start: TilePoint, end: TilePoint, walkable: boolean[][]): TilePoint[] {
  if (start.x === end.x && start.y === end.y) return [start];
  const startKey = `${start.x},${start.y}`;
  const endKey = `${end.x},${end.y}`;
  const openSet = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const fScore = new Map<string, number>([[startKey, manhattanDistance(start, end)]]);

  const neighbors = (point: TilePoint): TilePoint[] => {
    const deltas = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    return deltas
      .map((delta) => ({ x: point.x + delta.x, y: point.y + delta.y }))
      .filter(
        (candidate) =>
          candidate.x >= 0 &&
          candidate.x < MAP_WIDTH &&
          candidate.y >= 0 &&
          candidate.y < MAP_HEIGHT &&
          walkable[candidate.y][candidate.x]
      );
  };

  while (openSet.size > 0) {
    let currentKey = "";
    let currentScore = Number.POSITIVE_INFINITY;
    openSet.forEach((key) => {
      const score = fScore.get(key) ?? Number.POSITIVE_INFINITY;
      if (score < currentScore) {
        currentScore = score;
        currentKey = key;
      }
    });

    if (currentKey === endKey) {
      const path: TilePoint[] = [];
      let key = currentKey;
      while (key) {
        const [x, y] = key.split(",").map(Number);
        path.unshift({ x, y });
        key = cameFrom.get(key) ?? "";
      }
      return path;
    }

    openSet.delete(currentKey);
    const [currentX, currentY] = currentKey.split(",").map(Number);
    const current = { x: currentX, y: currentY };
    const currentG = gScore.get(currentKey) ?? Number.POSITIVE_INFINITY;

    neighbors(current).forEach((neighbor) => {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      const tentativeG = currentG + 1;
      if (tentativeG < (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + manhattanDistance(neighbor, end));
        openSet.add(neighborKey);
      }
    });
  }

  return [start];
}

function findFallbackPath(
  start: TilePoint,
  end: TilePoint,
  walkable: boolean[][]
): TilePoint[] {
  const path: TilePoint[] = [{ ...start }];
  let cx = start.x;
  let cy = start.y;

  const isWalkable = (p: TilePoint) =>
    p.x >= 0 &&
    p.x < MAP_WIDTH &&
    p.y >= 0 &&
    p.y < MAP_HEIGHT &&
    walkable[p.y][p.x];

  while (cx !== end.x || cy !== end.y) {
    const nextTiles: TilePoint[] = [];
    if (cx !== end.x) nextTiles.push({ x: cx + (end.x > cx ? 1 : -1), y: cy });
    if (cy !== end.y) nextTiles.push({ x: cx, y: cy + (end.y > cy ? 1 : -1) });
    const next = nextTiles.find(isWalkable) ?? nextTiles[0];
    if (!next || (next.x === cx && next.y === cy)) break;
    cx = next.x;
    cy = next.y;
    path.push({ x: cx, y: cy });
    if (path.length > MAP_WIDTH * MAP_HEIGHT) break;
  }
  return path;
}

type AvatarBundle = {
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  data: PlayerSnapshot;
  moving: boolean;
  queuedPlayer?: PlayerSnapshot;
};

class VirtualOfficeScene extends Phaser.Scene {
  private avatars = new Map<string, AvatarBundle>();
  private walkableGrid: boolean[][] = [];
  private onPlayersUpdate: (players: PlayerSnapshot[]) => void;

  constructor(onPlayersUpdate: (players: PlayerSnapshot[]) => void) {
    super("VirtualOfficeScene");
    this.onPlayersUpdate = onPlayersUpdate;
  }

  preload(): void {
    const blueAvatar = this.make.graphics({ x: 0, y: 0 });
    blueAvatar.fillStyle(0x3b6bb0, 1).fillRect(2, 7, 8, 8);
    blueAvatar.fillStyle(0x2c5282, 1).fillRect(1, 8, 10, 7);
    blueAvatar.fillStyle(0xf6d69b, 1).fillRect(3, 2, 6, 5);
    blueAvatar.fillStyle(0x6b4b2a, 1).fillRect(2, 1, 8, 2);
    blueAvatar.generateTexture("avatar-blue", 12, 16);
    blueAvatar.destroy();
  }

  create(): void {
    const built = buildMapData();
    this.walkableGrid = built.walkable;
    this.cameras.main.setBackgroundColor("#000000");
    this.drawOfficeFloor(built.map);
    this.drawFurniture();
  }

  private drawOfficeFloor(map: number[][]): void {
    const g = this.add.graphics();
    for (let y = 0; y < MAP_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_WIDTH; x += 1) {
        const left = x * TILE_SIZE;
        const top = y * TILE_SIZE;
        if (map[y][x] === MAP_INDEX.WALL) {
          g.fillStyle(0x000000, 1);
          g.fillRect(left, top, TILE_SIZE, TILE_SIZE);
          continue;
        }
        const checker = (x + y) % 2 === 0;
        g.fillStyle(checker ? 0xd8ccb6 : 0xd0c3ad, 1);
        g.fillRect(left, top, TILE_SIZE, TILE_SIZE);
        g.lineStyle(1, 0xc5b79f, 0.7);
        g.strokeRect(left, top, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private drawFurniture(): void {
    const g = this.add.graphics();
    const desk = (x: number, y: number, w: number, h: number, color: number) => {
      g.fillStyle(color, 1);
      g.fillRoundedRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE, 4);
      g.lineStyle(1, 0x3a2a20, 0.45);
      g.strokeRoundedRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE, 4);
    };

    desk(5, 8, 6, 2, 0xbe8359);
    desk(11, 8, 6, 2, 0x8e5f3f);
    desk(10, 11, 7, 2, 0x8e5f3f);
    desk(17, 11, 6, 2, 0x31353a);
    desk(22, 16, 5, 4, 0xcbb89b);

    g.fillStyle(0x6a3d2a, 1);
    g.fillRoundedRect(1.2 * TILE_SIZE, 2.6 * TILE_SIZE, 2.1 * TILE_SIZE, 2.1 * TILE_SIZE, 3);
    g.fillStyle(0x9aa2ab, 1);
    g.fillRoundedRect(11.9 * TILE_SIZE, 1.5 * TILE_SIZE, 2.8 * TILE_SIZE, 2 * TILE_SIZE, 2);
    g.fillRoundedRect(14.9 * TILE_SIZE, 1.5 * TILE_SIZE, 1.8 * TILE_SIZE, 2.4 * TILE_SIZE, 2);
    g.fillStyle(0x73a942, 1);
    g.fillRoundedRect(24.6 * TILE_SIZE, 1.8 * TILE_SIZE, 1.2 * TILE_SIZE, 2.2 * TILE_SIZE, 2);
    g.fillStyle(0x6fbde3, 1);
    g.fillRoundedRect(27 * TILE_SIZE, 1.8 * TILE_SIZE, 1.3 * TILE_SIZE, 2.2 * TILE_SIZE, 2);
  }

  setPlayers(players: PlayerSnapshot[]): void {
    players.forEach((player) => this.upsertPlayer(player, false));
    this.pushState();
  }

  upsertPlayer(player: PlayerSnapshot, animate = true): void {
    const existing = this.avatars.get(player.employeeId);
    if (!existing) {
      const initialTile = animate
        ? OFFICE_ZONES.entrance.targetTiles[0]
        : toTile(player.x, player.y);
      const initialPixel = toPixels(initialTile);
      const sprite = this.add.sprite(initialPixel.x, initialPixel.y, "avatar-blue").setScale(1.6);
      const nameText = this.add
        .text(initialPixel.x, initialPixel.y - 18, player.name, {
          fontFamily: "Verdana",
          fontSize: "9px",
          color: "#f8fafc",
          backgroundColor: "#000000",
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5);
      const statusText = this.add
        .text(initialPixel.x, initialPixel.y - 30, player.status, {
          fontFamily: "Verdana",
          fontSize: "8px",
          color: "#f8fafc",
          backgroundColor: "#1a1a1a",
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5);
      const bundle: AvatarBundle = {
        sprite,
        nameText,
        statusText,
        data: player,
        moving: false,
      };
      this.applyBehavior(bundle, player.behavior);
      this.setVisibility(bundle, player.visible);
      this.avatars.set(player.employeeId, bundle);

      if (animate) {
        const destination = this.pickDestinationTile(player);
        const startTile = toTile(bundle.sprite.x, bundle.sprite.y);
        const primaryPath = findPath(startTile, destination, this.walkableGrid);
        const path =
          primaryPath.length > 1
            ? primaryPath
            : findFallbackPath(startTile, destination, this.walkableGrid);
        if (path.length > 1) {
          this.walkPath(bundle, path.slice(1), () => {
            this.applyBehavior(bundle, player.behavior);
            this.setVisibility(bundle, player.visible);
            this.pushState();
          });
          return;
        }
      }

      this.pushState();
      return;
    }

    if (existing.moving) {
      if (animate) {
        existing.queuedPlayer = player;
      } else {
        existing.data = player;
        existing.nameText.setText(player.name);
        existing.statusText.setText(player.status);
      }
      return;
    }

    const destination = this.pickDestinationTile(player);
    const currentTile = toTile(existing.sprite.x, existing.sprite.y);
    const primaryPath = findPath(currentTile, destination, this.walkableGrid);
    const path =
      primaryPath.length > 1
        ? primaryPath
        : findFallbackPath(currentTile, destination, this.walkableGrid);

    existing.data = player;
    existing.nameText.setText(player.name);
    existing.statusText.setText(player.status);
    this.setVisibility(existing, true);
    if (animate && path.length > 1) {
      this.walkPath(existing, path.slice(1), () => {
        this.applyBehavior(existing, player.behavior);
        this.setVisibility(existing, player.visible);
        this.pushState();
      });
      return;
    }

    const pixel = toPixels(destination);
    existing.sprite.setPosition(pixel.x, pixel.y);
    existing.nameText.setPosition(pixel.x, pixel.y - 18);
    existing.statusText.setPosition(pixel.x, pixel.y - 30);
    this.applyBehavior(existing, player.behavior);
    this.setVisibility(existing, player.visible);
    this.pushState();
  }

  handleAction(event: OfficeActionEvent): void {
    const action = normalizeAction(event.action);
    const mapping = ACTION_TO_ZONE[action];
    const zone = normalizeZone(event.destinationZone, action);
    const destination = pickDestinationTile(zone, event.employeeId);
    const destPixel = toPixels(destination);
    const payload: PlayerSnapshot = {
      employeeId: event.employeeId,
      name: event.name ?? `Employee ${event.employeeId.slice(-4)}`,
      action,
      status: getStatusForAction(action),
      zone,
      x: destPixel.x,
      y: destPixel.y,
      visible: mapping.visible,
      behavior: mapping.behavior,
      lastUpdate: Date.now(),
    };
    // Time In: spawn at entrance then walk to desk (so we set start position at entrance)
    if (action === "work") {
      const entranceTile = OFFICE_ZONES.entrance.targetTiles[0];
      const entrancePixel = toPixels(entranceTile);
      payload.x = entrancePixel.x;
      payload.y = entrancePixel.y;
    }
    this.upsertPlayer(payload, true);
  }

  private pickDestinationTile(player: PlayerSnapshot): TilePoint {
    return pickDestinationTile(player.zone, player.employeeId);
  }

  private walkPath(bundle: AvatarBundle, path: TilePoint[], onComplete: () => void): void {
    if (bundle.moving || path.length === 0) {
      onComplete();
      return;
    }
    bundle.moving = true;
    this.applyBehavior(bundle, "walking");

    const next = path[0];
    const pixel = toPixels(next);
    this.tweens.add({
      targets: bundle.sprite,
      x: pixel.x,
      y: pixel.y,
      duration: 170,
      ease: "Linear",
      onUpdate: () => {
        bundle.nameText.setPosition(bundle.sprite.x, bundle.sprite.y - 18);
        bundle.statusText.setPosition(bundle.sprite.x, bundle.sprite.y - 30);
      },
      onComplete: () => {
        if (path.length > 1) {
          this.walkPath(bundle, path.slice(1), onComplete);
        } else {
          bundle.moving = false;
          if (bundle.queuedPlayer) {
            const queued = bundle.queuedPlayer;
            bundle.queuedPlayer = undefined;
            this.upsertPlayer(queued, true);
            return;
          }
          onComplete();
        }
      },
    });
  }

  private applyBehavior(bundle: AvatarBundle, behavior: AvatarBehavior): void {
    bundle.data.behavior = behavior;
    bundle.sprite.clearTint();
    bundle.sprite.setScale(1.45);
    this.tweens.killTweensOf(bundle.sprite);

    if (behavior === "walking") {
      this.tweens.add({
        targets: bundle.sprite,
        yoyo: true,
        repeat: -1,
        duration: 120,
        scaleX: 1.35,
        scaleY: 1.55,
      });
      return;
    }

    if (behavior === "sitting") {
      bundle.sprite.setTint(0xdbeafe);
      bundle.sprite.setScale(1.45, 1.2);
      return;
    }

    if (behavior === "eating") {
      bundle.sprite.setTint(0xfcd34d);
      this.tweens.add({
        targets: bundle.sprite,
        yoyo: true,
        repeat: -1,
        duration: 400,
        angle: { from: -3, to: 3 },
      });
    }
  }

  private setVisibility(bundle: AvatarBundle, visible: boolean): void {
    bundle.data.visible = visible;
    bundle.sprite.setVisible(visible);
    bundle.nameText.setVisible(visible);
    bundle.statusText.setVisible(visible);
  }

  private pushState(): void {
    const players = Array.from(this.avatars.values()).map((bundle) => ({
      ...bundle.data,
      x: bundle.sprite.x,
      y: bundle.sprite.y,
      lastUpdate: Date.now(),
    }));
    this.onPlayersUpdate(players.sort((a, b) => Number(b.visible) - Number(a.visible)));
  }
}

function extractPayload<T>(input: unknown, fallback: T): T {
  if (!input || typeof input !== "object") return fallback;
  const maybe = input as Record<string, unknown>;
  if ("data" in maybe) return (maybe.data as T) ?? fallback;
  return input as T;
}

export default function VirtualOffice() {
  const { account } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  const [players, setPlayers] = useState<PlayerSnapshot[]>([]);
  const [socketState, setSocketState] = useState<"connecting" | "connected" | "offline">("connecting");
  const [selectedAction, setSelectedAction] = useState<OfficeAction>("work");
  const [lastEventMessage, setLastEventMessage] = useState("Waiting for realtime events...");
  const [sceneError, setSceneError] = useState("");

  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<VirtualOfficeScene | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const localEmployee = useMemo(() => {
    const idFromStorage = localStorage.getItem("lastEmployeeId") || localStorage.getItem("employeeId");
    const employeeId = String(account?._id || idFromStorage || "guest-employee");
    const fullName = `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim();
    return {
      employeeId,
      name: fullName || `Employee ${employeeId.slice(-4)}`,
    };
  }, [account?._id, account?.firstName, account?.lastName]);

  useEffect(() => {
    if (!showSplash) {
      return undefined;
    }
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => {
    if (showSplash) return undefined;
    const scene = new VirtualOfficeScene(setPlayers);
    sceneRef.current = scene;

    try {
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "virtual-office-canvas",
        width: MAP_WIDTH * TILE_SIZE,
        height: MAP_HEIGHT * TILE_SIZE,
        backgroundColor: "#0f172a",
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [scene],
      });
      gameRef.current = game;
    } catch (error) {
      setSceneError("Unable to initialize Phaser scene.");
      console.error(error);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      sceneRef.current = null;
    };
  }, [localEmployee.employeeId, showSplash]);

  useEffect(() => {
    if (showSplash) return undefined;
    setSocketState("connecting");
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setSocketState("connected");
      socket.emit("office:join", {
        employeeId: localEmployee.employeeId,
        name: localEmployee.name,
      });
    };

    const onDisconnect = () => {
      setSocketState("offline");
    };

    const onEmployeeAction = (event: OfficeActionEvent) => {
      setLastEventMessage(`${event.employeeId} -> ${normalizeAction(event.action)}`);
      sceneRef.current?.handleAction(event);
    };

    const onOfficePlayers = (payload: unknown) => {
      const rows = extractPayload<OfficePlayerResponse[]>(payload, []);
      const snapshots: PlayerSnapshot[] = rows.map((player) => {
        const action = normalizeAction(player.currentAction);
        const zone = normalizeZone(player.currentZone, action);
        const mapping = ACTION_TO_ZONE[action];
        const destinationTiles =
          zone === "work-area"
            ? DESK_TILES
            : OFFICE_ZONES[zone].targetTiles;
        const tile = destinationTiles[hashId(player.employeeId) % destinationTiles.length];
        const pixel = toPixels(tile);
        return {
          employeeId: player.employeeId,
          name: player.name || `Employee ${player.employeeId.slice(-4)}`,
          action,
          status: getStatusForAction(action),
          zone,
          x: pixel.x,
          y: pixel.y,
          behavior: mapping.behavior,
          visible: mapping.visible,
          lastUpdate: Date.now(),
        };
      });
      sceneRef.current?.setPlayers(snapshots);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("employee-action", onEmployeeAction);
    socket.on("office:employee-action", onEmployeeAction);
    socket.on("office:players", onOfficePlayers);
    socket.on("office-players", onOfficePlayers);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("employee-action", onEmployeeAction);
      socket.off("office:employee-action", onEmployeeAction);
      socket.off("office:players", onOfficePlayers);
      socket.off("office-players", onOfficePlayers);
      socket.disconnect();
    };
  }, [localEmployee.employeeId, localEmployee.name, showSplash]);

  useEffect(() => {
    if (showSplash) return undefined;
    let mounted = true;

    const bootstrapState = async () => {
      try {
        const [statusRes, playersRes] = await Promise.all([
          axiosInstance.get("/employee/status", {
            params: { employeeId: localEmployee.employeeId },
          }),
          axiosInstance.get("/office/players"),
        ]);

        const status = extractPayload<OfficeStatusResponse | null>(statusRes.data, null);
        const officePlayers = extractPayload<OfficePlayerResponse[]>(playersRes.data, []);
        if (!mounted) return;

        if (status) {
          sceneRef.current?.handleAction({
            employeeId: status.employeeId,
            action: status.currentAction ?? "work",
            destinationZone: status.currentZone,
            name: localEmployee.name,
          });
        }

        const snapshots: PlayerSnapshot[] = officePlayers.map((player) => {
          const action = normalizeAction(player.currentAction);
          const zone = normalizeZone(player.currentZone, action);
          const mapping = ACTION_TO_ZONE[action];
          const destinationTiles =
            zone === "work-area" ? DESK_TILES : OFFICE_ZONES[zone].targetTiles;
          const tile = destinationTiles[hashId(player.employeeId) % destinationTiles.length];
          const pixel = toPixels(tile);
          return {
            employeeId: player.employeeId,
            name: player.name || `Employee ${player.employeeId.slice(-4)}`,
            action,
            status: getStatusForAction(action),
            zone,
            x: pixel.x,
            y: pixel.y,
            behavior: mapping.behavior,
            visible: mapping.visible,
            lastUpdate: Date.now(),
          };
        });
        sceneRef.current?.setPlayers(snapshots);
      } catch (error) {
        console.warn("Virtual Office bootstrap failed", error);
      }
    };

    const pollStatus = async () => {
      try {
        const statusRes = await axiosInstance.get("/employee/status", {
          params: { employeeId: localEmployee.employeeId },
        });
        const status = extractPayload<OfficeStatusResponse | null>(statusRes.data, null);
        if (!status || !mounted) return;
        sceneRef.current?.handleAction({
          employeeId: status.employeeId,
          action: status.currentAction ?? "work",
          destinationZone: status.currentZone,
          name: localEmployee.name,
        });
      } catch {
        // Realtime socket is primary, polling is fallback.
      }
    };

    bootstrapState();
    const timer = window.setInterval(pollStatus, 15000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [localEmployee.employeeId, localEmployee.name, showSplash]);

  const triggerAction = async (action: OfficeAction) => {
    const mapping = ACTION_TO_ZONE[action];
    setSelectedAction(action);
    setLastEventMessage(`You selected ${action} -> ${mapping.zone}`);
    const event: OfficeActionEvent = {
      employeeId: localEmployee.employeeId,
      name: localEmployee.name,
      action,
      destinationZone: mapping.zone,
    };

    sceneRef.current?.handleAction(event);
    socketRef.current?.emit("employee-action", event);
    socketRef.current?.emit("office:employee-action", event);

    try {
      await axiosInstance.post("/employee/action", {
        employeeId: localEmployee.employeeId,
        action,
        destinationZone: mapping.zone,
      });
    } catch (error) {
      console.warn("Failed to persist action", error);
    }
  };

  if (showSplash) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowSplash(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setShowSplash(false);
        }}
        className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 transition-opacity duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        <div className="px-6 text-center">
          <h1 className="text-xl font-semibold text-white sm:text-2xl md:text-3xl">
            Welcome to the WES Virtual Office
          </h1>
          <p className="mt-3 text-sm text-slate-400">Click or wait to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-2 py-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <div className="mb-2 flex w-full items-center justify-between text-[11px] text-slate-300">
          <div className="font-semibold tracking-wide text-slate-200">Virtual Office</div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Players: {players.filter((player) => player.visible).length}</span>
            <span>
            Realtime:{" "}
            <span
              className={
                socketState === "connected"
                  ? "text-emerald-400"
                  : socketState === "connecting"
                    ? "text-amber-300"
                    : "text-red-400"
              }
            >
              {socketState}
            </span>
            </span>
          </div>
        </div>
        <div className="w-full rounded-lg border border-slate-900 bg-black p-2">
          <div id="virtual-office-canvas" className="mx-auto aspect-[30/22] w-full max-w-[960px] overflow-hidden rounded-md bg-black" />
        </div>
        {sceneError ? <p className="mt-2 text-xs text-red-300">{sceneError}</p> : null}
        <p className="mt-2 text-[11px] text-slate-400">{lastEventMessage}</p>
        <div className="mt-3 grid w-full max-w-3xl grid-cols-4 gap-1.5 md:grid-cols-7">
          {(
            ["work", "break", "meal", "bio-break", "clinic-break", "on-trip", "timeout"] as OfficeAction[]
          ).map((action) => (
            <button
              key={action}
              onClick={() => triggerAction(action)}
              className={`rounded border px-1.5 py-1 text-[10px] uppercase tracking-wide ${
                selectedAction === action
                  ? "border-amber-300 bg-amber-200/15 text-amber-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              {OFFICE_ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
