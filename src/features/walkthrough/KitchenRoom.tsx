import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { wallCutawayOpacity } from "./cutaway";
import type { PlanPoint, SceneItem, WallSolid, WalkthroughScene } from "./plan-scene";
import { planDegreesToRotationY, polygonCentroid } from "./plan-scene";
import { ApplianceBody, CabinetFront, SocketFace, WorkTriangleOverlay } from "./room-details";
import { surfaceMaterial, tiledSurface } from "./surfaces";

export function KitchenRoom({
  scene,
  mode,
  selectedId,
  onSelect,
}: {
  scene: WalkthroughScene;
  mode: "walk" | "orbit";
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const floorGeometry = usePolygonGeometry(scene.floor);
  const centroid = polygonCentroid(scene.floor);
  const floorMaterial = useFloorMaterial(scene);
  const wallMaterial = useMemo(() => {
    const material = surfaceMaterial("wall", scene.palette.walls);
    material.side = THREE.DoubleSide;
    return material;
  }, [scene.palette.walls]);

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

      <mesh
        geometry={floorGeometry}
        material={floorMaterial}
        position={[0, -0.001, 0]}
        receiveShadow
        onClick={
          mode === "orbit"
            ? (event) => {
                event.stopPropagation();
                onSelect(null);
              }
            : undefined
        }
      />
      {mode === "walk" && (
        <mesh
          geometry={floorGeometry}
          material={wallMaterial}
          position={[0, scene.ceilingHeight, 0]}
        />
      )}

      {scene.solids.map((solid) => (
        <CutawayWall key={solid.id} solid={solid} source={wallMaterial} mode={mode} />
      ))}

      {scene.items.map((item) => (
        <ItemMesh
          key={item.id}
          item={item}
          scene={scene}
          selected={selectedId !== null && item.sourceId === selectedId}
          interactive={mode === "orbit"}
          onSelect={onSelect}
        />
      ))}

      <WorkTriangleOverlay triangle={scene.workTriangle} mode={mode} />
    </group>
  );
}

function CutawayWall({
  solid,
  source,
  mode,
}: {
  solid: WallSolid;
  source: THREE.MeshStandardMaterial;
  mode: "walk" | "orbit";
}) {
  const material = useMemo(() => {
    const next = source.clone();
    next.transparent = true;
    next.opacity = 1;
    next.depthWrite = true;
    return next;
  }, [source]);
  const mesh = useRef<THREE.Mesh>(null);

  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  useFrame(({ camera }) => {
    const opacity = wallCutawayOpacity(camera.position, solid, mode);
    if (Math.abs(material.opacity - opacity) < 0.015) return;
    material.opacity = opacity;
    material.depthWrite = opacity > 0.92;
    const wall = mesh.current;
    if (wall) wall.castShadow = opacity > 0.85;
  });

  return (
    <mesh
      ref={mesh}
      position={solid.center}
      rotation={[0, solid.rotationY, 0]}
      material={material}
      castShadow
      receiveShadow
    >
      <boxGeometry args={solid.size} />
    </mesh>
  );
}

function ItemMesh({
  item,
  scene,
  selected,
  interactive,
  onSelect,
}: {
  item: SceneItem;
  scene: WalkthroughScene;
  selected: boolean;
  interactive: boolean;
  onSelect: (id: string | null) => void;
}) {
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
      <ItemBody item={item} scene={scene} />
      {selected && item.role !== "light" && item.role !== "socket" && item.role !== "switch" && (
        <mesh position={[item.size[0] / 2, item.size[1] / 2, item.size[2] / 2]}>
          <boxGeometry args={[item.size[0] + 0.02, item.size[1] + 0.02, item.size[2] + 0.02]} />
          <meshBasicMaterial color="#e07a32" wireframe />
        </mesh>
      )}
    </group>
  );
}

function ItemBody({ item, scene }: { item: SceneItem; scene: WalkthroughScene }) {
  if (item.role === "light") {
    return (
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.9} />
        <pointLight intensity={0.4} distance={3.2} color="#ffe6bf" />
      </mesh>
    );
  }
  if (item.role === "cabinet") {
    const paint = surfaceMaterial("cabinet", item.color);
    return (
      <group>
        <mesh
          position={[item.size[0] / 2, item.size[1] / 2, item.size[2] / 2]}
          material={paint}
          castShadow
          receiveShadow
        >
          <boxGeometry args={item.size} />
        </mesh>
        <CabinetFront item={item} handle={scene.palette.handles} />
      </group>
    );
  }
  if (item.role === "appliance") return <ApplianceBody item={item} />;
  if (item.role === "socket" || item.role === "switch") return <SocketFace item={item} />;
  if (item.role === "window") return <WindowPane item={item} />;

  const material = materialFor(item, scene);
  const inset = item.role === "plinth" ? 0.025 : 0;
  return (
    <mesh
      position={[item.size[0] / 2, item.size[1] / 2, item.size[2] / 2 + inset / 2]}
      material={material}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[item.size[0], item.size[1], Math.max(0.01, item.size[2] - inset)]} />
    </mesh>
  );
}

function WindowPane({ item }: { item: SceneItem }) {
  const [w, h, d] = item.size;
  const bar = 0.015;
  return (
    <group>
      <mesh position={[w / 2, h / 2, d / 2]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color="#c5e2ef"
          transparent
          opacity={0.38}
          roughness={0.06}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[w / 2, h / 2, d / 2]}>
        <boxGeometry args={[bar, h, d + 0.006]} />
        <meshStandardMaterial color="#f3efe6" roughness={0.45} />
      </mesh>
      <mesh position={[w / 2, h / 2, d / 2]}>
        <boxGeometry args={[w, bar, d + 0.006]} />
        <meshStandardMaterial color="#f3efe6" roughness={0.45} />
      </mesh>
    </group>
  );
}

function materialFor(item: SceneItem, scene: WalkthroughScene) {
  if (item.role === "countertop") {
    return surfaceMaterial("worktop", item.color, scene.countertopMaterial);
  }
  if (item.role === "backsplash") {
    return surfaceMaterial("splash", item.color, scene.backsplashStyle);
  }
  if (item.role === "plinth") return surfaceMaterial("cabinet", item.color);
  if (item.role === "door" || item.role === "furniture") {
    return surfaceMaterial("timber", item.color);
  }
  return surfaceMaterial("cabinet", item.color);
}

function useFloorMaterial(scene: WalkthroughScene) {
  const span = useMemo(() => {
    const xs = scene.floor.map((point) => point.x);
    const zs = scene.floor.map((point) => point.z);
    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 1);
  }, [scene.floor]);

  const material = useMemo(() => {
    const repeat = Math.max(2, span / 1.25);
    const next = tiledSurface("floor", scene.palette.floor, scene.flooringStyle, repeat, repeat);
    next.side = THREE.DoubleSide;
    return next;
  }, [scene.palette.floor, scene.flooringStyle, span]);

  useEffect(
    () => () => {
      material.map?.dispose();
      material.roughnessMap?.dispose();
      material.bumpMap?.dispose();
      material.dispose();
    },
    [material],
  );

  return material;
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
