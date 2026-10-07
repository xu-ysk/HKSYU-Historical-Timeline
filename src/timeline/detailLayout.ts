import type { DisplayCard } from '../domain/timeline';
import type { Pose, Viewport } from './layout';
import { normal } from './layout';
import { clamp } from './timeScale';
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function detailRegions(view: Viewport, showText = true) {
  const photosHeight = showText
    ? Math.max(180, view.height - 435)
    : Math.max(220, view.height - 250);
  return {
    photos: {
      x: 65,
      y: (view.height - photosHeight) / 2,
      width: showText ? view.width * 0.61 - 65 : view.width - 130,
      height: photosHeight,
    },
    text: {
      x: showText ? view.width * 0.68 : view.width + 65,
      y: 240,
      width: showText ? view.width * 0.32 - 65 : 0,
      height: Math.max(180, view.height - 435),
    },
  };
}
function contain(ratio: number, box: Rect): Rect {
  const width = Math.min(box.width, box.height * ratio),
    height = width / ratio;
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
}
function centerVertically(rects: Rect[], box: Rect): Rect[] {
  if (!rects.length) return rects;
  const top = Math.min(...rects.map((rect) => rect.y));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  const shift = box.y + box.height / 2 - (top + bottom) / 2;
  return rects.map((rect) => ({ ...rect, y: rect.y + shift }));
}
export function detailPhotoRects(cards: DisplayCard[], view: Viewport, showText = true): Rect[] {
  const box = detailRegions(view, showText).photos,
    gap = 20;
  const ratios = cards.map((c) => (c.photo ? c.photo.width / c.photo.height : 1.5));
  if (cards.length <= 1)
    return centerVertically(
      ratios.map((r) => contain(r, box)),
      box,
    );
  if (cards.length > 2) throw new Error('Photo group exceeds two photos');
  const horizontal = ratios.map((r, i) =>
    contain(r, {
      x: box.x + (i * (box.width + gap)) / cards.length,
      y: box.y,
      width: (box.width - gap * (cards.length - 1)) / cards.length,
      height: box.height,
    }),
  );
  const vertical = ratios.map((r, i) =>
    contain(r, {
      x: box.x,
      y: box.y + (i * (box.height + gap)) / cards.length,
      width: box.width,
      height: (box.height - gap * (cards.length - 1)) / cards.length,
    }),
  );
  const area = (rects: Rect[]) => rects.reduce((sum, r) => sum + r.width * r.height, 0);
  return centerVertically(area(horizontal) >= area(vertical) ? horizontal : vertical, box);
}
export function detailPose(rect: Rect): Pose {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    width: rect.width,
    height: rect.height,
    ry: 0,
    rz: 0,
    scale: 1,
    z: 1701,
    skew: 0,
  };
}
export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const result = { ...a };
  for (const key of ['x', 'y', 'width', 'height', 'ry', 'rz', 'scale'] as const)
    result[key] = a[key] + (b[key] - a[key]) * t;
  result.z = t > 0 ? b.z : a.z;
  result.skew = (a.skew ?? 0) + ((b.skew ?? 0) - (a.skew ?? 0)) * t;
  return result;
}

export function smoothStep(value: number) {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** A reversible lift, turn and approach, with zero velocity at both ends. */
export function extractPose(source: Pose, destination: Pose, progress: number): Pose {
  if (progress <= 0) return { ...source };
  if (progress >= 1) return { ...destination };
  const travel = smoothStep((progress - 0.14) / 0.86);
  const turn = smoothStep((progress - 0.06) / 0.8);
  const grow = smoothStep((progress - 0.2) / 0.8);
  const lift = 32 * smoothStep(progress / 0.24) * (1 - smoothStep((progress - 0.24) / 0.76));
  const result = mixPose(source, destination, travel);
  result.x -= normal.x * lift;
  result.y -= normal.y * lift;
  result.ry = source.ry + (destination.ry - source.ry) * turn;
  result.rz = source.rz + (destination.rz - source.rz) * turn;
  result.skew = (source.skew ?? 0) + ((destination.skew ?? 0) - (source.skew ?? 0)) * turn;
  for (const key of ['width', 'height', 'scale'] as const)
    result[key] = source[key] + (destination[key] - source[key]) * grow;
  result.z = Math.round(source.z + (destination.z - source.z) * smoothStep(progress / 0.3));
  return result;
}
