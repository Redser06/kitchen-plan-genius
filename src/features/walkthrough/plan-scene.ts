// Kitchen plan → a walkable room.
//
// Measurements enter in millimetres and leave in metres. Plan X stays world X;
// plan Y becomes world Z. Wall and opening math stays private; the renderer
// only sees the floor polygon, collision solids, and placed items.

import { offsetPlanPoint, workTriangleOf } from "../../domain/geometry";
import type { Carcass, Fixture, Furniture, KitchenDesign, Vec2 } from "../../domain/types";

export const MM = 0.001;
export const WALL_THICKNESS = 0.12;
export const EYE_HEIGHT = 1.6;
export const PLAYER_RADIUS = 0.22;

const PLINTH = 0.12;
const BASE_CARCASS = 0.72;
const COUNTER_THICK = 0.04;
const TALL_HEIGHT = 2.1;
const WALL_CAB_ELEVATION = 1.42;
const WALL_CAB_HEIGHT = 0.72;
const DOOR_HEIGHT = 2.04;
const WINDOW_SILL = 0.9;
const WINDOW_HEAD = 2.1;
const TABLE_TOP = 0.04;
const TABLE_HEIGHT = 0.75;

export interface PlanPoint {
  x: number;
  z: number;
}

export type ItemRole =
  | "cabinet"
  | "countertop"
  | "appliance"
  | "furniture"
  | "plinth"
  | "door"
  | "window"
  | "backsplash"
  | "light"
  | "socket"
  | "switch";

export type DoorProfile = "slab" | "shaker" | "beadboard";

export type ApplianceKind =
  | "hob"
  | "sink"
  | "oven"
  | "fridge"
  | "fridge-american"
  | "dishwasher"
  | "rangehood"
  | "winecooler"
  | "microwave"
  | "washer";

interface WallNode {
  id: string;
  start: PlanPoint;
  end: PlanPoint;
  length: number;
  thickness: number;
  height: number;
  rotationY: number;
  inward: PlanPoint;
  outward: PlanPoint;
}

export interface WallSolid {
  id: string;
  center: [number, number, number];
  size: [number, number, number];
  rotationY: number;
  /** Unit vector pointing out of the room, in the XZ plane. */
  outward: PlanPoint;
}

interface OpeningNode {
  id: string;
  kind: "door" | "window";
  wallId: string;
  along: number;
  width: number;
  sill: number;
  head: number;
}

export interface SceneItem {
  id: string;
  role: ItemRole;
  sourceId: string;
  label: string;
  /** Unrotated corner. The box extends +X (width) and +Z (depth) before rotation. */
  origin: PlanPoint;
  size: [number, number, number];
  elevation: number;
  /** Clockwise degrees, matching the 2D plan. */
  rotation: number;
  color: string;
  blocksWalk: boolean;
  /** Carcass door style from materials.cabinetFinish. */
  profile?: DoorProfile;
  fitting?: string;
  mount?: Carcass["mount"];
  /** False when an appliance face replaces the doors. */
  showFront?: boolean;
  appliance?: ApplianceKind;
}

export interface WorkTriangleOverlay {
  sink: PlanPoint;
  hob: PlanPoint;
  fridge: PlanPoint;
  elevation: number;
  status: "ok" | "warning";
}

export interface WalkthroughScene {
  floor: PlanPoint[];
  solids: WallSolid[];
  items: SceneItem[];
  ceilingHeight: number;
  palette: KitchenDesign["colours"];
  cabinetFinish: KitchenDesign["materials"]["cabinetFinish"];
  flooringStyle: string;
  countertopMaterial: string;
  backsplashStyle: string;
  /** Sink, hob, and fridge centres from the shared rotated-footprint triangle. */
  workTriangle: WorkTriangleOverlay | null;
  /** True when the room polygon could not be walked, so a sample kitchen is shown. */
  usedSample: boolean;
  spawn: { x: number; z: number; yaw: number };
}

export function planDegreesToRotationY(degrees: number): number {
  return (-degrees * Math.PI) / 180;
}

