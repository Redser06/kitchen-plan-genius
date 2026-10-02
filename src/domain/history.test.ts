import { describe, expect, it } from "vitest";
import { commitHistory, redoHistory, undoHistory } from "./history";

describe("history helpers", () => {
  it("appends a snapshot and drops the redo tail", () => {
    const next = { n: 3 };
    const committed = commitHistory({ history: [{ n: 1 }, { n: 2 }], historyIndex: 0 }, next);

    expect(committed).toEqual({ history: [{ n: 1 }, { n: 3 }], historyIndex: 1 });
    expect(committed.history[1]).not.toBe(next);
  });

  it("steps backward and forward without exposing the stored snapshot", () => {
    const state = commitHistory({ history: [{ n: 1 }], historyIndex: 0 }, { n: 2 });
    const undone = undoHistory(state);

    expect(undone).toEqual({ historyIndex: 0, value: { n: 1 } });
    if (!undone) return;
    undone.value.n = 9;
    expect(state.history[0]).toEqual({ n: 1 });

    expect(redoHistory({ history: state.history, historyIndex: undone.historyIndex })).toEqual({
      historyIndex: 1,
      value: { n: 2 },
    });
  });

  it("refuses to move past either end", () => {
    const state = { history: [{ n: 1 }], historyIndex: 0 };
    expect(undoHistory(state)).toBeNull();
    expect(redoHistory(state)).toBeNull();
  });
});
