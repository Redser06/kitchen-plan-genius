import type { ColourScheme, Fixture, Furniture, KitchenDesign, Materials, Vec2 } from "./types";

export const DESIGN_STORAGE_KEY = "kitchenplan-design-v3";

const COLOUR_KEYS = ["cabinets", "countertops", "walls", "floor", "backsplash", "handles"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isVec2(value: unknown): value is Vec2 {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y)
  );
}

/** Structural check for an imported or persisted kitchen plan. Missing lists default to empty. */
export function validateImportedDesign(value: unknown): KitchenDesign | null {
  if (!isRecord(value)) return null;
  const room = value.room;
  if (!isRecord(room) || typeof room.height !== "number" || !Number.isFinite(room.height))
    return null;
  if (!Array.isArray(room.points) || !room.points.every(isVec2)) return null;
  if (!Array.isArray(value.carcasses)) return null;
  if (value.furniture != null && !Array.isArray(value.furniture)) return null;
  if (value.fixtures != null && !Array.isArray(value.fixtures)) return null;

  const colours = value.colours;
  if (!isRecord(colours) || !COLOUR_KEYS.every((key) => typeof colours[key] === "string"))
    return null;
  const materials = value.materials;
  if (
    !isRecord(materials) ||
    typeof materials.cabinetFinish !== "string" ||
    typeof materials.countertopMaterial !== "string" ||
    typeof materials.flooringStyle !== "string" ||
    typeof materials.backsplashStyle !== "string"
  ) {
    return null;
  }

  return {
    room: { points: room.points as Vec2[], height: room.height },
    carcasses: value.carcasses as KitchenDesign["carcasses"],
    furniture: (Array.isArray(value.furniture) ? value.furniture : []) as Furniture[],
    fixtures: (Array.isArray(value.fixtures) ? value.fixtures : []) as Fixture[],
    colours: {
      cabinets: colours.cabinets as string,
      countertops: colours.countertops as string,
      walls: colours.walls as string,
      floor: colours.floor as string,
      backsplash: colours.backsplash as string,
      handles: colours.handles as string,
    } satisfies ColourScheme,
    materials: {
      cabinetFinish: materials.cabinetFinish as Materials["cabinetFinish"],
      countertopMaterial: materials.countertopMaterial as string,
      flooringStyle: materials.flooringStyle as string,
      backsplashStyle: materials.backsplashStyle as string,
    },
  };
}

export function parseDesignText(
  text: string,
): { ok: true; design: KitchenDesign } | { ok: false; error: "unreadable" | "invalid" } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "unreadable" };
  }
  const design = validateImportedDesign(parsed);
  if (!design) return { ok: false, error: "invalid" };
  return { ok: true, design };
}

export function serializeDesign(design: KitchenDesign): string {
  return JSON.stringify(design);
}

export function parsePersistedDesign(raw: string): KitchenDesign | null {
  try {
    return validateImportedDesign(JSON.parse(raw));
  } catch {
    return null;
  }
}
