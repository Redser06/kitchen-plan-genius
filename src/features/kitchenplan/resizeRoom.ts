import type { KitchenDesign } from '../../domain/types';

/** Whole-string room size, e.g. "5m x 4m" or "3.5m × 3m". */
const RESIZE_RE = /^(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m$/i;

export const RESIZE_SUGGESTIONS = ['4m x 3m', '5m x 4m', '3.5m x 3m', '6m x 4.5m'];

export type ResizeResult =
  | { ok: true; design: KitchenDesign; message: string }
  | { ok: false; message: string };

/** Scale the current room outline to a width × depth. Does not invent a new layout. */
export function resizeRoom(design: KitchenDesign, input: string): ResizeResult {
  const match = input.trim().match(RESIZE_RE);
  if (!match) {
    return {
      ok: false,
      message:
        'Only a room size works here, for example "5m x 4m". For a new layout, use Room shape.',
    };
  }
  const widthM = parseFloat(match[1]);
  const depthM = parseFloat(match[2]);
  const newW = Math.round(widthM * 1000);
  const newD = Math.round(depthM * 1000);
  if (!(newW > 0) || !(newD > 0)) {
    return { ok: false, message: 'Enter a size greater than 0, for example "5m x 4m".' };
  }

  const next = JSON.parse(JSON.stringify(design)) as KitchenDesign;
  const pts = next.room.points;
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const curW = maxX - minX || 1;
  const curD = maxY - minY || 1;
  next.room.points = pts.map((p) => ({
    x: ((p.x - minX) * newW) / curW,
    y: ((p.y - minY) * newD) / curD,
  }));
  return { ok: true, design: next, message: `Resized room to ${match[1]}m × ${match[2]}m.` };
}
