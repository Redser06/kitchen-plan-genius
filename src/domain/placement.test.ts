import { describe, expect, it } from "vitest";
import { snapCarcassToNearestWall } from "./placement";
import type { Vec2 } from "./types";

const room: Vec2[] = [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 4000, y: 3000 },
  { x: 0, y: 3000 },
];

describe("snapCarcassToNearestWall", () => {
  it("keeps a click in the middle of the room on the 50 mm grid", () => {
    expect(snapCarcassToNearestWall(room, { x: 2000, y: 1524 })).toEqual({
      position: { x: 2000, y: 1500 },
      rotation: 0,
    });
  });

  it("does not snap at exactly 400 mm from a wall", () => {
    expect(snapCarcassToNearestWall(room, { x: 2000, y: 2600 })).toEqual({
      position: { x: 2000, y: 2600 },
      rotation: 0,
    });
  });

  it("rotates onto a wall and shifts half the depth toward the centroid", () => {
    expect(snapCarcassToNearestWall(room, { x: 2012, y: 2601 }, 600)).toEqual({
      position: { x: 2000, y: 2700 },
      rotation: 180,
    });
    expect(snapCarcassToNearestWall(room, { x: 3700, y: 1500 }, 600)).toEqual({
      position: { x: 3700, y: 1500 },
      rotation: 90,
    });
  });

  it("normalizes a negative wall angle into the 0–360 range", () => {
    const slanted: Vec2[] = [
      { x: 0, y: 1000 },
      { x: 3000, y: 0 },
      { x: 3000, y: 2500 },
      { x: 0, y: 2500 },
    ];
    expect(snapCarcassToNearestWall(slanted, { x: 1500, y: 800 }, 600)).toEqual({
      position: { x: 1400, y: 850 },
      rotation: 342,
    });
  });
});
