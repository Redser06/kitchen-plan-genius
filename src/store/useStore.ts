// ============================================================================
// KitchenPlan — Zustand Store (v3: fixtures, materials, walk mode, export)
// ============================================================================

import create from 'zustand';
import type { KitchenDesign, Carcass, Furniture, Fixture, Vec2, DesignAnalysis, Materials, ColourScheme } from '../domain/types';

function defaultDesign(): KitchenDesign {
  return {
    room: { points: [{ x: 0, y: 0 }, { x: 4200, y: 0 }, { x: 4200, y: 3200 }, { x: 0, y: 3200 }], height: 2400 },
    fixtures: [
      { id: 'fx1', type: 'window', wallIndex: 0, t: 0.167, width: 1200 },
      { id: 'fx2', type: 'door', wallIndex: 0, t: 0.595, width: 900 },
      { id: 'fx3', type: 'socket', wallIndex: 1, t: 0.3 },
      { id: 'fx4', type: 'socket', wallIndex: 1, t: 0.7 },
      { id: 'fx5', type: 'water', position: { x: 2350, y: 2900 } },
      { id: 'fx6', type: 'waste', position: { x: 2450, y: 2900 } },
    ],
    carcasses: [
      { id: 'c1', size: 600, depth: 600, mount: 'floor', position: { x: 200, y: 2600 }, rotation: 0, label: 'Drawer Unit', fittingType: 'drawer', fittingLabel: 'Drawer Bank', applianceType: null, applianceLabel: null },
      { id: 'c2', size: 600, depth: 600, mount: 'floor', position: { x: 800, y: 2600 }, rotation: 0, label: '', fittingType: 'plain', fittingLabel: '', applianceType: 'hob', applianceLabel: 'Induction Hob' },
      { id: 'c3', size: 600, depth: 600, mount: 'floor', position: { x: 1400, y: 2600 }, rotation: 0, label: '', fittingType: 'plain', fittingLabel: '', applianceType: null, applianceLabel: null },
      { id: 'c4', size: 800, depth: 600, mount: 'floor', position: { x: 2000, y: 2600 }, rotation: 0, label: '', fittingType: 'plain', fittingLabel: '', applianceType: 'sink', applianceLabel: 'Sink — Undermount' },
      { id: 'c5', size: 600, depth: 600, mount: 'floor', position: { x: 2800, y: 2600 }, rotation: 0, label: 'Dishwasher Housing', fittingType: 'plain', fittingLabel: '', applianceType: 'dishwasher', applianceLabel: 'Dishwasher' },
      { id: 'c6', size: 600, depth: 600, mount: 'tall', position: { x: 3400, y: 2600 }, rotation: 0, label: 'Tall Fridge Housing', fittingType: 'larder', fittingLabel: 'Larder Unit', applianceType: 'fridge', applianceLabel: 'Integrated Fridge' },
    ],
    furniture: [
      { id: 'f1', type: 'dining-table', label: 'Dining Table', position: { x: 1450, y: 1350 }, width: 1800, depth: 900, rotation: 0, seats: 6 },
    ],
    colours: { cabinets: '#C9B79C', countertops: '#2E2620', walls: '#F8F3EA', floor: '#E4D3BA', backsplash: '#EFE2D0', handles: '#5B4A38' },
    materials: { cabinetFinish: 'Shaker', countertopMaterial: 'Black Granite', flooringStyle: 'Natural Oak', backsplashStyle: 'Plain' },
  };
}

function cloneDesign(d: KitchenDesign): KitchenDesign { return JSON.parse(JSON.stringify(d)); }

// --- Analysis ---
function polygonArea(pts: Vec2[]): number {
  let a = 0; const n = pts.length;
  for (let i = 0; i < n; i++) { const p1 = pts[i], p2 = pts[(i + 1) % n]; a += p1.x * p2.y - p2.x * p1.y; }
  return Math.abs(a) / 2;
}

