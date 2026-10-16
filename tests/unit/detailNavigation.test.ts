import { expect, test } from 'vitest';
import { detailEventNeighbors } from '../../src/domain/detailNavigation';
import type { SchoolEvent, TimelineDataset } from '../../src/domain/timeline';
import timeline from '../../public/timeline.json';

const events = (timeline as TimelineDataset).schoolEvents;
const event = (id: string) => events.find((item) => item.id === id)!;

test('first and last events expose only the available direction', () => {
  expect(detailEventNeighbors(events, event('P01'), null)).toEqual({
    previous: null,
    next: event('P02'),
  });
  expect(detailEventNeighbors(events, event('P118'), null)).toEqual({
    previous: event('P117'),
    next: null,
  });
});

test('navigation includes records in the same year and follows the selected theme', () => {
  expect(detailEventNeighbors(events, event('P02'), null)).toEqual({
    previous: event('P01'),
    next: event('P03'),
  });
  expect(detailEventNeighbors(events, event('P02'), 'D')).toEqual({
    previous: null,
    next: event('P04'),
  });
  expect(detailEventNeighbors(events, event('P01'), 'A').next).toBe(event('P06'));
  expect(detailEventNeighbors(events, event('P108'), 'E').next).toBe(event('P109'));
});

test('an event with only text remains reachable when it has no photos', () => {
  const sameYear: SchoolEvent[] = [
    { ...event('P01'), id: 'first', year: 2000, orderInYear: 0 },
    { ...event('P03'), id: 'middle', year: 2001, orderInYear: 0, photos: [] },
    { ...event('P118'), id: 'last', year: 2002, orderInYear: 0 },
  ];
  expect(detailEventNeighbors(sameYear, sameYear[0], null).next?.id).toBe('middle');
});

test('every recorded event is reachable in both directions', () => {
  const ordered = [...events].sort((a, b) =>
    a.year - b.year || a.orderInYear - b.orderInYear || a.id.localeCompare(b.id),
  );
  for (const [index, current] of ordered.entries()) {
    expect(detailEventNeighbors(events, current, null)).toEqual({
      previous: ordered[index - 1] ?? null,
      next: ordered[index + 1] ?? null,
    });
  }
});
