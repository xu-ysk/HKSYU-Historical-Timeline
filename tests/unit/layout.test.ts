import { test, expect } from 'vitest';
import { anchor, direction, cardPose } from '../../src/timeline/layout';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
test('both lanes project each year onto exactly the same time axis at every zoom', () => {
  for (const zoom of [0, 0.25, 0.5, 1])
    for (const year of [1949, 1952, 1997, 2026]) {
      const a = anchor(
        year,
        'school',
        { width: 1440, height: 900 },
        { focus: 0.55, zoom, endYear: 2026 },
      );
      const b = anchor(
        year,
        'education',
        { width: 1440, height: 900 },
        { focus: 0.55, zoom, endYear: 2026 },
      );
      expect((a.x - b.x) * direction.x + (a.y - b.y) * direction.y).toBeCloseTo(0);
    }
});
test('overview cards remain inside desktop windows including portrait cards', () => {
  for (const view of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ])
    for (const card of toCards(createMockTimeline(2026))) {
      const p = cardPose(card, view, { focus: 0, zoom: 0, endYear: 2026 });
      expect(p.x).toBeGreaterThan(p.width / 2);
      expect(p.x).toBeLessThan(view.width - p.width / 2);
      expect(p.y).toBeGreaterThan(p.height / 2);
      expect(p.y).toBeLessThan(view.height - p.height / 2);
    }
});
