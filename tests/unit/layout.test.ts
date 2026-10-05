import { test, expect } from 'vitest';
import {
  anchor,
  direction,
  cardPose,
  browseStackZ,
  upperYearOffsets,
} from '../../src/timeline/layout';
import timeline from '../../public/timeline.json';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
import { eventPositions } from '../../src/timeline/albumTrack';

test('real upper-rail years retain readable spacing through zoom, focus and resize', () => {
  const years = timeline.upperRailEvents.map((event) => event.year);
  for (const view of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ])
    for (const zoom of [0, 0.25, 0.5, 0.75, 1])
      for (const focus of [0, 0.4, 0.7, 1]) {
        const values = { focus, zoom, endYear: 2026 };
        const offsets = upperYearOffsets(years, view, values);
        expect(offsets.size).toBeGreaterThanOrEqual(10);
        if (zoom === 1) expect(offsets.size).toBe(years.length);
        expect([...offsets.values()].every((offset) => offset <= 46)).toBe(true);
        const labels = [...offsets.keys()].map((year) => {
          const p = anchor(year, 'upper', view, values);
          return { x: p.x, y: p.y - offsets.get(year)! };
        });
        labels.forEach((a, i) =>
          labels.slice(i + 1).forEach((b) => {
            expect(Math.abs(a.x - b.x) >= 36 || Math.abs(a.y - b.y) >= 20).toBe(true);
          }),
        );
      }
});
test('three lanes project each year onto exactly the same time axis at every zoom', () => {
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
      const upper = anchor(
        year,
        'upper',
        { width: 1440, height: 900 },
        { focus: 0.55, zoom, endYear: 2026 },
      );
      expect((a.x - b.x) * direction.x + (a.y - b.y) * direction.y).toBeCloseTo(0);
      expect((a.x - upper.x) * direction.x + (a.y - upper.y) * direction.y).toBeCloseTo(0);
    }
});
test('upper rail, photo rail and education rail use equal perpendicular spacing', () => {
  for (const zoom of [0, 0.5, 1])
    for (const year of [1949, 1997, 2026]) {
      const values = { focus: 0.55, zoom, endYear: 2026 };
      const upper = anchor(year, 'upper', { width: 1440, height: 900 }, values);
      const school = anchor(year, 'school', { width: 1440, height: 900 }, values);
      const education = anchor(year, 'education', { width: 1440, height: 900 }, values);
      const upperToSchool = Math.hypot(upper.x - school.x, upper.y - school.y);
      const schoolToEducation = Math.hypot(school.x - education.x, school.y - education.y);
      expect(upperToSchool).toBeCloseTo(schoolToEducation, 6);
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
test('browsing stack puts earlier years above later years along the left-down axis', () => {
  const cards = toCards(createMockTimeline(2026));
  const focused = cards.find((card) => card.event.id === 'school-1997-0')!;
  const previous = cards.find((card) => card.event.id === 'school-1996-0')!;
  const next = cards.find((card) => card.event.id === 'school-1998-0')!;
  expect(browseStackZ(previous, 1997)).toBeGreaterThan(browseStackZ(focused, 1997));
  expect(browseStackZ(focused, 1997)).toBeGreaterThan(browseStackZ(next, 1997));
  expect(browseStackZ(previous, 1997)).toBeGreaterThan(browseStackZ(next, 1997));
});

test('left and right browse stacks keep chronological order across adjacent events and years', () => {
  const data = createMockTimeline(2026);
  const cards = toCards(data);
  const positions = eventPositions(data.schoolEvents, 2026);
  for (const focus of [1953, 1997, 2025.64]) {
    const nearby = cards.filter((card) => Math.abs(positions.get(card.event.id)! - focus) < 4);
    for (let i = 1; i < nearby.length; i++) {
      const earlier = nearby[i - 1],
        later = nearby[i];
      expect(browseStackZ(earlier, focus, positions.get(earlier.event.id))).toBeGreaterThan(
        browseStackZ(later, focus, positions.get(later.event.id)),
      );
    }
  }
  for (const focus of [1949, 1997, 2026])
    for (const card of cards) {
      const z = browseStackZ(card, focus, positions.get(card.event.id));
      expect(z).toBeGreaterThanOrEqual(200);
      expect(z).toBeLessThanOrEqual(1550);
    }
});
