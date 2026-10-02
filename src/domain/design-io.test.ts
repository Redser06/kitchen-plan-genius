import { describe, expect, it } from "vitest";
import type { KitchenDesign } from "./types";
import {
  parseDesignText,
  parsePersistedDesign,
  serializeDesign,
  validateImportedDesign,
} from "./design-io";

function validDesign(): KitchenDesign {
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
        fittingType: "plain",
        fittingLabel: "",
        applianceType: "sink",
        applianceLabel: "Sink",
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
  };
}

describe("import validation", () => {
  it("accepts a complete plan and defaults missing lists", () => {
    const design = validDesign();
    expect(validateImportedDesign(design)).toEqual(design);

    const { furniture: _furniture, fixtures: _fixtures, ...partial } = design;
    expect(validateImportedDesign(partial)?.furniture).toEqual([]);
    expect(validateImportedDesign(partial)?.fixtures).toEqual([]);
  });

  it("rejects plans that cannot be opened", () => {
    const design = validDesign();
    expect(validateImportedDesign(null)).toBeNull();
    expect(validateImportedDesign({ carcasses: [] })).toBeNull();
    expect(validateImportedDesign({ ...design, carcasses: {} })).toBeNull();
    expect(validateImportedDesign({ ...design, colours: { cabinets: "#fff" } })).toBeNull();
    expect(
      validateImportedDesign({
        ...design,
        room: { points: [{ x: "0", y: 0 }], height: 2400 },
      }),
    ).toBeNull();
    expect(parseDesignText("not json")).toEqual({ ok: false, error: "unreadable" });
    expect(parseDesignText("{}")).toEqual({ ok: false, error: "invalid" });
  });
});

describe("persist round-trip", () => {
  it("serializes a plan and reads the same plan back", () => {
    const design = validDesign();
    const raw = serializeDesign(design);

    expect(parsePersistedDesign(raw)).toEqual(design);
    expect(parseDesignText(raw)).toEqual({ ok: true, design });
    expect(parsePersistedDesign("{")).toBeNull();
  });
});