function computeAnalysis(design: KitchenDesign): DesignAnalysis {
  const room = design.room, carcasses = design.carcasses, furniture = design.furniture, fixtures = design.fixtures;
  const floorAreaM2 = polygonArea(room.points) / 1e6;
  const glazingAreaM2 = fixtures.filter((f) => f.type === 'window').reduce((s, f) => s + (f.width! * 1200) / 1e6, 0);
  const lightRatio = floorAreaM2 > 0 ? glazingAreaM2 / floorAreaM2 : 0;
  let rating = 'poor';
  if (lightRatio >= 0.3) rating = 'excellent'; else if (lightRatio >= 0.2) rating = 'good'; else if (lightRatio >= 0.1) rating = 'adequate';
  const light = { floorAreaM2, glazingAreaM2, lightRatio, rating };

  const sinkC = carcasses.find((c) => c.applianceType === 'sink');
  const hobC = carcasses.find((c) => c.applianceType === 'hob');
  const fridgeC = carcasses.find((c) => c.applianceType === 'fridge' || c.applianceType === 'fridge-american');
  let triangle: any = null;
  if (sinkC && hobC && fridgeC) {
    const ctr = (c: Carcass) => ({ x: c.position.x + c.size / 2, y: c.position.y + c.depth / 2 });
    const s = ctr(sinkC), h = ctr(hobC), f = ctr(fridgeC);
    const d = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
    const perimeter = d(s, h) + d(h, f) + d(f, s);
    const status = (perimeter > 6600 || [d(s,h), d(h,f), d(f,s)].some(l => l < 1200 || l > 2700)) ? 'warning' : 'ok';
    triangle = { sink: s, hob: h, fridge: f, perimeter, status };
  }

  let walkway: any = null;
  if (furniture.length > 0 && carcasses.length > 0) {
    const runFrontY = Math.min(...carcasses.map((c) => c.position.y));
    const table = furniture[0];
    const clearance = runFrontY - (table.position.y + table.depth);
    walkway = { clearance, status: clearance < 600 ? 'error' : clearance < 900 ? 'warning' : 'ok' };
  }

  const issues: any[] = [];
  if (triangle && triangle.status === 'warning')
    issues.push({ id: 'triangle', severity: 'warning', message: 'Work triangle is outside the ideal range', detail: `Perimeter ${Math.round(triangle.perimeter)}mm (ideal 4000–6600mm)`, fix: 'Reposition the sink, hob, or fridge.' });
  if (walkway && walkway.status !== 'ok')
    issues.push({ id: 'walkway', severity: walkway.status, message: 'Tight clearance behind the dining table', detail: `${Math.round(walkway.clearance)}mm gap — 900mm minimum recommended`, fix: `Move the table ${Math.max(0, Math.round(900 - walkway.clearance))}mm toward the opposite wall.` });
  if (rating === 'poor')
    issues.push({ id: 'light', severity: 'warning', message: 'Natural light is limited', detail: 'Glazing area is below 10% of floor area.', fix: 'Add a window from the Fixtures tab.' });

  // Plumbing validation
  const sinkCarcasses = carcasses.filter((c) => c.applianceType === 'sink');
  const waterFixtures = fixtures.filter((f) => f.type === 'water');
  const wasteFixtures = fixtures.filter((f) => f.type === 'waste');
  sinkCarcasses.forEach((c) => {
    const ctr = { x: c.position.x + c.size / 2, y: c.position.y + c.depth / 2 };
    const nd = (list: Fixture[]) => list.length === 0 ? Infinity : Math.min(...list.map((f) => Math.hypot(f.position!.x - ctr.x, f.position!.y - ctr.y)));
    if (nd(waterFixtures) > 1500 || nd(wasteFixtures) > 1500)
      issues.push({ id: 'plumbing-' + c.id, severity: 'warning', message: 'Sink is missing nearby plumbing', detail: `${c.label || 'Sink'} has no water/waste within 1.5m.`, fix: 'Add Water supply and Waste point near this sink.' });
  });

  // Socket validation
  if (carcasses.filter((c) => c.applianceType).length > 0 && fixtures.filter((f) => f.type === 'socket').length === 0)
    issues.push({ id: 'sockets', severity: 'warning', message: 'No electrical sockets placed', detail: 'You have appliances but no sockets.', fix: 'Add sockets near your appliance run.' });

  if (issues.length === 0) issues.push({ id: 'ok', severity: 'ok', message: 'No issues detected', detail: 'Your layout meets standard guidelines.', fix: null });

  return { light, triangle, walkway, issues };
}

export type Screen = 'editor' | 'room-setup';
export type ViewMode = '2d' | '3d' | 'walk';
export type SheetTab = 'components' | 'measure' | 'materials' | 'fixtures' | 'analysis' | null;
export type Tool = 'select' | 'pan' | 'place-carcass' | 'place-furniture' | 'place-door' | 'place-window' | 'place-socket' | 'place-switch' | 'place-water' | 'place-waste' | 'place-light-pendant' | 'place-light-downlight';

interface KitchenState {
  screen: Screen;
  design: KitchenDesign;
  analysis: DesignAnalysis | null;
  selectedId: string | null;
  tool: Tool;
  selectedCarcassSize: Carcass['size'];
  viewMode: ViewMode;
  walkIndex: number;
  sheetTab: SheetTab;
  scale: number;
  position: Vec2;
  history: KitchenDesign[];
  historyIndex: number;
  roomDraft: { points: Vec2[] };
  selectedCornerIndex: number | null;
  selectedWallIndex: number | null;
  showExportPanel: boolean;
  shareLinkPublic: boolean;
  linkCopied: boolean;
  collaborators: { id: number; name: string; email: string; role: string }[];
  inviteEmail: string;