export function polygonCentroid(pts: PlanPoint[]): PlanPoint {
  if (pts.length === 0) return { x: 0, z: 0 };
  let twiceArea = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cross = p.x * q.z - q.x * p.z;
    twiceArea += cross;
    cx += (p.x + q.x) * cross;
    cz += (p.z + q.z) * cross;
  }
  if (Math.abs(twiceArea) < 1e-8) {
    return {
      x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length,
      z: pts.reduce((sum, p) => sum + p.z, 0) / pts.length,
    };
  }
  return { x: cx / (3 * twiceArea), z: cz / (3 * twiceArea) };
}

export function pointInPolygon(x: number, z: number, polygon: PlanPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    const crosses = pi.z > z !== pj.z > z;
    if (!crosses) continue;
    const xAtZ = ((pj.x - pi.x) * (z - pi.z)) / (pj.z - pi.z) + pi.x;
    if (x < xAtZ) inside = !inside;
  }
  return inside;
}

export function buildWalkthroughScene(design: KitchenDesign): WalkthroughScene {
  const usable = isWalkableRoom(design.room.points);
  const source = usable ? design : sampleKitchen();
  const polygon = source.room.points.map((point) => ({ x: point.x * MM, z: point.y * MM }));
  const ceilingHeight = Math.max(2.2, (source.room.height || 2400) * MM);
  const area = signedArea(polygon);
  const walls = buildWalls(polygon, ceilingHeight, area >= 0);
  const openings = buildOpenings(source.fixtures, walls, ceilingHeight);
  const items = [
    ...source.carcasses.flatMap((carcass) => carcassItems(carcass, source)),
    ...source.furniture.flatMap((piece) => furnitureItems(piece)),
    ...openingItems(openings, walls),
    ...lightItems(source.fixtures, ceilingHeight),
    ...electricalItems(source.fixtures, walls, openings),
  ];

  return {
    floor: polygon,
    solids: walls.flatMap((wall) =>
      solidsForWall(
        wall,
        openings.filter((opening) => opening.wallId === wall.id),
      ),
    ),
    items,
    ceilingHeight,
    palette: { ...source.colours },
    cabinetFinish: source.materials.cabinetFinish,
    flooringStyle: source.materials.flooringStyle,
    countertopMaterial: source.materials.countertopMaterial,
    backsplashStyle: source.materials.backsplashStyle,
    workTriangle: sceneTriangle(source),
    usedSample: !usable,
    spawn: spawnFor(polygon, walls, openings, items),
  };
}

export interface WalkerPose {
  x: number;
  z: number;
}

/** Keep an eye-level walker inside the floor polygon and out of floor-standing items. */
export function constrainWalker(
  pose: WalkerPose,
  scene: WalkthroughScene,
  radius = PLAYER_RADIUS,
): WalkerPose {
  return keepInside(pose, scene.floor, scene.items, radius);
}

function keepInside(
  pose: WalkerPose,
  floor: PlanPoint[],
  items: SceneItem[],
  radius: number,
): WalkerPose {
  let next = pushInside(pose.x, pose.z, floor, radius);
  for (let pass = 0; pass < 3; pass++) {
    for (const item of items) {
      if (!item.blocksWalk || !overlapsItem(next.x, next.z, item, radius)) continue;
      const options = exitCandidates(next.x, next.z, item, radius)
        .map((candidate) => pushInside(candidate.x, candidate.z, floor, radius))
        .filter(
          (candidate) =>
            pointInPolygon(candidate.x, candidate.z, floor) &&
            !items.some(
              (other) => other.blocksWalk && overlapsItem(candidate.x, candidate.z, other, radius),
            ),
        )
        .sort(
          (a, b) => Math.hypot(a.x - next.x, a.z - next.z) - Math.hypot(b.x - next.x, b.z - next.z),
        );
      next = options[0] ?? pushOutOfItem(next.x, next.z, item, radius);
    }
    next = pushInside(next.x, next.z, floor, radius);
  }
  return next;
}

