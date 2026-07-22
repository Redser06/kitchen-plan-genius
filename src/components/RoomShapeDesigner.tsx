import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Vec2 } from '../domain/types';

const MM_TO_PX = 0.16;

export default function RoomShapeDesigner() {
  const roomDraft = useStore((s) => s.roomDraft);
  const setRoomDraft = useStore((s) => s.setRoomDraft);
  const selectedCornerIndex = useStore((s) => s.selectedCornerIndex);
  const selectedWallIndex = useStore((s) => s.selectedWallIndex);
  const setSelectedCornerIndex = useStore((s) => s.setSelectedCornerIndex);
  const setSelectedWallIndex = useStore((s) => s.setSelectedWallIndex);
  const confirmRoomDraft = useStore((s) => s.confirmRoomDraft);
  const cancelRoomSetup = useStore((s) => s.setScreen);
  const [aiInput, setAiInput] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [cornerDrag, setCornerDrag] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const pts = roomDraft.points;

  const fitTransform = (points: Vec2[]) => {
    const xs = points.map(p => p.x * MM_TO_PX), ys = points.map(p => p.y * MM_TO_PX);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    const scale = Math.min(760 / w, 460 / h, 2.2);
    const tx = 500 - (minX + w / 2) * scale;
    const ty = 350 - (minY + h / 2) * scale;
    return { tx, ty, scale };
  };

  const ft = fitTransform(pts);
  const transform = `translate(${ft.tx} ${ft.ty}) scale(${ft.scale})`;

  const onRoomMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (cornerDrag === null) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const vx = (e.clientX - rect.left) * (1000 / rect.width);
    const vy = (e.clientY - rect.top) * (700 / rect.height);
    const mmX = (vx - ft.tx) / ft.scale / MM_TO_PX;
    const mmY = (vy - ft.ty) / ft.scale / MM_TO_PX;
    const idx = cornerDrag;
    const n = pts.length;
    const prevPt = pts[(idx - 1 + n) % n];
    const dx = mmX - prevPt.x, dy = mmY - prevPt.y;
    const dist = Math.hypot(dx, dy);
    const snapRad = 15 * Math.PI / 180;
    const ang = Math.round(Math.atan2(dy, dx) / snapRad) * snapRad;
    const newPts = pts.slice();
    newPts[idx] = { x: prevPt.x + Math.cos(ang) * dist, y: prevPt.y + Math.sin(ang) * dist };
    setRoomDraft(newPts);
  };

  const onWallDoubleClick = (e: React.MouseEvent, wallIndex: number) => {
    e.stopPropagation();
    const rect = svgRef.current!.getBoundingClientRect();
    const vx = (e.clientX - rect.left) * (1000 / rect.width);
    const vy = (e.clientY - rect.top) * (700 / rect.height);
    const mmX = (vx - ft.tx) / ft.scale / MM_TO_PX;
    const mmY = (vy - ft.ty) / ft.scale / MM_TO_PX;
    const newPts = pts.slice();
    newPts.splice(wallIndex + 1, 0, { x: Math.round(mmX), y: Math.round(mmY) });
    setRoomDraft(newPts);
    setSelectedCornerIndex(wallIndex + 1);
    setSelectedWallIndex(null);
  };

  const deleteCorner = (idx: number) => {
    if (pts.length <= 3) return;
    const newPts = pts.slice();
    newPts.splice(idx, 1);
    setRoomDraft(newPts);
    setSelectedCornerIndex(null);
  };

  const setWallLength = (idx: number, newLen: number) => {
    const n = pts.length;
    const p1 = pts[idx], p2 = pts[(idx + 1) % n];
    const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const newPts = pts.slice();
    newPts[(idx + 1) % n] = { x: p1.x + Math.cos(ang) * newLen, y: p1.y + Math.sin(ang) * newLen };
    setRoomDraft(newPts);
  };

  const setWallAngle = (idx: number, newAngDeg: number) => {
    const n = pts.length;
    const p1 = pts[idx], p2 = pts[(idx + 1) % n];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const rad = newAngDeg * Math.PI / 180;
    const newPts = pts.slice();
    newPts[(idx + 1) % n] = { x: p1.x + Math.cos(rad) * len, y: p1.y + Math.sin(rad) * len };
    setRoomDraft(newPts);
  };

  const generateRoomShape = (input: string): Vec2[] => {
    const text = input.toLowerCase();
    const m = input.match(/(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/i);
    const w = m ? Math.round(parseFloat(m[1]) * 1000) : 4200;
    const d = m ? Math.round(parseFloat(m[2]) * 1000) : 3200;
    if (text.includes('l-shape') || text.includes('l shape'))
      return [{ x: 0, y: 0 }, { x: w * 0.6, y: 0 }, { x: w * 0.6, y: d * 0.4 }, { x: w, y: d * 0.4 }, { x: w, y: d }, { x: 0, y: d }];
    if (text.includes('u-shape') || text.includes('u shape'))
      return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: d }, { x: w * 0.65, y: d }, { x: w * 0.65, y: d * 0.4 }, { x: w * 0.35, y: d * 0.4 }, { x: w * 0.35, y: d }, { x: 0, y: d }];
    if (text.includes('galley'))
      return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: Math.min(d, 2400) }, { x: 0, y: Math.min(d, 2400) }];
    return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: d }, { x: 0, y: d }];
  };

  const handleAISend = () => {
    if (!aiInput.trim()) return;
    const points = generateRoomShape(aiInput);
    setRoomDraft(points);
    setAiFeedback('Generated a starting shape — drag corners or select a wall to fine-tune.');
    setAiInput('');
    setSelectedCornerIndex(null);
    setSelectedWallIndex(null);
    setTimeout(() => setAiFeedback(null), 4500);
  };

  // Side panel values
  let cornerPanel: any = null;
  if (selectedCornerIndex !== null && selectedCornerIndex < pts.length) {
    const p = pts[selectedCornerIndex];
    cornerPanel = { posLabel: `${Math.round(p.x)}, ${Math.round(p.y)} mm` };
  }

  let wallPanel: any = null;
  if (selectedWallIndex !== null && selectedWallIndex < pts.length) {
    const p1 = pts[selectedWallIndex], p2 = pts[(selectedWallIndex + 1) % pts.length];
    const len = Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y));
    const ang = Math.round(Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI);
    wallPanel = { len, ang, idx: selectedWallIndex };
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="topbar-logo-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M4 13 L12 5 L20 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="7.5" y="13" width="9" height="7" rx="1" fill="#fff" opacity="0.92"/></svg></div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: 20, fontWeight: 600 }}>Room Shape</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => cancelRoomSetup('editor')} style={{ padding: '10px 20px', borderRadius: 9, fontSize: 14, fontWeight: 500, color: 'var(--text-3)', border: '1px solid var(--border)' }}>Cancel</button>
        <button onClick={() => confirmRoomDraft()} style={{ padding: '10px 24px', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#fff' }}>✓ Confirm Shape</button>
      </header>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg ref={svgRef} viewBox="0 0 1000 700" width="100%" height="100%" style={{ display: 'block' }}
            onMouseMove={onRoomMouseMove} onMouseUp={() => setCornerDrag(null)} onMouseLeave={() => setCornerDrag(null)}>
            <rect x={-2000} y={-2000} width={6000} height={6000} fill="var(--bg)" />
            <g transform={transform}>
              {/* Grid */}
              {Array.from({ length: 50 }, (_, i) => i * 200).map(v => (
                <React.Fragment key={`g${v}`}>
                  <line x1={v * MM_TO_PX} y1={-2000 * MM_TO_PX} x2={v * MM_TO_PX} y2={2000 * MM_TO_PX} stroke="#EDE3D6" strokeWidth={0.4} />
                  <line x1={-2000 * MM_TO_PX} y1={v * MM_TO_PX} x2={2000 * MM_TO_PX} y2={v * MM_TO_PX} stroke="#EDE3D6" strokeWidth={0.4} />
                </React.Fragment>
              ))}
              {/* Room polygon */}
              <polygon points={pts.map(p => `${p.x * MM_TO_PX},${p.y * MM_TO_PX}`).join(' ')} fill="#F3E1D2" fillOpacity={0.3} stroke="none" />
              {/* Walls */}
              {pts.map((p, i) => {
                const next = pts[(i + 1) % pts.length];
                const isSel = selectedWallIndex === i;
                return <line key={`w${i}`} x1={p.x * MM_TO_PX} y1={p.y * MM_TO_PX} x2={next.x * MM_TO_PX} y2={next.y * MM_TO_PX}
                  stroke={isSel ? 'var(--accent)' : '#7A6A53'} strokeWidth={isSel ? 9 : 7} vectorEffect="non-scaling-stroke" strokeLinecap="round"
                  style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedWallIndex(i); setSelectedCornerIndex(null); }}
                  onDoubleClick={(e) => onWallDoubleClick(e, i)} />;
              })}
              {/* Wall labels */}
              {pts.map((p, i) => {
                const next = pts[(i + 1) % pts.length];
                const len = Math.round(Math.hypot(next.x - p.x, next.y - p.y));
                const mx = (p.x + next.x) / 2 * MM_TO_PX, my = (p.y + next.y) / 2 * MM_TO_PX;
                return <text key={`wl${i}`} x={mx} y={my - 10} fontSize={10} fill="#9C9186" textAnchor="middle" pointerEvents="none">{len}mm</text>;
              })}
              {/* Corners */}
              {pts.map((p, i) => {
                const isSel = selectedCornerIndex === i;
                const isDrag = cornerDrag === i;
                return (
                  <g key={`c${i}`}>
                    <circle cx={p.x * MM_TO_PX} cy={p.y * MM_TO_PX} r={20} fill="transparent" style={{ cursor: 'grab' }}
                      onMouseDown={(e) => { e.stopPropagation(); setCornerDrag(i); setSelectedCornerIndex(i); setSelectedWallIndex(null); }} />
                    <circle cx={p.x * MM_TO_PX} cy={p.y * MM_TO_PX} r={isSel || isDrag ? 8 : 5}
                      fill={isDrag ? 'var(--accent)' : isSel ? '#fff' : 'var(--surface)'} stroke="var(--accent)" strokeWidth={2} pointerEvents="none" />
                  </g>
                );
              })}
            </g>
          </svg>
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '7px 18px', fontSize: 12, color: 'var(--text-3)' }}>
            Drag corners to reshape · double-click a wall to add a corner · 15° angle snapping
          </div>
        </div>

        {/* Side panel */}
        <div style={{ width: 320, background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: 24 }}>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Design your room shape</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 24 }}>Drag corners to reshape · double-click a wall to add a corner</div>

          {/* AI prompt */}
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>AI shape generator</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAISend(); }}
              placeholder='e.g. "L-shape 4m x 3m"' style={{ flex: 1, fontSize: 13, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <button onClick={handleAISend} style={{ padding: '9px 14px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Generate</button>
          </div>
          {aiFeedback && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 16, background: 'var(--accent-soft)', padding: '8px 12px', borderRadius: 8 }}>{aiFeedback}</div>}

          {/* Corner panel */}
          {cornerPanel && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>Selected corner</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Position: {cornerPanel.posLabel}</div>
              <button onClick={() => deleteCorner(selectedCornerIndex!)} disabled={pts.length <= 3}
                style={{ width: '100%', padding: 9, color: 'var(--error)', fontSize: 13, fontWeight: 600, borderRadius: 9, background: '#FBEDEA', border: 'none', opacity: pts.length <= 3 ? 0.4 : 1, cursor: pts.length <= 3 ? 'not-allowed' : 'pointer' }}>
                Delete this corner
              </button>
            </div>
          )}

          {/* Wall panel */}
          {wallPanel && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>Selected wall</div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5 }}>Length (mm)</label>
                <input type="number" value={wallPanel.len} onChange={(e) => setWallLength(wallPanel.idx, Number(e.target.value))}
                  style={{ fontSize: 14, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 5 }}>Angle (degrees)</label>
                <input type="number" value={wallPanel.ang} onChange={(e) => setWallAngle(wallPanel.idx, Number(e.target.value))}
                  style={{ fontSize: 14, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </div>
            </div>
          )}

          {!cornerPanel && !wallPanel && (
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
              Click a wall to edit its length and angle precisely, or drag a corner directly.
              Double-click any wall to insert a new corner.
            </div>
          )}

          {/* Stats */}
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>Room stats</div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 3 }}>Corners</div><div style={{ fontFamily: 'Newsreader, serif', fontSize: 19, fontWeight: 600 }}>{pts.length}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 3 }}>Floor area</div><div style={{ fontFamily: 'Newsreader, serif', fontSize: 19, fontWeight: 600 }}>{(Math.abs(pts.reduce((s, p, i) => s + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y, 0)) / 2 / 1e6).toFixed(1)} m²</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
