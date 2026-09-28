import { describe, expect, test } from 'vitest';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { normalizeTimeline, toCards } from '../../src/domain/normalizeTimeline';
import { getCurrentYear, untilNextHongKongDay } from '../../src/domain/currentYear';
import { rebaseFocus, timeScale } from '../../src/timeline/timeScale';
import { localized } from '../../src/domain/timeline';
describe('time and content contracts', () => {
  test('1949, empty years, middle and end retain a shared linear scale', () => {
    const scale = timeScale(2026);
    expect(scale.toUnit(1949)).toBe(0);
    expect(scale.toUnit(2026)).toBe(1);
    for (const year of [1950, 1952, 1971, 2006])
      expect(scale.toYear(scale.toUnit(year))).toBeCloseTo(year);
    expect(scale.toUnit(1952) - scale.toUnit(1951)).toBeCloseTo(
      scale.toUnit(2007) - scale.toUnit(2006),
    );
  });
  test('Hong Kong new year extends the range without moving the focus year', () => {
    expect(getCurrentYear(new Date('2026-12-31T15:59:59Z'))).toBe(2026);
    expect(getCurrentYear(new Date('2026-12-31T16:00:00Z'))).toBe(2027);
    expect(
      timeScale(2027).toYear(rebaseFocus(timeScale(2026).toUnit(1997), 2026, 2027)),
    ).toBeCloseTo(1997);
    expect(untilNextHongKongDay(Date.parse('2026-12-31T15:59:59Z'))).toBe(1100);
  });
  test('deterministic fixtures cover themes, missing images, pairs and independent same-year events', () => {
    const data = normalizeTimeline(createMockTimeline(2026), 2026);
    expect(data).toEqual(createMockTimeline(2026));
    expect(data.schoolEvents.length).toBeGreaterThanOrEqual(240);
    expect(new Set(data.schoolEvents.map((e) => e.themeId)).size).toBe(5);
    expect(data.schoolEvents.filter((e) => !e.photos.length).length).toBeGreaterThanOrEqual(6);
    expect(data.schoolEvents.filter((e) => e.photos.length === 2).length).toBeGreaterThanOrEqual(6);
    const cards = toCards(data),
      empty = data.schoolEvents[0],
      pair = data.schoolEvents.find((e) => e.photos.length === 2)!;
    expect(cards.filter((c) => c.event.id === empty.id)).toHaveLength(1);
    expect(empty.photos).toHaveLength(0);
    expect(cards.filter((c) => c.event.id === pair.id)).toHaveLength(2);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    expect(data.schoolEvents.some((e) => e.year === 1950)).toBe(false);
    expect(data.educationEvents.some((e) => e.year === 1950)).toBe(true);
    expect([...data.schoolEvents, ...data.educationEvents].some((e) => e.year === 1952)).toBe(
      false,
    );
  });
  test('invalid data fails explicitly and sorting does not mutate the provider result', () => {
    const data = createMockTimeline(2026);
    data.schoolEvents.reverse();
    expect(normalizeTimeline(data, 2026).schoolEvents[0].year).toBe(1949);
    expect(data.schoolEvents[0].year).toBe(2026);
    data.schoolEvents[0].id = data.schoolEvents[1].id;
    expect(() => normalizeTimeline(data, 2026)).toThrow(/ID/);
    const bad = createMockTimeline(2026);
    bad.schoolEvents[1].photos[0].width = 0;
    expect(() => normalizeTimeline(bad, 2026)).toThrow(/size/);
  });
  test('English sample copy is available in all interface languages', () => {
    expect(localized({ en: 'Sample' }, 'zh-Hant')).toBe('Sample');
    expect(localized({ en: 'Sample', 'zh-Hans': '示例' }, 'zh-Hans')).toBe('示例');
  });
});