function isWalkableRoom(points: Vec2[]): boolean {
  if (points.length < 3) return false;
  const polygon = points.map((point) => ({ x: point.x * MM, z: point.y * MM }));
  return Math.abs(signedArea(polygon)) > 0.05 && polygon.every((point) => Number.isFinite(point.x));
}

function signedArea(polygon: PlanPoint[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    area += current.x * next.z - next.x * current.z;
  }
  return area / 2;
}

function buildWalls(polygon: PlanPoint[], height: number, ccw: boolean): WallNode[] {
  return polygon.map((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz) || 0.001;
    const left = { x: -dz / length, z: dx / length };
    const inward = ccw ? left : { x: -left.x, z: -left.z };
    return {
      id: `wall-${index}`,
      start,
      end,
      length,
      thickness: WALL_THICKNESS,
      height,
      rotationY: Math.atan2(dz, dx),
      inward,
      outward: { x: -inward.x, z: -inward.z },
    };
  });
}

function buildOpenings(fixtures: Fixture[], walls: WallNode[], roomHeight: number): OpeningNode[] {
  const openings: OpeningNode[] = [];
  for (const fixture of fixtures) {
    if (fixture.type !== "door" && fixture.type !== "window") continue;
    if (fixture.wallIndex === undefined || fixture.t === undefined) continue;
    const wall = walls[fixture.wallIndex];
    if (!wall || wall.length < 0.4) continue;
    const requested = (fixture.width ?? (fixture.type === "door" ? 900 : 1200)) * MM;
    const width = Math.min(wall.length * 0.72, Math.max(0.45, requested));
    const margin = width / 2 + 0.08;
    const along = Math.min(wall.length - margin, Math.max(margin, wall.length * fixture.t));
    const head =
      fixture.type === "door"
        ? Math.min(DOOR_HEIGHT, roomHeight - 0.12)
        : Math.min(WINDOW_HEAD, roomHeight - 0.12);
    openings.push({
      id: fixture.id,
      kind: fixture.type,
      wallId: wall.id,
      along,
      width,
      sill: fixture.type === "door" ? 0 : Math.min(WINDOW_SILL, head - 0.4),
      head,
    });
  }
  return openings;
}

function solidsForWall(wall: WallNode, openings: OpeningNode[]): WallSolid[] {
  const sorted = [...openings].sort((a, b) => a.along - b.along);
  const solids: WallSolid[] = [];
  let cursor = 0;

  const push = (from: number, to: number, y0: number, y1: number, suffix: string) => {
    const length = to - from;
    const height = y1 - y0;
    if (length < 0.04 || height < 0.04) return;
    const mid = pointAlong(wall, (from + to) / 2);
    solids.push({
      id: `${wall.id}-${suffix}`,
      center: [
        mid.x + wall.outward.x * (wall.thickness / 2),
        y0 + height / 2,
        mid.z + wall.outward.z * (wall.thickness / 2),
      ],
      size: [length, height, wall.thickness],
      rotationY: wall.rotationY,
      outward: wall.outward,
    });
  };

  sorted.forEach((opening, index) => {
    const left = Math.max(cursor, opening.along - opening.width / 2);
    const right = Math.max(left, Math.min(wall.length, opening.along + opening.width / 2));
    push(cursor, left, 0, wall.height, `span-${index}`);
    if (opening.sill > 0) push(left, right, 0, opening.sill, `sill-${index}`);
    if (opening.head < wall.height) push(left, right, opening.head, wall.height, `head-${index}`);
    cursor = right;
  });
  push(cursor, wall.length, 0, wall.height, "end");
  if (solids.length === 0) push(0, wall.length, 0, wall.height, "full");
  return solids;
}

