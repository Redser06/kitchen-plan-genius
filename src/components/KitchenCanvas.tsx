import React, { useRef, useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useStore } from '../store/useStore';
import { snapCarcassToNearestWall } from '../domain/placement';
import type { Vec2, ViewMode } from '../domain/types';

const WalkthroughView = lazy(() => import('../features/walkthrough/WalkthroughView'));

const MM_TO_PX = 0.16;

const fixtureColor: Record<string, string> = { door: '#8A6A4A', window: '#4E7A96', socket: '#6B6058', switch: '#8A7A63', water: '#4E7A96', waste: '#8A6A4A', pendant: '#C08A3E', downlight: '#C08A3E' };
const fixtureBadge: Record<string, string> = { door: 'Dr', window: 'Wn', socket: 'S', switch: 'Sw', water: 'W', waste: 'Ds', pendant: 'P', downlight: 'L' };

interface Props { scale: number; position: Vec2; setScale: (s: number) => void; setPosition: (p: Vec2) => void; viewMode: ViewMode; }

export default function KitchenCanvas({ scale, position, setScale, setPosition, viewMode }: Props) {
  const design = useStore((s) => s.design);
  const selectedId = useStore((s) => s.selectedId);
  const tool = useStore((s) => s.tool);
  const setSelected = useStore((s) => s.setSelected);
  const setTool = useStore((s) => s.setTool);
  const selectedCarcassSize = useStore((s) => s.selectedCarcassSize);
  const addCarcass = useStore((s) => s.addCarcass);
  const addFurniture = useStore((s) => s.addFurniture);
  const updateCarcass = useStore((s) => s.updateCarcass);
  const updateFurniture = useStore((s) => s.updateFurniture);
  const commitGesture = useStore((s) => s.commitGesture);
  const addFixture = useStore((s) => s.addFixture);
  const analysis = useStore((s) => s.analysis);
  const colours = useStore((s) => s.design.colours);
  const materials = useStore((s) => s.design.materials);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [dragState, setDragState] = useState<any>(null);
  const [panState, setPanState] = useState<any>(null);
  const [rotationState, setRotationState] = useState<{ id: string; type: string; cx: number; cy: number; startAngle: number; startRotation: number } | null>(null);
  const [viewRotation, setViewRotation] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => { if (containerRef.current) setContainerSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight }); };
    update();
    const obs = new ResizeObserver(update); obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const toPx = (mm: number) => mm * MM_TO_PX;
  const is3D = viewMode === '3d' || viewMode === 'walk';
  const isWalk = viewMode === 'walk';

  if (is3D) {
    return (
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 14 }}>Preparing the 3D kitchen…</div>}>
          <WalkthroughView design={design} mode={isWalk ? 'walk' : 'orbit'} selectedId={selectedId} onSelect={setSelected} />
        </Suspense>
      </div>
    );
  }

  const clickToMm = (e: React.MouseEvent): Vec2 => {
    const rect = containerRef.current!.getBoundingClientRect();
    const vx = (e.clientX - rect.left) * (1000 / rect.width);
    const vy = (e.clientY - rect.top) * (700 / rect.height);
    return { x: (vx - position.x) / scale / MM_TO_PX, y: (vy - position.y) / scale / MM_TO_PX };
  };

  const wallGeom = (wallIndex: number) => {
    const pts = design.room.points; const n = pts.length;
    const p1 = pts[wallIndex], p2 = pts[(wallIndex + 1) % n];
    const dx = p2.x - p1.x, dy = p2.y - p1.y; const len = Math.hypot(dx, dy) || 1;
    return { p1, p2, ux: dx / len, uy: dy / len, len };
  };

  const groupTransform = `translate(${position.x} ${position.y}) scale(${scale}) rotate(${viewRotation} 500 350)`;

  const onCanvasBackgroundClick = (e: React.MouseEvent<SVGRectElement>) => {
    if (tool === 'pan') return;
    const mm = clickToMm(e);
    if (tool === 'place-carcass') {
      const { position: pos, rotation } = snapCarcassToNearestWall(design.room.points, mm, 600);
      addCarcass({ id: `carcass-${Date.now()}`, size: selectedCarcassSize, depth: 600, mount: 'floor', position: pos, rotation, label: '', fittingType: 'plain', fittingLabel: '', applianceType: null, applianceLabel: null });
      setSelected(null); setTool('select');
    } else if (tool === 'place-furniture') {
      addFurniture({ id: `furn-${Date.now()}`, type: 'dining-table', label: 'Dining Table', position: { x: Math.round(mm.x / 50) * 50, y: Math.round(mm.y / 50) * 50 }, width: 1400, depth: 800, rotation: 0, seats: 4 });
      setSelected(null); setTool('select');
    } else if (['place-water', 'place-waste', 'place-light-pendant', 'place-light-downlight'].includes(tool)) {
      const typeMap: Record<string, string> = { 'place-water': 'water', 'place-waste': 'waste', 'place-light-pendant': 'pendant', 'place-light-downlight': 'downlight' };
      addFixture({ id: `fx-${Date.now()}`, type: typeMap[tool] as any, position: { x: Math.round(mm.x / 50) * 50, y: Math.round(mm.y / 50) * 50 } });
      setSelected(null); setTool('select');
    } else {
      setSelected(null);
    }
  };

  const onWallClick = (wallIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const wallTools: Record<string, string> = { 'place-door': 'door', 'place-window': 'window', 'place-socket': 'socket', 'place-switch': 'switch' };
    if (!wallTools[tool]) return;
    const mm = clickToMm(e);
    const g = wallGeom(wallIndex);
    const t = Math.max(0.05, Math.min(0.95, ((mm.x - g.p1.x) * g.ux + (mm.y - g.p1.y) * g.uy) / g.len));
    const type = wallTools[tool];
    const width = type === 'door' ? 900 : type === 'window' ? 1200 : undefined;
    addFixture({ id: `fx-${Date.now()}`, type: type as any, wallIndex, t, width });
    setSelected(null); setTool('select');
  };

  const startDrag = (e: React.MouseEvent, id: string, type: string) => {
    if (tool !== 'select') return;
    e.stopPropagation(); setSelected(id);
    const rect = containerRef.current!.getBoundingClientRect();
    const item = type === 'carcass' ? design.carcasses.find((c: any) => c.id === id) : design.furniture.find((f: any) => f.id === id);
    if (!item) return;
    setDragState({ id, type, sx: e.clientX, sy: e.clientY, startPos: { ...item.position }, rw: rect.width, rh: rect.height, moved: false });
  };

  const startRotation = (e: React.MouseEvent, id: string, type: string) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    const item = type === 'carcass' ? design.carcasses.find((c: any) => c.id === id) : design.furniture.find((f: any) => f.id === id);
    if (!item) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = (toPx(item.position.x) + position.x) * (rect.width / 1000) / scale;
    const cy = (toPx(item.position.y) + position.y) * (rect.height / 700) / scale;
    // Actually for SVG viewBox, the center in screen coords:
    const itemCx = item.position.x + (type === 'carcass' ? (item as any).size / 2 : (item as any).width / 2);
    const itemCy = item.position.y + (type === 'carcass' ? (item as any).depth / 2 : (item as any).depth / 2);
    const vbCx = toPx(itemCx) * scale + position.x;
    const vbCy = toPx(itemCy) * scale + position.y;
    const screenCx = rect.left + vbCx * rect.width / 1000;
    const screenCy = rect.top + vbCy * rect.height / 700;
    const dx = e.clientX - screenCx;
    const dy = e.clientY - screenCy;
    const startAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    setRotationState({ id, type, cx: screenCx, cy: screenCy, startAngle, startRotation: item.rotation || 0 });
  };

  const onCanvasMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (dragState) {
      const ds = dragState;
      const dxVB = (e.clientX - ds.sx) * (1000 / ds.rw);
      const dyVB = (e.clientY - ds.sy) * (700 / ds.rh);
      if (Math.abs(dxVB) > 1 || Math.abs(dyVB) > 1) ds.moved = true;
      const np = { x: ds.startPos.x + dxVB / (scale * MM_TO_PX), y: ds.startPos.y + dyVB / (scale * MM_TO_PX) };
      if (ds.type === 'carcass') updateCarcass(ds.id, { position: np }, { recordHistory: false });
      else updateFurniture(ds.id, { position: np }, { recordHistory: false });
    }
    if (panState) {
      const rect = containerRef.current!.getBoundingClientRect();
      setPosition({ x: panState.startPos.x + (e.clientX - panState.sx) * (1000 / rect.width), y: panState.startPos.y + (e.clientY - panState.sy) * (700 / rect.height) });
    }
    if (rotationState) {
      const rs = rotationState;
      const dx = e.clientX - rs.cx;
      const dy = e.clientY - rs.cy;
      const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      let newRotation = rs.startRotation + (currentAngle - rs.startAngle);
      // Snap to 15° increments
      newRotation = Math.round(newRotation / 15) * 15;
      if (rs.type === 'carcass') updateCarcass(rs.id, { rotation: newRotation }, { recordHistory: false });
      else updateFurniture(rs.id, { rotation: newRotation }, { recordHistory: false });
    }
  };

  const endGesture = () => {
    const record = Boolean(dragState?.moved || rotationState);
    setDragState(null);
    setPanState(null);
    setRotationState(null);
    if (record) commitGesture();
  };

  const errorCount = analysis ? analysis.issues.filter((i: any) => i.severity === 'error').length : 0;
  const warningCount = analysis ? analysis.issues.filter((i: any) => i.severity === 'warning').length : 0;
  const floorArea = Math.abs(design.room.points.reduce((s, p, i) => s + p.x * design.room.points[(i + 1) % design.room.points.length].y - design.room.points[(i + 1) % design.room.points.length].x * p.y, 0)) / 2;

  // Fixtures rendering data
  const fixturesWall: any[] = [];
  const fixturesMarker: any[] = [];
  design.fixtures.forEach((f: any) => {
    if (f.type === 'window' || f.type === 'door') {
      const g = wallGeom(f.wallIndex);
      const px = g.p1.x + g.ux * g.len * f.t;
      const py = g.p1.y + g.uy * g.len * f.t;
      const halfLen = (f.width || 900) / 2;
      fixturesWall.push({ id: f.id, x1: toPx(px - g.ux * halfLen), y1: toPx(py - g.uy * halfLen), x2: toPx(px + g.ux * halfLen), y2: toPx(py + g.uy * halfLen), stroke: f.type === 'window' ? '#4E7A96' : '#8A6A4A', dash: f.type === 'window' ? '9 5' : 'none', onWallClick: (e: React.MouseEvent) => onWallClick(f.wallIndex, e), sel: selectedId === f.id });
    } else if (f.type === 'socket' || f.type === 'switch') {
      const g = wallGeom(f.wallIndex);
      const px = g.p1.x + g.ux * g.len * f.t;
      const py = g.p1.y + g.uy * g.len * f.t;
      const ox = px + g.ux * 30, oy = py + g.uy * 30; // offset slightly inward
      fixturesMarker.push({ id: f.id, cx: toPx(ox), cy: toPx(oy), r: 5.5, fill: selectedId === f.id ? 'var(--accent)' : fixtureColor[f.type], label: fixtureBadge[f.type] });
    } else if (f.position) {
      fixturesMarker.push({ id: f.id, cx: toPx(f.position.x), cy: toPx(f.position.y), r: 8, fill: selectedId === f.id ? 'var(--accent)' : fixtureColor[f.type], label: fixtureBadge[f.type] });
    }
  });

  const cursor = tool === 'pan' ? 'grab' : (tool.startsWith('place-') ? 'crosshair' : 'default');
  const finishMap: Record<string, string> = { Shaker: 'inset', Slab: 'flat', Beadboard: 'bead' };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}
      onMouseUp={endGesture} onMouseLeave={endGesture}>
      <svg viewBox="0 0 1000 700" width="100%" height="100%" style={{ display: 'block', cursor }}
        onMouseMove={onCanvasMouseMove}>
        <rect x={-2000} y={-2000} width={6000} height={6000} fill="var(--bg)"
          onMouseDown={(e) => { if (tool === 'pan') setPanState({ sx: e.clientX, sy: e.clientY, startPos: { ...position } }); }}
          onClick={onCanvasBackgroundClick} />

        <g transform={groupTransform}>
            <g>
              {/* Room floor */}
              <polygon points={design.room.points.map(p => `${toPx(p.x)},${toPx(p.y)}`).join(' ')} fill={colours.floor} opacity={0.35} />

              {/* Walls */}
              {design.room.points.map((p, i) => {
                const next = design.room.points[(i + 1) % design.room.points.length];
                return <line key={`w${i}`} x1={toPx(p.x)} y1={toPx(p.y)} x2={toPx(next.x)} y2={toPx(next.y)}
                  stroke="#7A6A53" strokeWidth={8} vectorEffect="non-scaling-stroke" strokeLinecap="round"
                  style={{ cursor: tool.startsWith('place-') ? 'crosshair' : 'default' }}
                  onClick={(e) => onWallClick(i, e)} />;
              })}

              {/* Wall labels */}
              {design.room.points.map((p, i) => {
                const next = design.room.points[(i + 1) % design.room.points.length];
                const len = Math.round(Math.hypot(next.x - p.x, next.y - p.y));
                const mx = (toPx(p.x) + toPx(next.x)) / 2, my = (toPx(p.y) + toPx(next.y)) / 2;
                return <text key={`wl${i}`} x={mx} y={my - 10} fontSize={10} fill="#9C9186" textAnchor="middle" pointerEvents="none">{len}mm</text>;
              })}

              {/* Wall fixtures (windows, doors) */}
              {fixturesWall.map((f) => (
                <line key={f.id} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2}
                  stroke={f.stroke} strokeWidth={5} vectorEffect="non-scaling-stroke"
                  strokeDasharray={f.dash === 'none' ? undefined : f.dash} pointerEvents="none" />
              ))}

              {/* Floor fixtures (water, waste, sockets, lights) */}
              {fixturesMarker.map((f) => (
                <g key={f.id}>
                  <circle cx={f.cx} cy={f.cy} r={f.r * scale} fill={f.fill} stroke="#fff" strokeWidth={1.5 * scale} onClick={() => setSelected(f.id)} style={{ cursor: 'pointer' }} />
                  <text x={f.cx} y={f.cy + 3 * scale} fontSize={7 * scale} fill="#fff" textAnchor="middle" pointerEvents="none" fontWeight={600}>{f.label}</text>
                </g>
              ))}

              {/* Furniture */}
              {design.furniture.map((f: any) => {
                const isSel = selectedId === f.id;
                return (
                  <g key={f.id} transform={`translate(${toPx(f.position.x)} ${toPx(f.position.y)}) rotate(${f.rotation})`}
                    onMouseDown={(e) => startDrag(e, f.id, 'furniture')} onClick={(e) => { e.stopPropagation(); setSelected(f.id); }} style={{ cursor: 'move' }}>
                    <rect width={toPx(f.width)} height={toPx(f.depth)} fill="#C9B79C" opacity={0.5} stroke={isSel ? 'var(--accent)' : '#9C8B6E'} strokeWidth={isSel ? 2.4 : 1.2} vectorEffect="non-scaling-stroke" rx={5} />
                    <text x={toPx(f.width) / 2} y={toPx(f.depth) / 2 + 4} fontSize={11} fill="#6B6058" textAnchor="middle">{f.label}</text>
                    {isSel && (
                      <g>
                        {/* Rotation handle — top-right corner */}
                        <circle cx={toPx(f.width) + 20} cy={-20} r={12 * scale} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2 * scale}
                          style={{ cursor: 'grab' }} onMouseDown={(e) => { e.stopPropagation(); startRotation(e, f.id, 'furniture'); }}
                          pointerEvents="all" />
                        <line x1={toPx(f.width)} y1={0} x2={toPx(f.width) + 20} y2={-20} stroke="var(--accent)" strokeWidth={1 * scale} strokeDasharray="3 2" pointerEvents="none" />
                        <text x={toPx(f.width) + 20} y={-16} fontSize={8 * scale} fill="var(--accent)" textAnchor="middle" pointerEvents="none">↻</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Carcasses — with material-aware rendering */}
              {design.carcasses.map((c: any) => {
                const isSel = selectedId === c.id;
                const w = toPx(c.size), h = toPx(c.depth);
                const finish = materials.cabinetFinish;
                const hasInset = finish !== 'Slab';
                return (
                  <g key={c.id} transform={`translate(${toPx(c.position.x)} ${toPx(c.position.y)}) rotate(${c.rotation})`}
                    onMouseDown={(e) => startDrag(e, c.id, 'carcass')} onClick={(e) => { e.stopPropagation(); setSelected(c.id); }} style={{ cursor: 'move' }}>
                    <rect width={w} height={h} fill={colours.cabinets} stroke={isSel ? 'var(--accent)' : '#B8A98C'} strokeWidth={isSel ? 2.4 : 1.1} vectorEffect="non-scaling-stroke" rx={3} />
                    {hasInset && <rect x={6} y={6} width={Math.max(2, w - 12)} height={Math.max(2, h - 12)} fill="none" stroke={colours.handles} strokeWidth={0.8} vectorEffect="non-scaling-stroke" opacity={0.4} rx={2} />}
                    {finish === 'Beadboard' && Array.from({ length: Math.floor(c.size / 100) }, (_, i) => (
                      <line key={i} x1={toPx((i + 1) * 100)} y1={2} x2={toPx((i + 1) * 100)} y2={h - 2} stroke={colours.handles} strokeWidth={0.4} opacity={0.25} vectorEffect="non-scaling-stroke" />
                    ))}
                    <line x1={0} y1={h} x2={w} y2={h} stroke={colours.countertops} strokeWidth={4} vectorEffect="non-scaling-stroke" />
                    <text x={6} y={c.applianceType ? 25 : Math.max(14, h - 6)} fontSize={9.5} fill="#3A322B" opacity={0.75} fontFamily="Inter,sans-serif">{c.label || `${c.size}mm Unit`}</text>
                    {c.applianceLabel && <text x={6} y={14} fontSize={9} fill="#8A3F1E" fontFamily="Inter,sans-serif" fontWeight={600}>{c.applianceLabel}</text>}
                    {isSel && (
                      <g>
                        <circle cx={w + 20} cy={-20} r={12 * scale} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2 * scale}
                          style={{ cursor: 'grab' }} onMouseDown={(e) => { e.stopPropagation(); startRotation(e, c.id, 'carcass'); }}
                          pointerEvents="all" />
                        <line x1={w} y1={0} x2={w + 20} y2={-20} stroke="var(--accent)" strokeWidth={1 * scale} strokeDasharray="3 2" pointerEvents="none" />
                        <text x={w + 20} y={-16} fontSize={8 * scale} fill="var(--accent)" textAnchor="middle" pointerEvents="none">↻</text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Work triangle */}
              {analysis?.triangle && tool === 'select' && (() => {
                const t = analysis.triangle;
                const color = t.status === 'ok' ? 'var(--success)' : 'var(--warning)';
                return (
                  <g opacity={0.55} pointerEvents="none">
                    <line x1={toPx(t.sink.x)} y1={toPx(t.sink.y)} x2={toPx(t.hob.x)} y2={toPx(t.hob.y)} stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeDasharray="7 4" />
                    <line x1={toPx(t.hob.x)} y1={toPx(t.hob.y)} x2={toPx(t.fridge.x)} y2={toPx(t.fridge.y)} stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeDasharray="7 4" />
                    <line x1={toPx(t.fridge.x)} y1={toPx(t.fridge.y)} x2={toPx(t.sink.x)} y2={toPx(t.sink.y)} stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeDasharray="7 4" />
                  </g>
                );
              })()}
            </g>
        </g>
      </svg>

      {/* Overlays */}
      <div className="canvas-overlay-top">
        <div className="overlay-badge">{Math.round(scale * 100)}%</div>
        <div className="overlay-badge">{(floorArea / 1e6).toFixed(1)} m² floor</div>
        {(errorCount > 0 || warningCount > 0) && (
          <div className="overlay-badge issues" style={{ color: errorCount > 0 ? 'var(--error)' : 'var(--warning)', fontWeight: 600 }}>
            {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : ''}
            {errorCount > 0 && warningCount > 0 ? ' · ' : ''}
            {warningCount > 0 ? `${warningCount} warning${warningCount > 1 ? 's' : ''}` : ''}
          </div>
        )}
      </div>

      {/* Rotate room view */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6, zIndex: 10 }}>
        <button onClick={() => setViewRotation(r => r + 90)} title="Rotate view 90°"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, boxShadow: 'var(--shadow-sm)' }}>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10 a6 6 0 1 0 2-4.5"/><path d="M4 3 V6 H7"/></svg>
          Rotate
        </button>
      </div>

      <div className="canvas-hint">
        {tool === 'place-carcass' ? `Click to place a ${selectedCarcassSize}mm cabinet` :
         tool === 'place-furniture' ? 'Click to place furniture' :
         ['place-door','place-window','place-socket','place-switch'].includes(tool) ? 'Click on a wall to place' :
         ['place-water','place-waste','place-light-pendant','place-light-downlight'].includes(tool) ? 'Click on the floor to place' :
         tool === 'pan' ? 'Drag to pan' :
         tool === 'select' ? 'Click to select · Drag to move · Drag ↻ to rotate' :
         'Click to select · Drag to move'}
      </div>
    </div>
  );
}
