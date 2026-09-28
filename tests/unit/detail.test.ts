import { test, expect } from 'vitest';
import { detailReducer, initialDetail } from '../../src/timeline/timelineReducer';
import { detailPhotoRects, detailRegions } from '../../src/timeline/detailLayout';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
test('closing during opening invalidates old callbacks and repeated clicks', () => {
  const opening = detailReducer(initialDetail, { type: 'open', eventId: 'A' });
  expect(detailReducer(opening, { type: 'open', eventId: 'B' })).toBe(opening);
  const closing = detailReducer(opening, { type: 'close' });
  expect(detailReducer(closing, { type: 'opened', token: opening.token })).toBe(closing);
  expect(detailReducer(closing, { type: 'close' })).toBe(closing);
  expect(detailReducer(closing, { type: 'closed', token: closing.token })).toEqual({
    ...initialDetail,
    token: closing.token,
  });
});
test('single, blank and both pair orientations preserve aspect ratios and fit left of the text', () => {
  const cards = toCards(createMockTimeline(2026));
  for (const view of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ])
    for (const event of createMockTimeline(2026).schoolEvents) {
      const group = cards.filter((c) => c.event.id === event.id),
        rects = detailPhotoRects(group, view),
        regions = detailRegions(view);
      expect(rects).toHaveLength(Math.max(1, event.photos.length));
      rects.forEach((r, i) => {
        expect(r.width / r.height).toBeCloseTo(
          group[i].photo ? group[i].photo!.width / group[i].photo!.height : 1.5,
        );
        expect(r.x + r.width).toBeLessThan(regions.text.x);
        expect(r.y).toBeGreaterThanOrEqual(regions.photos.y);
        expect(r.y + r.height).toBeLessThanOrEqual(
          regions.photos.y + regions.photos.height + 0.001,
        );
      });
      if (rects.length === 2)
        expect(
          rects[0].x + rects[0].width <= rects[1].x || rects[0].y + rects[0].height <= rects[1].y,
        ).toBe(true);
    }
});
