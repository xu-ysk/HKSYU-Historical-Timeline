import { expect, test } from 'vitest';
import timeline from '../../public/timeline.json';
import { localizedYearLabel } from '../../src/domain/timeline';

test('English year labels translate decade suffixes without changing Chinese labels', () => {
  const first = timeline.educationEvents.find((event) => event.id === 'B01')!;
  const nineties = timeline.educationEvents.find((event) => event.id === 'B11')!;
  expect(localizedYearLabel(first, 'en')).toBe('1949–1950s');
  expect(localizedYearLabel(nineties, 'en')).toBe('1990s');
  expect(localizedYearLabel(first, 'zh-Hant')).toBe(first.yearLabel);
  expect(localizedYearLabel(first, 'zh-Hans')).toBe(first.yearLabel);
});

test('every imported event has a Chinese-free English year label', () => {
  for (const event of [
    ...timeline.upperRailEvents,
    ...timeline.schoolEvents,
    ...timeline.educationEvents,
  ]) {
    expect(localizedYearLabel(event, 'en')).not.toMatch(/[\u3400-\u9fff]/);
  }
});
