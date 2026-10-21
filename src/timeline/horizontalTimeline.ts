import { sceneConfig } from '../config/scene';
import { browseScale, START_YEAR } from './timeScale';

/** Reuse the original time spacing, reserving enough room for every year label. */
export function horizontalTimelineGeometry(
  width: number,
  endYear: number,
  years: readonly number[],
) {
  const scale = browseScale(endYear);
  const positions = [...new Set([START_YEAR, ...years, endYear])]
    .filter((year) => year >= START_YEAR && year <= endYear)
    .sort((a, b) => a - b)
    .map(scale.toUnit);
  const gaps = positions.slice(1).map((position, index) => position - positions[index]);
  const smallestGap = Math.min(...gaps.filter((gap) => gap > 0));
  const length = Math.max(
    sceneConfig.browseLength * Math.max(0.8, width / 1440),
    Number.isFinite(smallestGap) ? 48 / smallestGap : 0,
  );
  return { scale, length, min: scale.toUnit(START_YEAR), max: scale.toUnit(endYear) };
}

export function nearestTimelineYear(year: number, years: readonly number[]) {
  return years.reduce(
    (best, candidate) => (Math.abs(candidate - year) < Math.abs(best - year) ? candidate : best),
    years[0] ?? START_YEAR,
  );
}
