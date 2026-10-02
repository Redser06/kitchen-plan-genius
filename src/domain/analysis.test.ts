import { describe, expect, it } from "vitest";
import type { Carcass, Furniture, KitchenDesign } from "./types";
import { computeAnalysis } from "./analysis";

const colours: KitchenDesign["colours"] = {
  cabinets: "#C9B79C",
  countertops: "#2E2620",
  walls: "#F8F3EA",
  floor: "#E4D3BA",
  backsplash: "#EFE2D0",
  handles: "#5B4A38",
};

const materials: KitchenDesign["materials"] = {
  cabinetFinish: "Shaker",
  countertopMaterial: "Black Granite",
  flooringStyle: "Natural Oak",
  backsplashStyle: "Plain",
};

function carcass(overrides: Partial<Carcass> & Pick<Carcass, "id">): Carcass {
  return {
    size: 600,
    depth: 600,
    mount: "floor",
    position: { x: 0, y: 0 },
    rotation: 0,
    fittingType: "plain",
    fittingLabel: "",
    applianceType: null,
    applianceLabel: null,
    ...overrides,
  };
}

function design(overrides: Partial<KitchenDesign> = {}): KitchenDesign {
  return {
    room: {
      points: [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 5000, y: 4000 },
        { x: 0, y: 4000 },
      ],
      height: 2400,
    },
    fixtures: [{ id: "socket", type: "socket", wallIndex: 0, t: 0.2 }],
    carcasses: [],
    furniture: [],
    colours,
    materials,
    ...overrides,
  };
}

describe("computeAnalysis", () => {
  function triangleLayout(sinkRotation: number): KitchenDesign {
    return design({
      fixtures: [
        { id: "socket", type: "socket", wallIndex: 0, t: 0.2 },
        { id: "water", type: "water", position: { x: -250, y: 500 } },
        { id: "waste", type: "waste", position: { x: -250, y: 500 } },
      ],
      carcasses: [
        carcass({
          id: "sink",
          position: { x: 0, y: 0 },
          size: 1000,
          depth: 500,
          rotation: sinkRotation,
          applianceType: "sink",
          applianceLabel: "Sink",
        }),
        carcass({
          id: "hob",
          position: { x: 2400, y: 0 },
          applianceType: "hob",
          applianceLabel: "Hob",
        }),
        carcass({
          id: "fridge",
          position: { x: 1200, y: 1800 },
          mount: "tall",
          applianceType: "fridge",
          applianceLabel: "Fridge",
        }),
      ],
    });
  }

  it("uses the rotated center so a 90 degree sink changes the triangle", () => {
    const turned = computeAnalysis(triangleLayout(90));
    const flat = computeAnalysis(triangleLayout(0));

    expect(turned.triangle?.sink.x).toBeCloseTo(-250, 6);
    expect(turned.triangle?.sink.y).toBeCloseTo(500, 6);
    expect(turned.triangle?.hob).toEqual({ x: 2700, y: 300 });
    expect(turned.triangle?.fridge).toEqual({ x: 1500, y: 2100 });
    expect(turned.triangle?.status).toBe("warning");
    expect(turned.issues.some((issue) => issue.id === "triangle")).toBe(true);

    expect(flat.triangle?.sink).toEqual({ x: 500, y: 250 });
    expect(flat.triangle?.status).toBe("ok");
    expect(flat.issues.some((issue) => issue.id === "triangle")).toBe(false);
  });

  it("rates walkway clearance from the cabinet run to the table", () => {
    const table: Furniture = {
      id: "table",
      type: "dining-table",
      label: "Table",
      position: { x: 1000, y: 1000 },
      width: 1800,
      depth: 900,
      rotation: 0,
    };
    const at = (y: number) =>
      computeAnalysis(
        design({
          carcasses: [carcass({ id: "run", position: { x: 0, y } })],
          furniture: [table],
        }),
      ).walkway;

    expect(at(2000)).toEqual({ clearance: 100, status: "error" });
    expect(at(2600)).toEqual({ clearance: 700, status: "warning" });
    expect(at(2900)).toEqual({ clearance: 1000, status: "ok" });
    expect(computeAnalysis(design({ furniture: [table] })).walkway).toBeNull();
  });

  it("warns when a sink center is more than 1.5m from water or waste", () => {
    const sink = carcass({
      id: "sink",
      position: { x: 0, y: 0 },
      applianceType: "sink",
      applianceLabel: "Sink",
    });
    const withWaste = (x: number) =>
      computeAnalysis(
        design({
          carcasses: [sink],
          fixtures: [
            { id: "socket", type: "socket", wallIndex: 0, t: 0.2 },
            { id: "water", type: "water", position: { x: 300, y: 300 } },
            { id: "waste", type: "waste", position: { x, y: 300 } },
          ],
        }),
      );

    expect(withWaste(1800).issues.some((issue) => issue.id === "plumbing-sink")).toBe(false);
    const far = withWaste(1801);
    expect(far.issues.find((issue) => issue.id === "plumbing-sink")).toMatchObject({
      severity: "warning",
    });
  });

  it("measures plumbing from the rotated center of a 90 degree sink", () => {
    const analysis = computeAnalysis(
      design({
        carcasses: [
          carcass({
            id: "sink",
            position: { x: 0, y: 0 },
            size: 1000,
            depth: 500,
            rotation: 90,
            applianceType: "sink",
            applianceLabel: "Sink",
          }),
        ],
        fixtures: [
          { id: "socket", type: "socket", wallIndex: 0, t: 0.2 },
          { id: "water", type: "water", position: { x: -250, y: 500 } },
          { id: "waste", type: "waste", position: { x: 1700, y: 250 } },
        ],
      }),
    );

    expect(analysis.issues.some((issue) => issue.id === "plumbing-sink")).toBe(true);
  });
});
