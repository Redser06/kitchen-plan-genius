import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { KitchenDesign } from "../../domain/types";
import { KitchenRoom } from "./KitchenRoom";
import { Walker, type WalkPose } from "./Walker";
import { buildWalkthroughScene, polygonCentroid, type WalkthroughScene } from "./plan-scene";
import { disposeSurfaceCache } from "./surfaces";

export default function WalkthroughView({
  design,
  mode,
  selectedId,
  onSelect,
}: {
  design: KitchenDesign;
  mode: "walk" | "orbit";
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const scene = useMemo(() => buildWalkthroughScene(design), [design]);
  const pose = useWalkPose(scene.spawn);
  useEffect(() => () => disposeSurfaceCache(), []);
  const cabinetCount = new Set(
    scene.items.filter((item) => item.role === "cabinet").map((item) => item.sourceId),
  ).size;
  const walkKey = [
    scene.floor.map((point) => `${point.x.toFixed(2)},${point.z.toFixed(2)}`).join(";"),
    scene.spawn.x.toFixed(2),
    scene.spawn.z.toFixed(2),
    scene.spawn.yaw.toFixed(2),
    scene.ceilingHeight.toFixed(2),
  ].join("|");

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <WebglBoundary>
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ fov: 55, near: 0.08, far: 80 }}
          onCreated={({ gl }) => {
            gl.setClearColor("#efe6da");
          }}
        >
          <KitchenRoom scene={scene} mode={mode} selectedId={selectedId} onSelect={onSelect} />
          {mode === "walk" ? (
            <Walker key={walkKey} scene={scene} onPose={pose.publish} />
          ) : (
            <OrbitRig scene={scene} />
          )}
        </Canvas>
      </WebglBoundary>
      <Hud scene={scene} mode={mode} cabinetCount={cabinetCount} pose={pose.current} />
    </div>
  );
}

function OrbitRig({ scene }: { scene: WalkthroughScene }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const polygonRef = useRef(scene.floor);
  polygonRef.current = scene.floor;
  const roomKey = scene.floor
    .map((point) => `${point.x.toFixed(2)},${point.z.toFixed(2)}`)
    .join(";");

  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = true;
    orbit.maxPolarAngle = Math.PI / 2.08;
    orbit.minDistance = 0.8;
    orbit.maxDistance = 24;
    controls.current = orbit;
    return () => orbit.dispose();
  }, [camera, gl]);

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const polygon = polygonRef.current;
    const center = polygonCentroid(polygon);
    let radius = 1.5;
    for (const point of polygon) {
      radius = Math.max(radius, Math.hypot(point.x - center.x, point.z - center.z));
    }
    orbit.target.set(center.x, 0.85, center.z);
    camera.position.set(center.x + radius * 0.15, radius * 1.25 + 1.4, center.z + radius * 1.85);
    orbit.update();
  }, [camera, roomKey]);

  useFrame(() => controls.current?.update());

  return null;
}

function Hud({
  scene,
  mode,
  cabinetCount,
  pose,
}: {
  scene: WalkthroughScene;
  mode: "walk" | "orbit";
  cabinetCount: number;
  pose: WalkPose;
}) {
  const hint =
    mode === "walk"
      ? pose.locked
        ? "WASD to walk · Shift to move faster · Esc to release the mouse"
        : "Click the room to look around · WASD to walk"
      : "Drag to orbit · Scroll to zoom · Click a unit to select it · Click the floor to clear";

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {scene.usedSample && (
        <div style={bannerStyle}>
          Showing a sample kitchen until the room has at least three corners.
        </div>
      )}
      {!scene.usedSample && cabinetCount === 0 && (
        <div style={{ ...bannerStyle, top: 14 }}>
          This room has no units yet. Place them on the 2D plan, then come back to walk through.
        </div>
      )}
      <div style={hintStyle}>{hint}</div>
      {mode === "walk" && <Minimap scene={scene} pose={pose} />}
      {mode === "walk" && pose.locked && <div style={crosshairStyle} />}
    </div>
  );
}

