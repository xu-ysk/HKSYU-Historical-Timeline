import type { SchoolEvent, TimelineDataset } from '../domain/timeline';
import { themeIds } from '../config/themes';
export function createMockTimeline(endYear: number): TimelineDataset {
  const years = Array.from({ length: endYear - 1948 }, (_, i) => i + 1949).filter(
    (y) => y !== 1950 && y !== 1952,
  );
  const schoolEvents: SchoolEvent[] = [];
  years.forEach((year, yi) => {
    for (let order = 0; order < 4; order++) {
      const index = yi * 4 + order,
        themeId = themeIds[index % 5],
        id = `school-${year}-${order}`;
      const count = index % 13 === 0 ? 0 : index % 11 === 0 ? 2 : 1;
      schoolEvents.push({
        id,
        year,
        orderInYear: order,
        themeId,
        title: { en: `Event ${themeId} · ${String(index + 1).padStart(3, '0')}` },
        body: {
          en:
            count === 0
              ? 'Some moments live in words. This blank photograph holds a place for a story yet to be told. This is sample content for exploring the timeline.'
              : 'A moment in a continuing story. This sample entry marks a place in time, connecting the life of a university with the city around it. Photographs and historical accounts will be added to this collection.' +
                (index === 11
                  ? '\n\n' +
                    'Every photograph offers another perspective. The complete account remains readable as the window changes size. '.repeat(
                      28,
                    )
                  : ''),
        },
        photos: Array.from({ length: count }, (_, p) => ({
          id: `${id}-photo-${p}`,
          kind: 'placeholder',
          width: p === 1 && index % 2 ? 800 : 1200,
          height: 800 + (p === 1 && index % 2 ? 400 : 0),
          alt: { en: `${themeId} ${p + 1} — sample photograph` },
        })),
      });
    }
  });
  const educationYears = [
    ...new Set([1949, 1950, ...years.filter((y) => (y - 1949) % 3 === 0), endYear]),
  ].sort((a, b) => a - b);
  return {
    schemaVersion: 1,
    revision: `demo-${endYear}-1`,
    schoolEvents,
    educationEvents: educationYears.map((year) => ({
      id: `education-${year}`,
      year,
      orderInYear: 0,
      title: { en: `Education in ${year}` },
      body: {
        en: 'A changing city. An evolving education. This sample milestone shares its place in time with the university archive.',
      },
    })),
  };
}
