import React from 'react';
import { useStore } from '../store/useStore';

const CARCASS_SIZES = [200, 400, 600, 800, 1000];
const CARCASS_DEPTHS = [500, 550, 600, 650];
const FITTING_OPTIONS = [
  { value: 'plain', label: '— Plain cupboard —' },
  { value: 'drawer', label: 'Drawer bank' }, { value: 'cutlery', label: 'Cutlery drawer' },
  { value: 'pullout', label: 'Pull-out shelf' }, { value: 'spice', label: 'Spice rack' },
  { value: 'carousel', label: 'Corner carousel' }, { value: 'larder', label: 'Larder unit' },
  { value: 'wine', label: 'Wine rack' }, { value: 'bin', label: 'Bin pull-out' },
  { value: 'plate', label: 'Plate rack' }, { value: 'garage', label: 'Appliance garage (tambour)' },
];
const APPLIANCE_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'hob', label: 'Induction hob' }, { value: 'oven', label: 'Built-in oven' },
  { value: 'sink', label: 'Sink — Undermount' }, { value: 'sink-belfast', label: 'Sink — Belfast' },
  { value: 'sink-farm', label: 'Sink — Farmhouse' },
  { value: 'fridge', label: 'Integrated fridge' }, { value: 'dishwasher', label: 'Dishwasher' },
  { value: 'rangehood', label: 'Extractor hood' }, { value: 'winecooler', label: 'Wine cooler' },
  { value: 'microwave', label: 'Microwave' }, { value: 'washer', label: 'Washing machine' },
];
const fixtureLabels: Record<string, string> = { door: 'Door', window: 'Window', socket: 'Socket', switch: 'Light switch', water: 'Water supply', waste: 'Waste point', pendant: 'Pendant light', downlight: 'Recessed downlight' };

