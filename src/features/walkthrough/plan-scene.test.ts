import { describe, expect, it } from "vitest";
import type { KitchenDesign } from "../../domain/types";
import { wallCutawayOpacity } from "./cutaway";
import {
  buildWalkthroughScene,
  constrainWalker,
  EYE_HEIGHT,
  offsetOrigin,
  planDegreesToRotationY,
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

function edgeLengths(points: { x: number; z: number }[]) {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return Number(Math.hypot(next.x - point.x, next.z - point.z).toFixed(1));
  });
}

describe("buildWalkthroughScene", () => {
  it("turns a millimetre plan into a metre-scale floor the walker can stand on", () => {
    const scene = buildWalkthroughScene(design());

    expect(scene.usedSample).toBe(false);
    expect(edgeLengths(scene.floor)).toEqual([4.2, 3.2, 4.2, 3.2]);
    expect(scene.ceilingHeight).toBeCloseTo(2.4);
    expect(scene.solids.some((solid) => solid.size[1] < scene.ceilingHeight - 0.1)).toBe(true);
    expect(pointInPolygon(scene.spawn.x, scene.spawn.z, scene.floor)).toBe(true);
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
    expect(scene.floor.length).toBeGreaterThanOrEqual(4);
    expect(scene.items.some((item) => item.role === "cabinet")).toBe(true);
    expect(pointInPolygon(scene.spawn.x, scene.spawn.z, scene.floor)).toBe(true);
  });

  it("keeps an empty but valid room walkable", () => {
    const scene = buildWalkthroughScene(design({ carcasses: [], fixtures: [], furniture: [] }));
    const fullHeight = scene.solids.filter(
      (solid) => Math.abs(solid.size[1] - scene.ceilingHeight) < 0.01,
    );
    expect(scene.usedSample).toBe(false);
    expect(scene.items.filter((item) => item.role === "cabinet")).toHaveLength(0);
    expect(fullHeight.map((solid) => Number(solid.size[0].toFixed(1))).sort()).toEqual([
      3.2, 3.2, 4.2, 4.2,
    ]);
  });

  it("splits door and window walls into piers, a sill, and lintels", () => {
    const scene = buildWalkthroughScene(
      design({
        carcasses: [],
        furniture: [],
        fixtures: [
          { id: "door", type: "door", wallIndex: 0, t: 0.5, width: 900 },
          { id: "window", type: "window", wallIndex: 1, t: 0.4, width: 1200 },
        ],
      }),
    );
    const short = scene.solids.filter((solid) => solid.size[1] < scene.ceilingHeight - 0.05);
    const sill = short.find((solid) => solid.center[1] < 0.6 && solid.size[1] < 1.2);
    const lintels = short.filter((solid) => solid.center[1] > 1.8);
    const piers = scene.solids.filter(
      (solid) => Math.abs(solid.size[1] - scene.ceilingHeight) < 0.01,
    );

    expect(sill).toBeDefined();
    expect(sill?.size[1]).toBeCloseTo(0.9, 1);
    expect(lintels.length).toBeGreaterThanOrEqual(2);
    expect(piers.length).toBeGreaterThanOrEqual(2);
    expect(piers.some((solid) => solid.size[0] < 3)).toBe(true);
  });

  it("spawns just inside the door and looks toward the room centre", () => {
    const scene = buildWalkthroughScene(design({ carcasses: [], furniture: [] }));
    const centre = polygonCentroid(scene.floor);
    const dx = centre.x - scene.spawn.x;
    const dz = centre.z - scene.spawn.z;
    const forwardX = -Math.sin(scene.spawn.yaw);
    const forwardZ = -Math.cos(scene.spawn.yaw);

    expect(scene.spawn.x).toBeCloseTo(2.1, 1);
    expect(scene.spawn.z).toBeCloseTo(0.9, 1);
    expect(pointInPolygon(scene.spawn.x, scene.spawn.z, scene.floor)).toBe(true);
    expect(forwardX * dx + forwardZ * dz).toBeGreaterThan(0);
  });

  it("paints cabinet fronts from the finish and covers them with a fridge face", () => {
    const shaker = buildWalkthroughScene(design());
    expect(shaker.items.find((item) => item.id === "base")).toMatchObject({
      profile: "shaker",
      showFront: true,
    });
    expect(shaker.items.find((item) => item.id === "base-hob")?.appliance).toBe("hob");

    const beadboard = buildWalkthroughScene(
      design({
        materials: { ...design().materials, cabinetFinish: "Beadboard" },
      }),
    );
    const slab = buildWalkthroughScene(
      design({
        materials: { ...design().materials, cabinetFinish: "Slab" },
      }),
    );
    expect(beadboard.items.find((item) => item.id === "base")?.profile).toBe("beadboard");
    expect(slab.items.find((item) => item.id === "base")?.profile).toBe("slab");

    const housed = buildWalkthroughScene(
      design({
        carcasses: [
          {
            id: "fridge",
            size: 600,
            depth: 600,
            mount: "tall",
            position: { x: 200, y: 200 },
            rotation: 0,
            fittingType: "larder",
            fittingLabel: "Larder",
            applianceType: "fridge",
            applianceLabel: "Fridge",
          },
        ],
      }),
    );
    const housing = housed.items.find((item) => item.id === "fridge" && item.role === "cabinet");
    expect(housing?.showFront).toBe(false);
    expect(housed.items.find((item) => item.role === "appliance")?.appliance).toBe("fridge");
  });

  it("places sockets inside the room and skips one that sits in a doorway", () => {
    const scene = buildWalkthroughScene(
      design({
        carcasses: [],
        furniture: [],
        fixtures: [
          { id: "door", type: "door", wallIndex: 0, t: 0.5, width: 900 },
          { id: "socket", type: "socket", wallIndex: 1, t: 0.5 },
          { id: "switch", type: "switch", wallIndex: 2, t: 0.25 },
          { id: "blocked", type: "socket", wallIndex: 0, t: 0.5 },
        ],
      }),
    );
    const socket = scene.items.find((item) => item.id === "socket");
    const switched = scene.items.find((item) => item.id === "switch");
    expect(socket?.role).toBe("socket");
    expect(switched?.role).toBe("switch");
    expect(scene.items.find((item) => item.id === "blocked")).toBeUndefined();
    if (!socket || !switched) return;

    const center = offsetOrigin(
      socket.origin,
      socket.rotation,
      socket.size[0] / 2,
      socket.size[2] / 2,
    );
    expect(pointInPolygon(center.x, center.z, scene.floor)).toBe(true);
    expect(center.x).toBeGreaterThan(4);
    expect(center.x).toBeLessThan(4.2);
    expect(socket.elevation).toBeGreaterThan(0.35);
    expect(socket.elevation).toBeLessThan(0.55);
    expect(switched.elevation).toBeGreaterThan(1);
  });

  it("matches the shared work triangle, including a unit rotated 90 degrees", () => {
    const scene = buildWalkthroughScene(
      design({
        carcasses: [
          {
            id: "sink",
            size: 600,
            depth: 600,
            mount: "floor",
            position: { x: 1000, y: 2000 },
            rotation: 90,
            fittingType: "plain",
            fittingLabel: "",
            applianceType: "sink",
            applianceLabel: "Sink",
          },
          {
            id: "hob",
            size: 600,
            depth: 600,
            mount: "floor",
            position: { x: 3000, y: 2000 },
            rotation: 0,
            fittingType: "plain",
            fittingLabel: "",
            applianceType: "hob",
            applianceLabel: "Hob",
          },
          {
            id: "fridge",
            size: 600,
            depth: 600,
            mount: "tall",
            position: { x: 4800, y: 800 },
            rotation: 0,
            fittingType: "larder",
            fittingLabel: "",
            applianceType: "fridge",
            applianceLabel: "Fridge",
          },
        ],
      }),
    );

    expect(scene.workTriangle?.sink.x).toBeCloseTo(0.7);
    expect(scene.workTriangle?.sink.z).toBeCloseTo(2.3);
    expect(scene.workTriangle?.hob.x).toBeCloseTo(3.3);
    expect(scene.workTriangle?.hob.z).toBeCloseTo(2.3);
    expect(scene.workTriangle?.elevation).toBeGreaterThan(0.8);
  });

  it("fades a wall the camera is outside, and a wall the walker is standing against", () => {
    const scene = buildWalkthroughScene(design({ carcasses: [], furniture: [] }));
    const south = scene.solids.filter((solid) => solid.outward.z < -0.5);
    expect(south.length).toBeGreaterThan(0);
    for (const solid of south) {
      expect(wallCutawayOpacity({ x: solid.center[0], z: -1.5 }, solid, "orbit")).toBeLessThan(0.2);
    }
    const pier = south.find((solid) => solid.size[1] > 2 && solid.center[0] < 1.5);
    expect(pier).toBeDefined();
    if (!pier) return;
    expect(wallCutawayOpacity({ x: pier.center[0], z: 1.6 }, pier, "walk")).toBe(1);
    expect(wallCutawayOpacity({ x: pier.center[0], z: 0.28 }, pier, "walk")).toBeLessThan(0.5);
  });
});

