// Plan geometry shared by the 2D analysis and the 3D walkthrough.
//
// Measurements stay in millimetres. Positive rotation is clockwise degrees
// about the footprint's origin corner, matching the SVG plan and
// planDegreesToRotationY (local +x is width, local +y is depth).

import type { Carcass, Severity, Vec2 } from "./types";

export function offsetPlanPoint(
  origin: Vec2,
  rotationDeg: number,
  localX: number,
  localY: number,
): Vec2 {
  const ry = (-rotationDeg * Math.PI) / 180;
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  return {
    x: origin.x + localX * c + localY * s,
    y: origin.y - localX * s + localY * c,
  };
}

/** Centre of a rotated footprint. That point is also the centre of its axis-aligned bounds. */
export function rotatedFootprintCenter(
  origin: Vec2,
  rotationDeg: number,
  width: number,
  depth: number,
): Vec2 {
  return offsetPlanPoint(origin, rotationDeg, width / 2, depth / 2);
}

export interface WorkTriangle {
  sink: Vec2;
  hob: Vec2;
  fridge: Vec2;
  perimeter: number;
  status: Extract<Severity, "ok" | "warning">;
}

const LEG_MIN = 1200;
const LEG_MAX = 2700;
const PERIMETER_MAX = 6600;

export function workTriangleOf(carcasses: Carcass[]): WorkTriangle | null {
  const sinkC = carcasses.find((carcass) => carcass.applianceType === "sink");
  const hobC = carcasses.find((carcass) => carcass.applianceType === "hob");
  const fridgeC = carcasses.find(
    (carcass) => carcass.applianceType === "fridge" || carcass.applianceType === "fridge-american",
  );
  if (!sinkC || !hobC || !fridgeC) return null;

  const sink = station(sinkC);
  const hob = station(hobC);
  const fridge = station(fridgeC);
  const legs = [distance(sink, hob), distance(hob, fridge), distance(fridge, sink)];
  const perimeter = legs[0] + legs[1] + legs[2];
  const status =
    perimeter > PERIMETER_MAX || legs.some((leg) => leg < LEG_MIN || leg > LEG_MAX)
      ? "warning"
      : "ok";
  return { sink, hob, fridge, perimeter, status };
}

function station(carcass: Carcass): Vec2 {
  return rotatedFootprintCenter(
    carcass.position,
    carcass.rotation || 0,
    carcass.size,
    carcass.depth,
  );
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
