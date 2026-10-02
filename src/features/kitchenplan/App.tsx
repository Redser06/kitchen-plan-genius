import React, { useState, useEffect } from 'react';
import KitchenCanvas from '@/components/KitchenCanvas';
import BottomBar from '@/components/BottomBar';
import BottomSheet from '@/components/BottomSheet';
import ContextPanel from '@/components/ContextPanel';
import RoomShapeDesigner from '@/components/RoomShapeDesigner';
import ExportPanel from '@/components/ExportPanel';
import { subscribeDesignAutosave, useStore } from '@/store/useStore';
import { parseDesignText } from '@/domain/design-io';
import type { Vec2 } from '@/domain/types';
import kitchenplanCssUrl from './kitchenplan.css?url';
import { RESIZE_SUGGESTIONS, resizeRoom } from './resizeRoom';

function useKitchenPlanStylesheet() {
  useEffect(() => {
    const id = 'kitchenplan-stylesheet';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = kitchenplanCssUrl;
    document.head.appendChild(link);
  }, []);
}


export default function App() {
  useKitchenPlanStylesheet();
  const screen = useStore((s) => s.screen);
  const load = useStore((s) => s.load);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const historyIndex = useStore((s) => s.historyIndex);
  const history = useStore((s) => s.history);
  const selectedId = useStore((s) => s.selectedId);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const sheetTab = useStore((s) => s.sheetTab);
  const setSheetTab = useStore((s) => s.setSheetTab);
  const showExportPanel = useStore((s) => s.showExportPanel);
  const openRoomSetup = useStore((s) => s.setScreen);
  const design = useStore((s) => s.design);
  const [savedLocally, setSavedLocally] = useState(false);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Vec2>({ x: 150, y: 65 });

  useEffect(() => {
    load();
    let cueTimer = 0;
    const { unsubscribe, flush } = subscribeDesignAutosave(() => {
      setSavedLocally(true);
      window.clearTimeout(cueTimer);
      cueTimer = window.setTimeout(() => setSavedLocally(false), 2000);
    });
    window.addEventListener('pagehide', flush);
    return () => {
      unsubscribe();
      window.removeEventListener('pagehide', flush);
      window.clearTimeout(cueTimer);
    };
  }, [load]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if (document.pointerLockElement) return;
      const store = useStore.getState();
      if (e.key === 'Escape') { store.setSelected(null); store.setSheetTab(null); store.setShowExportPanel(false); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedId) {
        e.preventDefault();
        const id = store.selectedId;
        if (store.design.carcasses.find((c) => c.id === id)) store.removeCarcass(id);
        else if (store.design.furniture.find((f) => f.id === id)) store.removeFurniture(id);
        else if (store.design.fixtures.find((f) => f.id === id)) store.removeFixture(id);
      }
      if (e.key === 'r' || e.key === 'R') {
        const id = store.selectedId;
        if (id) {
          const c = store.design.carcasses.find((c: any) => c.id === id);
          const f = store.design.furniture.find((f: any) => f.id === id);
          if (c) store.updateCarcass(id, { rotation: ((c.rotation || 0) + 90) % 360 });
          else if (f) store.updateFurniture(id, { rotation: ((f.rotation || 0) + 90) % 360 });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); store.redo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kitchen-design.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = parseDesignText(String(ev.target?.result ?? ''));
        if (result.ok) useStore.getState().setDesign(result.design);
        else alert(result.error === 'unreadable' ? 'Could not read file' : 'Invalid file');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleNew = () => {
    if (!confirm('Start a new kitchen design?')) return;
    const d = useStore.getState().design;
    useStore.getState().setDesign({ ...d, carcasses: [], furniture: [], fixtures: [] });
    useStore.getState().setScreen('room-setup');
  };

  // ---- Room Setup Screen ----
  if (screen === 'room-setup') {
    return <RoomShapeDesigner />;
  }

  // ---- Editor Screen ----
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M4 13 L12 5 L20 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="7.5" y="13" width="9" height="7" rx="1" fill="#fff" opacity="0.92"/>
            </svg>
          </div>
          <span className="topbar-logo-text">KitchenPlan</span>
        </div>

        <ResizeRoomBar />

        <button onClick={() => openRoomSetup('room-setup')} title="Edit room shape" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 9, color: 'var(--text-2)', fontSize: 13, fontWeight: 500 }}>
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><polygon points="3,8 10,3 17,8 17,17 3,17"/></svg>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Room shape</span>
        </button>

        {savedLocally && <span className="save-cue" role="status">Saved locally</span>}

        <div className="view-toggle">
          <button className={viewMode === '2d' ? 'active' : ''} onClick={() => setViewMode('2d')}>2D</button>
          <button className={viewMode === '3d' ? 'active' : ''} onClick={() => setViewMode('3d')}>3D</button>
          <button className={viewMode === 'walk' ? 'active' : ''} onClick={() => setViewMode('walk')}>Walk</button>
        </div>

        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setScale(s => Math.min(3, s * 1.2))} title="Zoom in">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg>
          </button>
          <button className="icon-btn" onClick={() => setScale(s => Math.max(0.4, s / 1.2))} title="Zoom out">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="4" y1="10" x2="16" y2="10"/></svg>
          </button>
          <span className="topbar-divider" />
          <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5 L3 8 L6 11"/><path d="M3 8 H12 a4 4 0 0 1 0 8 h-3"/></svg>
          </button>
          <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5 L17 8 L14 11"/><path d="M17 8 H8 a4 4 0 0 0 0 8 h3"/></svg>
          </button>
          <span className="topbar-divider" />
          <button className="icon-btn" onClick={handleImport} title="Import">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13 V4"/><path d="M6 8 L10 4 L14 8"/><path d="M4 16 H16"/></svg>
          </button>
          <button className="icon-btn" onClick={handleExport} title="Export">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3 V12"/><path d="M6 9 L10 13 L14 9"/><path d="M4 16 H16"/></svg>
          </button>
          <button className="icon-btn" onClick={() => useStore.getState().setShowExportPanel(true)} title="Print and export">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7 V3 H14 V7"/><path d="M6 14 H4 V8 H16 V14 H14"/><rect x="6" y="12" width="8" height="5"/></svg>
          </button>
          <button className="icon-btn" onClick={handleNew} title="New design">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2.5 H12 L16 6.5 V17 H6 Z"/><path d="M12 2.5 V6.5 H16"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>
          </button>
        </div>
      </header>

      <div className="canvas-area">
        <KitchenCanvas scale={scale} position={position} setScale={setScale} setPosition={setPosition} viewMode={viewMode} />
        {selectedId && !sheetTab && <ContextPanel />}
      </div>

      {sheetTab && <BottomSheet tab={sheetTab} onClose={() => setSheetTab(null)} />}
      <BottomBar activeTab={sheetTab} onTabChange={setSheetTab} />
      {showExportPanel && <ExportPanel />}
    </div>
  );
}

function ResizeRoomBar() {
  const setDesign = useStore((s) => s.setDesign);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setShowSuggestions(false);
    const result = resizeRoom(useStore.getState().design, text);
    setFeedback(result.message);
    if (result.ok) {
      setDesign(result.design);
      setInput('');
    }
    window.setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="resize-room-wrap">
      <div className="resize-room">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          aria-label="Resize room"
          placeholder="Resize room — e.g. 5m x 4m" />
        <button className="resize-room-submit" onClick={handleSend} disabled={!input.trim()}>
          Resize
        </button>
      </div>
      {showSuggestions && !input && (
        <div className="resize-room-suggestions">
          {RESIZE_SUGGESTIONS.map((s) => (
            <button key={s} onMouseDown={() => setInput(s)}>{s}</button>
          ))}
        </div>
      )}
      {feedback && <div className="resize-room-feedback">{feedback}</div>}
    </div>
  );
}