function carcassItems(carcass: Carcass, design: KitchenDesign): SceneItem[] {
  const origin = { x: carcass.position.x * MM, z: carcass.position.y * MM };
  const width = carcass.size * MM;
  const depth = carcass.depth * MM;
  const rotation = carcass.rotation || 0;
  const label =
    carcass.applianceLabel || carcass.label || carcass.fittingLabel || `${carcass.size}mm unit`;
  const color = design.colours.cabinets;
  const items: SceneItem[] = [];
  const front = {
    profile: doorProfile(design.materials.cabinetFinish),
    fitting: carcass.fittingType,
    mount: carcass.mount,
    showFront: !coversFront(carcass.applianceType),
  };

  if (carcass.mount === "wall") {
    items.push(
      boxItem({
        id: carcass.id,
        role: "cabinet",
        sourceId: carcass.id,
        label,
        origin,
        size: [width, WALL_CAB_HEIGHT, depth],
        elevation: WALL_CAB_ELEVATION,
        rotation,
        color,
        blocksWalk: false,
        ...front,
      }),
    );
    items.push(...applianceItems(carcass, origin, width, depth, rotation));
    return items;
  }

  if (carcass.mount === "tall") {
    items.push(
      boxItem({
        id: carcass.id,
        role: "cabinet",
        sourceId: carcass.id,
        label,
        origin,
        size: [width, TALL_HEIGHT, depth],
        elevation: 0,
        rotation,
        color,
        blocksWalk: true,
        ...front,
      }),
    );
    items.push(...applianceItems(carcass, origin, width, depth, rotation));
    return items;
  }

  items.push(
    boxItem({
      id: `${carcass.id}-plinth`,
      role: "plinth",
      sourceId: carcass.id,
      label: "",
      origin,
      size: [width, PLINTH, depth],
      elevation: 0,
      rotation,
      color: shade(color, -28),
      blocksWalk: true,
    }),
    boxItem({
      id: carcass.id,
      role: "cabinet",
      sourceId: carcass.id,
      label,
      origin,
      size: [width, BASE_CARCASS, depth],
      elevation: PLINTH,
      rotation,
      color,
      blocksWalk: true,
      ...front,
    }),
    boxItem({
      id: `${carcass.id}-top`,
      role: "countertop",
      sourceId: carcass.id,
      label: design.materials.countertopMaterial,
      origin: offsetOrigin(origin, rotation, 0, -0.02),
      size: [width, COUNTER_THICK, depth + 0.02],
      elevation: PLINTH + BASE_CARCASS,
      rotation,
      color: design.colours.countertops,
      blocksWalk: true,
    }),
    boxItem({
      id: `${carcass.id}-splash`,
      role: "backsplash",
      sourceId: carcass.id,
      label: "",
      origin: offsetOrigin(origin, rotation, 0.015, depth - 0.015),
      size: [Math.max(0.05, width - 0.03), 0.45, 0.012],
      elevation: PLINTH + BASE_CARCASS + COUNTER_THICK,
      rotation,
      color: design.colours.backsplash,
      blocksWalk: false,
    }),
  );
  items.push(...applianceItems(carcass, origin, width, depth, rotation));
  return items;
}

function applianceItems(
  carcass: Carcass,
  origin: PlanPoint,
  width: number,
  depth: number,
  rotation: number,
): SceneItem[] {
  const type = carcass.applianceType;
  if (!type) return [];
  const label = carcass.applianceLabel || type;
  const base = {
    role: "appliance" as const,
    sourceId: carcass.id,
    label,
    rotation,
    blocksWalk: false,
    appliance: asApplianceKind(type),
  };

  if ((type === "hob" || type === "sink") && carcass.mount === "floor") {
    const sink = type === "sink";
    return [
      boxItem({
        ...base,
        id: `${carcass.id}-${type}`,
        origin: offsetOrigin(origin, rotation, width * 0.14, depth * 0.18),
        size: [width * 0.72, sink ? 0.025 : 0.012, depth * 0.52],
        elevation: PLINTH + BASE_CARCASS + COUNTER_THICK + 0.001,
        color: sink ? "#c5d0d6" : "#1a1a1a",
      }),
    ];
  }

  if (type === "rangehood") {
    return [
      boxItem({
        ...base,
        id: `${carcass.id}-hood`,
        origin: offsetOrigin(origin, rotation, width * 0.12, depth * 0.2),
        size: [width * 0.76, 0.16, Math.min(depth, 0.4)],
        elevation: 1.55,
        color: "#e7e2da",
      }),
    ];
  }

  const tall = carcass.mount === "tall" || type === "fridge" || type === "fridge-american";
  const frontHeight = tall ? 1.55 : type === "oven" || type === "microwave" ? 0.55 : 0.62;
  const elevation = tall ? 0.2 : PLINTH + 0.08;
  const color =
    type === "dishwasher" || type === "washer"
      ? "#b7b1a8"
      : type === "fridge" || type === "fridge-american"
        ? "#ece7df"
        : "#2b261f";
  return [
    boxItem({
      ...base,
      id: `${carcass.id}-${type}`,
      origin: offsetOrigin(origin, rotation, width * 0.08, -0.02),
      size: [width * 0.84, frontHeight, 0.02],
      elevation,
      color,
    }),
  ];
}

