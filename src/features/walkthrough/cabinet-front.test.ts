import { describe, expect, it } from "vitest";
import { cabinetLeaves } from "./cabinet-front";
import type { DoorProfile } from "./plan-scene";

function front(
  profile: DoorProfile,
  fitting: string,
  mount: "floor" | "wall" | "tall",
  size: [number, number, number],
  showFront = true,
) {
  return { size, profile, fitting, mount, showFront };
}

describe("cabinetLeaves", () => {
  it("builds one shaker door for a 600mm base unit", () => {
    const leaves = cabinetLeaves(front("shaker", "plain", "floor", [0.6, 0.72, 0.6]));
    expect(leaves).toHaveLength(1);
    expect(leaves?.[0]).toMatchObject({ profile: "shaker", beads: false, handle: "vertical" });
  });

  it("marks beadboard grooves and keeps a slab door flat", () => {
    expect(cabinetLeaves(front("beadboard", "plain", "floor", [0.6, 0.72, 0.6]))?.[0].beads).toBe(
      true,
    );
    expect(cabinetLeaves(front("slab", "plain", "wall", [0.6, 0.72, 0.35]))?.[0]).toMatchObject({
      profile: "slab",
      beads: false,
    });
  });

  it("stacks drawer fronts and splits a tall cabinet", () => {
    const drawers = cabinetLeaves(front("shaker", "drawer", "floor", [0.6, 0.72, 0.6]));
    expect(drawers && drawers.length).toBeGreaterThan(1);
    expect(drawers?.every((leaf) => leaf.handle === "horizontal")).toBe(true);

    const tall = cabinetLeaves(front("shaker", "larder", "tall", [0.6, 2.1, 0.6]));
    expect(tall).toHaveLength(2);
    expect(tall?.[0].profile).toBe("shaker");
  });

  it("skips the front when an appliance face replaces the doors", () => {
    expect(cabinetLeaves(front("shaker", "plain", "tall", [0.6, 2.1, 0.6], false))).toBeNull();
  });
});
