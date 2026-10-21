import { expect, test } from 'vitest';
import { browseScale, shiftBrowseFocus, timeScale } from '../../src/timeline/timeScale';

test('browse coordinates compress only 1949–1971 and round-trip fractional event slots', () => {
  for (const endYear of [2026, 2035]) {
    const browse = browseScale(endYear);
    const time = timeScale(endYear);
    expect(browse.toUnit(1971) - browse.toUnit(1949)).toBeCloseTo(
      (time.toUnit(1971) - time.toUnit(1949)) / 5,
    );
    for (const year of [1949, 1950.24, 1966, 1970.999, 1971, 1971.24, 1997, endYear]) {
      expect(browse.toYear(browse.toUnit(year))).toBeCloseTo(year, 10);
    }
    expect(browse.toUnit(endYear) - browse.toUnit(1971)).toBeCloseTo(
      time.toUnit(endYear) - time.toUnit(1971),
    );
  }
});

test('gestures retain their visual travel in both directions across the 1971 boundary', () => {
  const endYear = 2026;
  const browse = browseScale(endYear);
  const time = timeScale(endYear);
  for (const year of [1966, 1970.5, 1971, 1971.5, 1997]) {
    for (const delta of [-0.01, 0.01]) {
      const focus = time.toUnit(year);
      const moved = shiftBrowseFocus(focus, delta, endYear);
      expect(browse.toUnit(time.toYear(moved)) - browse.toUnit(year)).toBeCloseTo(delta, 10);
      expect(shiftBrowseFocus(moved, -delta, endYear)).toBeCloseTo(focus, 10);
    }
  }
  expect(shiftBrowseFocus(0, -10, endYear)).toBe(0);
  expect(shiftBrowseFocus(1, 10, endYear)).toBe(1);
  expect(shiftBrowseFocus(time.toUnit(1997), 0.01, endYear)).toBeCloseTo(time.toUnit(1997) + 0.01);
});
