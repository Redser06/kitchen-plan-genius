export interface DesignHistory<T> {
  history: T[];
  historyIndex: number;
}

export function cloneDesign<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function sameDesign(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Push a snapshot and drop any redo tail above the current index. */
export function commitHistory<T>(state: DesignHistory<T>, next: T): DesignHistory<T> {
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push(cloneDesign(next));
  return { history, historyIndex: history.length - 1 };
}

export function undoHistory<T>(state: DesignHistory<T>): { historyIndex: number; value: T } | null {
  if (state.historyIndex <= 0) return null;
  const historyIndex = state.historyIndex - 1;
  return { historyIndex, value: cloneDesign(state.history[historyIndex]) };
}

export function redoHistory<T>(state: DesignHistory<T>): { historyIndex: number; value: T } | null {
  if (state.historyIndex >= state.history.length - 1) return null;
  const historyIndex = state.historyIndex + 1;
  return { historyIndex, value: cloneDesign(state.history[historyIndex]) };
}