describe("constrainWalker", () => {
  it("pushes a walker back inside the room and out of a base cabinet", () => {
    const scene = buildWalkthroughScene(design());
    const outside = constrainWalker({ x: -1, z: 1.5 }, scene);
    const insideCabinet = constrainWalker({ x: 0.5, z: 2.9 }, scene);
    const centroid = polygonCentroid(scene.floor);

    expect(pointInPolygon(outside.x, outside.z, scene.floor)).toBe(true);
    expect(pointInPolygon(insideCabinet.x, insideCabinet.z, scene.floor)).toBe(true);
    expect(Math.hypot(insideCabinet.x - 0.5, insideCabinet.z - 2.9)).toBeGreaterThan(0.15);
    expect(pointInPolygon(centroid.x, centroid.z, scene.floor)).toBe(true);
    expect(EYE_HEIGHT).toBeGreaterThan(1.4);
  });

  it("pushes a walker out of a cabinet rotated 90 degrees on plan", () => {
    const scene = buildWalkthroughScene(
      design({
        fixtures: [],
        furniture: [],
        carcasses: [
          {
            id: "turned",
            size: 600,
            depth: 600,
            mount: "floor",
            position: { x: 1000, y: 1000 },
            rotation: 90,
            fittingType: "plain",
            fittingLabel: "",
            applianceType: null,
            applianceLabel: null,
          },
        ],
      }),
    );
    const inside = constrainWalker({ x: 0.7, z: 1.3 }, scene);
    const clear = constrainWalker({ x: 1.3, z: 1.3 }, scene);

    expect(Math.hypot(inside.x - 0.7, inside.z - 1.3)).toBeGreaterThan(0.15);
    expect(Math.hypot(clear.x - 1.3, clear.z - 1.3)).toBeLessThan(0.05);
    expect(pointInPolygon(inside.x, inside.z, scene.floor)).toBe(true);
  });
});

