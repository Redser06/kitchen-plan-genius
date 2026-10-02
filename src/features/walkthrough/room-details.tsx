import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { cabinetLeaves, type DoorLeafSpec } from "./cabinet-front";
import type { SceneItem, WorkTriangleOverlay } from "./plan-scene";
import { shiftColor, surfaceMaterial } from "./surfaces";

export function CabinetFront({ item, handle }: { item: SceneItem; handle: string }) {
  const leaves = cabinetLeaves(item);
  if (!leaves) return null;
  const paint = surfaceMaterial("cabinet", item.color);
  const recess = surfaceMaterial("cabinet", shiftColor(item.color, -16));
  return (
    <group>
      {leaves.map((leaf, index) => (
        <DoorLeaf key={index} leaf={leaf} paint={paint} recess={recess} handle={handle} />
      ))}
    </group>
  );
}

function DoorLeaf({
  leaf,
  paint,
  recess,
  handle,
}: {
  leaf: DoorLeafSpec;
  paint: THREE.Material;
  recess: THREE.Material;
  handle: string;
}) {
  const frameDepth = 0.016;
  const frameZ = -0.002 - frameDepth / 2;
  if (leaf.profile === "slab") {
    return (
      <group>
        <Box
          position={[leaf.x + leaf.w / 2, leaf.y + leaf.h / 2, frameZ]}
          size={[leaf.w, leaf.h, frameDepth]}
          material={paint}
          castShadow
        />
        <HandleBar leaf={leaf} color={handle} front={frameZ - frameDepth / 2} />
      </group>
    );
  }

  const stile = Math.min(0.05, leaf.w * 0.16, leaf.h * 0.2);
  const innerW = Math.max(0.02, leaf.w - stile * 2);
  const innerH = Math.max(0.02, leaf.h - stile * 2);
  const panelZ = -0.006;
  return (
    <group>
      <Box
        position={[leaf.x + stile / 2, leaf.y + leaf.h / 2, frameZ]}
        size={[stile, leaf.h, frameDepth]}
        material={paint}
        castShadow
      />
      <Box
        position={[leaf.x + leaf.w - stile / 2, leaf.y + leaf.h / 2, frameZ]}
        size={[stile, leaf.h, frameDepth]}
        material={paint}
        castShadow
      />
      <Box
        position={[leaf.x + leaf.w / 2, leaf.y + leaf.h - stile / 2, frameZ]}
        size={[innerW, stile, frameDepth]}
        material={paint}
      />
      <Box
        position={[leaf.x + leaf.w / 2, leaf.y + stile / 2, frameZ]}
        size={[innerW, stile, frameDepth]}
        material={paint}
      />
      <Box
        position={[leaf.x + leaf.w / 2, leaf.y + leaf.h / 2, panelZ]}
        size={[innerW + 0.012, innerH + 0.012, 0.008]}
        material={recess}
      />
      {leaf.beads && (
        <Beads x={leaf.x + stile} y={leaf.y + stile} w={innerW} h={innerH} material={paint} />
      )}
      <HandleBar leaf={leaf} color={handle} front={frameZ - frameDepth / 2} />
    </group>
  );
}

function Beads({
  x,
  y,
  w,
  h,
  material,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  material: THREE.Material;
}) {
  const count = Math.max(3, Math.round(w / 0.028));
  const gap = w / count;
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <Box
          key={index}
          position={[x + gap * (index + 0.5), y + h / 2, -0.011]}
          size={[0.008, Math.max(0.02, h - 0.008), 0.006]}
          material={material}
        />
      ))}
    </group>
  );
}

function HandleBar({ leaf, color, front }: { leaf: DoorLeafSpec; color: string; front: number }) {
  const vertical = leaf.handle === "vertical";
  const length = vertical ? Math.min(0.16, leaf.h * 0.42) : Math.min(0.14, leaf.w * 0.46);
  const x =
    leaf.handleSide === "left"
      ? leaf.x + 0.03
      : leaf.handleSide === "right"
        ? leaf.x + leaf.w - 0.03
        : leaf.x + leaf.w / 2;
  const y = leaf.y + leaf.h * (vertical ? 0.55 : 0.5);
  return (
    <mesh position={[x, y, front - 0.008]} castShadow>
      <boxGeometry args={vertical ? [0.012, length, 0.014] : [length, 0.012, 0.014]} />
      <meshStandardMaterial color={color} metalness={0.72} roughness={0.28} />
    </mesh>
  );
}

