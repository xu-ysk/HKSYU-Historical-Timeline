import { expect, test } from 'vitest';
import timeline from '../../public/timeline.json';
import {
  horizontalTimelineGeometry,
  nearestTimelineYear,
} from '../../src/timeline/horizontalTimeline';

const years = [
  ...new Set([...timeline.upperRailEvents, ...timeline.educationEvents].map((event) => event.year)),
].sort((a, b) => a - b);

for (const width of [1216, 1356, 1836]) {
  test(`horizontal rails keep the same chronology and readable gaps at ${width}px`, () => {
    const { scale, length, min, max } = horizontalTimelineGeometry(width, 2026, years);
    expect(min).toBe(scale.toUnit(1949));
    expect(max).toBe(scale.toUnit(2026));
    for (const [index, year] of years.entries()) {
      expect(scale.toYear(scale.toUnit(year))).toBeCloseTo(year);
      if (index > 0)
        expect(
          (scale.toUnit(year) - scale.toUnit(years[index - 1])) * length,
        ).toBeGreaterThanOrEqual(47.99);
    }
    expect(scale.toUnit(1971) - scale.toUnit(1970)).toBeCloseTo(
      (scale.toUnit(1972) - scale.toUnit(1971)) / 5,
    );
  });
}

test('a shared focus can land on education-only years and both endpoints', () => {
  expect(nearestTimelineYear(1952.1, years)).toBe(1952);
  expect(nearestTimelineYear(2022.8, years)).toBe(2023);
  expect(nearestTimelineYear(1900, [1949, ...years, 2026])).toBe(1949);
  expect(nearestTimelineYear(2100, [1949, ...years, 2026])).toBe(2026);
  expect(nearestTimelineYear(2000, [])).toBe(1949);
});
