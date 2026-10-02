import { beforeEach, describe, expect, it } from "vitest";
import { DESIGN_STORAGE_KEY, subscribeDesignAutosave, useStore } from "../../store/useStore";
import { resizeRoom } from "./resizeRoom";

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  const storage = {
    getItem: (key: string) => (mem.has(key) ? mem.get(key)! : null),
    setItem: (key: string, value: string) => {
      mem.set(key, String(value));
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
    clear: () => mem.clear(),
    key: (index: number) => [...mem.keys()][index] ?? null,
    get length() {
      return mem.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  useStore.getState().load();
});

describe("local design persistence", () => {
  it("persist writes kitchenplan-design-v3 and load restores it", () => {
    useStore.getState().updateRoomHeight(2700);
    expect(useStore.getState().persist()).toBe(true);
    const raw = mem.get(DESIGN_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).room.height).toBe(2700);

    useStore.getState().updateRoomHeight(2400);
    expect(useStore.getState().design.room.height).toBe(2400);
    useStore.getState().load();
    expect(useStore.getState().design.room.height).toBe(2700);
    expect(useStore.getState().history).toHaveLength(1);
    expect(useStore.getState().history[0].room.height).toBe(2700);
    expect(useStore.getState().roomDraft.points).toEqual(useStore.getState().design.room.points);
  });

  it("autosave waits, then writes, and flush writes immediately", async () => {
    const saved: string[] = [];
    const { unsubscribe, flush } = subscribeDesignAutosave(() => saved.push("ok"), 30);
    useStore.getState().updateRoomHeight(2600);
    expect(mem.has(DESIGN_STORAGE_KEY)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(JSON.parse(mem.get(DESIGN_STORAGE_KEY)!).room.height).toBe(2600);
    expect(saved).toEqual(["ok"]);

    useStore.getState().updateRoomHeight(2800);
    expect(flush()).toBe(true);
    expect(JSON.parse(mem.get(DESIGN_STORAGE_KEY)!).room.height).toBe(2800);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(saved).toEqual(["ok"]);
    unsubscribe();
  });
});

describe("resize room", () => {
  it("scales the outline to an exact size and ignores layout requests", () => {
    const design = useStore.getState().design;
    const resized = resizeRoom(design, "5m x 4m");
    expect(resized.ok).toBe(true);
    if (!resized.ok) return;
    const xs = resized.design.room.points.map((p) => p.x);
    const ys = resized.design.room.points.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(5000);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(4000);
    expect(resized.design.carcasses).toEqual(design.carcasses);

    const rejected = resizeRoom(design, "4m x 3m L-shape with an island");
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.message).toContain("Room shape");
  });
});