export default function ContextPanel() {
  const design = useStore((s) => s.design);
  const selectedId = useStore((s) => s.selectedId);
  const setSelected = useStore((s) => s.setSelected);
  const updateCarcass = useStore((s) => s.updateCarcass);
  const removeCarcass = useStore((s) => s.removeCarcass);
  const updateFurniture = useStore((s) => s.updateFurniture);
  const removeFurniture = useStore((s) => s.removeFurniture);
  const removeFixture = useStore((s) => s.removeFixture);

  const carcass = design.carcasses.find((c: any) => c.id === selectedId);
  const furniture = design.furniture.find((f: any) => f.id === selectedId);
  const fixture = design.fixtures.find((f: any) => f.id === selectedId);

  if (!carcass && !furniture && !fixture) return null;

  if (fixture) {
    return (
      <div className="context-panel">
        <h3>{fixtureLabels[fixture.type] || fixture.type}</h3>
        <div className="subtitle">{fixture.wallIndex !== undefined ? `Wall ${fixture.wallIndex}` : `Floor position`}</div>
        {fixture.width && <div className="field"><label>Width</label><input type="number" value={fixture.width} onChange={(e) => useStore.setState((s: any) => { const d = JSON.parse(JSON.stringify(s.design)); const f = d.fixtures.find((fx: any) => fx.id === fixture.id); if (f) f.width = Number(e.target.value); return { design: d }; })} /></div>}
        <button className="delete-btn" onClick={() => { removeFixture(fixture.id); setSelected(null); }}>🗑 Delete fixture</button>
      </div>
    );
  }

  if (furniture) {
    return (
      <div className="context-panel">
        <h3>{furniture.label}</h3>
        <div className="subtitle">{furniture.width} × {furniture.depth}mm{furniture.seats ? ` · ${furniture.seats} seats` : ''}</div>
        <div className="field"><label>Label</label><input type="text" value={furniture.label} onChange={(e) => updateFurniture(furniture.id, { label: e.target.value })} /></div>
        <div className="field-row">
          <div className="field"><label>Width (mm)</label><input type="number" step={50} value={furniture.width} onChange={(e) => updateFurniture(furniture.id, { width: Number(e.target.value) })} /></div>
          <div className="field"><label>Depth (mm)</label><input type="number" step={50} value={furniture.depth} onChange={(e) => updateFurniture(furniture.id, { depth: Number(e.target.value) })} /></div>
        </div>
        {furniture.seats !== undefined && <div className="field"><label>Seats</label><input type="number" min={2} max={12} value={furniture.seats} onChange={(e) => updateFurniture(furniture.id, { seats: Number(e.target.value) })} /></div>}
        <div className="field"><label>Rotation (degrees)</label><input type="number" step={15} value={furniture.rotation} onChange={(e) => updateFurniture(furniture.id, { rotation: Number(e.target.value) })} /></div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[0, 90, 180, 270].map(r => <button key={r} onClick={() => updateFurniture(furniture.id, { rotation: r })} style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, background: furniture.rotation === r ? 'var(--accent-soft)' : 'var(--bg)', color: furniture.rotation === r ? 'var(--accent)' : 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6 }}>{r}°</button>)}
        </div>
        <button className="delete-btn" onClick={() => { removeFurniture(furniture.id); setSelected(null); }}>🗑 Delete item</button>
      </div>
    );
  }

  if (carcass) {
    return (
      <div className="context-panel">
        <h3>{carcass.label || `${carcass.size}mm Unit`}</h3>
        <div className="subtitle">{carcass.size} × {carcass.depth}mm{carcass.applianceLabel ? ` · ${carcass.applianceLabel}` : ''}{carcass.fittingLabel ? ` · ${carcass.fittingLabel}` : ''}</div>
        <div className="field-row">
          <div className="field"><label>Width</label><select value={carcass.size} onChange={(e) => updateCarcass(carcass.id, { size: Number(e.target.value) as any })}>{CARCASS_SIZES.map(s => <option key={s} value={s}>{s}mm</option>)}</select></div>
          <div className="field"><label>Depth</label><select value={carcass.depth} onChange={(e) => updateCarcass(carcass.id, { depth: Number(e.target.value) as any })}>{CARCASS_DEPTHS.map(d => <option key={d} value={d}>{d}mm</option>)}</select></div>
        </div>
        <div className="field"><label>Mount type</label><select value={carcass.mount} onChange={(e) => updateCarcass(carcass.id, { mount: e.target.value as any })}><option value="floor">Floor unit</option><option value="wall">Wall unit</option><option value="tall">Tall unit</option></select></div>
        <div className="field"><label>Label</label><input type="text" value={carcass.label || ''} placeholder={`${carcass.size}mm Unit`} onChange={(e) => updateCarcass(carcass.id, { label: e.target.value })} /></div>
        <div className="field"><label>Fitting</label><select value={carcass.fittingType} onChange={(e) => { const opt = FITTING_OPTIONS.find(o => o.value === e.target.value); updateCarcass(carcass.id, { fittingType: e.target.value, fittingLabel: opt?.label.replace('— ', '') || '' }); }}>{FITTING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div className="field"><label>Appliance</label><select value={carcass.applianceType || ''} onChange={(e) => { const val = e.target.value; const opt = APPLIANCE_OPTIONS.find(o => o.value === val); updateCarcass(carcass.id, { applianceType: val || null, applianceLabel: val ? opt?.label || val : null }); }}>{APPLIANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div className="field"><label>Rotation (degrees)</label><input type="number" step={15} value={carcass.rotation} onChange={(e) => updateCarcass(carcass.id, { rotation: Number(e.target.value) })} /></div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[0, 90, 180, 270].map(r => <button key={r} onClick={() => updateCarcass(carcass.id, { rotation: r })} style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, background: carcass.rotation === r ? 'var(--accent-soft)' : 'var(--bg)', color: carcass.rotation === r ? 'var(--accent)' : 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6 }}>{r}°</button>)}
        </div>
        <button className="delete-btn" onClick={() => { removeCarcass(carcass.id); setSelected(null); }}>🗑 Delete unit</button>
      </div>
    );
  }
  return null;
}
