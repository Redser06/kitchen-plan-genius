// ============================================================================
// KitchenPlan — Zustand Store (v3: fixtures, materials, walk mode, export)
// ============================================================================

import { create } from 'zustand';
import type { KitchenDesign, Carcass, Furniture, Fixture, Vec2, DesignAnalysis, Materials, ColourScheme } from '../domain/types';
import { computeAnalysis } from '../domain/analysis';
import { DESIGN_STORAGE_KEY, parsePersistedDesign, serializeDesign } from '../domain/design-io';
import { cloneDesign, commitHistory, redoHistory, sameDesign, undoHistory } from '../domain/history';

type PatchOptions = { recordHistory?: boolean };

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
  updateCarcass: (id: string, patch: Partial<Carcass>, options?: PatchOptions) => void;
  removeCarcass: (id: string) => void;
  addCarcass: (c: Carcass) => void;
  updateFurniture: (id: string, patch: Partial<Furniture>, options?: PatchOptions) => void;
  removeFurniture: (id: string) => void;
  addFurniture: (f: Furniture) => void;
  removeFixture: (id: string) => void;
  addFixture: (f: Fixture) => void;
  updateColours: (patch: Partial<ColourScheme>) => void;
  updateMaterials: (patch: Partial<Materials>) => void;
  updateRoomHeight: (h: number, options?: PatchOptions) => void;
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
  commitGesture: () => void;
  addAmericanFridge: () => void;
  persist: () => void;
  load: () => void;
}

function commit(state: { history: KitchenDesign[]; historyIndex: number }, newDesign: KitchenDesign) {
  const next = commitHistory(state, newDesign);
  return { design: newDesign, analysis: computeAnalysis(newDesign), history: next.history, historyIndex: next.historyIndex };
}

function patchDesign(
  state: { history: KitchenDesign[]; historyIndex: number },
  next: KitchenDesign,
  options?: PatchOptions,
) {
  if (options?.recordHistory === false) return { design: next, analysis: computeAnalysis(next) };
  return commit(state, next);
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
  updateCarcass: (id, patch, options) => set((s) => {
    const d = cloneDesign(s.design);
    const carcass = d.carcasses.find((item) => item.id === id);
    if (!carcass) return {};
    Object.assign(carcass, patch);
    return patchDesign(s, d, options);
  }),
  removeCarcass: (id) => set((s) => { const d = cloneDesign(s.design); d.carcasses = d.carcasses.filter((c) => c.id !== id); return { design: d, analysis: computeAnalysis(d), selectedId: s.selectedId === id ? null : s.selectedId }; }),
  addCarcass: (c) => set((s) => { const d = cloneDesign(s.design); d.carcasses.push(c); return commit(s, d); }),
  updateFurniture: (id, patch, options) => set((s) => {
    const d = cloneDesign(s.design);
    const furniture = d.furniture.find((item) => item.id === id);
    if (!furniture) return {};
    Object.assign(furniture, patch);
    return patchDesign(s, d, options);
  }),
  removeFurniture: (id) => set((s) => { const d = cloneDesign(s.design); d.furniture = d.furniture.filter((f) => f.id !== id); return { design: d, analysis: computeAnalysis(d), selectedId: s.selectedId === id ? null : s.selectedId }; }),
  addFurniture: (f) => set((s) => { const d = cloneDesign(s.design); d.furniture.push(f); return commit(s, d); }),
  removeFixture: (id) => set((s) => { const d = cloneDesign(s.design); d.fixtures = d.fixtures.filter((f) => f.id !== id); return { design: d, analysis: computeAnalysis(d), selectedId: s.selectedId === id ? null : s.selectedId }; }),
  addFixture: (f) => set((s) => { const d = cloneDesign(s.design); d.fixtures.push(f); return commit(s, d); }),
  updateColours: (patch) => set((s) => { const d = cloneDesign(s.design); d.colours = { ...d.colours, ...patch }; return commit(s, d); }),
  updateMaterials: (patch) => set((s) => { const d = cloneDesign(s.design); d.materials = { ...d.materials, ...patch }; return commit(s, d); }),
  updateRoomHeight: (h, options) => set((s) => { const d = cloneDesign(s.design); d.room = { ...d.room, height: h }; return patchDesign(s, d, options); }),

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

  undo: () => set((s) => {
    const step = undoHistory(s);
    if (!step) return {};
    return { design: step.value, historyIndex: step.historyIndex, selectedId: null, analysis: computeAnalysis(step.value) };
  }),
  redo: () => set((s) => {
    const step = redoHistory(s);
    if (!step) return {};
    return { design: step.value, historyIndex: step.historyIndex, selectedId: null, analysis: computeAnalysis(step.value) };
  }),
  commitGesture: () => set((s) => {
    if (sameDesign(s.history[s.historyIndex], s.design)) return {};
    return commit(s, s.design);
  }),

  addAmericanFridge: () => set((s) => {
    const d = cloneDesign(s.design);
    d.carcasses.push({ id: `carcass-${Date.now()}`, size: 900 as Carcass['size'], depth: 750 as Carcass['depth'], mount: 'tall', position: { x: 200, y: 200 }, rotation: 0, label: 'American Fridge-Freezer', fittingType: 'plain', fittingLabel: '', applianceType: 'fridge-american', applianceLabel: 'American Fridge-Freezer' });
    return commit(s, d);
  }),

  persist: () => {
    try { localStorage.setItem(DESIGN_STORAGE_KEY, serializeDesign(get().design)); } catch { /* ignore quota */ }
  },
  load: () => {
    try {
      const saved = localStorage.getItem(DESIGN_STORAGE_KEY);
      if (!saved) { set({ analysis: computeAnalysis(get().design) }); return; }
      const design = parsePersistedDesign(saved);
      if (!design) {
        localStorage.removeItem(DESIGN_STORAGE_KEY);
        set({ analysis: computeAnalysis(get().design) });
        return;
      }
      set({ design, analysis: computeAnalysis(design) });
    } catch { try { localStorage.removeItem(DESIGN_STORAGE_KEY); } catch { /* ignore */ } }
  },
}));

// Compute analysis on init
useStore.getState().analysis = computeAnalysis(useStore.getState().design);
