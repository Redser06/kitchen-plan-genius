import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { PlanPoint, SceneItem, WalkthroughScene } from "./plan-scene";
import { planDegreesToRotationY, polygonCentroid } from "./plan-scene";

export function KitchenRoom({
  scene,
  mode,
  selectedId,
  onSelect,
}: {
  scene: WalkthroughScene;
  mode: "walk" | "orbit";
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const floorGeometry = usePolygonGeometry(scene.slab.polygon);
  const centroid = polygonCentroid(scene.slab.polygon);

  return (
    <group>
      <hemisphereLight args={["#fff6ea", "#c8b59a", 0.62]} />
      <ambientLight intensity={0.38} />
      <directionalLight
        position={[centroid.x + 4, 9, centroid.z + 2]}
        intensity={1.25}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight
        position={[centroid.x, scene.ceilingHeight - 0.15, centroid.z]}
        intensity={0.45}
        distance={10}
        color="#fff1d2"
      />

      <mesh geometry={floorGeometry} position={[0, -0.001, 0]} receiveShadow>
        <FloorMaterial color={scene.palette.floor} />
      </mesh>
      {mode === "walk" && (
        <mesh geometry={floorGeometry} position={[0, scene.ceilingHeight, 0]}>
          <meshStandardMaterial color={scene.palette.walls} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      )}

      {scene.solids.map((solid) => (
        <mesh
          key={solid.id}
          position={solid.center}
          rotation={[0, solid.rotationY, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={solid.size} />
          <meshStandardMaterial color={scene.palette.walls} roughness={0.92} />
        </mesh>
      ))}

      {scene.items.map((item) => (
        <ItemMesh
          key={item.id}
          item={item}
          finish={scene.cabinetFinish}
          handle={scene.palette.handles}
          selected={selectedId !== null && item.sourceId === selectedId}
          interactive={mode === "orbit"}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

function ItemMesh({
  item,
  finish,
  handle,
  selected,
  interactive,
  onSelect,
}: {
  item: SceneItem;
  finish: WalkthroughScene["cabinetFinish"];
  handle: string;
  selected: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
}) {
  const transparent = item.role === "window";
  const showFront = item.role === "cabinet" && finish !== "Slab";
  return (
    <group
      position={[item.origin.x, item.elevation, item.origin.z]}
      rotation={[0, planDegreesToRotationY(item.rotation), 0]}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onSelect(item.sourceId);
            }
          : undefined
      }
    >
      {item.role === "light" ? (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.9} />
          <pointLight intensity={0.4} distance={3.2} color="#ffe6bf" />
        </mesh>
      ) : (
        <mesh
          position={[item.size[0] / 2, item.size[1] / 2, item.size[2] / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={item.size} />
          <meshStandardMaterial
            color={item.color}
            roughness={item.role === "countertop" ? 0.32 : 0.62}
            metalness={item.role === "appliance" ? 0.2 : 0.02}
            transparent={transparent}
            opacity={transparent ? 0.42 : 1}
            emissive={selected ? "#c47a3a" : "#000000"}
            emissiveIntensity={selected ? 0.28 : 0}
          />
        </mesh>
      )}
      {showFront && (
        <mesh position={[item.size[0] / 2, item.size[1] / 2, -0.008]} castShadow>
          <boxGeometry
            args={[Math.max(0.05, item.size[0] - 0.08), Math.max(0.05, item.size[1] - 0.12), 0.016]}
          />
          <meshStandardMaterial color={item.color} roughness={0.48} />
        </mesh>
      )}
      {item.role === "cabinet" && (
        <mesh position={[item.size[0] * 0.8, item.size[1] * 0.48, -0.02]}>
          <boxGeometry args={[0.014, Math.min(0.16, item.size[1] * 0.22), 0.016]} />
          <meshStandardMaterial color={handle} metalness={0.45} roughness={0.35} />
        </mesh>
      )}
    </group>
  );
}

function FloorMaterial({ color }: { color: string }) {
  const material = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(2.5, 2.5);
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 512, 512);
      for (let row = 0; row < 8; row++) {
        const y = row * 64;
        ctx.fillStyle = "rgba(90, 58, 28, 0.16)";
        ctx.fillRect(0, y, 512, 3);
        const offset = row % 2 === 0 ? 0 : 90;
        for (let x = offset; x < 512; x += 180) {
          ctx.strokeStyle = "rgba(90, 58, 28, 0.12)";
          ctx.strokeRect(x + 6, y + 8, 160, 48);
        }
      }
      texture.needsUpdate = true;
    }
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    });
  }, [color]);

  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  return <primitive object={material} attach="material" />;
}

function usePolygonGeometry(polygon: PlanPoint[]) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    polygon.forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, point.z);
      else shape.lineTo(point.x, point.z);
    });
    shape.closePath();
    const next = new THREE.ShapeGeometry(shape);
    // ShapeGeometry lives in XY. +90° about X lays that Y axis onto +Z.
    next.rotateX(Math.PI / 2);
    return next;
  }, [polygon]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

  return geometry;
}