export function ApplianceBody({ item }: { item: SceneItem }) {
  const [w, h, d] = item.size;
  switch (item.appliance) {
    case "hob":
      return <Hob w={w} h={h} d={d} />;
    case "sink":
      return <Sink w={w} h={h} d={d} />;
    case "fridge":
      return <Fridge w={w} h={h} d={d} />;
    case "fridge-american":
      return <Fridge w={w} h={h} d={d} american />;
    case "oven":
      return <Oven w={w} h={h} d={d} />;
    case "dishwasher":
      return <Dishwasher w={w} h={h} d={d} />;
    case "microwave":
      return <Microwave w={w} h={h} d={d} />;
    case "washer":
      return <Washer w={w} h={h} d={d} />;
    case "winecooler":
      return <WineCooler w={w} h={h} d={d} />;
    case "rangehood":
      return <Rangehood w={w} h={h} d={d} />;
    default:
      return <GenericFront w={w} h={h} d={d} />;
  }
}

function Hob({ w, h, d }: BoxSize) {
  const rings: [number, number][] =
    w > 0.42 && d > 0.28
      ? [
          [0.28, 0.34],
          [0.72, 0.34],
          [0.28, 0.7],
          [0.72, 0.7],
        ]
      : [
          [0.5, 0.36],
          [0.5, 0.68],
        ];
  const radius = Math.min(w, d) * 0.16;
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#161616"
        metalness={0.55}
        roughness={0.16}
      />
      {rings.map(([px, pz], index) => (
        <mesh key={index} position={[w * px, h + 0.001, d * pz]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.004, 8, 20]} />
          <meshStandardMaterial color="#3c3c3c" metalness={0.8} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
}

function Sink({ w, h, d }: BoxSize) {
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, Math.max(h, 0.02), d]}
        color="#d5dde2"
        metalness={0.82}
        roughness={0.22}
      />
      <Metal
        position={[w / 2, -0.045, d * 0.48]}
        size={[w * 0.76, 0.1, d * 0.62]}
        color="#8e9aa1"
        metalness={0.64}
        roughness={0.3}
      />
      <mesh position={[w / 2, 0.09, d * 0.86]} castShadow>
        <cylinderGeometry args={[0.012, 0.015, 0.16, 12]} />
        <meshStandardMaterial color="#eef2f3" metalness={0.86} roughness={0.18} />
      </mesh>
      <mesh position={[w / 2, 0.16, d * 0.64]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, d * 0.36, 10]} />
        <meshStandardMaterial color="#eef2f3" metalness={0.86} roughness={0.18} />
      </mesh>
    </group>
  );
}

function Fridge({ w, h, d, american = false }: BoxSize & { american?: boolean }) {
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#ece8e1"
        metalness={0.34}
        roughness={0.38}
      />
      {american ? (
        <Metal
          position={[w / 2, h / 2, -0.002]}
          size={[0.008, h * 0.9, 0.004]}
          color="#2c2926"
          metalness={0.2}
          roughness={0.5}
        />
      ) : (
        <Metal
          position={[w / 2, h * 0.38, -0.002]}
          size={[w * 0.88, 0.008, 0.004]}
          color="#2c2926"
          metalness={0.2}
          roughness={0.5}
        />
      )}
      {american ? (
        <>
          <Bar x={w * 0.42} y={h * 0.55} z={-0.012} vertical length={h * 0.28} />
          <Bar x={w * 0.58} y={h * 0.55} z={-0.012} vertical length={h * 0.28} />
        </>
      ) : (
        <Bar x={w * 0.86} y={h * 0.62} z={-0.012} vertical length={Math.min(0.42, h * 0.28)} />
      )}
    </group>
  );
}

