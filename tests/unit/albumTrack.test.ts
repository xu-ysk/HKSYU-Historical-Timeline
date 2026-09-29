import { expect, test } from 'vitest';
import { eventPositions } from '../../src/timeline/albumTrack';
import { cardPose, direction } from '../../src/timeline/layout';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
import { timeScale } from '../../src/timeline/timeScale';

const data = createMockTimeline(2026);
const positions = eventPositions(data.schoolEvents, 2026);
const cards = toCards(data);
const view = { width: 1440, height: 900 };

test('every same-year event has a reachable chronological slot, including the final year', () => {
  const values = data.schoolEvents.map((event) => positions.get(event.id)!);
  expect(values[0]).toBe(1949);
  expect(values.at(-1)).toBe(2026);
  values.forEach((value, index) => {
    expect(Math.round(value)).toBe(data.schoolEvents[index].year);
    if (index > 0) expect(value).toBeGreaterThan(values[index - 1]);
  });
  expect(positions.get('school-1997-0')).toBe(1997);
});

test('the complete photo procession keeps its event order through the focus opening', () => {
  for (let year = 1996.5; year <= 1998; year += 0.015) {
    const poses = data.schoolEvents
      .filter((event) => event.year >= 1995 && event.year <= 1999)
      .map((event) =>
        cardPose(
          cards.find((card) => card.event.id === event.id)!,
          view,
          { focus: timeScale(2026).toUnit(year), zoom: 1, endYear: 2026 },
          positions.get(event.id),
        ),
      );
    for (let i = 1; i < poses.length; i++) {
      expect(poses[i].x).toBeGreaterThan(poses[i - 1].x);
      expect(poses[i].y).toBeLessThan(poses[i - 1].y);
      expect(poses[i].ry).toBe(poses[0].ry);
      expect(poses[i].rz).toBe(poses[0].rz);
    }
  }
});

test('a card moves in only one direction during a continuous sweep and leaves a central gap', () => {
  const card = cards.find((item) => item.event.id === 'school-1997-0')!;
  let previous = Infinity;
  for (let year = 1996; year < 1998; year += 0.005) {
    const pose = cardPose(
      card,
      view,
      { focus: timeScale(2026).toUnit(year), zoom: 1, endYear: 2026 },
      1997,
    );
    const along = pose.x * direction.x + pose.y * direction.y;
    expect(along).toBeLessThan(previous);
    previous = along;
  }
  const values = { focus: timeScale(2026).toUnit(1997), zoom: 1, endYear: 2026 };
  const next = cards.find((item) => item.event.id === 'school-1997-1')!;
  const a = cardPose(card, view, values, positions.get(card.event.id));
  const b = cardPose(next, view, values, positions.get(next.event.id));
  expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(250);
});
