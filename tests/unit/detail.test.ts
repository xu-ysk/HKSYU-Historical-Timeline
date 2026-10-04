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

test('three and four photo groups use a complete non-overlapping collage inside the photo region', () => {
  const data = createMockTimeline(2026),
    cards = toCards(data),
    view = { width: 1440, height: 900 },
    regions = detailRegions(view);
  for (const count of [3, 4]) {
    const event = data.schoolEvents.find((item) => item.photos.length === count)!;
    const group = cards.filter((card) => card.event.id === event.id);
    const rects = detailPhotoRects(group, view);
    expect(rects).toHaveLength(count);
    expect(new Set(rects.map((rect) => `${Math.round(rect.x)}:${Math.round(rect.y)}`)).size).toBe(
      count,
    );
    expect(new Set(rects.map((rect) => Math.round(rect.y))).size).toBeGreaterThan(1);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(regions.photos.x - 0.001);
      expect(rect.y).toBeGreaterThanOrEqual(regions.photos.y - 0.001);
      expect(rect.x + rect.width).toBeLessThanOrEqual(
        regions.photos.x + regions.photos.width + 0.001,
      );
      expect(rect.y + rect.height).toBeLessThanOrEqual(
        regions.photos.y + regions.photos.height + 0.001,
      );
      expect(rect.x + rect.width).toBeLessThanOrEqual(regions.text.x);
    }
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i],
          b = rects[j],
          overlap =
            Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
            Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        expect(overlap).toBeLessThan(0.01);
      }
  }
});
