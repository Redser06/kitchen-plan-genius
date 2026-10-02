import { describe, expect, it } from "vitest";
import type { Carcass } from "./types";
import { rotatedFootprintCenter, workTriangleOf } from "./geometry";

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