function Oven({ w, h, d }: BoxSize) {
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#c8c3bb"
        metalness={0.58}
        roughness={0.32}
      />
      <Metal
        position={[w / 2, h * 0.4, -0.004]}
        size={[w * 0.8, h * 0.58, 0.008]}
        color="#161412"
        metalness={0.45}
        roughness={0.12}
      />
      <Bar x={w / 2} y={h * 0.74} z={-0.014} length={w * 0.52} />
      {[0.32, 0.44, 0.56, 0.68].map((t) => (
        <mesh key={t} position={[w * t, h * 0.9, -0.008]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.012, 10]} />
          <meshStandardMaterial color="#2a2724" metalness={0.45} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Dishwasher({ w, h, d }: BoxSize) {
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#d7d3cc"
        metalness={0.62}
        roughness={0.28}
      />
      <Metal
        position={[w / 2, h * 0.9, -0.003]}
        size={[w * 0.92, h * 0.12, 0.006]}
        color="#2a2825"
        metalness={0.3}
        roughness={0.4}
      />
      <Bar x={w / 2} y={h * 0.72} z={-0.012} length={w * 0.46} />
    </group>
  );
}

function Microwave({ w, h, d }: BoxSize) {
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#2b2926"
        metalness={0.4}
        roughness={0.35}
      />
      <Metal
        position={[w * 0.38, h / 2, -0.004]}
        size={[w * 0.62, h * 0.72, 0.008]}
        color="#0e0e0e"
        metalness={0.5}
        roughness={0.1}
      />
      <Bar x={w * 0.78} y={h * 0.38} z={-0.012} vertical length={h * 0.28} />
    </group>
  );
}

function Washer({ w, h, d }: BoxSize) {
  const radius = Math.min(w, h) * 0.28;
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#f2f0ea"
        metalness={0.28}
        roughness={0.4}
      />
      <mesh position={[w / 2, h * 0.46, -0.006]}>
        <circleGeometry args={[radius, 24]} />
        <meshStandardMaterial color="#1a242c" metalness={0.45} roughness={0.12} />
      </mesh>
      <mesh position={[w / 2, h * 0.46, -0.008]} rotation={[0, 0, 0]}>
        <torusGeometry args={[radius, 0.01, 8, 24]} />
        <meshStandardMaterial color="#c5c8cc" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

function WineCooler({ w, h, d }: BoxSize) {
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#1e1c1a"
        metalness={0.35}
        roughness={0.4}
      />
      <mesh position={[w / 2, h / 2, -0.004]}>
        <boxGeometry args={[w * 0.72, h * 0.82, 0.006]} />
        <meshStandardMaterial
          color="#9ec4d4"
          transparent
          opacity={0.38}
          roughness={0.08}
          metalness={0.15}
        />
      </mesh>
      {[0.3, 0.48, 0.66].map((t) => (
        <Metal
          key={t}
          position={[w / 2, h * t, -0.008]}
          size={[w * 0.6, 0.006, 0.004]}
          color="#d9d4cb"
          metalness={0.3}
          roughness={0.4}
        />
      ))}
      <Bar x={w * 0.86} y={h * 0.5} z={-0.012} vertical length={h * 0.22} />
    </group>
  );
}

function Rangehood({ w, h, d }: BoxSize) {
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#ece7df"
        metalness={0.55}
        roughness={0.3}
      />
      <Metal
        position={[w / 2, h + 0.2, d * 0.55]}
        size={[w * 0.42, 0.4, Math.min(d, 0.28)]}
        color="#e4dfd6"
        metalness={0.5}
        roughness={0.32}
      />
      <Metal
        position={[w / 2, 0.004, d / 2]}
        size={[w * 0.8, 0.008, d * 0.7]}
        color="#2a2826"
        metalness={0.2}
        roughness={0.55}
      />
    </group>
  );
}

function GenericFront({ w, h, d }: BoxSize) {
  return (
    <group>
      <Metal
        position={[w / 2, h / 2, d / 2]}
        size={[w, h, d]}
        color="#c9c4bb"
        metalness={0.5}
        roughness={0.34}
      />
      <Bar x={w * 0.82} y={h * 0.55} z={-0.01} vertical length={Math.min(0.18, h * 0.28)} />
    </group>
  );
}

