import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import timeline from '../../public/timeline.json';

test('workbook text and chronology remain complete with real photos', () => {
  expect(timeline.schoolEvents).toHaveLength(118);
  expect(timeline.upperRailEvents).toHaveLength(28);
  expect(timeline.educationEvents).toHaveLength(20);

  const photos = timeline.schoolEvents.flatMap((event) => event.photos);
  expect(photos).toHaveLength(181);
  expect(
    photos.every((photo) => photo.kind === 'image' && photo.src.startsWith('Historical_Timeline_Images/')),
  ).toBe(true);
  expect(
    photos.every((photo) => existsSync(resolve('public', decodeURIComponent(photo.src)))),
  ).toBe(true);
  expect(new Set(photos.map((photo) => photo.id)).size).toBe(181);
  expect(timeline.schoolEvents.every((event) => event.photos.length <= 2)).toBe(true);
  expect(timeline.schoolEvents.filter((event) => event.photos.length === 0)).toHaveLength(7);
  expect(timeline.schoolEvents.filter((event) => event.photos.length === 1)).toHaveLength(41);
  expect(timeline.schoolEvents.filter((event) => event.photos.length === 2)).toHaveLength(70);
  expect(timeline.schoolEvents.find((event) => event.id === 'P52')?.photos).toHaveLength(2);
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
  expect(finalPlan?.photos).toHaveLength(1);
  expect(finalPlan?.photos.map((photo) => photo.id)).toEqual([
    'P118-photo-1',
  ]);
  expect(timeline.upperRailEvents.find((event) => event.id === 'T01')?.title.en).toContain('Studied');
  expect(timeline.educationEvents.find((event) => event.id === 'B15')?.title.en).toContain('Programmes');
});
