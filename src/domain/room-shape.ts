import type { Vec2 } from "./types";

const DEFAULT_WIDTH_MM = 4200;
const DEFAULT_DEPTH_MM = 3200;
const GALLEY_MAX_DEPTH_MM = 2400;

/**
 * Starting outline for the room-shape panel.
 *
 * KitchenPlan parses a short description into a rectangle, L, U, or galley.
 * A size such as "4m x 3m" or "4m × 3m" sets width and depth; otherwise the
 * outline uses 4200 × 3200 mm. L is tested before U, and both before galley.
 */
export function startingRoomShape(input: string): Vec2[] {
  const text = input.toLowerCase();
  const match = input.match(/(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/i);
  const width = match ? Math.round(parseFloat(match[1]) * 1000) : DEFAULT_WIDTH_MM;
  const depth = match ? Math.round(parseFloat(match[2]) * 1000) : DEFAULT_DEPTH_MM;
  if (text.includes("l-shape") || text.includes("l shape")) {
    return [
      { x: 0, y: 0 },
      { x: width * 0.6, y: 0 },
      { x: width * 0.6, y: depth * 0.4 },
      { x: width, y: depth * 0.4 },
      { x: width, y: depth },
      { x: 0, y: depth },
    ];
  }
  if (text.includes("u-shape") || text.includes("u shape")) {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: depth },
      { x: width * 0.65, y: depth },
      { x: width * 0.65, y: depth * 0.4 },
      { x: width * 0.35, y: depth * 0.4 },
      { x: width * 0.35, y: depth },
      { x: 0, y: depth },
    ];
  }
  if (text.includes("galley")) {
    const galleyDepth = Math.min(depth, GALLEY_MAX_DEPTH_MM);
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: galleyDepth },
      { x: 0, y: galleyDepth },
    ];
  }
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: depth },
    { x: 0, y: depth },
  ];
}
