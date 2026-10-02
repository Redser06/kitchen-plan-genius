// Small procedural finishes. Canvas textures stay in the lazy walkthrough
// chunk so the 2D planner does not download them with Three.js.

import * as THREE from "three";

export type SurfaceKind = "cabinet" | "worktop" | "floor" | "wall" | "splash" | "timber";

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** Drop cached finish textures. Call when the walkthrough unmounts. */
export function disposeSurfaceCache() {
  for (const material of cache.values()) {
    material.map?.dispose();
    material.roughnessMap?.dispose();
    material.bumpMap?.dispose();
    material.dispose();
  }
  cache.clear();
}

export function surfaceMaterial(
  kind: SurfaceKind,
  color: string,
  style = "",
): THREE.MeshStandardMaterial {
  const key = `${kind}|${color.toLowerCase()}|${style.toLowerCase()}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const material = buildMaterial(kind, color, style);
  cache.set(key, material);
  return material;
}

/** Clone maps so a mesh can tile without changing the shared finish. */
export function tiledSurface(
  kind: SurfaceKind,
  color: string,
  style: string,
  repeatX: number,
  repeatY: number,
): THREE.MeshStandardMaterial {
  const base = surfaceMaterial(kind, color, style);
  const next = base.clone();
  next.map = retile(base.map, repeatX, repeatY);
  next.roughnessMap = retile(base.roughnessMap, repeatX, repeatY);
  next.bumpMap = retile(base.bumpMap, repeatX, repeatY);
  return next;
}

export function shiftColor(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const channel = (value: number) =>
    Math.max(0, Math.min(255, value + amount))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`;
}

function retile(map: THREE.Texture | null, repeatX: number, repeatY: number) {
  if (!map) return null;
  const copy = map.clone();
  copy.wrapS = THREE.RepeatWrapping;
  copy.wrapT = THREE.RepeatWrapping;
  copy.repeat.set(repeatX, repeatY);
  copy.needsUpdate = true;
  return copy;
}

type Pattern =
  | "paint"
  | "plaster"
  | "planks"
  | "herringbone"
  | "tile"
  | "slate"
  | "stone"
  | "marble"
  | "concrete"
  | "subway";

function buildMaterial(kind: SurfaceKind, color: string, style: string) {
  const pattern = patternFor(kind, style);
  const rgb = parseHex(color) ?? [200, 190, 175];
  const size = 256;
  const albedo = new Uint8ClampedArray(size * size * 4);
  const rough = new Uint8ClampedArray(size * size * 4);
  const height = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sample = paint(pattern, rgb, x, y);
      const index = (y * size + x) * 4;
      albedo[index] = byte(sample.r);
      albedo[index + 1] = byte(sample.g);
      albedo[index + 2] = byte(sample.b);
      albedo[index + 3] = 255;
      rough[index] = rough[index + 1] = rough[index + 2] = byte(sample.rough);
      rough[index + 3] = 255;
      height[index] = height[index + 1] = height[index + 2] = byte(sample.height);
      height[index + 3] = 255;
    }
  }

  const map = textureFrom(albedo, size, THREE.SRGBColorSpace);
  const roughnessMap = textureFrom(rough, size, THREE.NoColorSpace);
  const bumpMap = textureFrom(height, size, THREE.NoColorSpace);
  return new THREE.MeshStandardMaterial({
    map,
    roughnessMap,
    bumpMap,
    roughness: 1,
    metalness: metalnessFor(kind, style),
    bumpScale: bumpFor(pattern),
    color: "#ffffff",
  });
}

function textureFrom(data: Uint8ClampedArray, size: number, colorSpace: THREE.ColorSpace) {
  const image = new ImageData(size, size);
  image.data.set(data);
  const texture = new THREE.CanvasTexture(imageCanvas(image));
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function imageCanvas(image: ImageData) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  ctx?.putImageData(image, 0, 0);
  return canvas;
}

function patternFor(kind: SurfaceKind, style: string): Pattern {
  const name = style.toLowerCase();
  if (kind === "cabinet") return "paint";
  if (kind === "wall") return "plaster";
  if (kind === "timber") return "planks";
  if (kind === "worktop") {
    if (name.includes("wood") || name.includes("oak") || name.includes("butcher")) return "planks";
    if (name.includes("concrete")) return "concrete";
    if (name.includes("marble")) return "marble";
    return "stone";
  }
  if (kind === "splash") {
    if (name.includes("subway")) return "subway";
    if (name.includes("marble")) return "marble";
    if (name.includes("pattern")) return "tile";
    return "paint";
  }
  if (name.includes("herring")) return "herringbone";
  if (name.includes("tile") || name.includes("porcelain")) return "tile";
  if (name.includes("slate")) return "slate";
  return "planks";
}

function metalnessFor(kind: SurfaceKind, style: string) {
  const name = style.toLowerCase();
  if (
    kind === "worktop" &&
    (name.includes("granite") || name.includes("marble") || name.includes("quartz"))
  ) {
    return 0.16;
  }
  if (kind === "splash" && name.includes("marble")) return 0.1;
  return 0.02;
}

