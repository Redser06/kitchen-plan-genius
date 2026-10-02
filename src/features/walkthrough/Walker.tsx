import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EYE_HEIGHT, constrainWalker, type WalkthroughScene } from "./plan-scene";
import { publishWalkPose } from "./walk-pose";

const LOOK_SPEED = 0.0022;
const WALK_SPEED = 1.45;
const RUN_SPEED = 2.6;

export function Walker({ scene }: { scene: WalkthroughScene }) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(scene.spawn.yaw);
  const pitch = useRef(-0.06);
  const locked = useRef(false);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  useEffect(() => {
    const spawn = sceneRef.current.spawn;
    camera.position.set(spawn.x, EYE_HEIGHT, spawn.z);
    yaw.current = spawn.yaw;
    pitch.current = -0.06;
    camera.rotation.order = "YXZ";
  }, [camera]);

  useEffect(() => {
    const element = gl.domElement;
    const onKey = (event: KeyboardEvent, down: boolean) => {
      if (isTypingTarget(event.target)) return;
      if (isWalkKey(event.code)) event.preventDefault();
      keys.current[event.code] = down;
    };
    const down = (event: KeyboardEvent) => onKey(event, true);
    const up = (event: KeyboardEvent) => onKey(event, false);
    const look = (event: MouseEvent) => {
      if (!locked.current) return;
      yaw.current -= event.movementX * LOOK_SPEED;
      pitch.current = Math.max(-1.15, Math.min(1.05, pitch.current - event.movementY * LOOK_SPEED));
    };
    const lockChange = () => {
      locked.current = document.pointerLockElement === element;
      publishWalkPose({
        x: camera.position.x,
        z: camera.position.z,
        yaw: yaw.current,
        locked: locked.current,
      });
    };
    const requestLock = () => {
      if (document.pointerLockElement !== element) element.requestPointerLock();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("mousemove", look);
    document.addEventListener("pointerlockchange", lockChange);
    element.addEventListener("click", requestLock);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("mousemove", look);
      document.removeEventListener("pointerlockchange", lockChange);
      element.removeEventListener("click", requestLock);
      if (document.pointerLockElement === element) document.exitPointerLock();
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const current = sceneRef.current;
    const frame = Math.min(delta, 0.05);
    const speed =
      (keys.current.ShiftLeft || keys.current.ShiftRight ? RUN_SPEED : WALK_SPEED) * frame;
    const forwardX = -Math.sin(yaw.current);
    const forwardZ = -Math.cos(yaw.current);
    const rightX = Math.cos(yaw.current);
    const rightZ = -Math.sin(yaw.current);
    let mx = 0;
    let mz = 0;
    if (keys.current.KeyW || keys.current.ArrowUp) {
      mx += forwardX;
      mz += forwardZ;
    }
    if (keys.current.KeyS || keys.current.ArrowDown) {
      mx -= forwardX;
      mz -= forwardZ;
    }
    if (keys.current.KeyD || keys.current.ArrowRight) {
      mx += rightX;
      mz += rightZ;
    }
    if (keys.current.KeyA || keys.current.ArrowLeft) {
      mx -= rightX;
      mz -= rightZ;
    }
    let dx = 0;
    let dz = 0;
    if (mx !== 0 || mz !== 0) {
      const length = Math.hypot(mx, mz);
      dx = (mx / length) * speed;
      dz = (mz / length) * speed;
    }
    const next = constrainWalker({ x: camera.position.x + dx, z: camera.position.z + dz }, current);
    camera.position.set(next.x, EYE_HEIGHT, next.z);
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0);
    publishWalkPose({ x: next.x, z: next.z, yaw: yaw.current, locked: locked.current });
  });

  return null;
}

function isWalkKey(code: string) {
  return (
    code === "KeyW" ||
    code === "KeyA" ||
    code === "KeyS" ||
    code === "KeyD" ||
    code.startsWith("Arrow")
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
