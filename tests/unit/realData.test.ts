import { expect, test } from 'vitest';
import timeline from '../../public/timeline.json';

test('imported workbook snapshot contains the complete real-data contract', () => {
  expect(timeline.schoolEvents).toHaveLength(118);
  expect(timeline.upperRailEvents).toHaveLength(28);
  expect(timeline.educationEvents).toHaveLength(20);

  const photos = timeline.schoolEvents.flatMap((event) => event.photos);
  expect(photos).toHaveLength(185);
  expect(photos.every((photo) => photo.kind === 'image' && photo.src.startsWith('/'))).toBe(true);
  expect(new Set(photos.map((photo) => photo.src)).size).toBe(185);
  expect(timeline.schoolEvents.filter((event) => event.photos.length === 3)).toHaveLength(1);
  expect(timeline.schoolEvents.filter((event) => event.photos.length === 4)).toHaveLength(1);
  expect(
    timeline.schoolEvents.filter((event) => !Object.keys(event.body).length).map((event) => event.id),
  ).toEqual(['P54', 'P58', 'P59', 'P67']);
  expect(timeline.schoolEvents.find((event) => event.id === 'P02')?.yearLabel).toBe('1971–1972');
  expect(timeline.schoolEvents.find((event) => event.id === 'P118')?.year).toBe(2026);
});
