import { test, expect } from 'vitest';
import {
  anchor,
  direction,
  cardPose,
  browseStackZ,
  yearLabelOffsets,
  overviewUnit,
  lengths,
  trackEndpoints,
  groupPhotoOffset,
  normal,
} from '../../src/timeline/layout';
import { timeScale } from '../../src/timeline/timeScale';
import { sceneConfig } from '../../src/config/scene';
import timeline from '../../public/timeline.json';
import { createMockTimeline } from '../../src/data/mockTimeline';
import { toCards } from '../../src/domain/normalizeTimeline';
import { eventPositions } from '../../src/timeline/albumTrack';

test('early browse rails fit the screenshot range without changing lane spacing', () => {
  const view = { width: 1920, height: 869 };
  const values = { focus: 0, zoom: 1, endYear: 2026 };
  const gaps = (['upper', 'school', 'education'] as const).map((lane) => {
    const first = anchor(1949, lane, view, values);
    const last = anchor(1971, lane, view, values);
    return Math.hypot(last.x - first.x, last.y - first.y);
  });
  for (const gap of gaps) {
    expect(gap).toBeGreaterThan(580);
    expect(gap).toBeLessThan(610);
  }
  expect(gaps[0]).toBeCloseTo(gaps[1], 8);
  expect(gaps[1]).toBeCloseTo(gaps[2], 8);
});

test('overview from 1971 onward and all browse geometry retain their original coordinates', () => {
  for (const view of [
    { width: 1280, height: 720 },
    { width: 1920, height: 869 },
  ]) {
    for (const endYear of [2026, 2035]) {
      const time = timeScale(endYear);
      for (const focusYear of [1971, 1982, 1997, endYear]) {
        for (const year of [1971, 1971.24, 1981, 1997, endYear]) {
          const b = lengths(view).browse * (time.toUnit(year) - time.toUnit(focusYear));
          const q = b + sceneConfig.gap * Math.tanh(b / sceneConfig.gapSoftness);
          for (const [lane, offset] of [
            ['upper', -135],
            ['school', -20],
            ['education', 95],
          ] as const) {
            const pose = anchor(year, lane, view, {
              focus: time.toUnit(focusYear),
              zoom: 1,
              endYear,
            });
            expect(pose.x).toBeCloseTo(view.width * 0.47 + direction.x * q + normal.x * offset, 8);
            expect(pose.y).toBeCloseTo(view.height * 0.49 + direction.y * q + normal.y * offset, 8);
          }
        }
      }
      for (const year of [1971, 1997, endYear]) {
        const q = lengths(view).overview * (overviewUnit(year, endYear) - 0.5);
        const pose = anchor(year, 'school', view, { focus: 0.4, zoom: 0, endYear });
        expect(pose.x).toBeCloseTo(view.width * 0.47 + direction.x * q - normal.x * 20, 8);
        expect(pose.y).toBeCloseTo(view.height * 0.49 + direction.y * q - normal.y * 20, 8);
      }
    }
  }
});

test('early overview years fit both history rails without changing their shared chronology', () => {
  const overviewYears = [...new Set(
    [...timeline.upperRailEvents, ...timeline.educationEvents].map((event) => event.year),
  )].sort((a, b) => a - b);
  for (const view of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
  ]) {
    const values = { focus: 0, zoom: 0, endYear: 2026, overviewYears };
    for (const lane of ['upper', 'education'] as const) {
      const points = [1949, 1952, 1957, 1959, 1960, 1966, 1971].map((year) => anchor(year, lane, view, values));
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(32);
        expect(point.y).toBeLessThanOrEqual(view.height - 32);
      }
      points.slice(1).forEach((point, index) => {
        expect(point.x).toBeGreaterThan(points[index].x);
        expect(point.y).toBeLessThan(points[index].y);
      });
    }
  }
});

