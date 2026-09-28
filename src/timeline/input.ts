import { direction } from './layout';
export function wheelPixels(deltaX: number, deltaY: number, mode: number, pageHeight: number) {
  const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
  return delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1);
}
export function dragProjection(dx: number, dy: number) {
  return dx * direction.x + dy * direction.y;
}
