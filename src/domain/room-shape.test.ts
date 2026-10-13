import { describe, expect, it } from "vitest";
import { startingRoomShape } from "./room-shape";

describe("startingRoomShape", () => {
  it("uses a 4200 by 3200 rectangle when the text has no size", () => {
    expect(startingRoomShape("a plain kitchen")).toEqual([
      { x: 0, y: 0 },
      { x: 4200, y: 0 },
      { x: 4200, y: 3200 },
      { x: 0, y: 3200 },
    ]);
  });

  it("reads metres with x or a times sign", () => {
    expect(startingRoomShape("5m x 4m")).toEqual([
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
      { x: 5000, y: 4000 },
      { x: 0, y: 4000 },
    ]);
    expect(startingRoomShape("4.5m × 3.5m")[2]).toEqual({ x: 4500, y: 3500 });
  });

  it("builds an L before a U, and a U before a galley", () => {
    const lShape = startingRoomShape("L-shape 4m x 3m");
    expect(lShape).toEqual([
      { x: 0, y: 0 },
      { x: 2400, y: 0 },
      { x: 2400, y: 1200 },
      { x: 4000, y: 1200 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ]);
    expect(startingRoomShape("l shape galley")).toEqual(startingRoomShape("L shape"));

    expect(startingRoomShape("U-shape 4m x 3m")).toEqual([
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 2600, y: 3000 },
      { x: 2600, y: 1200 },
      { x: 1400, y: 1200 },
      { x: 1400, y: 3000 },
      { x: 0, y: 3000 },
    ]);
  });

  it("caps a galley at 2400 mm deep and keeps a shallower one", () => {
    expect(startingRoomShape("Galley kitchen, 3m x 2.5m")).toEqual([
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 2400 },
      { x: 0, y: 2400 },
    ]);
    expect(startingRoomShape("galley 3m x 2m")[2]).toEqual({ x: 3000, y: 2000 });
  });
});