function bumpFor(pattern: Pattern) {
  switch (pattern) {
    case "paint":
      return 0.0015;
    case "plaster":
      return 0.004;
    case "planks":
      return 0.012;
    case "herringbone":
      return 0.01;
    case "tile":
    case "subway":
      return 0.008;
    case "stone":
    case "marble":
      return 0.005;
    case "concrete":
      return 0.01;
    case "slate":
      return 0.014;
    default:
      return 0.004;
  }
}

interface Sample {
  r: number;
  g: number;
  b: number;
  rough: number;
  height: number;
}

function paint(pattern: Pattern, rgb: [number, number, number], x: number, y: number): Sample {
  const [r, g, b] = rgb;
  const n = hash(x, y);
  if (pattern === "paint") {
    const wobble = (n - 0.5) * 10;
    return tint(r, g, b, wobble, 148 + n * 18, 128 + wobble);
  }
  if (pattern === "plaster") {
    const low = hash(x * 0.15, y * 0.15);
    const wobble = (low - 0.5) * 18 + (n - 0.5) * 8;
    return tint(r, g, b, wobble, 214, 128 + (low - 0.5) * 36);
  }
  if (pattern === "planks" || pattern === "herringbone") {
    return wood(pattern, r, g, b, x, y, n);
  }
  if (pattern === "tile" || pattern === "subway") {
    return bricks(pattern, r, g, b, x, y, n);
  }
  if (pattern === "slate") {
    const grout = x % 70 < 3 || y % 70 < 3;
    const mottled = (hash(Math.floor(x / 8), Math.floor(y / 8)) - 0.5) * 28;
    const shift = grout ? -42 : mottled;
    return tint(r, g, b, shift, grout ? 210 : 150, grout ? 70 : 150 + mottled);
  }
  if (pattern === "marble") {
    const vein = Math.abs(Math.sin(x * 0.05 + Math.sin(y * 0.04) * 4.5)) < 0.12;
    const soft = (hash(x * 0.1, y * 0.1) - 0.5) * 12;
    return tint(r, g, b, (vein ? -34 : 0) + soft, vein ? 90 : 58, vein ? 90 : 150);
  }
  if (pattern === "concrete") {
    const pit = n > 0.985 ? -48 : 0;
    const wobble = (hash(x * 0.25, y * 0.25) - 0.5) * 16 + pit;
    return tint(r, g, b, wobble, 168, 128 + wobble);
  }
  const speckle = n > 0.94 ? 46 : n < 0.06 ? -34 : (hash(x * 0.2, y * 0.2) - 0.5) * 16;
  return tint(r, g, b, speckle, 78 + n * 24, 128 + speckle * 0.4);
}

function wood(
  pattern: Pattern,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  n: number,
): Sample {
  let u = x;
  let v = y;
  let row = 0;
  if (pattern === "herringbone") {
    const tile = 36;
    const col = Math.floor(x / tile);
    row = Math.floor(y / tile);
    const flip = (col + row) % 2 === 0;
    const lx = x - col * tile;
    const ly = y - row * tile;
    u = flip ? lx : ly;
    v = flip ? ly : lx;
  } else {
    const plankH = 42;
    row = Math.floor(y / plankH);
    v = y - row * plankH;
    u = (x + (row % 2) * 28) % 96;
  }
  const seam = v < 2 || (pattern === "herringbone" && u < 2) || (pattern === "planks" && u < 2);
  const grain = Math.sin((u + row * 13) * 0.09 + Math.sin(v * 0.07) * 1.4) * 14;
  const shift = grain + (n - 0.5) * 10 + (seam ? -36 : 0);
  return {
    r: r + shift,
    g: g + shift * 0.92,
    b: b + shift * 0.7,
    rough: seam ? 205 : 118,
    height: seam ? 78 : 146 + grain,
  };
}

function bricks(
  pattern: Pattern,
  r: number,
  g: number,
  b: number,
  x: number,
  y: number,
  n: number,
): Sample {
  const brickW = pattern === "subway" ? 72 : 64;
  const brickH = pattern === "subway" ? 28 : 64;
  const row = Math.floor(y / brickH);
  const offset = pattern === "subway" && row % 2 === 1 ? brickW / 2 : 0;
  const lx = (x + offset) % brickW;
  const ly = y % brickH;
  const grout = lx < 3 || ly < 3;
  const alt = (Math.floor((x + offset) / brickW) + row) % 2 === 0 ? 8 : -6;
  const shift = grout ? -30 : alt + (n - 0.5) * 8;
  return tint(r, g, b, shift, grout ? 200 : 130, grout ? 72 : 148);
}

function tint(
  r: number,
  g: number,
  b: number,
  shift: number,
  rough: number,
  height: number,
): Sample {
  return { r: r + shift, g: g + shift, b: b + shift, rough, height };
}

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function byte(value: number) {
  return value < 0 ? 0 : value > 255 ? 255 : value | 0;
}

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}
