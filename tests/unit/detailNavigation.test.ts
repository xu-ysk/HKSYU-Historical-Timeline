import { expect, test } from 'vitest';
import { detailYearNeighbors } from '../../src/domain/detailNavigation';
import type { SchoolEvent, TimelineDataset } from '../../src/domain/timeline';
import timeline from '../../public/timeline.json';

const events = (timeline as TimelineDataset).schoolEvents;
const event = (id: string) => events.find((item) => item.id === id)!;

test('first and last photographed years expose only the available direction', () => {
  expect(detailYearNeighbors(events, event('P01'), null)).toEqual({
    previous: null,
    next: event('P03'),
  });
  expect(detailYearNeighbors(events, event('P118'), null)).toEqual({
    previous: event('P108'),
    next: null,
  });
});

test('navigation skips records in the same year and follows the selected theme', () => {
  expect(detailYearNeighbors(events, event('P02'), 'D')).toEqual({
    previous: null,
    next: event('P04'),
  });
  expect(detailYearNeighbors(events, event('P01'), 'A').next).toBe(event('P06'));
  expect(detailYearNeighbors(events, event('P108'), 'E').next).toBe(event('P114'));
});

test('a year with only text remains reachable when it has no photos', () => {
  const sameYear: SchoolEvent[] = [
    { ...event('P01'), id: 'first', year: 2000, orderInYear: 0 },
    { ...event('P03'), id: 'middle', year: 2001, orderInYear: 0, photos: [] },
    { ...event('P118'), id: 'last', year: 2002, orderInYear: 0 },
  ];
  expect(detailYearNeighbors(sameYear, sameYear[0], null).next?.id).toBe('middle');
});