function furnitureItems(piece: Furniture): SceneItem[] {
  const origin = { x: piece.position.x * MM, z: piece.position.y * MM };
  const width = piece.width * MM;
  const depth = piece.depth * MM;
  const rotation = piece.rotation || 0;
  const items: SceneItem[] = [
    boxItem({
      id: piece.id,
      role: "furniture",
      sourceId: piece.id,
      label: piece.label,
      origin,
      size: [width, TABLE_TOP, depth],
      elevation: TABLE_HEIGHT - TABLE_TOP,
      rotation,
      color: "#c4a882",
      blocksWalk: true,
    }),
  ];
  const leg = 0.06;
  const inset = 0.1;
  const corners: [number, number][] = [
    [inset, inset],
    [width - inset - leg, inset],
    [inset, depth - inset - leg],
    [width - inset - leg, depth - inset - leg],
  ];
  corners.forEach(([localX, localZ], index) => {
    items.push(
      boxItem({
        id: `${piece.id}-leg-${index}`,
        role: "furniture",
        sourceId: piece.id,
        label: "",
        origin: offsetOrigin(origin, rotation, localX, localZ),
        size: [leg, TABLE_HEIGHT - TABLE_TOP, leg],
        elevation: 0,
        rotation,
        color: "#8c7355",
        blocksWalk: false,
      }),
    );
  });
  return items;
}

function openingItems(openings: OpeningNode[], walls: WallNode[]): SceneItem[] {
  const items: SceneItem[] = [];
  for (const opening of openings) {
    const wall = walls.find((candidate) => candidate.id === opening.wallId);
    if (!wall) continue;
    if (opening.kind === "window") {
      const mid = pointAlong(wall, opening.along);
      const center = {
        x: mid.x + wall.outward.x * (wall.thickness / 2),
        z: mid.z + wall.outward.z * (wall.thickness / 2),
      };
      const size: [number, number, number] = [
        opening.width * 0.9,
        Math.max(0.3, (opening.head - opening.sill) * 0.82),
        0.02,
      ];
      items.push(
        boxItem({
          id: `${opening.id}-glass`,
          role: "window",
          sourceId: opening.id,
          label: "Window",
          origin: cornerFromCenter(center, size[0], size[2], wall.rotationY),
          size,
          elevation: opening.sill + (opening.head - opening.sill - size[1]) / 2,
          rotation: (-wall.rotationY * 180) / Math.PI,
          color: "#b7d7e8",
          blocksWalk: false,
        }),
      );
      continue;
    }

    const panelLength = Math.max(0.4, opening.width - 0.08);
    const hinge = pointAlong(wall, opening.along - opening.width / 2 + 0.04);
    const swing = 1.05;
    const score = (extra: number) => {
      const dx = Math.cos(wall.rotationY + extra);
      const dz = Math.sin(wall.rotationY + extra);
      return dx * wall.inward.x + dz * wall.inward.z;
    };
    const extra = score(swing) >= score(-swing) ? swing : -swing;
    items.push(
      boxItem({
        id: `${opening.id}-door`,
        role: "door",
        sourceId: opening.id,
        label: "Door",
        origin: {
          x: hinge.x + wall.inward.x * 0.04,
          z: hinge.z + wall.inward.z * 0.04,
        },
        size: [panelLength, Math.max(1.6, opening.head - 0.02), 0.04],
        elevation: 0,
        rotation: (-(wall.rotationY + extra) * 180) / Math.PI,
        color: "#8d6a45",
        blocksWalk: false,
      }),
    );
  }
  return items;
}

