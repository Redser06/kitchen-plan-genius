import { describe, expect, it } from "vitest";
import type { KitchenDesign } from "../../domain/types";
import {
  buildWalkthroughScene,
  constrainWalker,
  EYE_HEIGHT,
  pointInPolygon,
  polygonCentroid,
} from "./plan-scene";

function design(overrides: Partial<KitchenDesign> = {}): KitchenDesign {
  return {
    room: {
      points: [
        { x: 0, y: 0 },
        { x: 4200, y: 0 },
        { x: 4200, y: 3200 },
        { x: 0, y: 3200 },
      ],
      height: 2400,
    },
    fixtures: [{ id: "door", type: "door", wallIndex: 0, t: 0.5, width: 900 }],
    carcasses: [
      {
        id: "base",
        size: 600,
        depth: 600,
        mount: "floor",
        position: { x: 200, y: 2600 },
        rotation: 0,
        fittingType: "drawer",
        fittingLabel: "Drawer",
        applianceType: "hob",
        applianceLabel: "Hob",
      },
      {
        id: "upper",
        size: 600,
        depth: 500,
        mount: "wall",
        position: { x: 200, y: 2600 },
        rotation: 0,
        fittingType: "plain",
        fittingLabel: "",
        applianceType: null,
        applianceLabel: null,
      },
    ],
    furniture: [],
    colours: {
      cabinets: "#C9B79C",
      countertops: "#2E2620",
      walls: "#F8F3EA",
      floor: "#E4D3BA",
      backsplash: "#EFE2D0",
      handles: "#5B4A38",
    },
    materials: {
      cabinetFinish: "Shaker",
      countertopMaterial: "Black Granite",
      flooringStyle: "Natural Oak",
      backsplashStyle: "Plain",
    },
    ...overrides,
  };
}

describe("buildWalkthroughScene", () => {
  it("turns a millimetre plan into a metre-scale room with walls, a slab, and a zone", () => {
    const scene = buildWalkthroughScene(design());

    expect(scene.usedSample).toBe(false);
    expect(scene.siteName).toBeTruthy();
    expect(scene.walls.map((wall) => Number(wall.length.toFixed(1)))).toEqual([4.2, 3.2, 4.2, 3.2]);
    expect(scene.slab.polygon).toHaveLength(4);
    expect(scene.zone.name).toBe("Kitchen");
    expect(scene.ceilingHeight).toBeCloseTo(2.4);
    expect(scene.openings.map((opening) => opening.kind)).toContain("door");
    expect(scene.solids.some((solid) => solid.size[1] < scene.ceilingHeight - 0.1)).toBe(true);
    expect(pointInPolygon(scene.spawn.x, scene.spawn.z, scene.zone.polygon)).toBe(true);
  });

  it("stacks a floor cabinet into plinth, carcass, and countertop", () => {
    const scene = buildWalkthroughScene(design());
    const plinth = scene.items.find((item) => item.id === "base-plinth");
    const carcass = scene.items.find((item) => item.id === "base");
    const top = scene.items.find((item) => item.id === "base-top");
    const hob = scene.items.find((item) => item.id === "base-hob");
    const upper = scene.items.find((item) => item.id === "upper");

    expect(carcass).toMatchObject({ origin: { x: 0.2, z: 2.6 }, blocksWalk: true });
    expect(plinth).toBeDefined();
    expect(top).toBeDefined();
    expect(upper).toBeDefined();
    if (!plinth || !carcass || !top || !upper) return;
    expect(plinth.elevation).toBe(0);
    expect(carcass.elevation).toBeGreaterThan(plinth.elevation);
    expect(top.elevation).toBeGreaterThan(carcass.elevation + carcass.size[1] - 0.001);
    expect(top.origin.z).toBeLessThan(carcass.origin.z);
    expect(hob?.role).toBe("appliance");
    expect(upper).toMatchObject({ blocksWalk: false });
    expect(upper.elevation).toBeGreaterThan(1.2);
  });

  it("uses a furnished sample when the room polygon is missing", () => {
    const scene = buildWalkthroughScene(design({ room: { points: [], height: 2400 } }));

    expect(scene.usedSample).toBe(true);
    expect(scene.walls.length).toBeGreaterThanOrEqual(4);
    expect(scene.items.some((item) => item.role === "cabinet")).toBe(true);
    expect(pointInPolygon(scene.spawn.x, scene.spawn.z, scene.zone.polygon)).toBe(true);
  });

  it("keeps an empty but valid room walkable", () => {
    const scene = buildWalkthroughScene(design({ carcasses: [], fixtures: [], furniture: [] }));
    expect(scene.usedSample).toBe(false);
    expect(scene.items.filter((item) => item.role === "cabinet")).toHaveLength(0);
    expect(scene.walls).toHaveLength(4);
  });
});

describe("constrainWalker", () => {
  it("pushes a walker back inside the room and out of a base cabinet", () => {
    const scene = buildWalkthroughScene(design());
    const outside = constrainWalker({ x: -1, z: 1.5 }, scene);
    const insideCabinet = constrainWalker({ x: 0.5, z: 2.9 }, scene);
    const centroid = polygonCentroid(scene.zone.polygon);

    expect(pointInPolygon(outside.x, outside.z, scene.zone.polygon)).toBe(true);
    expect(pointInPolygon(insideCabinet.x, insideCabinet.z, scene.zone.polygon)).toBe(true);
    expect(Math.hypot(insideCabinet.x - 0.5, insideCabinet.z - 2.9)).toBeGreaterThan(0.15);
    expect(pointInPolygon(centroid.x, centroid.z, scene.zone.polygon)).toBe(true);
    expect(EYE_HEIGHT).toBeGreaterThan(1.4);
  });
});