describe("plan orientation", () => {
  it("keeps planDegreesToRotationY and offsetOrigin on the same clockwise mapping", () => {
    expect(planDegreesToRotationY(0)).toBeCloseTo(0);
    expect(planDegreesToRotationY(90)).toBeCloseTo(-Math.PI / 2);

    const origin = { x: 1, z: 2 };
    const flat = offsetOrigin(origin, 0, 0, -0.02);
    expect(flat.x).toBeCloseTo(1);
    expect(flat.z).toBeCloseTo(1.98);
    const turned = offsetOrigin(origin, 90, 0, -0.02);
    expect(turned.x).toBeCloseTo(1.02);
    expect(turned.z).toBeCloseTo(2);

    const scene = buildWalkthroughScene(
      design({
        fixtures: [],
        furniture: [],
        carcasses: [
          {
            id: "base",
            size: 600,
            depth: 600,
            mount: "floor",
            position: { x: 1000, y: 2000 },
            rotation: 90,
            fittingType: "plain",
            fittingLabel: "",
            applianceType: null,
            applianceLabel: null,
          },
        ],
      }),
    );
    const carcass = scene.items.find((item) => item.id === "base");
    const top = scene.items.find((item) => item.id === "base-top");
    expect(carcass).toBeDefined();
    expect(top).toBeDefined();
    if (!carcass || !top) return;
    const overhang = offsetOrigin(carcass.origin, carcass.rotation, 0, -0.02);
    expect(top.origin.x).toBeCloseTo(overhang.x);
    expect(top.origin.z).toBeCloseTo(overhang.z);
    expect(top.rotation).toBe(90);
  });
});
