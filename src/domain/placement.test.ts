import { describe, expect, it } from "vitest";
import { snapCarcassToNearestWall } from "./placement";
import { startingRoomShape } from "./room-shape";
import type { Vec2 } from "./types";

/** Even-odd ray cast. Plan y grows downward, matching the room outlines. */
function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const current = polygon[i];
    const previous = polygon[j];
    const crosses = current.y > point.y !== previous.y > point.y;
    if (!crosses) continue;
    const xAtY =
      ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (point.x < xAtY) inside = !inside;
  }
  return inside;
}

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

  it("rotates onto a wall and insets half the depth along the inward normal", () => {
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
      position: { x: 1500, y: 800 },
      rotation: 342,
    });
  });

  it("flips the inset when the outline is wound the other way", () => {
    const reversed = [...room].reverse();
    const snapped = snapCarcassToNearestWall(reversed, { x: 2012, y: 2601 }, 600);
    expect(snapped).toEqual({ position: { x: 2000, y: 2700 }, rotation: 0 });
    expect(pointInPolygon(snapped.position, reversed)).toBe(true);
  });
});

describe("concave wall snap", () => {
  const uRoom = startingRoomShape("U-shape 4m x 3m");

  it("insets a U-room notch click (2000, 1100) to (2000, 900)", () => {
    expect(uRoom).toEqual([
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 2600, y: 3000 },
      { x: 2600, y: 1200 },
      { x: 1400, y: 1200 },
      { x: 1400, y: 3000 },
      { x: 0, y: 3000 },
    ]);
    const snapped = snapCarcassToNearestWall(uRoom, { x: 2000, y: 1100 }, 600);
    expect(snapped).toEqual({ position: { x: 2000, y: 900 }, rotation: 180 });
    expect(pointInPolygon(snapped.position, uRoom)).toBe(true);
    expect(pointInPolygon({ x: 2000, y: 1500 }, uRoom)).toBe(false);
  });

  it("insets a U-room leg click (2700, 2500) to (2900, 2500)", () => {
    const snapped = snapCarcassToNearestWall(uRoom, { x: 2700, y: 2500 }, 600);
    expect(snapped).toEqual({ position: { x: 2900, y: 2500 }, rotation: 270 });
    expect(pointInPolygon(snapped.position, uRoom)).toBe(true);
    expect(pointInPolygon({ x: 2350, y: 2350 }, uRoom)).toBe(false);
  });

  it("insets an L-room re-entrant wall along the inward normal", () => {
    const lRoom = startingRoomShape("L-shape 4m x 3m");
    const snapped = snapCarcassToNearestWall(lRoom, { x: 2300, y: 600 }, 600);
    expect(snapped).toEqual({ position: { x: 2100, y: 600 }, rotation: 90 });
    expect(pointInPolygon(snapped.position, lRoom)).toBe(true);
  });

  it("breaks an outer-corner tie toward the earlier wall and stays inside", () => {
    // (50, 50) is 50 mm from both walls that meet at the outer corner (0, 0).
    // The top wall is earlier in the winding, so the tie uses rotation 0.
    const snapped = snapCarcassToNearestWall(uRoom, { x: 50, y: 50 }, 600);
    expect(snapped).toEqual({ position: { x: 50, y: 300 }, rotation: 0 });
    expect(pointInPolygon(snapped.position, uRoom)).toBe(true);
  });

  it("insets the U notch corner near (2550, 1150) along the nearer wall", () => {
    // 50 mm from the notch ceiling and about 71 mm from the inner leg, so the
    // ceiling wins and the half-depth inset steps up into the room.
    const snapped = snapCarcassToNearestWall(uRoom, { x: 2550, y: 1150 }, 600);
    expect(snapped).toEqual({ position: { x: 2550, y: 900 }, rotation: 180 });
    expect(pointInPolygon(snapped.position, uRoom)).toBe(true);
  });
});

describe("reversed-winding U room", () => {
  const reversed = [...startingRoomShape("U-shape 4m x 3m")].reverse();

  it("insets the same U clicks into the room when the outline is wound the other way", () => {
    expect(reversed[0]).toEqual({ x: 0, y: 3000 });
    const cases: { click: Vec2; position: Vec2; rotation: number }[] = [
      { click: { x: 2000, y: 1100 }, position: { x: 2000, y: 900 }, rotation: 0 },
      { click: { x: 2700, y: 2500 }, position: { x: 2900, y: 2500 }, rotation: 90 },
      { click: { x: 2550, y: 1150 }, position: { x: 2550, y: 900 }, rotation: 0 },
      { click: { x: 50, y: 50 }, position: { x: 50, y: 300 }, rotation: 180 },
    ];

    for (const { click, position, rotation } of cases) {
      const snapped = snapCarcassToNearestWall(reversed, click, 600);
      expect(snapped).toEqual({ position, rotation });
      expect(pointInPolygon(position, reversed)).toBe(true);
    }
  });
});

describe("snapped carcass stays inside the outline", () => {
  it("keeps the half-depth inset inside rectangle, L, U, and galley shapes", () => {
    const cases: { name: string; shape: Vec2[]; click: Vec2 }[] = [
      { name: "rectangle", shape: startingRoomShape("4m x 3m"), click: { x: 2000, y: 2900 } },
      { name: "L", shape: startingRoomShape("L-shape 4m x 3m"), click: { x: 2300, y: 600 } },
      { name: "U", shape: startingRoomShape("U-shape 4m x 3m"), click: { x: 2000, y: 1100 } },
      { name: "galley", shape: startingRoomShape("galley 4m x 3m"), click: { x: 200, y: 1200 } },
    ];

    for (const { name, shape, click } of cases) {
      const snapped = snapCarcassToNearestWall(shape, click, 600);
      expect({ name, inside: pointInPolygon(snapped.position, shape) }).toEqual({
        name,
        inside: true,
      });
    }
  });
});