test('every rail year retains a label through zoom, focus and resize', () => {
  const years = [
    ...new Set(
      [...timeline.upperRailEvents, ...timeline.educationEvents].map((event) => event.year),
    ),
  ].sort((a, b) => a - b);
  for (const view of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ])
    for (const zoom of [0, 0.25, 0.5, 0.75, 1])
      for (const focus of [0, 0.4, 0.7, 1]) {
        const values = { focus, zoom, endYear: 2026, overviewYears: years };
        for (const lane of ['upper', 'education'] as const) {
          const laneYears = (
            lane === 'upper' ? timeline.upperRailEvents : timeline.educationEvents
          ).map((event) => event.year);
          const labeledYears = lane === 'education' ? [...laneYears, 1980, 2026] : laneYears;
          const offsets = yearLabelOffsets(labeledYears, lane, view, values);
          expect(offsets.size).toBe(new Set(labeledYears).size);
          const labels = [...offsets]
            .map(([year, dy]) => {
              const p = anchor(year, lane, view, values);
              return {
                x: p.x,
                y: p.y + dy,
                visible: p.x >= 0 && p.x <= view.width && p.y >= 0 && p.y <= view.height,
              };
            })
            .filter((label) => label.visible);
          if (zoom === 0) {
            const visibleOffsets = [...offsets].filter(([year]) => {
              const p = anchor(year, lane, view, values);
              return p.x >= 0 && p.x <= view.width && p.y >= 0 && p.y <= view.height;
            });
            const above = visibleOffsets.filter(([, dy]) => dy < 0).length;
            expect(Math.abs(above - (visibleOffsets.length - above))).toBeLessThanOrEqual(1);
          }
          labels.forEach((a, i) =>
            labels.slice(i + 1).forEach((b) => {
              expect(Math.abs(a.x - b.x) >= 29 || Math.abs(a.y - b.y) >= 15).toBe(true);
            }),
          );
        }
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
test('overview rails reach the screen edges while photo endpoints remain visible', () => {
  for (const view of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    const values = { focus: 0, zoom: 0, endYear: 2026 };
    const photoEnd = anchor(2026, 'school', view, values);
    expect(photoEnd.y).toBeGreaterThan(30);
    expect(photoEnd.y).toBeLessThan(60);
    for (const lane of ['upper', 'school', 'education'] as const) {
      const { first, last } = trackEndpoints(lane, view, values);
      expect(first.x < 0 || first.y > view.height).toBe(true);
      expect(last.x > view.width || last.y < 0).toBe(true);
    }
  }
});
test('overview spaces every marked year across the full rail without changing browse', () => {
  expect(overviewUnit(1949, 2026)).toBe(0);
  expect(overviewUnit(1971, 2026)).toBeCloseTo(0.18);
  expect(overviewUnit(2026, 2026)).toBe(1);
  const view = { width: 1920, height: 1080 };
  const overview = { focus: 0, zoom: 0, endYear: 2026 };
  const browse = { ...overview, zoom: 1 };
  const recentGap = Math.hypot(
    anchor(2000, 'school', view, overview).x - anchor(1971, 'school', view, overview).x,
    anchor(2000, 'school', view, overview).y - anchor(1971, 'school', view, overview).y,
  );
  expect(recentGap).toBeGreaterThan(750);
  const years = [
    ...new Set(
      [...timeline.upperRailEvents, ...timeline.educationEvents].map((event) => event.year),
    ),
  ].sort((a, b) => a - b);
  const marked = { ...overview, overviewYears: years };
  const points = years.map((year) => anchor(year, 'upper', view, marked));
  const minimum = (0.78 * lengths(view).overview) / years.length;
  points.slice(1).forEach((point, index) => {
    // The early section now reserves space for the first education marker.
    // Keep its labels at least one label-width apart; later gaps stay unchanged.
    expect(Math.hypot(point.x - points[index].x, point.y - points[index].y)).toBeGreaterThanOrEqual(
      years[index] < 1971 ? 29 : minimum,
    );
  });
  expect(anchor(2000, 'upper', view, { ...browse, overviewYears: years })).toEqual(
    anchor(2000, 'upper', view, browse),
  );
});
test('upper rail, photo rail and education rail use equal perpendicular spacing', () => {
  for (const zoom of [0, 0.5, 1])
    for (const year of [1949, 1997, 2026]) {
      const values = { focus: 0.55, zoom, endYear: 2026 };
      const upper = anchor(year, 'upper', { width: 1440, height: 900 }, values);
      const school = anchor(year, 'school', { width: 1440, height: 900 }, values);
      const photoAxis = anchor(year, 'axis', { width: 1440, height: 900 }, values);
      const education = anchor(year, 'education', { width: 1440, height: 900 }, values);
      const upperToSchool = Math.hypot(upper.x - school.x, upper.y - school.y);
      const schoolToEducation = Math.hypot(school.x - education.x, school.y - education.y);
      expect(upperToSchool).toBeCloseTo(schoolToEducation, 6);
      expect(photoAxis.x).toBeCloseTo(school.x, 6);
      expect(photoAxis.y).toBeCloseTo(school.y, 6);
      expect(photoAxis.x).toBeCloseTo((upper.x + education.x) / 2, 6);
      expect(photoAxis.y).toBeCloseTo((upper.y + education.y) / 2, 6);
    }
});
test('paired photos retain their overview and browse spacing', () => {
  expect([0, 1].map((index) => groupPhotoOffset(index, 2, 0))).toEqual([-9, 9]);
  expect([0, 1].map((index) => groupPhotoOffset(index, 2, 1))).toEqual([-22, 22]);
  expect([0, 1, 2, 3, 4].map((index) => groupPhotoOffset(index, 5, 0))).toEqual([
    -16, -8, 0, 8, 16,
  ]);
  expect([0, 1, 2, 3, 4].map((index) => groupPhotoOffset(index, 5, 1))).toEqual([
    -88, -44, 0, 44, 88,
  ]);
  expect(() => groupPhotoOffset(0, 6, 0)).toThrow(/exceeds five photos/);
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