function electricalItems(
  fixtures: Fixture[],
  walls: WallNode[],
  openings: OpeningNode[],
): SceneItem[] {
  const items: SceneItem[] = [];
  for (const fixture of fixtures) {
    if (fixture.type !== "socket" && fixture.type !== "switch") continue;
    if (fixture.wallIndex === undefined || fixture.t === undefined) continue;
    const wall = walls[fixture.wallIndex];
    if (!wall) continue;
    const t = Math.min(0.96, Math.max(0.04, fixture.t));
    const along = wall.length * t;
    const blocked = openings.some(
      (opening) =>
        opening.wallId === wall.id && Math.abs(opening.along - along) < opening.width / 2,
    );
    if (blocked) continue;

    const at = pointAlong(wall, along);
    const plateW = fixture.type === "socket" ? 0.148 : 0.086;
    const plateH = 0.086;
    const plateD = 0.016;
    const theta = Math.atan2(wall.inward.x, wall.inward.z);
    const rotation = (-theta * 180) / Math.PI;
    const hx = plateW / 2;
    const hz = plateD / 2;
    const center = {
      x: at.x + wall.inward.x * (0.008 + hz),
      z: at.z + wall.inward.z * (0.008 + hz),
    };
    const axisX = wall.inward.z;
    const axisZ = -wall.inward.x;
    const elevation = fixture.type === "switch" ? 1.15 : 0.45;
    items.push(
      boxItem({
        id: fixture.id,
        role: fixture.type,
        sourceId: fixture.id,
        label: fixture.type === "socket" ? "Socket" : "Switch",
        origin: {
          x: center.x - axisX * hx - wall.inward.x * hz,
          z: center.z - axisZ * hx - wall.inward.z * hz,
        },
        size: [plateW, plateH, plateD],
        elevation: elevation - plateH / 2,
        rotation,
        color: "#f4f1ea",
        blocksWalk: false,
      }),
    );
  }
  return items;
}

function sceneTriangle(design: KitchenDesign): WorkTriangleOverlay | null {
  const triangle = workTriangleOf(design.carcasses);
  if (!triangle) return null;
  const point = (station: { x: number; y: number }): PlanPoint => ({
    x: station.x * MM,
    z: station.y * MM,
  });
  return {
    sink: point(triangle.sink),
    hob: point(triangle.hob),
    fridge: point(triangle.fridge),
    elevation: 0.92,
    status: triangle.status,
  };
}

const APPLIANCE_KINDS: readonly ApplianceKind[] = [
  "hob",
  "sink",
  "oven",
  "fridge",
  "fridge-american",
  "dishwasher",
  "rangehood",
  "winecooler",
  "microwave",
  "washer",
];

const FRONT_APPLIANCES = new Set<ApplianceKind>([
  "oven",
  "fridge",
  "fridge-american",
  "dishwasher",
  "washer",
  "microwave",
  "winecooler",
]);

function asApplianceKind(type: string): ApplianceKind | undefined {
  return (APPLIANCE_KINDS as readonly string[]).includes(type)
    ? (type as ApplianceKind)
    : undefined;
}

function coversFront(type: string | null): boolean {
  const kind = type ? asApplianceKind(type) : undefined;
  return kind !== undefined && FRONT_APPLIANCES.has(kind);
}

function doorProfile(finish: KitchenDesign["materials"]["cabinetFinish"]): DoorProfile {
  if (finish === "Beadboard") return "beadboard";
  if (finish === "Slab") return "slab";
  return "shaker";
}

