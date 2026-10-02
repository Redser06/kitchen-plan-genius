import { useSyncExternalStore } from "react";

export interface WalkPose {
  x: number;
  z: number;
  yaw: number;
  locked: boolean;
}

let pose: WalkPose = { x: 0, z: 0, yaw: 0, locked: false };
const listeners = new Set<() => void>();

export function publishWalkPose(next: WalkPose) {
  const sameLock = next.locked === pose.locked;
  const close =
    Math.abs(next.x - pose.x) < 0.03 &&
    Math.abs(next.z - pose.z) < 0.03 &&
    Math.abs(next.yaw - pose.yaw) < 0.04;
  if (sameLock && close) return;
  pose = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWalkPose(): WalkPose {
  return useSyncExternalStore(
    subscribe,
    () => pose,
    () => pose,
  );
}