  // Actions
  setDesign: (d: KitchenDesign) => void;
  updateCarcass: (id: string, patch: Partial<Carcass>) => void;
  removeCarcass: (id: string) => void;
  addCarcass: (c: Carcass) => void;
  updateFurniture: (id: string, patch: Partial<Furniture>) => void;
  removeFurniture: (id: string) => void;
  addFurniture: (f: Furniture) => void;
  removeFixture: (id: string) => void;
  addFixture: (f: Fixture) => void;
  updateColours: (patch: Partial<ColourScheme>) => void;
  updateMaterials: (patch: Partial<Materials>) => void;
  updateRoomHeight: (h: number) => void;
  setScreen: (s: Screen) => void;
  setSelected: (id: string | null) => void;
  setTool: (t: Tool) => void;
  setSelectedCarcassSize: (s: Carcass['size']) => void;
  setViewMode: (v: ViewMode) => void;
  setWalkIndex: (i: number) => void;
  setSheetTab: (t: SheetTab) => void;
  setScale: (s: number) => void;
  setPosition: (p: Vec2) => void;
  setRoomDraft: (points: Vec2[]) => void;
  setSelectedCornerIndex: (i: number | null) => void;
  setSelectedWallIndex: (i: number | null) => void;
  confirmRoomDraft: () => void;
  setShowExportPanel: (v: boolean) => void;
  setShareLinkPublic: (v: boolean) => void;
  setLinkCopied: (v: boolean) => void;
  setInviteEmail: (e: string) => void;
  inviteCollaborator: () => void;
  removeCollaborator: (id: number) => void;
  setCollaboratorRole: (id: number, role: string) => void;
  restoreVersion: (idx: number) => void;
  undo: () => void;
  redo: () => void;
  addAmericanFridge: () => void;
  persist: () => void;
  load: () => void;
}

function commit(state: any, newDesign: KitchenDesign) {
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push(cloneDesign(newDesign));
  return { design: newDesign, analysis: computeAnalysis(newDesign), history, historyIndex: history.length - 1 };
}

