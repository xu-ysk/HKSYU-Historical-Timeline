import type { DisplayCard } from '../domain/timeline';
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
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const direction = { x: Math.cos(config.angle), y: Math.sin(config.angle) };
export const normal = { x: -direction.y, y: direction.x };
export function lengths(view: Viewport) {
  return {
    overview: Math.min((view.width - 220) / direction.x, (view.height - 455) / -direction.y),
    browse: config.browseLength * Math.max(0.8, view.width / 1440),
  };
}
export function anchor(
  year: number,
  lane: 'school' | 'education' | 'axis',
  view: Viewport,
  values: SceneValues,
) {
  const u = timeScale(values.endYear).toUnit(year),
    length = lengths(view);
  const a = length.overview * (u - 0.5),
    b = length.browse * (u - values.focus);
  const q = lerp(a, b + config.gap * Math.tanh(b / config.gapSoftness), values.zoom);
  const offset = lane === 'school' ? -20 : lane === 'education' ? 70 : 25;
  return {
    x: view.width * 0.47 + direction.x * q + normal.x * offset,
    y: view.height * 0.49 + direction.y * q + normal.y * offset,
  };
}
export function cardPose(card: DisplayCard, view: Viewport, values: SceneValues): Pose {
  const base = anchor(card.event.year, 'school', view, values);
  const length = lengths(view),
    span = timeScale(values.endYear).span;
  const slot = card.countInYear > 1 ? card.slot / (card.countInYear - 1) - 0.5 : 0;
  let delta = slot * 0.7;
  if (card.event.year === 1949) delta += 0.35;
  if (card.event.year === values.endYear) delta -= 0.35;
  const offset = (delta * lerp(length.overview, length.browse, values.zoom)) / span;
  const width = lerp(config.overviewCardWidth, config.browseCardWidth, values.zoom);
  const ratio = 1.5; // Uniform album sleeves; the detail view uses each photograph's own aspect ratio.
  return {
    x: base.x + direction.x * offset,
    y: base.y + direction.y * offset,
    width,
    height: width / ratio,
    ry: -52,
    rz: 18,
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
