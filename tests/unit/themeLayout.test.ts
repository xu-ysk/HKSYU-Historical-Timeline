import { expect, test } from 'vitest';
import {
  browseStackZ,
  cardPose,
  chronologicalStackZ,
  groupPhotoDisplacement,
  normal,
} from '../../src/timeline/layout';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';

test('photo group offsets align with the shared timeline during theme filtering', () => {
  for (const zoom of [0, 0.5, 1])
    for (const count of [1, 2])
      for (const scale of [0.35, 1])
        for (let index = 0; index < count; index++) {
          const offset = groupPhotoDisplacement(index, count, zoom, scale, 1);
          expect(offset.x * normal.x + offset.y * normal.y).toBeCloseTo(0, 6);
        }
});

test('base chronology keeps older photos ahead of newer ones at either size', () => {
  const cards = toCards(createMockTimeline(2026));
  const older = cards.find((card) => card.event.year === 1953)!;
  const newer = cards.find((card) => card.event.year === 1997)!;
  const view = { width: 1440, height: 900 };
  for (const scale of [0.35, 1]) {
    const oldPose = cardPose(older, view, { focus: 0.5, zoom: 0, endYear: 2026 });
    const newPose = cardPose(newer, view, { focus: 0.5, zoom: 0, endYear: 2026 });
    oldPose.scale = newPose.scale = scale;
    expect(oldPose.z).toBeGreaterThan(newPose.z);
    expect(browseStackZ(older, 1997)).toBeGreaterThan(browseStackZ(newer, 1997));
  }
});

test('theme chronology stays strict through crowded years regardless of photo size', () => {
  const cards = toCards(createMockTimeline(2026));
  for (let index = 1; index < cards.length; index++) {
    expect(chronologicalStackZ(index - 1)).toBeGreaterThan(chronologicalStackZ(index));
    expect(chronologicalStackZ(index)).toBeLessThan(1200);
  }
});
