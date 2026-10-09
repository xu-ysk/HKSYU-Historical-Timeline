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
export function detailRegions(view: Viewport, showText = true, photoCount = 3) {
  const enlarged = showText && (photoCount <= 2 || photoCount === 5);
  const photosHeight = showText
    ? Math.max(180, view.height - (enlarged ? 300 : 435))
    : Math.max(220, view.height - 250);
  return {
    photos: {
      x: 65,
      y: (view.height - photosHeight) / 2,
      width: showText ? view.width * (enlarged ? 0.65 : 0.61) - 65 : view.width - 130,
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
function capAdditionalUpscaling(
  rect: Rect,
  previous: Rect,
  photo: DisplayCard['photo'],
  pixelRatio: number,
): Rect {
  if (photo?.kind !== 'image') return rect;
  // The published photo copy is limited to 2200 pixels on its longest side.
  const publishedScale = Math.min(1, 2200 / Math.max(photo.width, photo.height));
  const maxWidth = Math.max(previous.width, (photo.width * publishedScale) / pixelRatio);
  const maxHeight = Math.max(previous.height, (photo.height * publishedScale) / pixelRatio);
  const scale = Math.min(1, maxWidth / rect.width, maxHeight / rect.height);
  return {
    x: rect.x + (rect.width * (1 - scale)) / 2,
    y: rect.y + (rect.height * (1 - scale)) / 2,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
export function detailPhotoRects(
  cards: DisplayCard[],
  view: Viewport,
  showText = true,
  pixelRatio = 1,
): Rect[] {
  if (!cards.length) return [];
  const box = detailRegions(view, showText, cards.length).photos,
    gap = 20;
  const ratios = cards.map((c) => (c.photo ? c.photo.width / c.photo.height : 1.5));
  if (cards.length <= 1) {
    const previous = contain(ratios[0], detailRegions(view, showText).photos);
    return centerVertically(
      ratios.map((r, i) => capAdditionalUpscaling(contain(r, box), previous, cards[i].photo, pixelRatio)),
      box,
    );
  }
  if (cards.length > 5) throw new Error('Photo group exceeds five photos');
  if (cards.length === 5) {
    const rowGap = 16;
    const cellWidth = (box.width - gap * 2) / 3;
    const cellHeight = (box.height - rowGap) / 2;
    const cells = ratios.map((ratio, i) =>
      contain(ratio, {
        x: box.x + (i < 3 ? i : i - 3 + 0.5) * (cellWidth + gap),
        y: box.y + (i < 3 ? 0 : cellHeight + rowGap),
        width: cellWidth,
        height: cellHeight,
      }),
    );
    return centerVertically(cells, box);
  }
  if (cards.length > 2) {
    const columns = Math.ceil(cards.length / 2);
    const rows = Math.ceil(cards.length / columns);
    const cellWidth = (box.width - gap * (columns - 1)) / columns;
    const cellHeight = (box.height - gap * (rows - 1)) / rows;
    return centerVertically(
      ratios.map((ratio, i) =>
        contain(ratio, {
          x: box.x + (i % columns) * (cellWidth + gap),
          y: box.y + Math.floor(i / columns) * (cellHeight + gap),
          width: cellWidth,
          height: cellHeight,
        }),
      ),
      box,
    );
  }
  const pairRects = (region: Rect) => {
    const horizontal = ratios.map((r, i) =>
      contain(r, {
        x: region.x + (i * (region.width + gap)) / cards.length,
        y: region.y,
        width: (region.width - gap * (cards.length - 1)) / cards.length,
        height: region.height,
      }),
    );
    const vertical = ratios.map((r, i) =>
      contain(r, {
        x: region.x,
        y: region.y + (i * (region.height + gap)) / cards.length,
        width: region.width,
        height: (region.height - gap * (cards.length - 1)) / cards.length,
      }),
    );
    const area = (rects: Rect[]) => rects.reduce((sum, r) => sum + r.width * r.height, 0);
    return centerVertically(area(horizontal) >= area(vertical) ? horizontal : vertical, region);
  };
  const rects = pairRects(box);
  if (!showText) return rects;
  const previous = pairRects(detailRegions(view, showText).photos);
  return centerVertically(
    rects.map((rect, i) => capAdditionalUpscaling(rect, previous[i], cards[i].photo, pixelRatio)),
    box,
  );
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