function lightItems(fixtures: Fixture[], ceilingHeight: number): SceneItem[] {
  return fixtures
    .filter((fixture) => fixture.type === "pendant" || fixture.type === "downlight")
    .filter((fixture) => fixture.position)
    .map((fixture) =>
      boxItem({
        id: fixture.id,
        role: "light",
        sourceId: fixture.id,
        label: fixture.type === "pendant" ? "Pendant" : "Downlight",
        origin: { x: fixture.position!.x * MM, z: fixture.position!.y * MM },
        size: [0.12, 0.12, 0.12],
        elevation:
          fixture.type === "pendant" ? Math.min(1.95, ceilingHeight - 0.35) : ceilingHeight - 0.08,
        rotation: 0,
        color: "#ffe1a8",
        blocksWalk: false,
      }),
    );
}

function boxItem(item: SceneItem): SceneItem {
  return item;
}

function pointAlong(wall: WallNode, distance: number): PlanPoint {
  const t = distance / wall.length;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    z: wall.start.z + (wall.end.z - wall.start.z) * t,
  };
}

export function offsetOrigin(
  origin: PlanPoint,
  rotationDeg: number,
  localX: number,
  localZ: number,
): PlanPoint {
  const next = offsetPlanPoint({ x: origin.x, y: origin.z }, rotationDeg, localX, localZ);
  return { x: next.x, z: next.y };
}

function cornerFromCenter(
  center: PlanPoint,
  width: number,
  depth: number,
  rotationY: number,
): PlanPoint {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  const lx = width / 2;
  const lz = depth / 2;
  return {
    x: center.x - (c * lx + s * lz),
    z: center.z - (-s * lx + c * lz),
  };
}

function shade(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return hex;
  const channel = (index: number) =>
    Math.max(0, Math.min(255, Number.parseInt(raw.slice(index, index + 2), 16) + amount));
  const hexByte = (value: number) => value.toString(16).padStart(2, "0");
  return `#${hexByte(channel(0))}${hexByte(channel(2))}${hexByte(channel(4))}`;
}

function spawnFor(
  floor: PlanPoint[],
  walls: WallNode[],
  openings: OpeningNode[],
  items: SceneItem[],
): WalkthroughScene["spawn"] {
  const centroid = polygonCentroid(floor);
  const door = openings.find((opening) => opening.kind === "door");
  let x = centroid.x;
  let z = centroid.z;
  if (door) {
    const wall = walls.find((candidate) => candidate.id === door.wallId);
    if (wall) {
      const at = pointAlong(wall, door.along);
      x = at.x + wall.inward.x * 0.9;
      z = at.z + wall.inward.z * 0.9;
    }
  }
  const placed = keepInside({ x, z }, floor, items, 0.28);
  const dx = centroid.x - placed.x;
  const dz = centroid.z - placed.z;
  return { ...placed, yaw: Math.atan2(-dx, -dz) };
}

function pushInside(x: number, z: number, polygon: PlanPoint[], margin: number): WalkerPose {
  if (polygon.length < 3) return { x, z };
  let nearest: { dist: number; x: number; z: number; nx: number; nz: number } | null = null;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz || 1e-8;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len2));
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const dist = Math.hypot(x - px, z - pz);
    const len = Math.hypot(dx, dz) || 1;
    let nx = -dz / len;
    let nz = dx / len;
    if (!pointInPolygon(px + nx * 0.05, pz + nz * 0.05, polygon)) {
      nx = -nx;
      nz = -nz;
    }
    if (!nearest || dist < nearest.dist) nearest = { dist, x: px, z: pz, nx, nz };
  }
  if (!nearest) return { x, z };
  if (!pointInPolygon(x, z, polygon)) {
    return { x: nearest.x + nearest.nx * margin, z: nearest.z + nearest.nz * margin };
  }
  if (nearest.dist < margin) {
    const push = margin - nearest.dist;
    return { x: x + nearest.nx * push, z: z + nearest.nz * push };
  }
  return { x, z };
}

function itemFrame(item: SceneItem) {
  const ry = planDegreesToRotationY(item.rotation);
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const hx = item.size[0] / 2;
  const hz = item.size[2] / 2;
  return {
    c,
    s,
    hx,
    hz,
    cx: item.origin.x + hx * c + hz * s,
    cz: item.origin.z - hx * s + hz * c,
  };
}

