import { describe, expect, it } from "vitest";
import { disposeSurfaceCache } from "./surfaces";

describe("disposeSurfaceCache", () => {
  it("is safe to call when no finishes have been created", () => {
    expect(() => {
      disposeSurfaceCache();
      disposeSurfaceCache();
    }).not.toThrow();
  });
});
