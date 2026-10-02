// Door leaves for a carcass front. Pure layout so the mesh builder and the
// tests share one reading of cabinetFinish, fitting, and mount.

import type { DoorProfile } from "./plan-scene";

export interface DoorLeafSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  profile: DoorProfile;
  beads: boolean;
  handle: "vertical" | "horizontal";
  handleSide: "left" | "right" | "center";
}

export function cabinetLeaves(item: {
  size: [number, number, number];
  profile?: DoorProfile;
  fitting?: string;
  mount?: "floor" | "wall" | "tall";
  showFront?: boolean;
}): DoorLeafSpec[] | null {
  if (item.showFront === false) return null;
  const profile = item.profile ?? "slab";
  const width = item.size[0];
  const height = item.size[1];
  const margin = 0.01;
  const gap = 0.005;
  const innerW = Math.max(0.05, width - margin * 2);
  const innerH = Math.max(0.05, height - margin * 2);
  const beads = profile === "beadboard";
  const drawers =
    item.fitting === "drawer" || item.fitting === "cutlery" || item.fitting === "spice";

  if (drawers) {
    const count = height > 0.65 ? 3 : 2;
    const leafH = (innerH - gap * (count - 1)) / count;
    return Array.from({ length: count }, (_, index) => ({
      x: margin,
      y: margin + index * (leafH + gap),
      w: innerW,
      h: leafH,
      profile,
      beads,
      handle: "horizontal" as const,
      handleSide: "center" as const,
    }));
  }

  const cols = width >= 0.75 ? 2 : 1;
  const rows = item.mount === "tall" || height > 1.25 ? 2 : 1;
  const leafW = (innerW - gap * (cols - 1)) / cols;
  const leafH = (innerH - gap * (rows - 1)) / rows;
  const leaves: DoorLeafSpec[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      leaves.push({
        x: margin + col * (leafW + gap),
        y: margin + row * (leafH + gap),
        w: leafW,
        h: leafH,
        profile,
        beads,
        handle: "vertical",
        handleSide: cols === 1 ? "right" : col === 0 ? "right" : "left",
      });
    }
  }
  return leaves;
}
