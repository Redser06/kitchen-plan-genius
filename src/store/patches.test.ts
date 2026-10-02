import { beforeEach, describe, expect, it } from "vitest";
import { computeAnalysis } from "../domain/analysis";
import { DESIGN_STORAGE_KEY } from "../domain/design-io";
import { cloneDesign } from "../domain/history";
import { useStore } from "./useStore";

const baseline = cloneDesign(useStore.getState().design);

function resetStore() {
  useStore.setState({
    design: cloneDesign(baseline),
    history: [cloneDesign(baseline)],
    historyIndex: 0,
    analysis: computeAnalysis(baseline),
    selectedId: "c1",
  });
}

describe("patch history", () => {
  beforeEach(resetStore);

  it("undo and redo restore carcass, furniture, colour, material, and height edits", () => {
    const store = useStore.getState();
    store.updateCarcass("c1", { position: { x: 10, y: 20 } });
    store.updateFurniture("f1", { rotation: 90 });
    store.updateColours({ cabinets: "#112233" });
    store.updateMaterials({ cabinetFinish: "Slab" });
    store.updateRoomHeight(2800);

    expect(useStore.getState().historyIndex).toBe(5);
    useStore.getState().undo();
    expect(useStore.getState().design.room.height).toBe(baseline.room.height);
    useStore.getState().undo();
    expect(useStore.getState().design.materials.cabinetFinish).toBe("Shaker");
    useStore.getState().undo();
    expect(useStore.getState().design.colours.cabinets).toBe(baseline.colours.cabinets);
    useStore.getState().undo();
    expect(useStore.getState().design.furniture[0].rotation).toBe(0);
    useStore.getState().undo();
    expect(useStore.getState().design.carcasses[0].position).toEqual(
      baseline.carcasses[0].position,
    );
    expect(useStore.getState().historyIndex).toBe(0);
    expect(useStore.getState().selectedId).toBeNull();

    useStore.getState().redo();
    expect(useStore.getState().design.carcasses[0].position).toEqual({ x: 10, y: 20 });
    expect(useStore.getState().analysis?.triangle).toBeTruthy();
  });

  it("keeps live analysis current during a gesture and records one snapshot at the end", () => {
    useStore.getState().updateCarcass("c2", { position: { x: 0, y: 0 } }, { recordHistory: false });
    useStore
      .getState()
      .updateCarcass("c2", { position: { x: 50, y: 80 } }, { recordHistory: false });

    expect(useStore.getState().historyIndex).toBe(0);
    expect(useStore.getState().history).toHaveLength(1);
    expect(useStore.getState().analysis?.triangle?.hob).toEqual({ x: 350, y: 380 });

    useStore.getState().commitGesture();
    expect(useStore.getState().history).toHaveLength(2);
    useStore.getState().commitGesture();
    expect(useStore.getState().history).toHaveLength(2);

    useStore.getState().undo();
    expect(
      useStore.getState().design.carcasses.find((carcass) => carcass.id === "c2")?.position,
    ).toEqual(baseline.carcasses.find((carcass) => carcass.id === "c2")?.position);
    useStore.getState().redo();
    expect(
      useStore.getState().design.carcasses.find((carcass) => carcass.id === "c2")?.position,
    ).toEqual({
      x: 50,
      y: 80,
    });
  });

  it("records a ceiling-height drag as a single step", () => {
    useStore.getState().updateRoomHeight(2500, { recordHistory: false });
    useStore.getState().updateRoomHeight(2700, { recordHistory: false });
    expect(useStore.getState().design.room.height).toBe(2700);
    expect(useStore.getState().historyIndex).toBe(0);

    useStore.getState().commitGesture();
    useStore.getState().undo();
    expect(useStore.getState().design.room.height).toBe(baseline.room.height);
  });

  it("drops redo history when a new patch is committed", () => {
    useStore.getState().updateColours({ cabinets: "#111111" });
    useStore.getState().undo();
    useStore.getState().updateMaterials({ cabinetFinish: "Beadboard" });

    expect(useStore.getState().history).toHaveLength(2);
    useStore.getState().redo();
    expect(useStore.getState().design.materials.cabinetFinish).toBe("Beadboard");
    expect(useStore.getState().design.colours.cabinets).toBe(baseline.colours.cabinets);
  });
});

describe("persist round-trip", () => {
  beforeEach(() => {
    resetStore();
    const bag = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => bag.get(key) ?? null,
        setItem: (key: string, value: string) => {
          bag.set(key, value);
        },
        removeItem: (key: string) => {
          bag.delete(key);
        },
        clear: () => bag.clear(),
      },
    });
  });

  it("saves the live design and loads it back with analysis", () => {
    useStore.getState().updateCarcass("c4", { rotation: 90 });
    useStore.getState().persist();
    useStore.setState({ design: cloneDesign(baseline), analysis: null });

    useStore.getState().load();

    const loaded = useStore.getState();
    expect(loaded.design.carcasses.find((carcass) => carcass.id === "c4")?.rotation).toBe(90);
    expect(loaded.analysis?.triangle?.sink).toEqual({ x: 2000 - 300, y: 2600 + 400 });
    expect(localStorage.getItem(DESIGN_STORAGE_KEY)).toContain('"rotation":90');
  });

  it("discards a stored plan that fails validation", () => {
    localStorage.setItem(DESIGN_STORAGE_KEY, "{");
    useStore.getState().load();

    expect(localStorage.getItem(DESIGN_STORAGE_KEY)).toBeNull();
    expect(useStore.getState().design.room.height).toBe(baseline.room.height);
    expect(useStore.getState().analysis?.light.floorAreaM2).toBeGreaterThan(0);
  });
});
