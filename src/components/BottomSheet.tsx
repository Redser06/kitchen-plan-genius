import React from 'react';
import { useStore } from '../store/useStore';
import type { SheetTab } from '../store/useStore';
import type { ColourScheme, Materials } from '../domain/types';

interface Props { tab: SheetTab; onClose: () => void; }

const CARCASS_SIZES = [200, 400, 600, 800, 1000];
const FITTING_TYPES = [
  { value: 'drawer', label: 'Drawer bank' }, { value: 'cutlery', label: 'Cutlery drawer' },
  { value: 'pullout', label: 'Pull-out shelf' }, { value: 'spice', label: 'Spice rack' },
  { value: 'carousel', label: 'Corner carousel' }, { value: 'larder', label: 'Larder unit' },
  { value: 'wine', label: 'Wine rack' }, { value: 'bin', label: 'Bin pull-out' },
  { value: 'plate', label: 'Plate rack' }, { value: 'garage', label: 'Appliance garage' },
];
const APPLIANCE_TYPES = [
  { value: 'hob', label: 'Induction hob', sizes: '600 / 800mm' },
  { value: 'oven', label: 'Built-in oven', sizes: '600mm' },
  { value: 'sink', label: 'Sink — Undermount', sizes: '600 / 800mm' },
  { value: 'sink-belfast', label: 'Sink — Belfast', sizes: '600mm' },
  { value: 'sink-farm', label: 'Sink — Farmhouse', sizes: '800mm' },
  { value: 'fridge', label: 'Integrated fridge', sizes: '600 / 800mm' },
  { value: 'dishwasher', label: 'Dishwasher', sizes: '600mm' },
  { value: 'rangehood', label: 'Extractor hood', sizes: '600 / 800mm' },
  { value: 'winecooler', label: 'Wine cooler', sizes: '400 / 600mm' },
  { value: 'microwave', label: 'Microwave', sizes: '600mm' },
  { value: 'washer', label: 'Washing machine', sizes: '600mm' },
];
const PALETTES = {
  warmOak: { name: 'Warm Oak', cabinets: '#C9B79C', countertops: '#2E2620', walls: '#F8F3EA', floor: '#E4D3BA', backsplash: '#EFE2D0', handles: '#5B4A38' },
  sage: { name: 'Sage & Linen', cabinets: '#9CAF93', countertops: '#3A3A32', walls: '#F5F3ED', floor: '#DCD4C4', backsplash: '#E7E5DC', handles: '#736A54' },
  charcoal: { name: 'Charcoal & Brass', cabinets: '#3E3B38', countertops: '#242220', walls: '#EDEAE4', floor: '#C9C2B7', backsplash: '#DAD5CB', handles: '#B08D57' },
  terracotta: { name: 'Soft Terracotta', cabinets: '#C1602C', countertops: '#2B2420', walls: '#FAF6F1', floor: '#E8DDCF', backsplash: '#F3E1D2', handles: '#3A322B' },
  coastal: { name: 'Coastal Driftwood', cabinets: '#B9C4C2', countertops: '#41504E', walls: '#F4F6F5', floor: '#D9D2C4', backsplash: '#E5E9E7', handles: '#6E7F7C' },
};

export default function BottomSheet({ tab, onClose }: Props) {
  if (!tab) return null;
  const titles: Record<string, string> = { components: 'Components', measure: 'Room Measurements', materials: 'Materials & Finishes', fixtures: 'Fixtures & Utilities', analysis: 'Analysis & Recommendations' };
  return (
    <div className="bottom-sheet">
      <div className="bottom-sheet-header">
        <h2>{titles[tab]}</h2>
        <button className="sheet-close" onClick={onClose}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg></button>
      </div>
      <div className="sheet-content">
        {tab === 'components' && <ComponentsPanel />}
        {tab === 'measure' && <MeasurePanel />}
        {tab === 'materials' && <MaterialsPanel />}
        {tab === 'fixtures' && <FixturesPanel />}
        {tab === 'analysis' && <AnalysisPanel />}
      </div>
    </div>
  );
}

