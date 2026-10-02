import { describe, expect, it } from "vitest";
import type { Carcass, KitchenDesign } from "./types";
import { rotatedFootprintCenter, sinkLacksNearbyPlumbing, workTriangleOf } from "./geometry";
import { useStore } from "../store/useStore";

function unit(
  id: string,
  appliance: Carcass["applianceType"],
  position: { x: number; y: number },
  rotation: number,
  size: Carcass["size"] = 600,
  depth: Carcass["depth"] = 600,
): Carcass {
  return {
    id,
    size,
    depth,
    mount: appliance === "fridge" ? "tall" : "floor",
    position,
    rotation,
    fittingType: "plain",
    fittingLabel: "",
    applianceType: appliance,
    applianceLabel: appliance,
  };
}

describe("rotatedFootprintCenter", () => {
  it("keeps an unrotated unit on position plus half the footprint", () => {
    expect(rotatedFootprintCenter({ x: 1000, y: 2000 }, 0, 600, 600)).toEqual({
      x: 1300,
      y: 2300,
    });
  });

  it("swings a 90 degree unit about its origin corner", () => {
    const center = rotatedFootprintCenter({ x: 1000, y: 2000 }, 90, 600, 600);
    expect(center.x).toBeCloseTo(700);
    expect(center.y).toBeCloseTo(2300);
    expect(center).not.toEqual({ x: 1300, y: 2300 });
  });

  it("uses depth along plan x when a non-square unit is turned 90 degrees", () => {
    const center = rotatedFootprintCenter({ x: 0, y: 0 }, 90, 1000, 500);
    expect(center.x).toBeCloseTo(-250);
    expect(center.y).toBeCloseTo(500);
  });
});

describe("workTriangleOf", () => {
  it("uses the rotated footprint centre for each station", () => {
    const triangle = workTriangleOf([
      unit("sink", "sink", { x: 1000, y: 2000 }, 90),
      unit("hob", "hob", { x: 3000, y: 2000 }, 0),
      unit("fridge", "fridge", { x: 4800, y: 800 }, 0),
    ]);

    expect(triangle).not.toBeNull();
    if (!triangle) return;
    expect(triangle.sink.x).toBeCloseTo(700);
    expect(triangle.sink.y).toBeCloseTo(2300);
    expect(triangle.hob).toEqual({ x: 3300, y: 2300 });
    expect(triangle.fridge).toEqual({ x: 5100, y: 1100 });
    expect(triangle.sink).not.toEqual({ x: 1300, y: 2300 });
  });

  it("flags a leg outside 1.2–2.7 m and accepts a leg inside that range", () => {
    const tight = workTriangleOf([
      unit("sink", "sink", { x: 0, y: 0 }, 0),
      unit("hob", "hob", { x: 500, y: 0 }, 0),
      unit("fridge", "fridge", { x: 2000, y: 0 }, 0),
    ]);
    const easy = workTriangleOf([
      unit("sink", "sink", { x: 0, y: 0 }, 0),
      unit("hob", "hob", { x: 1500, y: 0 }, 0),
      unit("fridge", "fridge", { x: 1500, y: 1800 }, 0),
    ]);

    expect(tight?.status).toBe("warning");
    expect(easy?.status).toBe("ok");
  });
});

describe("computeAnalysis work triangle", () => {
  it("stores the rotated centre for a 90 degree sink", () => {
    const previous = useStore.getState().design;
    const design: KitchenDesign = {
      ...previous,
      carcasses: [
        unit("sink", "sink", { x: 1000, y: 2000 }, 90),
        unit("hob", "hob", { x: 3000, y: 2000 }, 0),
        unit("fridge", "fridge", { x: 4800, y: 800 }, 0),
      ],
    };

    useStore.getState().setDesign(design);
    const triangle = useStore.getState().analysis?.triangle;
    expect(triangle?.sink.x).toBeCloseTo(700);
    expect(triangle?.sink.y).toBeCloseTo(2300);
    expect(triangle?.sink).not.toEqual({ x: 1300, y: 2300 });

    useStore.getState().setDesign(previous);
  });

  it("flags plumbing from the rotated centre of a 90 degree sink", () => {
    const previous = useStore.getState().design;
    const sink = unit("sink", "sink", { x: 1000, y: 2000 }, 90);
    // 1450 mm from the rotated centre (700, 2300), about 1569 mm from the unrotated centre (1300, 2300).
    const besideRotated = { x: 700, y: 3750 };
    const besideUnrotated = { x: 1300, y: 3750 };
    const plumbing = (position: { x: number; y: number }) => [
      { id: "water", type: "water" as const, position },
      { id: "waste", type: "waste" as const, position },
    ];

    expect(sinkLacksNearbyPlumbing(sink, plumbing(besideRotated), plumbing(besideRotated))).toBe(
      false,
    );
    expect(
      sinkLacksNearbyPlumbing(sink, plumbing(besideUnrotated), plumbing(besideUnrotated)),
    ).toBe(true);

    useStore.getState().setDesign({
      ...previous,
      carcasses: [sink],
      fixtures: plumbing(besideRotated),
    });
    expect(
      useStore.getState().analysis?.issues.some((issue) => issue.id === "plumbing-sink"),
    ).toBe(false);

    useStore.getState().setDesign({
      ...previous,
      carcasses: [sink],
      fixtures: plumbing(besideUnrotated),
    });
    expect(
      useStore.getState().analysis?.issues.some((issue) => issue.id === "plumbing-sink"),
    ).toBe(true);

    useStore.getState().setDesign(previous);
  });

  it("no longer keeps the removed walk-waypoint index", () => {
    const state = useStore.getState();
    expect("walkIndex" in state).toBe(false);
    expect("setWalkIndex" in state).toBe(false);
  });
});
