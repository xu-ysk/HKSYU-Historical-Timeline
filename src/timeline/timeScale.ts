import { sceneConfig } from '../config/scene';

export const START_YEAR = 1949;
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export function timeScale(endYear: number) {
  const span = Math.max(1, endYear - START_YEAR);
  return {
    toUnit: (year: number) => clamp((year - START_YEAR) / span),
    toYear: (unit: number) => START_YEAR + clamp(unit) * span,
    span,
  };
}
/** Browse distance uses the original span so spacing after 1971 stays unchanged. */
export function browseScale(endYear: number) {
  const { span } = timeScale(endYear);
  const pivot = Math.min(endYear, sceneConfig.earlyBrowseEndYear);
  const earlySpan = (pivot - START_YEAR) * sceneConfig.earlyBrowseScale;
  return {
    toUnit: (year: number) => {
      const bounded = clamp(year, START_YEAR, endYear);
      return (
        (bounded <= pivot
          ? (bounded - START_YEAR) * sceneConfig.earlyBrowseScale
          : earlySpan + bounded - pivot) / span
      );
    },
    toYear: (unit: number) => {
      const distance = Math.max(0, unit * span);
      return Math.min(
        endYear,
        distance <= earlySpan
          ? START_YEAR + distance / sceneConfig.earlyBrowseScale
          : pivot + distance - earlySpan,
      );
    },
  };
}
/** Convert a gesture's visual distance back to the shared chronological focus. */
export function shiftBrowseFocus(focus: number, delta: number, endYear: number) {
  const time = timeScale(endYear);
  const browse = browseScale(endYear);
  return time.toUnit(browse.toYear(browse.toUnit(time.toYear(focus)) + delta));
}
export function rebaseFocus(focus: number, oldEnd: number, newEnd: number) {
  return timeScale(newEnd).toUnit(timeScale(oldEnd).toYear(focus));
}