function ComponentsPanel() {
  const setTool = useStore((s) => s.setTool);
  const tool = useStore((s) => s.tool);
  const selectedCarcassSize = useStore((s) => s.selectedCarcassSize);
  const setSelectedCarcassSize = useStore((s) => s.setSelectedCarcassSize);
  const addFurniture = useStore((s) => s.addFurniture);
  const addAmericanFridge = useStore((s) => s.addAmericanFridge);
  const design = useStore((s) => s.design);
  const selectedId = useStore((s) => s.selectedId);
  const updateCarcass = useStore((s) => s.updateCarcass);
  const selectedCarcass = design.carcasses.find((c: any) => c.id === selectedId);
  const hasSel = !!selectedCarcass;

  return (
    <div>
      <div className="section-label">Tools</div>
      <div className="chip-row">
        <button className={`chip ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool('select')}>🖱️ Select & move</button>
        <button className={`chip ${tool === 'pan' ? 'active' : ''}`} onClick={() => setTool('pan')}>✋ Pan</button>
        <button className={`chip ${tool === 'place-carcass' ? 'active' : ''}`} onClick={() => setTool('place-carcass')}>📦 Place cabinet</button>
        <button className={`chip ${tool === 'place-furniture' ? 'active' : ''}`} onClick={() => setTool('place-furniture')}>🪑 Place furniture</button>
      </div>

      <div className="section-label">Standard cabinet widths</div>
      <div className="size-card-row">
        {CARCASS_SIZES.map((size) => (
          <button key={size} className={`size-card ${selectedCarcassSize === size ? 'active' : ''}`} onClick={() => { setSelectedCarcassSize(size as any); setTool('place-carcass'); }}>
            <div className="num">{size}</div><div className="unit">mm</div>
          </button>
        ))}
      </div>

      <div className="section-label">Fittings & internal storage</div>
      <div className="fitting-chip-row" style={{ opacity: hasSel ? 1 : 0.45, pointerEvents: hasSel ? 'auto' : 'none', marginBottom: 24 }}>
        {FITTING_TYPES.map((f) => (
          <button key={f.value} className="fitting-chip" onClick={() => selectedCarcass && updateCarcass(selectedCarcass.id, { fittingType: f.value, fittingLabel: f.label })}>{f.label}</button>
        ))}
      </div>

      <div className="section-label">Appliances</div>
      <div className="appliance-grid" style={{ opacity: hasSel ? 1 : 0.45, pointerEvents: hasSel ? 'auto' : 'none', marginBottom: 24 }}>
        {APPLIANCE_TYPES.map((a) => (
          <button key={a.value} className="appliance-card" onClick={() => selectedCarcass && updateCarcass(selectedCarcass.id, { applianceType: a.value, applianceLabel: a.label })}>
            <div className="name">{a.label}</div><div className="sizes">{a.sizes}</div>
          </button>
        ))}
      </div>

      <div className="section-label">Non-standard units</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <button className="furniture-card" onClick={addAmericanFridge}>
          <div className="name">American Fridge-Freezer</div><div className="detail">900 × 750mm · tall</div>
        </button>
      </div>

      <div className="section-label">Furniture</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="furniture-card" onClick={() => addFurniture({ id: `f-${Date.now()}`, type: 'dining-table', label: 'Dining Table', position: { x: design.room.points[0].x + 1000, y: design.room.points[0].y + 500 }, width: 1800, depth: 900, rotation: 0, seats: 6 })}>
          <div className="name">Dining table</div><div className="detail">6 seats · 1800×900mm</div>
        </button>
        <button className="furniture-card" onClick={() => addFurniture({ id: `f-${Date.now()}`, type: 'round-table', label: 'Round Table', position: { x: design.room.points[0].x + 1000, y: design.room.points[0].y + 500 }, width: 1200, depth: 1200, rotation: 0, seats: 4 })}>
          <div className="name">Round table</div><div className="detail">4 seats · Ø1200mm</div>
        </button>
        <button className="furniture-card" onClick={() => addFurniture({ id: `f-${Date.now()}`, type: 'sideboard', label: 'Sideboard', position: { x: 200, y: 200 }, width: 1500, depth: 400, rotation: 0 })}>
          <div className="name">Sideboard</div><div className="detail">1500×400mm</div>
        </button>
      </div>
    </div>
  );
}

function MeasurePanel() {
  const design = useStore((s) => s.design);
  const updateRoomHeight = useStore((s) => s.updateRoomHeight);
  const setScreen = useStore((s) => s.setScreen);
  const pts = design.room.points;
  const floorArea = Math.abs(pts.reduce((s, p, i) => s + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y, 0)) / 2;
  const perimeter = pts.reduce((s, p, i) => s + Math.hypot(pts[(i + 1) % pts.length].x - p.x, pts[(i + 1) % pts.length].y - p.y), 0);

  return (
    <div>
      <div className="section-label">Room shape</div>
      <button onClick={() => setScreen('room-setup')} style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 600, background: 'var(--surface-soft)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        ✏️ Edit room shape
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Opens the room shape designer — drag corners, add walls, set precise lengths.</p>

      <div className="section-label">Ceiling height</div>
      <div className="measure-row">
        <label>Height</label>
        <input type="range" min={2200} max={3200} step={50} value={design.room.height} onChange={(e) => updateRoomHeight(Number(e.target.value))} />
        <div className="val">{(design.room.height / 1000).toFixed(2)}m</div>
      </div>

      <div className="section-label">Room summary</div>
      <div className="summary-grid cols-3">
        <div className="summary-card"><div className="label">Floor area</div><div className="val">{(floorArea / 1e6).toFixed(1)} m²</div></div>
        <div className="summary-card"><div className="label">Perimeter</div><div className="val">{(perimeter / 1000).toFixed(1)} m</div></div>
        <div className="summary-card"><div className="label">Volume</div><div className="val">{((floorArea * design.room.height) / 1e9).toFixed(1)} m³</div></div>
      </div>
    </div>
  );
}

function MaterialsPanel() {
  const colours = useStore((s) => s.design.colours);
  const updateColours = useStore((s) => s.updateColours);
  const materials = useStore((s) => s.design.materials);
  const updateMaterials = useStore((s) => s.updateMaterials);
  const colourFields: { key: keyof ColourScheme; label: string }[] = [
    { key: 'cabinets', label: 'Cabinets' }, { key: 'countertops', label: 'Countertops' },
    { key: 'walls', label: 'Walls' }, { key: 'floor', label: 'Floor' },
    { key: 'backsplash', label: 'Backsplash' }, { key: 'handles', label: 'Handles' },
  ];
  const countertopOpts = [{ label: 'Quartz White', hex: '#E8E3DA' }, { label: 'Black Granite', hex: '#2E2620' }, { label: 'Carrara Marble', hex: '#DCD6CB' }, { label: 'Concrete', hex: '#B8B2A8' }];
  const flooringOpts = [{ label: 'Natural Oak', hex: '#E4D3BA' }, { label: 'Herringbone Oak', hex: '#D8C3A0' }, { label: 'Porcelain Tile', hex: '#E8E6E1' }, { label: 'Slate', hex: '#5A5A56' }];
  const backsplashOpts = [{ label: 'Subway Tile', hex: '#EFE9DE' }, { label: 'Marble Slab', hex: '#DED8CC' }, { label: 'Patterned Tile', hex: '#D8CBB0' }, { label: 'Plain', hex: '#EFE2D0' }];

  return (
    <div>
      <div className="section-label">Cabinet finish</div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        {['Shaker', 'Slab', 'Beadboard'].map((f) => (
          <button key={f} className={`chip ${materials.cabinetFinish === f ? 'active' : ''}`} onClick={() => updateMaterials({ cabinetFinish: f as any })}>{f}</button>
        ))}
      </div>

      <div className="section-label">Countertop material</div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        {countertopOpts.map((o) => (
          <button key={o.label} className={`chip ${materials.countertopMaterial === o.label ? 'active' : ''}`} onClick={() => { updateMaterials({ countertopMaterial: o.label }); updateColours({ countertops: o.hex }); }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: o.hex, display: 'inline-block', marginRight: 4 }} />{o.label}
          </button>
        ))}
      </div>

      <div className="section-label">Flooring</div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        {flooringOpts.map((o) => (
          <button key={o.label} className={`chip ${materials.flooringStyle === o.label ? 'active' : ''}`} onClick={() => { updateMaterials({ flooringStyle: o.label }); updateColours({ floor: o.hex }); }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: o.hex, display: 'inline-block', marginRight: 4 }} />{o.label}
          </button>
        ))}
      </div>

      <div className="section-label">Backsplash</div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        {backsplashOpts.map((o) => (
          <button key={o.label} className={`chip ${materials.backsplashStyle === o.label ? 'active' : ''}`} onClick={() => { updateMaterials({ backsplashStyle: o.label }); updateColours({ backsplash: o.hex }); }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: o.hex, display: 'inline-block', marginRight: 4 }} />{o.label}
          </button>
        ))}
      </div>

      <div className="section-label">Fine-tune colours</div>
      <div className="colour-grid">
        {colourFields.map(({ key, label }) => (
          <div key={key} className="colour-row">
            <div className="colour-swatch" style={{ background: colours[key] }}><input type="color" value={colours[key]} onChange={(e) => updateColours({ [key]: e.target.value } as any)} /></div>
            <div><div className="colour-name">{label}</div><div className="colour-hex">{colours[key]}</div></div>
          </div>
        ))}
      </div>

      <div className="section-label">Preset palettes</div>
      <div className="palette-grid">
        {Object.entries(PALETTES).map(([key, p]) => (
          <button key={key} className="palette-card" onClick={() => updateColours({ cabinets: p.cabinets, countertops: p.countertops, walls: p.walls, floor: p.floor, backsplash: p.backsplash, handles: p.handles })}>
            <div className="name">{p.name}</div>
            <div className="swatches"><div style={{ background: p.cabinets }} /><div style={{ background: p.countertops }} /><div style={{ background: p.walls }} /><div style={{ background: p.floor }} /><div style={{ background: p.handles }} /></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FixturesPanel() {
  const setTool = useStore((s) => s.setTool);
  const tool = useStore((s) => s.tool);
  const design = useStore((s) => s.design);
  const removeFixture = useStore((s) => s.removeFixture);
  const fixtureLabels: Record<string, string> = { door: 'Door', window: 'Window', socket: 'Socket', switch: 'Light switch', water: 'Water supply', waste: 'Waste point', pendant: 'Pendant light', downlight: 'Recessed downlight' };
  const fixtureColors: Record<string, string> = { door: '#8A6A4A', window: '#4E7A96', socket: '#6B6058', switch: '#8A7A63', water: '#4E7A96', waste: '#8A6A4A', pendant: '#C08A3E', downlight: '#C08A3E' };

  return (
    <div>
      <div className="section-label">Doors & windows — click on a wall</div>
      <div className="chip-row">
        <button className={`chip ${tool === 'place-door' ? 'active' : ''}`} onClick={() => setTool('place-door')}>🚪 Door</button>
        <button className={`chip ${tool === 'place-window' ? 'active' : ''}`} onClick={() => setTool('place-window')}>🪟 Window</button>
      </div>

      <div className="section-label">Electrical — click on a wall</div>
      <div className="chip-row">
        <button className={`chip ${tool === 'place-socket' ? 'active' : ''}`} onClick={() => setTool('place-socket')}>🔌 Socket</button>
        <button className={`chip ${tool === 'place-switch' ? 'active' : ''}`} onClick={() => setTool('place-switch')}>🔘 Light switch</button>
      </div>

      <div className="section-label">Plumbing — click the floor plan</div>
      <div className="chip-row">
        <button className={`chip ${tool === 'place-water' ? 'active' : ''}`} onClick={() => setTool('place-water')}>💧 Water supply</button>
        <button className={`chip ${tool === 'place-waste' ? 'active' : ''}`} onClick={() => setTool('place-waste')}>🕳️ Waste point</button>
      </div>

      <div className="section-label">Lighting — click the floor plan</div>
      <div className="chip-row" style={{ marginBottom: 24 }}>
        <button className={`chip ${tool === 'place-light-pendant' ? 'active' : ''}`} onClick={() => setTool('place-light-pendant')}>💡 Pendant light</button>
        <button className={`chip ${tool === 'place-light-downlight' ? 'active' : ''}`} onClick={() => setTool('place-light-downlight')}>🔆 Recessed downlight</button>
      </div>

      <div className="section-label">Placed fixtures ({design.fixtures.length})</div>
      {design.fixtures.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No fixtures placed yet — pick a tool above, then click on the plan.</p>
      ) : (
        <div className="item-list">
          {design.fixtures.map((f: any) => (
            <div key={f.id} className="item-row">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: fixtureColors[f.type] || '#888', flexShrink: 0 }} />
              <div className="item-info">
                <div className="item-name">{fixtureLabels[f.type] || f.type}</div>
                <div className="item-detail">{f.wallIndex !== undefined ? `Wall ${f.wallIndex}, ${Math.round((f.t || 0) * 100)}%` : `Floor ${Math.round(f.position.x)}, ${Math.round(f.position.y)}mm`}{f.width ? ` · ${f.width}mm` : ''}</div>
              </div>
              <button className="item-delete" onClick={() => removeFixture(f.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisPanel() {
  const analysis = useStore((s) => s.analysis);
  const design = useStore((s) => s.design);
  if (!analysis) return <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 24 }}>Add components to see analysis.</div>;

  const lightColorMap: Record<string, string> = { poor: 'var(--error)', adequate: 'var(--warning)', good: 'var(--blue)', excellent: 'var(--success)' };
  const lightColor = lightColorMap[analysis.light.rating];
  const circumference = 2 * Math.PI * 40;
  const frac = Math.max(0.02, Math.min(1, analysis.light.lightRatio / 0.4));
  const lightDash = `${(circumference * frac).toFixed(1)} ${circumference.toFixed(1)}`;
  const wt = analysis.triangle;
  const trianglePercent = wt ? Math.max(4, Math.min(100, (wt.perimeter / 6600) * 100)) : 0;
  const triangleColor = wt?.status === 'ok' ? 'var(--success)' : 'var(--warning)';
  const walkway = analysis.walkway;
  const walkwayPercent = walkway ? Math.max(4, Math.min(100, (walkway.clearance / 1500) * 100)) : 0;
  const walkwayColorMap: Record<string, string> = { ok: 'var(--success)', warning: 'var(--warning)', error: 'var(--error)' };
  const walkwayColor = walkway ? walkwayColorMap[walkway.status] : 'var(--success)';

  return (
    <div>
      <div className="analysis-top">
        <div className="light-gauge-card">
          <div className="section-label" style={{ alignSelf: 'flex-start', margin: '0 0 10px 0' }}>Natural light</div>
          <svg viewBox="0 0 100 100" width="118" height="118">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={lightColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={lightDash} transform="rotate(-90 50 50)" />
            <text x="50" y="47" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--text)" fontFamily="Newsreader,serif">{Math.round(analysis.light.lightRatio * 100)}%</text>
            <text x="50" y="62" textAnchor="middle" fontSize="8" fill="var(--text-3)">glazing ratio</text>
          </svg>
          <div className={`light-badge ${analysis.light.rating}`}>{analysis.light.rating.charAt(0).toUpperCase() + analysis.light.rating.slice(1)}</div>
        </div>
        <div className="flow-card">
          <div className="section-label" style={{ margin: '0 0 14px 0' }}>Work triangle & flow</div>
          {wt && (<><div className="flow-line"><span className="fl">Sink → Hob → Fridge perimeter</span><span className="fv">{Math.round(wt.perimeter)}mm</span></div><div className="progress-bar" style={{ marginBottom: 4 }}><div style={{ width: `${trianglePercent}%`, background: triangleColor }} /></div><div className="progress-note" style={{ marginBottom: 16 }}>Ideal: 4000–6600mm, each leg 1200–2700mm</div></>)}
          {walkway && (<><div className="flow-line"><span className="fl">Walkway clearance — table to counter</span><span className="fv">{Math.round(walkway.clearance)}mm</span></div><div className="progress-bar"><div style={{ width: `${walkwayPercent}%`, background: walkwayColor }} /></div><div className="progress-note" style={{ marginTop: 4 }}>900mm minimum recommended</div></>)}
        </div>
      </div>

      <div className="section-label">Issues & recommendations</div>
      {analysis.issues.map((issue: any) => (
        <div key={issue.id} className={`issue-card ${issue.severity}`}>
          <div className="msg">{issue.message}</div>
          {issue.detail && <div className="detail">{issue.detail}</div>}
          {issue.fix && <div className="fix">→ {issue.fix}</div>}
        </div>
      ))}

      <div style={{ height: 12 }} />
      <div className="section-label">Design summary</div>
      <div className="summary-grid cols-4">
        <div className="summary-card"><div className="label">Cabinets</div><div className="val">{design.carcasses.length}</div></div>
        <div className="summary-card"><div className="label">Run length</div><div className="val">{(design.carcasses.reduce((s: number, c: any) => s + c.size, 0) / 1000).toFixed(1)}m</div></div>
        <div className="summary-card"><div className="label">Furniture</div><div className="val">{design.furniture.length}</div></div>
        <div className="summary-card"><div className="label">Floor area</div><div className="val">{(analysis.light.floorAreaM2).toFixed(1)} m²</div></div>
      </div>
    </div>
  );
}
