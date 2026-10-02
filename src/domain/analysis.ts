import type {
  AnalysisIssue,
  DesignAnalysis,
  Fixture,
  KitchenDesign,
  Severity,
  Vec2,
} from "./types";
import { rotatedFootprintCenter, workTriangleOf } from "./geometry";

function polygonArea(pts: Vec2[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearest(list: Fixture[], center: Vec2): number {
  if (list.length === 0) return Infinity;
  return Math.min(
    ...list.map((fixture) => {
      if (!fixture.position) return Infinity;
      return distance(fixture.position, center);
    }),
  );
}

export function computeAnalysis(design: KitchenDesign): DesignAnalysis {
  const room = design.room;
  const carcasses = design.carcasses;
  const furniture = design.furniture;
  const fixtures = design.fixtures;
  const floorAreaM2 = polygonArea(room.points) / 1e6;
  const glazingAreaM2 = fixtures
    .filter((fixture) => fixture.type === "window")
    .reduce((sum, fixture) => sum + ((fixture.width ?? 0) * 1200) / 1e6, 0);
  const lightRatio = floorAreaM2 > 0 ? glazingAreaM2 / floorAreaM2 : 0;
  let rating = "poor";
  if (lightRatio >= 0.3) rating = "excellent";
  else if (lightRatio >= 0.2) rating = "good";
  else if (lightRatio >= 0.1) rating = "adequate";
  const light = { floorAreaM2, glazingAreaM2, lightRatio, rating };

  const triangle = workTriangleOf(carcasses);

  let walkway: DesignAnalysis["walkway"] = null;
  if (furniture.length > 0 && carcasses.length > 0) {
    const runFrontY = Math.min(...carcasses.map((carcass) => carcass.position.y));
    const table = furniture[0];
    const clearance = runFrontY - (table.position.y + table.depth);
    const status: Severity = clearance < 600 ? "error" : clearance < 900 ? "warning" : "ok";
    walkway = { clearance, status };
  }

  const issues: AnalysisIssue[] = [];
  if (triangle && triangle.status === "warning") {
    issues.push({
      id: "triangle",
      severity: "warning",
      message: "Work triangle is outside the ideal range",
      detail: `Perimeter ${Math.round(triangle.perimeter)}mm (ideal 4000–6600mm)`,
      fix: "Reposition the sink, hob, or fridge.",
    });
  }
  if (walkway && walkway.status !== "ok") {
    issues.push({
      id: "walkway",
      severity: walkway.status,
      message: "Tight clearance behind the dining table",
      detail: `${Math.round(walkway.clearance)}mm gap — 900mm minimum recommended`,
      fix: `Move the table ${Math.max(0, Math.round(900 - walkway.clearance))}mm toward the opposite wall.`,
    });
  }
  if (rating === "poor") {
    issues.push({
      id: "light",
      severity: "warning",
      message: "Natural light is limited",
      detail: "Glazing area is below 10% of floor area.",
      fix: "Add a window from the Fixtures tab.",
    });
  }

  const sinkCarcasses = carcasses.filter((carcass) => carcass.applianceType === "sink");
  const waterFixtures = fixtures.filter((fixture) => fixture.type === "water");
  const wasteFixtures = fixtures.filter((fixture) => fixture.type === "waste");
  sinkCarcasses.forEach((carcass) => {
    const center = rotatedFootprintCenter(
      carcass.position,
      carcass.rotation || 0,
      carcass.size,
      carcass.depth,
    );
    if (nearest(waterFixtures, center) > 1500 || nearest(wasteFixtures, center) > 1500) {
      issues.push({
        id: "plumbing-" + carcass.id,
        severity: "warning",
        message: "Sink is missing nearby plumbing",
        detail: `${carcass.label || "Sink"} has no water/waste within 1.5m.`,
        fix: "Add Water supply and Waste point near this sink.",
      });
    }
  });

  if (
    carcasses.filter((carcass) => carcass.applianceType).length > 0 &&
    fixtures.filter((fixture) => fixture.type === "socket").length === 0
  ) {
    issues.push({
      id: "sockets",
      severity: "warning",
      message: "No electrical sockets placed",
      detail: "You have appliances but no sockets.",
      fix: "Add sockets near your appliance run.",
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "ok",
      severity: "ok",
      message: "No issues detected",
      detail: "Your layout meets standard guidelines.",
      fix: null,
    });
  }

  return { light, triangle, walkway, issues };
}
