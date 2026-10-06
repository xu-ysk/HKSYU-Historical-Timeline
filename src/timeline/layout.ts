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
/** Smaller sleeves recede behind full-size sleeves, never across their faces. */
export function themeStackZ(depth: number, scale: number) {
  return Math.round(scale * 1000 + (depth / 1550) * 400);
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Keep groups of three or more sleeves compact in overview; preserve browse spacing. */
export function groupPhotoOffset(index: number, count: number, zoom: number) {
  const standard = (index - 0.5) * (18 + 26 * zoom);
  if (count <= 2) return standard;
  const compactOverview = (index - (count - 1) / 2) * 7;
  return lerp(compactOverview, standard, zoom);
}
export const direction = { x: Math.cos(config.angle), y: Math.sin(config.angle) };
export const normal = { x: -direction.y, y: direction.x };
export function lengths(view: Viewport) {
  return {
    overview: Math.min((view.width - 220) / direction.x, (view.height - 455) / -direction.y),
    browse: config.browseLength * Math.max(0.8, view.width / 1440),
  };
}
export function anchor(year: number, lane: TimelineLane, view: Viewport, values: SceneValues) {
  const u = timeScale(values.endYear).toUnit(year),
    length = lengths(view);
  const a = length.overview * (u - 0.5),
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
/** Use at most two label rows; dense years retain their interactive rail dots. */
export function upperYearOffsets(years: number[], view: Viewport, values: SceneValues) {
  const placed: { x: number; y: number }[] = [];
  const offsets = new Map<number, number>();
  for (const year of [...new Set(years)].sort((a, b) => a - b)) {
    const p = anchor(year, 'upper', view, values);
    const offset = [24, 46].find(
      (candidate) =>
        !placed.some(
          (label) => Math.abs(label.x - p.x) < 36 && Math.abs(label.y - (p.y - candidate)) < 20,
        ),
    );
    if (offset === undefined) continue;
    placed.push({ x: p.x, y: p.y - offset });
    offsets.set(year, offset);
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
  let delta = slot * 0.7;
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
