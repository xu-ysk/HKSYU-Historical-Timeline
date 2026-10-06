import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import timeline from '../../public/timeline.json';

test('workbook text and chronology remain complete with real photos', () => {
  expect(timeline.schoolEvents).toHaveLength(118);
  expect(timeline.upperRailEvents).toHaveLength(28);
  expect(timeline.educationEvents).toHaveLength(20);

  const photos = timeline.schoolEvents.flatMap((event) => event.photos);
  expect(photos).toHaveLength(186);
  expect(
    photos.every((photo) => photo.kind === 'image' && photo.src.startsWith('Historical_Timeline_Images/')),
  ).toBe(true);
  expect(
    photos.every((photo) => existsSync(resolve('public', decodeURIComponent(photo.src)))),
  ).toBe(true);
  expect(new Set(photos.map((photo) => photo.id)).size).toBe(186);
  expect(timeline.schoolEvents.filter((event) => event.photos.length === 3)).toHaveLength(1);
  expect(timeline.schoolEvents.filter((event) => event.photos.length === 5)).toHaveLength(1);
  expect(
    timeline.schoolEvents
      .filter((event) => !Object.keys(event.body).length)
      .map((event) => event.id),
  ).toEqual([]);
  expect(
    timeline.upperRailEvents.every((event) => event.title.en?.trim() && event.body.en?.trim()),
  ).toBe(true);
  for (const id of ['P54', 'P58', 'P59', 'P67']) {
    const body = timeline.schoolEvents.find((event) => event.id === id)?.body ?? {};
    expect(Object.keys(body)).toEqual(['en', 'zh-Hant', 'zh-Hans']);
    expect(
      Object.values(body).every((text) => typeof text === 'string' && text.trim().length > 0),
    ).toBe(true);
  }
  expect(timeline.schoolEvents.find((event) => event.id === 'P02')?.yearLabel).toBe('1971–1972');
  const finalPlan = timeline.schoolEvents.find((event) => event.id === 'P118');
  expect(finalPlan?.year).toBe(2026);
  expect(finalPlan?.photos).toHaveLength(5);
  expect(finalPlan?.photos.map((photo) => photo.id)).toEqual([
    'P118-photo-1',
    'P118-photo-2',
    'P118-photo-3',
    'P118-photo-4',
    'P118-photo-5',
  ]);
});
