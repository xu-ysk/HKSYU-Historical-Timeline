import { expect, test } from 'vitest';
import timeline from '../../public/timeline.json';
import { educationYearLabel, localizedYearLabel } from '../../src/domain/timeline';

test('English year labels translate decade suffixes without changing Chinese labels', () => {
  const first = timeline.educationEvents.find((event) => event.id === 'B01')!;
  const nineties = timeline.educationEvents.find((event) => event.id === 'B11')!;
  expect(localizedYearLabel(first, 'en')).toBe('1949–1950s');
  expect(localizedYearLabel(nineties, 'en')).toBe('1990s');
  expect(localizedYearLabel(first, 'zh-Hant')).toBe(first.yearLabel);
  expect(localizedYearLabel(first, 'zh-Hans')).toBe(first.yearLabel);
});

test('education copy shows only year numbers and preserves range separators in every language', () => {
  const first = timeline.educationEvents.find((event) => event.id === 'B01')!;
  const nineties = timeline.educationEvents.find((event) => event.id === 'B11')!;
  for (const locale of ['zh-Hant', 'zh-Hans', 'en'] as const) {
    expect(educationYearLabel(first, locale)).toBe('1949–1950');
    expect(educationYearLabel(nineties, locale)).toBe('1990');
  }
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