function Minimap({ scene, pose }: { scene: WalkthroughScene; pose: WalkPose }) {
  const points = scene.floor;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minZ = Math.min(...points.map((point) => point.z));
  const maxZ = Math.max(...points.map((point) => point.z));
  const scale = 68 / Math.max(maxX - minX, maxZ - minZ, 0.01);
  const mapPoint = (x: number, z: number) => ({
    x: 10 + (x - minX) * scale,
    y: 10 + (z - minZ) * scale,
  });
  const polygon = points.map((point) => mapPoint(point.x, point.z));
  const dot = mapPoint(pose.x, pose.z);
  const forwardX = -Math.sin(pose.yaw);
  const forwardZ = -Math.cos(pose.yaw);
  const tip = mapPoint(pose.x + forwardX * 0.35, pose.z + forwardZ * 0.35);

  return (
    <svg viewBox="0 0 96 96" width={96} height={96} style={minimapStyle}>
      <rect width="96" height="96" rx="12" fill="rgba(255,255,255,0.92)" />
      <polygon
        points={polygon.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
        fill="#EFE2D0"
        stroke="#C9B79C"
        strokeWidth={1.4}
      />
      <line x1={dot.x} y1={dot.y} x2={tip.x} y2={tip.y} stroke="#C1602C" strokeWidth={2} />
      <circle cx={dot.x} cy={dot.y} r={3.2} fill="#C1602C" />
    </svg>
  );
}

class WebglBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div style={{ ...bannerStyle, top: "40%", left: 24, right: 24, textAlign: "center" }}>
          This browser could not start the 3D view. Switch back to 2D to keep planning.
        </div>
      );
    }
    return this.props.children;
  }
}

const bannerStyle = {
  position: "absolute" as const,
  top: 14,
  left: 14,
  maxWidth: 420,
  background: "var(--surface, #fff)",
  border: "1px solid var(--border, #E6DCCC)",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  color: "var(--text-2, #6B6058)",
  boxShadow: "0 8px 24px rgba(43,36,32,0.08)",
};

const hintStyle = {
  position: "absolute" as const,
  bottom: 16,
  left: "50%",
  transform: "translateX(-50%)",
  background: "var(--surface, #fff)",
  border: "1px solid var(--border, #E6DCCC)",
  borderRadius: 20,
  padding: "8px 16px",
  fontSize: 12.5,
  color: "var(--text-3, #9C9186)",
  whiteSpace: "nowrap" as const,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const minimapStyle = {
  position: "absolute" as const,
  right: 16,
  bottom: 16,
  borderRadius: 12,
  boxShadow: "0 8px 24px rgba(43,36,32,0.12)",
};

function useWalkPose(spawn: WalkthroughScene["spawn"]) {
  const [current, setCurrent] = useState<WalkPose>({
    x: spawn.x,
    z: spawn.z,
    yaw: spawn.yaw,
    locked: false,
  });
  const poseRef = useRef(current);

  const publish = useCallback((next: WalkPose) => {
    const prev = poseRef.current;
    const yawDelta = Math.abs(
      Math.atan2(Math.sin(prev.yaw - next.yaw), Math.cos(prev.yaw - next.yaw)),
    );
    if (
      Math.hypot(prev.x - next.x, prev.z - next.z) < 0.03 &&
      yawDelta < 0.04 &&
      prev.locked === next.locked
    ) {
      return;
    }
    poseRef.current = next;
    setCurrent(next);
  }, []);

  useEffect(() => {
    const next = { x: spawn.x, z: spawn.z, yaw: spawn.yaw, locked: false };
    poseRef.current = next;
    setCurrent(next);
  }, [spawn.x, spawn.z, spawn.yaw]);

  return { current, publish };
}

const crosshairStyle = {
  position: "absolute" as const,
  left: "50%",
  top: "50%",
  width: 8,
  height: 8,
  marginLeft: -4,
  marginTop: -4,
  borderRadius: 999,
  border: "1.5px solid rgba(255,255,255,0.9)",
  background: "rgba(43,36,32,0.35)",
};
