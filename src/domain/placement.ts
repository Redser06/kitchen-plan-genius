import type { Vec2 } from "./types";

const GRID_MM = 50;
/** A click at this distance or farther stays on the 50 mm grid with rotation 0. */
const WALL_SNAP_MM = 400;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_MM) * GRID_MM;
}

/**
 * Place a floor carcass from a plan click.
 *
 * Within 400 mm of a wall, the unit rotates to that wall's angle and shifts
 * half its depth toward the polygon centroid. Farther clicks only snap to
 * the 50 mm grid. Matches the 2D placement rule from KitchenPlan.
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

  const centroid = {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
  const wallMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const towardCenter = { x: centroid.x - wallMid.x, y: centroid.y - wallMid.y };
  const tcLen = Math.hypot(towardCenter.x, towardCenter.y) || 1;
  const offset = depth / 2;

  return {
    position: {
      x: snapToGrid(projected.x + (towardCenter.x / tcLen) * offset),
      y: snapToGrid(projected.y + (towardCenter.y / tcLen) * offset),
    },
    rotation,
  };
}
