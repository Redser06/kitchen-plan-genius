// ============================================================================
// KitchenPlan — Core Domain Types (v3: fixtures, materials, walk mode)
// All measurements in mm.
// ============================================================================

export interface Vec2 { x: number; y: number; }

// --- Room (polygon-based) -------------------------------------------------
export interface Room {
  points: Vec2[];      // polygon corners
  height: number;       // ceiling height
}

// --- Fixtures (doors, windows, sockets, switches, water, waste, lights) ---
export type FixtureType = 'window' | 'door' | 'socket' | 'switch' | 'water' | 'waste' | 'pendant' | 'downlight';

export interface Fixture {
  id: string;
  type: FixtureType;
  wallIndex?: number;   // for wall-based fixtures (window, door, socket, switch)
  t?: number;            // 0-1 position along wall
  width?: number;        // for windows/doors
  position?: Vec2;       // for floor-based fixtures (water, waste, pendant, downlight)
}

// --- Carcass (flat fitting/appliance strings) -----------------------------
export type CarcassSize = 200 | 400 | 600 | 800 | 1000;
export type CarcassDepth = 500 | 550 | 600 | 650;
export type CarcassMount = 'floor' | 'wall' | 'tall';

export interface Carcass {
  id: string;
  size: CarcassSize;
  depth: CarcassDepth;
  mount: CarcassMount;
  position: Vec2;
  rotation: number;
  label?: string;
  fittingType: string;     // 'plain' | 'drawer' | 'cutlery' | 'pullout' | 'spice' | 'carousel' | 'larder' | 'wine' | 'bin' | 'plate' | 'garage'
  fittingLabel: string;
  applianceType: string | null;  // 'hob' | 'oven' | 'sink' | 'fridge' | 'fridge-american' | 'dishwasher' | 'rangehood' | 'winecooler' | 'microwave' | 'washer' | null
  applianceLabel: string | null;
}

// --- Furniture ------------------------------------------------------------
export interface Furniture {
  id: string;
  type: string;
  label: string;
  position: Vec2;
  width: number;
  depth: number;
  rotation: number;
  seats?: number;
}

// --- Materials & Colours --------------------------------------------------
export interface ColourScheme {
  cabinets: string;
  countertops: string;
  walls: string;
  floor: string;
  backsplash: string;
  handles: string;
}

export interface Materials {
  cabinetFinish: 'Shaker' | 'Slab' | 'Beadboard';
  countertopMaterial: string;
  flooringStyle: string;
  backsplashStyle: string;
}

// --- Design ---------------------------------------------------------------
export interface KitchenDesign {
  room: Room;
  fixtures: Fixture[];
  carcasses: Carcass[];
  furniture: Furniture[];
  colours: ColourScheme;
  materials: Materials;
}

// --- Analysis -------------------------------------------------------------
export type Severity = 'ok' | 'warning' | 'error';

export interface AnalysisIssue {
  id: string;
  severity: Severity;
  message: string;
  detail: string;
  fix: string | null;
}

export interface DesignAnalysis {
  light: { floorAreaM2: number; glazingAreaM2: number; lightRatio: number; rating: string };
  triangle: { sink: Vec2; hob: Vec2; fridge: Vec2; perimeter: number; status: Severity } | null;
  walkway: { clearance: number; status: Severity } | null;
  issues: AnalysisIssue[];
}
