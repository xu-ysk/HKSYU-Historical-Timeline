import { test, expect } from 'vitest';
import { detailReducer, initialDetail } from '../../src/timeline/timelineReducer';
import { detailPhotoRects, detailRegions } from '../../src/timeline/detailLayout';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
import type { TimelineDataset } from '../../src/domain/timeline';
import timeline from '../../public/timeline.json';
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
        regions = detailRegions(view, true, group.length);
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

test('photo pairs remain centered and non-overlapping inside the photo region', () => {
  const data = createMockTimeline(2026),
    cards = toCards(data),
    view = { width: 1440, height: 900 },
    regions = detailRegions(view, true, 2);
  for (const event of data.schoolEvents.filter((item) => item.photos.length === 2).slice(0, 8)) {
    const group = cards.filter((card) => card.event.id === event.id);
    const rects = detailPhotoRects(group, view);
    expect(rects).toHaveLength(2);
    const top = Math.min(...rects.map((rect) => rect.y));
    const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
    expect((top + bottom) / 2).toBeCloseTo(view.height / 2);
    expect(new Set(rects.map((rect) => `${Math.round(rect.x)}:${Math.round(rect.y)}`)).size).toBe(
      2,
    );
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
  const pair = cards.filter((card) => card.event.id === data.schoolEvents.find((item) => item.photos.length === 2)!.id);
  expect(() => detailPhotoRects([...pair, pair[0], pair[0], pair[0], pair[0]], view)).toThrow(
    /exceeds five photos/,
  );
});

test('real single and paired photos fill more of the detail view without exceeding source pixels', () => {
  const cards = toCards(timeline as TimelineDataset);
  const view = { width: 1900, height: 850 };
  const single = cards.filter((card) => card.event.id === 'P03');
  const pair = cards.filter((card) => card.event.id === 'P04');
  const oldRegion = detailRegions(view).photos;
  const singleRect = detailPhotoRects(single, view)[0];
  const pairRects = detailPhotoRects(pair, view);
  expect(singleRect.height).toBeGreaterThan(oldRegion.height * 1.3);
  expect(singleRect.height).toBeLessThanOrEqual(single[0].photo!.height);
  expect(pairRects.every((rect) => rect.width > (oldRegion.width - 20) / 2)).toBe(true);
  expect(pairRects.every((rect) => rect.x + rect.width < detailRegions(view).text.x)).toBe(true);
  expect(detailPhotoRects(single, view, true, 2)[0].height).toBeCloseTo(oldRegion.height);
});

test('P118 five photos form a non-overlapping top-three bottom-two detail layout', () => {
  const cards = toCards(timeline as TimelineDataset).filter((card) => card.event.id === 'P118');
  expect(cards).toHaveLength(5);
  for (const view of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1832, height: 766 },
    { width: 1920, height: 1080 },
  ]) {
    const regions = detailRegions(view, true, 5);
    const box = regions.photos;
    const rects = detailPhotoRects(cards, view);
    expect(rects).toHaveLength(5);
    expect(box.height).toBe(Math.max(180, view.height - 300));
    expect(box.width).toBeCloseTo(view.width * 0.65 - 65);
    if (view.width === 1832) expect(Math.min(...rects.map((rect) => rect.width))).toBeGreaterThan(300);
    expect(Math.max(...rects.slice(0, 3).map((rect) => rect.y + rect.height))).toBeLessThan(
      Math.min(...rects.slice(3).map((rect) => rect.y)),
    );
    for (const [index, rect] of rects.entries()) {
      expect(rect.width / rect.height).toBeCloseTo(cards[index].photo!.width / cards[index].photo!.height);
      expect(rect.x).toBeGreaterThanOrEqual(box.x);
      expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width + 0.001);
      expect(rect.x + rect.width).toBeLessThan(regions.text.x);
      expect(rect.y).toBeGreaterThanOrEqual(box.y);
      expect(rect.y + rect.height).toBeLessThanOrEqual(box.y + box.height + 0.001);
      for (const other of rects.slice(index + 1)) {
        const overlap =
          Math.max(0, Math.min(rect.x + rect.width, other.x + other.width) - Math.max(rect.x, other.x)) *
          Math.max(0, Math.min(rect.y + rect.height, other.y + other.height) - Math.max(rect.y, other.y));
        expect(overlap).toBeLessThan(0.01);
      }
    }
  }
});

test('photo-only details use a centered full-width photo region', () => {
  const view = { width: 1440, height: 900 },
    regions = detailRegions(view, false);
  expect(regions.photos.x).toBe(65);
  expect(regions.photos.width).toBe(view.width - 130);
  expect(regions.photos.y).toBe(125);
  expect(regions.photos.height).toBe(view.height - 250);
  expect(regions.text.x).toBeGreaterThan(view.width);
});
