import { expect, test } from 'vitest';
import { themeStackZ } from '../../src/timeline/layout';

test('a reduced foreground sleeve cannot cover any full-size theme sleeve', () => {
  for (let depth = 200; depth <= 1550; depth += 50)
    expect(themeStackZ(depth, 1)).toBeGreaterThan(themeStackZ(1550, 0.35));
});

test('theme layering keeps depth order and remains below the detail scrim', () => {
  for (const scale of [0.35, 0.5, 0.75, 1]) {
    expect(themeStackZ(1550, scale)).toBeLessThan(1600);
    expect(themeStackZ(1550, scale)).toBeGreaterThan(themeStackZ(1000, scale));
    expect(themeStackZ(1000, scale)).toBeGreaterThan(themeStackZ(500, scale));
  }
});
