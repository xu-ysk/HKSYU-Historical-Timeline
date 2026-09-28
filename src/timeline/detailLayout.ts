import type { DisplayCard } from '../domain/timeline';
import type { Pose, Viewport } from './layout';
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function detailRegions(view: Viewport) {
  return {
    photos: {
      x: 65,
      y: 240,
      width: view.width * 0.61 - 65,
      height: Math.max(180, view.height - 435),
    },
    text: {
      x: view.width * 0.68,
      y: 240,
      width: view.width * 0.32 - 65,
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
export function detailPhotoRects(cards: DisplayCard[], view: Viewport): Rect[] {
  const box = detailRegions(view).photos,
    gap = 20;
  const ratios = cards.map((c) => (c.photo ? c.photo.width / c.photo.height : 1.5));
  if (cards.length <= 1) return ratios.map((r) => contain(r, box));
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
  return area(horizontal) >= area(vertical) ? horizontal : vertical;
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
  };
}
export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const result = { ...a };
  for (const key of ['x', 'y', 'width', 'height', 'ry', 'rz', 'scale'] as const)
    result[key] = a[key] + (b[key] - a[key]) * t;
  result.z = t > 0 ? b.z : a.z;
  return result;
}
