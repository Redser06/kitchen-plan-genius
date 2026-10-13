import type { Vec2 } from "./types";

const GRID_MM = 50;
/** A click at this distance or farther stays on the 50 mm grid with rotation 0. */
const WALL_SNAP_MM = 400;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_MM) * GRID_MM;
}

/** Twice the signed area. Positive matches the stored outlines, where y grows downward. */
function signedArea2(points: Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return sum;
}

/**
 * Unit normal pointing into the polygon.
 * A positive signed area keeps the interior on the left of each directed edge.
 * A reversed outline flips the normal so the inset still enters the room.
 */
function inwardNormal(p1: Vec2, p2: Vec2, positiveArea: boolean): Vec2 {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const left = { x: -dy / len, y: dx / len };
  return positiveArea ? left : { x: -left.x, y: -left.y };
}

/**
 * Place a floor carcass from a plan click.
 *
 * Within 400 mm of a wall, the unit rotates to that wall's angle and insets
 * half its depth along the wall's inward normal. Farther clicks only snap to
 * the 50 mm grid.
 */
export function snapCarcassToNearestWall(
  points: Vec2[],
  click: Vec2,
  depth = 600,
): { position: Vec2; rotation: number } {
  let nearestWall = -1;
  let nearestDist = WALL_SNAP_MM;
  let projected = click;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const t = Math.max(
      0,
      Math.min(1, ((click.x - p1.x) * dx + (click.y - p1.y) * dy) / (len * len)),
    );
    const proj = { x: p1.x + dx * t, y: p1.y + dy * t };
    const distance = Math.hypot(click.x - proj.x, click.y - proj.y);
    if (distance < nearestDist) {
      nearestDist = distance;
      nearestWall = i;
      projected = proj;
    }
  }

  if (nearestWall < 0) {
    return { position: { x: snapToGrid(click.x), y: snapToGrid(click.y) }, rotation: 0 };
  }

  const p1 = points[nearestWall];
  const p2 = points[(nearestWall + 1) % points.length];
  let rotation = Math.round((Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI);
  while (rotation < 0) rotation += 360;

  const inward = inwardNormal(p1, p2, signedArea2(points) >= 0);
  const offset = depth / 2;

  return {
    position: {
      x: snapToGrid(projected.x + inward.x * offset),
      y: snapToGrid(projected.y + inward.y * offset),
    },
    rotation,
  };
}
