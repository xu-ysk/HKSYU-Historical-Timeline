import { expect, test } from 'vitest';
import timeline from '../../public/timeline.json';
import type { TimelineDataset } from '../../src/domain/timeline';
import { toCards } from '../../src/domain/normalizeTimeline';
import { flatAlbumLayout, flatStackOffset, unfoldProgress } from '../../src/timeline/flatAlbum';

const cards = toCards(timeline as TimelineDataset);

test('campus development uses chronological event stacks and the reference four-column path', () => {
  const layout = flatAlbumLayout(cards, { width: 1280, height: 720 }, 'A');
  const expected = (timeline as TimelineDataset).schoolEvents.filter(
    (event) => event.themeId === 'A',
  );
  expect(layout.groups.map((group) => group.event.id)).toEqual(expected.map((event) => event.id));
  expect(layout.columns).toBe(4);
  expect(layout.rows).toBe(3);
  for (let index = 1; index < layout.groups.length; index++) {
    const previous = layout.groups[index - 1],
      current = layout.groups[index];
    expect(current.event.year).toBeGreaterThanOrEqual(previous.event.year);
    if (current.row === previous.row)
      expect(Math.sign(current.x - previous.x)).toBe(current.row % 2 ? -1 : 1);
    else {
      expect(current.y).toBeGreaterThan(previous.y);
      expect(current.x).toBe(previous.x);
    }
  }
});

for (const view of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`every photo, stack and year fits one screen for every theme at ${view.width}`, () => {
    for (const theme of ['A', 'B', 'C', 'D', 'E', null] as const) {
      const layout = flatAlbumLayout(cards, view, theme);
      const expected = cards.filter((card) => !theme || card.event.themeId === theme);
      expect(layout.poses.size).toBe(expected.length);
      for (const pose of layout.poses.values()) {
        expect(pose.x - pose.width / 2).toBeGreaterThanOrEqual(layout.area.x);
        expect(pose.x + pose.width / 2).toBeLessThanOrEqual(layout.area.x + layout.area.width);
        expect(pose.y - pose.height / 2).toBeGreaterThanOrEqual(layout.area.y);
        expect(pose.y + pose.height / 2).toBeLessThanOrEqual(layout.area.y + layout.area.height);
        expect([pose.ry, pose.rz, pose.skew]).toEqual([0, 0, 0]);
        expect(pose.scale).toBe(1);
      }
      for (const group of layout.groups) {
        const labelBottom = group.y + group.height / 2 + group.width * 0.08 + 12 + 18;
        expect(labelBottom).toBeLessThanOrEqual(layout.area.y + layout.area.height);
      }
    }
  });
}

test('single, double and up to five photos have unique planar stack positions', () => {
  for (const count of [1, 2, 3, 4, 5]) {
    const points = Array.from({ length: count }, (_, slot) => flatStackOffset(slot, count, 150));
    expect(new Set(points.map((point) => `${point.x}:${point.y}`)).size).toBe(count);
    expect(points.every((point) => Math.abs(point.x) <= 16 && Math.abs(point.y) <= 13)).toBe(true);
  }
  expect(flatStackOffset(0, 1, 150)).toEqual({ x: 0, y: 0 });
});

test('unfolding starts at the stack, staggers sheets and completes the entire group', () => {
  for (const count of [1, 2, 3, 4, 5]) {
    const halfway = Array.from({ length: count }, (_, slot) => unfoldProgress(0.5, slot, count));
    for (let slot = 0; slot < count; slot++) {
      expect(unfoldProgress(0, slot, count)).toBe(0);
      expect(unfoldProgress(1, slot, count)).toBe(1);
      if (slot) expect(halfway[slot]).toBeLessThan(halfway[slot - 1]);
    }
  }
});
