import type { DisplayCard, TimelineLane } from '../domain/timeline';
import { sceneConfig as config } from '../config/scene';
import { clamp, timeScale } from './timeScale';
export interface Viewport {
  width: number;
  height: number;
}
export interface SceneValues {
  focus: number;
  zoom: number;
  endYear: number;
  overviewYears?: readonly number[];
}
export interface Pose {
  x: number;
  y: number;
  width: number;
  height: number;
  ry: number;
  rz: number;
  scale: number;
  z: number;
  skew?: number;
}
/**
 * Keep the chronological procession layered from old to new.
 *
 * The browse axis runs from the lower-left (earlier years) to the upper-right
 * (later years). Older sleeves therefore receive the higher stack level and
 * cover later sleeves as they pass across one another during a drag.
 */
export function browseStackZ(card: DisplayCard, focusYear: number, position = card.event.year) {
  return clamp(1250 + Math.round((focusYear - position) * 40) - card.slot, 200, 1550);
}
/** Theme filtering changes size, while the shared photo lane keeps its original order. */
export function chronologicalStackZ(index: number) {
  return 1099 - index;
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Keep the sleeves of a photo group on the shared rail. */
export function groupPhotoOffset(index: number, count: number, zoom: number) {
  if (count > 5) throw new Error('Photo group exceeds five photos');
  const spacing = count === 5 ? 8 + 36 * zoom : 18 + 26 * zoom;
  return (index - (count - 1) / 2) * spacing;
}
export const direction = { x: Math.cos(config.angle), y: Math.sin(config.angle) };
export const normal = { x: -direction.y, y: direction.x };
export function groupPhotoDisplacement(
  index: number,
  count: number,
  zoom: number,
  scale: number,
  lineMix: number,
) {
  const offset = groupPhotoOffset(index, count, zoom) * scale;
  return {
    x: lerp(normal.x, direction.x, lineMix) * offset,
    y: lerp(normal.y, direction.y, lineMix) * offset,
  };
}
export function lengths(view: Viewport) {
  return {
    overview: Math.min((view.width - 120) / direction.x, (view.height - 130) / -direction.y),
    browse: config.browseLength * Math.max(0.8, view.width / 1440),
  };
}
/** Spread every marked year across the overview rail while preserving chronology. */
export function overviewUnit(year: number, endYear: number, years?: readonly number[]) {
  if (years?.length) {
    const knots = [...new Set([1949, ...years, endYear])]
      .filter((item) => item >= 1949 && item <= endYear)
      .sort((a, b) => a - b);
    if (knots.length > 1) {
      const gaps = knots.slice(1).map((item, index) => Math.sqrt(item - knots[index]));
      const total = gaps.reduce((sum, gap) => sum + gap, 0);
      const weights = gaps.map((gap) => 0.78 / gaps.length + (0.22 * gap) / total);
      const bounded = Math.min(endYear, Math.max(1949, year));
      let position = 0;
      for (let index = 0; index < gaps.length; index++) {
        const start = knots[index],
          finish = knots[index + 1];
        if (bounded <= finish)
          return position + (weights[index] * (bounded - start)) / (finish - start);
        position += weights[index];
      }
      return 1;
    }
  }
  const scale = timeScale(endYear);
  const unit = scale.toUnit(year);
  const pivot = scale.toUnit(1971);
  if (pivot <= 0 || pivot >= 1) return unit;
  return unit <= pivot ? (unit * 0.18) / pivot : 0.18 + ((unit - pivot) * 0.82) / (1 - pivot);
}
export function anchor(year: number, lane: TimelineLane, view: Viewport, values: SceneValues) {
  const u = timeScale(values.endYear).toUnit(year),
    length = lengths(view);
  const a = length.overview * (overviewUnit(year, values.endYear, values.overviewYears) - 0.5),
    b = length.browse * (u - values.focus);
  const q = lerp(a, b + config.gap * Math.tanh(b / config.gapSoftness), values.zoom);
  // Keep the drawn photo axis on the school card centers, midway between the
  // upper history rail (-110) and the education rail (70).
  const offset = lane === 'upper' ? -110 : lane === 'education' ? 70 : -20;
  return {
    x: view.width * 0.47 + direction.x * q + normal.x * offset,
    y: view.height * 0.49 + direction.y * q + normal.y * offset,
  };
}
/** Extend the drawn rails beyond the markers to the screen edges in overview. */
export function trackEndpoints(lane: TimelineLane, view: Viewport, values: SceneValues) {
  const first = anchor(1949, lane, view, values);
  const last = anchor(values.endYear, lane, view, values);
  const extra =
    (Math.max(0, (view.width + 120) / direction.x - lengths(view).overview) / 2) *
    (1 - values.zoom);
  return {
    first: { x: first.x - direction.x * extra, y: first.y - direction.y * extra },
    last: { x: last.x + direction.x * extra, y: last.y + direction.y * extra },
  };
}
/** Alternate year labels across each rail and use extra rows only for collisions. */
export function yearLabelOffsets(
  years: readonly number[],
  lane: 'upper' | 'education',
  view: Viewport,
  values: SceneValues,
) {
  const placed: { x: number; y: number }[] = [];
  const offsets = new Map<number, number>();
  const above = [-20, -38, -56, -74, -92];
  const below = [20, 38, 56, 74, 92];
  for (const [index, year] of [...new Set(years)].sort((a, b) => a - b).entries()) {
    const p = anchor(year, lane, view, values);
    const aboveFirst = index % 2 === (lane === 'upper' ? 0 : 1);
    if (p.x < 0 || p.x > view.width || p.y < 0 || p.y > view.height) {
      offsets.set(year, aboveFirst ? -20 : 20);
      continue;
    }
    const labelX = Math.min(view.width - 15, Math.max(15, p.x));
    const candidates = aboveFirst ? [...above, ...below] : [...below, ...above];
    const offset = candidates.find((candidate) => {
      const y = p.y + candidate;
      return (
        y >= 8 &&
        y <= view.height - 8 &&
        placed.every((label) => Math.abs(label.x - labelX) >= 29 || Math.abs(label.y - y) >= 15)
      );
    });
    const chosen = offset ?? (p.y > view.height / 2 ? -20 : 20);
    placed.push({ x: labelX, y: p.y + chosen });
    offsets.set(year, chosen);
  }
  return offsets;
}
export function cardPose(
  card: DisplayCard,
  view: Viewport,
  values: SceneValues,
  position = card.event.year,
): Pose {
  const length = lengths(view),
    span = timeScale(values.endYear).span;
  const slot = card.countInYear > 1 ? card.slot / (card.countInYear - 1) - 0.5 : 0;
  let delta = slot * 0.9;
  if (card.event.year === 1949) delta += 0.35;
  if (card.event.year === values.endYear) delta -= 0.35;
  const offset = (delta * length.overview) / span;
  const overview = anchor(card.event.year, 'school', view, { ...values, zoom: 0 });
  const browse = anchor(position, 'school', view, { ...values, zoom: 1 });
  const width = lerp(config.overviewCardWidth, config.browseCardWidth, values.zoom);
  const ratio = 1.5; // Uniform album sleeves; the detail view uses each photograph's own aspect ratio.
  return {
    x: lerp(overview.x + direction.x * offset, browse.x, values.zoom),
    y: lerp(overview.y + direction.y * offset, browse.y, values.zoom),
    width,
    height: width / ratio,
    ry: -52,
    rz: 18 * (1 - values.zoom),
    skew: 18 * values.zoom,
    scale: 1,
    z: Math.round(1000 - timeScale(values.endYear).toUnit(card.event.year) * 500 - card.slot),
  };
}
export function transform(p: Pose) {
  return (
    'translate3d(' +
    p.x +
    'px,' +
    p.y +
    'px,0) translate(-50%,-50%) rotateY(' +
    p.ry +
    'deg) rotateZ(' +
    p.rz +
    'deg) skewY(' +
    (p.skew ?? 0) +
    'deg) scale(' +
    p.scale +
    ')'
  );
}
export function isOnscreen(p: Pose, view: Viewport) {
  const rx = p.width * p.scale * 0.5 + 30,
    ry = p.height * p.scale * 0.7 + 30;
  return p.x > -rx && p.x < view.width + rx && p.y > -ry && p.y < view.height + ry;
}
export function focusFromYear(year: number, endYear: number) {
  return clamp(timeScale(endYear).toUnit(year));
}