export function SocketFace({ item }: { item: SceneItem }) {
  const [w, h, d] = item.size;
  const isSwitch = item.role === "switch";
  return (
    <group>
      <mesh position={[w / 2, h / 2, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#f6f3ec" roughness={0.52} metalness={0.02} />
      </mesh>
      {isSwitch ? (
        <mesh position={[w / 2, h / 2, -0.004]}>
          <boxGeometry args={[w * 0.46, h * 0.62, 0.01]} />
          <meshStandardMaterial color="#fbfaf6" roughness={0.4} />
        </mesh>
      ) : (
        <>
          <Gang cx={w * 0.32} cy={h * 0.56} />
          <Gang cx={w * 0.68} cy={h * 0.56} />
        </>
      )}
    </group>
  );
}

function Gang({ cx, cy }: { cx: number; cy: number }) {
  return (
    <group position={[cx, cy, -0.003]}>
      <mesh>
        <boxGeometry args={[0.03, 0.03, 0.006]} />
        <meshStandardMaterial color="#2c2a27" roughness={0.45} />
      </mesh>
      <mesh position={[-0.006, 0.004, -0.004]}>
        <boxGeometry args={[0.004, 0.012, 0.004]} />
        <meshStandardMaterial color="#d8d2c6" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0.006, 0.004, -0.004]}>
        <boxGeometry args={[0.004, 0.012, 0.004]} />
        <meshStandardMaterial color="#d8d2c6" metalness={0.65} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function WorkTriangleOverlay({
  triangle,
  mode,
}: {
  triangle: WorkTriangleOverlay | null;
  mode: "walk" | "orbit";
}) {
  const geometry = useMemo(() => (triangle ? triangleRibbon(triangle) : null), [triangle]);
  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry],
  );
  if (!triangle || !geometry) return null;
  const color = triangle.status === "ok" ? "#2f7d4a" : "#c47a3a";
  const points = [triangle.sink, triangle.hob, triangle.fridge];
  return (
    <group>
      <mesh geometry={geometry} renderOrder={4} raycast={ignoreRaycast}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={mode === "walk" ? 0.42 : 0.62}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {points.map((point, index) => (
        <mesh
          key={index}
          position={[point.x, triangle.elevation, point.z]}
          renderOrder={4}
          raycast={ignoreRaycast}
        >
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.9}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function triangleRibbon(triangle: WorkTriangleOverlay) {
  const loop = [triangle.sink, triangle.hob, triangle.fridge, triangle.sink];
  const y = triangle.elevation;
  const half = 0.012;
  const positions: number[] = [];
  for (let index = 0; index < 3; index++) {
    const a = loop[index];
    const b = loop[index + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = (-dz / len) * half;
    const pz = (dx / len) * half;
    const quad = [
      [a.x - px, y, a.z - pz],
      [a.x + px, y, a.z + pz],
      [b.x + px, y, b.z + pz],
      [a.x - px, y, a.z - pz],
      [b.x + px, y, b.z + pz],
      [b.x - px, y, b.z - pz],
    ];
    for (const vertex of quad) positions.push(vertex[0], vertex[1], vertex[2]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function ignoreRaycast() {}

interface BoxSize {
  w: number;
  h: number;
  d: number;
}

function Box({
  position,
  size,
  material,
  castShadow = false,
}: {
  position: [number, number, number];
  size: [number, number, number];
  material: THREE.Material;
  castShadow?: boolean;
}) {
  return (
    <mesh position={position} material={material} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Metal({
  position,
  size,
  color,
  metalness,
  roughness,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  metalness: number;
  roughness: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

function Bar({
  x,
  y,
  z,
  length,
  vertical = false,
}: {
  x: number;
  y: number;
  z: number;
  length: number;
  vertical?: boolean;
}) {
  return (
    <mesh position={[x, y, z]} castShadow>
      <boxGeometry args={vertical ? [0.014, length, 0.016] : [length, 0.014, 0.016]} />
      <meshStandardMaterial color="#8a8176" metalness={0.7} roughness={0.3} />
    </mesh>
  );
}
