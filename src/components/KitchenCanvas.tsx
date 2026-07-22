import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { Vec2, ViewMode } from '../domain/types';

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
  const addFixture = useStore((s) => s.addFixture);
  const analysis = useStore((s) => s.analysis);
  const colours = useStore((s) => s.design.colours);
  const materials = useStore((s) => s.design.materials);
  const walkIndex = useStore((s) => s.walkIndex);
  const setWalkIndex = useStore((s) => s.setWalkIndex);

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

  const fixturePoint = (f: any): Vec2 => {
    if (f.wallIndex !== undefined) {
      const g = wallGeom(f.wallIndex);
      return { x: g.p1.x + g.ux * g.len * f.t, y: g.p1.y + g.uy * g.len * f.t };
    }
    return f.position;
  };

  const iso = (x: number, y: number, z = 0) => { const a = Math.PI / 6; return { x: (x - y) * Math.cos(a), y: (x + y) * Math.sin(a) - z }; };
  const ptsToStr = (pts: Vec2[]) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const boxFaces = (cx: number, cy: number, cw: number, cd: number, hpx: number) => {
    const top = [iso(cx, cy, hpx), iso(cx + cw, cy, hpx), iso(cx + cw, cy + cd, hpx), iso(cx, cy + cd, hpx)];
    const front = [iso(cx, cy + cd), iso(cx + cw, cy + cd), iso(cx + cw, cy + cd, hpx), iso(cx, cy + cd, hpx)];
    const side = [iso(cx + cw, cy), iso(cx + cw, cy + cd), iso(cx + cw, cy + cd, hpx), iso(cx + cw, cy, hpx)];
    return { top: ptsToStr(top), front: ptsToStr(front), side: ptsToStr(side) };
  };

  // Walk mode waypoints
  const computeWaypoints = () => {
    const pts = design.room.points;
    const centroid = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
    const wps: { label: string; x: number; y: number }[] = [{ label: 'Room overview', x: centroid.x, y: centroid.y }];
    const door = design.fixtures.find((f) => f.type === 'door');
    if (door) { const dp = fixturePoint(door); wps.unshift({ label: 'Entrance', x: dp.x + (centroid.x - dp.x) * 0.3, y: dp.y + (centroid.y - dp.y) * 0.3 }); }
    const sink = design.carcasses.find((c) => c.applianceType === 'sink');
    if (sink) wps.push({ label: 'Sink & prep area', x: sink.position.x + sink.size / 2, y: sink.position.y - 600 });
    const dining = design.furniture.find((f) => f.type === 'dining-table' || f.type === 'round-table');
    if (dining) wps.push({ label: 'Dining area', x: dining.position.x + dining.width / 2, y: dining.position.y + dining.depth / 2 });
    return wps;
  };

  const waypoints = computeWaypoints();
  const walkIdx = Math.min(walkIndex, waypoints.length - 1);
  const walkWp = waypoints[walkIdx] || { x: 0, y: 0, label: '' };

  // Transform
  let groupTransform = `translate(${position.x} ${position.y}) scale(${scale}) rotate(${viewRotation} 500 350)`;
  if (isWalk) {
    const wpIso = iso(toPx(walkWp.x), toPx(walkWp.y), 45);
    const walkScale = 2.4;
    groupTransform = `translate(${500 - wpIso.x * walkScale} ${380 - wpIso.y * walkScale}) scale(${walkScale})`;
  }

  // Minimap
  const mmPts = design.room.points;
  const mmMinX = Math.min(...mmPts.map(p => p.x)), mmMaxX = Math.max(...mmPts.map(p => p.x));
  const mmMinY = Math.min(...mmPts.map(p => p.y)), mmMaxY = Math.max(...mmPts.map(p => p.y));
  const mmSc = 80 / Math.max(mmMaxX - mmMinX, mmMaxY - mmMinY, 1);
  const minimapFloor = ptsToStr(mmPts.map(p => ({ x: 10 + (p.x - mmMinX) * mmSc, y: 10 + (p.y - mmMinY) * mmSc })));
  const minimapDot = { x: 10 + (walkWp.x - mmMinX) * mmSc, y: 10 + (walkWp.y - mmMinY) * mmSc };

  const onCanvasBackgroundClick = (e: React.MouseEvent<SVGRectElement>) => {
    if (tool === 'pan') return;
    const mm = clickToMm(e);
    if (tool === 'place-carcass') {
      // Find nearest wall and auto-rotate to align with it
      const pts = design.room.points;
      let nearestWall = -1, nearestDist = 400; // 400mm snap threshold
      let projectedPt = mm;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = Math.max(0, Math.min(1, ((mm.x - p1.x) * dx + (mm.y - p1.y) * dy) / (len * len)));
        const proj = { x: p1.x + dx * t, y: p1.y + dy * t };
        const d = Math.hypot(mm.x - proj.x, mm.y - proj.y);
        if (d < nearestDist) { nearestDist = d; nearestWall = i; projectedPt = proj; }
      }

      let pos = { x: Math.round(mm.x / 50) * 50, y: Math.round(mm.y / 50) * 50 };
      let rotation = 0;

      if (nearestWall >= 0) {
        const p1 = pts[nearestWall], p2 = pts[(nearestWall + 1) % pts.length];
        const wallAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        rotation = Math.round(wallAngle);
        // Normalize to 0-360
        while (rotation < 0) rotation += 360;
        // Offset from wall by cabinet depth (600mm), toward room interior
        const centroid = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
        const wallMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const towardCenter = { x: centroid.x - wallMid.x, y: centroid.y - wallMid.y };
        const tcLen = Math.hypot(towardCenter.x, towardCenter.y) || 1;
        const offset = 300; // half the depth
        pos = {
          x: Math.round((projectedPt.x + towardCenter.x / tcLen * offset) / 50) * 50,
          y: Math.round((projectedPt.y + towardCenter.y / tcLen * offset) / 50) * 50,
        };
      }

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
      if (ds.type === 'carcass') updateCarcass(ds.id, { position: np });
      else updateFurniture(ds.id, { position: np });
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
      if (rs.type === 'carcass') updateCarcass(rs.id, { rotation: newRotation });
      else updateFurniture(rs.id, { rotation: newRotation });
    }
  };

  const errorCount = analysis ? analysis.issues.filter((i: any) => i.severity === 'error').length : 0;
  const warningCount = analysis ? analysis.issues.filter((i: any) => i.severity === 'warning').length : 0;
  const floorArea = Math.abs(design.room.points.reduce((s, p, i) => s + p.x * design.room.points[(i + 1) % design.room.points.length].y - design.room.points[(i + 1) % design.room.points.length].x * p.y, 0)) / 2;
  const wallHpx = toPx(design.room.height * 0.4);

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
      onMouseUp={() => { setDragState(null); setPanState(null); setRotationState(null); }} onMouseLeave={() => { setDragState(null); setPanState(null); setRotationState(null); }}>
      <svg viewBox="0 0 1000 700" width="100%" height="100%" style={{ display: 'block', cursor }}
        onMouseMove={onCanvasMouseMove}>
        <rect x={-2000} y={-2000} width={6000} height={6000} fill="var(--bg)"
          onMouseDown={(e) => { if (tool === 'pan') setPanState({ sx: e.clientX, sy: e.clientY, startPos: { ...position } }); }}
          onClick={onCanvasBackgroundClick} />

        <g transform={groupTransform}>
          {!is3D ? (
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
          ) : (
            // ---- 3D / Walk ----
            <g>
              <polygon points={ptsToStr(design.room.points.map(p => iso(toPx(p.x), toPx(p.y))))} fill={colours.floor} opacity={0.6} stroke="#D8C9B3" strokeWidth={1} />
              {design.room.points.map((p, i) => {
                const next = design.room.points[(i + 1) % design.room.points.length];
                const p1 = iso(toPx(p.x), toPx(p.y)), p2 = iso(toPx(next.x), toPx(next.y));
                return <polygon key={`3dw${i}`} points={ptsToStr([p1, p2, { x: p2.x, y: p2.y - wallHpx }, { x: p1.x, y: p1.y - wallHpx }])} fill={colours.walls} opacity={0.3 + (i % 2) * 0.2} stroke="#D8C9B3" strokeWidth={0.6} />;
              })}
              {design.carcasses.map((c: any) => {
                const isSel = selectedId === c.id;
                const cx = toPx(c.position.x), cy = toPx(c.position.y), cw = toPx(c.size), cd = toPx(c.depth);
                const hpx = c.mount === 'tall' ? wallHpx * 0.85 : wallHpx * 0.45;
                const faces = boxFaces(cx, cy, cw, cd, hpx);
                return (
                  <g key={c.id} onMouseDown={(e) => startDrag(e, c.id, 'carcass')} onClick={(e) => { e.stopPropagation(); setSelected(c.id); }} style={{ cursor: 'move' }}>
                    <polygon points={faces.top} fill={colours.countertops} stroke={isSel ? 'var(--accent)' : '#9a9080'} strokeWidth={isSel ? 2 : 0.8} />
                    <polygon points={faces.front} fill={colours.cabinets} stroke={isSel ? 'var(--accent)' : '#9a9080'} strokeWidth={0.8} />
                    <polygon points={faces.side} fill={colours.cabinets} opacity={0.78} stroke={isSel ? 'var(--accent)' : '#9a9080'} strokeWidth={0.8} />
                  </g>
                );
              })}
              {design.furniture.map((f: any) => {
                const isSel = selectedId === f.id;
                const faces = boxFaces(toPx(f.position.x), toPx(f.position.y), toPx(f.width), toPx(f.depth), toPx(750) * 0.35);
                return (
                  <g key={f.id} onMouseDown={(e) => startDrag(e, f.id, 'furniture')} onClick={(e) => { e.stopPropagation(); setSelected(f.id); }} style={{ cursor: 'move' }}>
                    <polygon points={faces.top} fill="#C9B79C" stroke={isSel ? 'var(--accent)' : '#9C8B6E'} strokeWidth={isSel ? 2 : 0.8} />
                    <polygon points={faces.front} fill="#B9A582" stroke="#9C8B6E" strokeWidth={0.7} />
                    <polygon points={faces.side} fill="#A6926E" stroke="#9C8B6E" strokeWidth={0.7} />
                  </g>
                );
              })}
            </g>
          )}
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

      {/* Walk mode controls */}
      {isWalk && (
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px 16px', boxShadow: 'var(--shadow-md)' }}>
          <button onClick={() => setWalkIndex(Math.max(0, walkIndex - 1))} disabled={walkIndex <= 0}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: walkIndex <= 0 ? 'default' : 'pointer', opacity: walkIndex <= 0 ? 0.4 : 1 }}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5 L7 10 L12 15"/></svg>
          </button>
          <div>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: 14, fontWeight: 600 }}>{walkWp.label}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{walkIdx + 1} of {waypoints.length}</div>
          </div>
          <button onClick={() => setWalkIndex(Math.min(waypoints.length - 1, walkIndex + 1))} disabled={walkIndex >= waypoints.length - 1}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: walkIndex >= waypoints.length - 1 ? 'default' : 'pointer', opacity: walkIndex >= waypoints.length - 1 ? 0.4 : 1 }}>
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5 L13 10 L8 15"/></svg>
          </button>
          {/* Minimap */}
          <svg viewBox="0 0 100 100" width={70} height={70} style={{ marginLeft: 8 }}>
            <polygon points={minimapFloor} fill="#EFE2D0" stroke="#D8C9B3" strokeWidth={1} />
            <circle cx={minimapDot.x} cy={minimapDot.y} r={3.5} fill="var(--accent)" />
          </svg>
        </div>
      )}

      {/* Rotate room view */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6, zIndex: 10 }}>
        <button onClick={() => setViewRotation(r => r + 90)} title="Rotate view 90°"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4, boxShadow: 'var(--shadow-sm)' }}>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10 a6 6 0 1 0 2-4.5"/><path d="M4 3 V6 H7"/></svg>
          Rotate
        </button>
      </div>

      {!isWalk && (
        <div className="canvas-hint">
          {tool === 'place-carcass' ? `Click to place a ${selectedCarcassSize}mm cabinet` :
           tool === 'place-furniture' ? 'Click to place furniture' :
           ['place-door','place-window','place-socket','place-switch'].includes(tool) ? 'Click on a wall to place' :
           ['place-water','place-waste','place-light-pendant','place-light-downlight'].includes(tool) ? 'Click on the floor to place' :
           tool === 'pan' ? 'Drag to pan' :
           tool === 'select' ? 'Click to select · Drag to move · Drag ↻ to rotate' :
           'Click to select · Drag to move'}
        </div>
      )}
    </div>
  );
}