export const useStore = create<KitchenState>((set, get) => ({
  screen: 'editor',
  design: defaultDesign(),
  analysis: null,
  selectedId: null,
  tool: 'select',
  selectedCarcassSize: 600,
  viewMode: '2d',
  walkIndex: 0,
  sheetTab: null,
  scale: 1,
  position: { x: 150, y: 65 },
  history: [cloneDesign(defaultDesign())],
  historyIndex: 0,
  roomDraft: { points: [...defaultDesign().room.points] },
  selectedCornerIndex: null,
  selectedWallIndex: null,
  showExportPanel: false,
  shareLinkPublic: false,
  linkCopied: false,
  collaborators: [
    { id: 1, name: 'You', email: 'owner@you.com', role: 'Owner' },
    { id: 2, name: 'Jamie Oliver-Smith', email: 'jamie@example.com', role: 'Editor' },
  ],
  inviteEmail: '',

  setDesign: (d) => set((s) => commit(s, d)),
  updateCarcass: (id, patch) => set((s) => { const d = cloneDesign(s.design); const c = d.carcasses.find((c) => c.id === id); if (c) Object.assign(c, patch); return { design: d, analysis: computeAnalysis(d) }; }),
  removeCarcass: (id) => set((s) => { const d = cloneDesign(s.design); d.carcasses = d.carcasses.filter((c) => c.id !== id); return { design: d, analysis: computeAnalysis(d), selectedId: s.selectedId === id ? null : s.selectedId }; }),
  addCarcass: (c) => set((s) => { const d = cloneDesign(s.design); d.carcasses.push(c); return commit(s, d); }),
  updateFurniture: (id, patch) => set((s) => { const d = cloneDesign(s.design); const f = d.furniture.find((f) => f.id === id); if (f) Object.assign(f, patch); return { design: d, analysis: computeAnalysis(d) }; }),
  removeFurniture: (id) => set((s) => { const d = cloneDesign(s.design); d.furniture = d.furniture.filter((f) => f.id !== id); return { design: d, analysis: computeAnalysis(d), selectedId: s.selectedId === id ? null : s.selectedId }; }),
  addFurniture: (f) => set((s) => { const d = cloneDesign(s.design); d.furniture.push(f); return commit(s, d); }),
  removeFixture: (id) => set((s) => { const d = cloneDesign(s.design); d.fixtures = d.fixtures.filter((f) => f.id !== id); return { design: d, analysis: computeAnalysis(d), selectedId: s.selectedId === id ? null : s.selectedId }; }),
  addFixture: (f) => set((s) => { const d = cloneDesign(s.design); d.fixtures.push(f); return commit(s, d); }),
  updateColours: (patch) => set((s) => { const d = cloneDesign(s.design); d.colours = { ...d.colours, ...patch }; return { design: d, analysis: computeAnalysis(d) }; }),
  updateMaterials: (patch) => set((s) => { const d = cloneDesign(s.design); d.materials = { ...d.materials, ...patch }; return { design: d, analysis: computeAnalysis(d) }; }),
  updateRoomHeight: (h) => set((s) => { const d = cloneDesign(s.design); d.room = { ...d.room, height: h }; return { design: d, analysis: computeAnalysis(d) }; }),

  setScreen: (s) => set({ screen: s }),
  setSelected: (id) => set({ selectedId: id }),
  setTool: (t) => set({ tool: t }),
  setSelectedCarcassSize: (s) => set({ selectedCarcassSize: s }),
  setViewMode: (v) => set({ viewMode: v }),
  setWalkIndex: (i) => set({ walkIndex: i }),
  setSheetTab: (t) => set({ sheetTab: t }),
  setScale: (s) => set({ scale: s }),
  setPosition: (p) => set({ position: p }),
  setRoomDraft: (points) => set({ roomDraft: { points } }),
  setSelectedCornerIndex: (i) => set({ selectedCornerIndex: i }),
  setSelectedWallIndex: (i) => set({ selectedWallIndex: i }),
  confirmRoomDraft: () => set((s) => { const d = cloneDesign(s.design); d.room = { ...d.room, points: s.roomDraft.points }; return { ...commit(s, d), screen: 'editor' as Screen }; }),

  setShowExportPanel: (v) => set({ showExportPanel: v }),
  setShareLinkPublic: (v) => set({ shareLinkPublic: v }),
  setLinkCopied: (v) => set({ linkCopied: v }),
  setInviteEmail: (e) => set({ inviteEmail: e }),
  inviteCollaborator: () => set((s) => { const email = s.inviteEmail.trim(); if (!email) return {}; return { collaborators: [...s.collaborators, { id: Date.now(), name: email.split('@')[0], email, role: 'Viewer' }], inviteEmail: '' }; }),
  removeCollaborator: (id) => set((s) => ({ collaborators: id === 1 ? s.collaborators : s.collaborators.filter((c) => c.id !== id) })),
  setCollaboratorRole: (id, role) => set((s) => ({ collaborators: s.collaborators.map((c) => c.id === id ? { ...c, role } : c) })),
  restoreVersion: (idx) => set((s) => ({ design: cloneDesign(s.history[idx]), historyIndex: idx, showExportPanel: false, selectedId: null })),

  undo: () => set((s) => s.historyIndex <= 0 ? {} : { design: cloneDesign(s.history[s.historyIndex - 1]), historyIndex: s.historyIndex - 1, selectedId: null, analysis: computeAnalysis(s.history[s.historyIndex - 1]) }),
  redo: () => set((s) => s.historyIndex >= s.history.length - 1 ? {} : { design: cloneDesign(s.history[s.historyIndex + 1]), historyIndex: s.historyIndex + 1, selectedId: null, analysis: computeAnalysis(s.history[s.historyIndex + 1]) }),

  addAmericanFridge: () => set((s) => {
    const d = cloneDesign(s.design);
    d.carcasses.push({ id: `carcass-${Date.now()}`, size: 900 as Carcass['size'], depth: 750 as Carcass['depth'], mount: 'tall', position: { x: 200, y: 200 }, rotation: 0, label: 'American Fridge-Freezer', fittingType: 'plain', fittingLabel: '', applianceType: 'fridge-american', applianceLabel: 'American Fridge-Freezer' });
    return commit(s, d);
  }),

  persist: () => { try { localStorage.setItem('kitchenplan-design-v3', JSON.stringify(get().design)); } catch {} },
  load: () => {
    try {
      const saved = localStorage.getItem('kitchenplan-design-v3');
      if (saved) { const d = JSON.parse(saved) as KitchenDesign; set({ design: d, analysis: computeAnalysis(d) }); }
      else { set({ analysis: computeAnalysis(get().design) }); }
    } catch { try { localStorage.removeItem('kitchenplan-design-v3'); } catch {} }
  },
}));

// Compute analysis on init
useStore.getState().analysis = computeAnalysis(useStore.getState().design);