function overlapsItem(x: number, z: number, item: SceneItem, radius: number): boolean {
  const frame = itemFrame(item);
  const localX = frame.c * (x - frame.cx) - frame.s * (z - frame.cz);
  const localZ = frame.s * (x - frame.cx) + frame.c * (z - frame.cz);
  return Math.abs(localX) < frame.hx + radius && Math.abs(localZ) < frame.hz + radius;
}

function exitCandidates(x: number, z: number, item: SceneItem, radius: number): WalkerPose[] {
  const frame = itemFrame(item);
  const localX = frame.c * (x - frame.cx) - frame.s * (z - frame.cz);
  const localZ = frame.s * (x - frame.cx) + frame.c * (z - frame.cz);
  const padX = frame.hx + radius;
  const padZ = frame.hz + radius;
  const locals = [
    { x: Math.sign(localX || 1) * padX, z: localZ },
    { x: -Math.sign(localX || 1) * padX, z: localZ },
    { x: localX, z: Math.sign(localZ || 1) * padZ },
    { x: localX, z: -Math.sign(localZ || 1) * padZ },
  ];
  return locals.map((local) => ({
    x: frame.cx + frame.c * local.x + frame.s * local.z,
    z: frame.cz - frame.s * local.x + frame.c * local.z,
  }));
}

function pushOutOfItem(x: number, z: number, item: SceneItem, radius: number): WalkerPose {
  const [first] = exitCandidates(x, z, item, radius);
  return first ?? { x, z };
}

function sampleKitchen(): KitchenDesign {
  return {
    room: {
      points: [
        { x: 0, y: 0 },
        { x: 3600, y: 0 },
        { x: 3600, y: 3000 },
        { x: 0, y: 3000 },
      ],
      height: 2400,
    },
    fixtures: [
      { id: "sample-window", type: "window", wallIndex: 0, t: 0.55, width: 1400 },
      { id: "sample-door", type: "door", wallIndex: 3, t: 0.62, width: 900 },
      { id: "sample-socket-a", type: "socket", wallIndex: 1, t: 0.35 },
      { id: "sample-socket-b", type: "socket", wallIndex: 1, t: 0.62 },
      { id: "sample-switch", type: "switch", wallIndex: 2, t: 0.22 },
      { id: "sample-pendant", type: "pendant", position: { x: 1700, y: 1400 } },
    ],
    carcasses: [
      carcass("sample-sink", 400, "sink", "Sink"),
      carcass("sample-hob", 1000, "hob", "Hob"),
      carcass("sample-base", 1600, null, "Base unit"),
      {
        ...carcass("sample-fridge", 2800, "fridge", "Fridge"),
        mount: "tall",
        fittingType: "larder",
        fittingLabel: "Larder",
      },
    ],
    furniture: [
      {
        id: "sample-table",
        type: "dining-table",
        label: "Dining table",
        position: { x: 900, y: 800 },
        width: 1400,
        depth: 800,
        rotation: 0,
        seats: 4,
      },
    ],
    colours: {
      cabinets: "#C9B79C",
      countertops: "#2E2620",
      walls: "#F7F1E8",
      floor: "#E4D3BA",
      backsplash: "#EFE2D0",
      handles: "#5B4A38",
    },
    materials: {
      cabinetFinish: "Shaker",
      countertopMaterial: "Black granite",
      flooringStyle: "Natural oak",
      backsplashStyle: "Plain",
    },
  };
}

function carcass(
  id: string,
  x: number,
  appliance: Carcass["applianceType"],
  label: string,
): Carcass {
  return {
    id,
    size: 600,
    depth: 600,
    mount: "floor",
    position: { x, y: 2400 },
    rotation: 0,
    fittingType: "plain",
    fittingLabel: "",
    applianceType: appliance,
    applianceLabel: appliance ? label : null,
    label: appliance ? "" : label,
  };
}
