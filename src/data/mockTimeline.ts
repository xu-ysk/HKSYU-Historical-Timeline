import type { SchoolEvent, TimelineDataset, UpperRailEvent } from '../domain/timeline';
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
      const count =
        index === 0
          ? 0
          : index % 29 === 0
            ? 4
            : index % 23 === 0
              ? 3
              : index % 13 === 0
                ? 0
                : index % 11 === 0
                  ? 2
                  : 1;
      schoolEvents.push({
        id,
        year,
        orderInYear: order,
        themeId,
        photoGroupId: `group-${year}-${order}`,
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
  const upperYears = [
    ...new Set([1949, 1953, 1959, 1964, 1971, 1976, 1984, 1990, 1999, 2006, 2014, endYear]),
  ]
    .filter((year) => year >= 1949 && year <= endYear)
    .sort((a, b) => a - b);
  const upperRailEvents: UpperRailEvent[] = upperYears.map((year, orderInYear) => ({
    id: `upper-${year}`,
    year,
    orderInYear,
    title: {
      en:
        year < 1970
          ? `Founders' path · ${year}`
          : year < 1990
            ? `College founding step · ${year}`
            : `University chapter · ${year}`,
    },
    body: {
      en: 'A founder story placeholder for Hung Hom-lieh and Chung Chi-yung, tracing the path from personal experience to the creation of Shue Yan.',
    },
  }));
  const educationYears = [
    ...new Set([1949, 1950, ...years.filter((y) => (y - 1949) % 3 === 0), endYear]),
  ].sort((a, b) => a - b);
  return {
    schemaVersion: 1,
    revision: `demo-${endYear}-1`,
    upperRailEvents,
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
