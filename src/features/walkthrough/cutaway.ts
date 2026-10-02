// Fade a wall when the camera is outside it (orbit cutaway) or close to its
// inner face (walk and orbit), so the room does not read as a closed box.

import type { WallSolid } from "./plan-scene";

export const WALL_CUTAWAY_OPACITY = 0.14;

export function wallCutawayOpacity(
  camera: { x: number; z: number },
  solid: WallSolid,
  mode: "orbit" | "walk",
): number {
  const halfThickness = solid.size[2] / 2;
  const innerX = solid.center[0] - solid.outward.x * halfThickness;
  const innerZ = solid.center[2] - solid.outward.z * halfThickness;
  const side = (camera.x - innerX) * solid.outward.x + (camera.z - innerZ) * solid.outward.z;

  if (side > -0.02) return WALL_CUTAWAY_OPACITY;

  const dirX = Math.cos(solid.rotationY);
  const dirZ = Math.sin(solid.rotationY);
  const along = (camera.x - solid.center[0]) * dirX + (camera.z - solid.center[2]) * dirZ;
  const beside = Math.abs(along) <= solid.size[0] / 2 + 0.4;
  if (!beside) return 1;

  const nearStart = mode === "walk" ? 0.95 : 0.7;
  const nearEnd = 0.18;
  const insideDistance = -side;
  if (insideDistance >= nearStart) return 1;
  if (insideDistance <= nearEnd) return WALL_CUTAWAY_OPACITY;
  const t = (insideDistance - nearEnd) / (nearStart - nearEnd);
  return WALL_CUTAWAY_OPACITY + t * (1 - WALL_CUTAWAY_OPACITY);
}
