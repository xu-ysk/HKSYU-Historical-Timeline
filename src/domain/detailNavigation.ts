import type { SchoolEvent, ThemeId } from './timeline';

/** Move between recorded years, preferring a photographed event within each year. */
export function detailYearNeighbors(
  events: SchoolEvent[],
  selected: SchoolEvent,
  theme: ThemeId | null,
): { previous: SchoolEvent | null; next: SchoolEvent | null } {
  const eligible = events
    .filter((event) => !theme || event.themeId === theme)
    .sort((a, b) => a.year - b.year || a.orderInYear - b.orderInYear || a.id.localeCompare(b.id));
  const earlier = eligible.filter((event) => event.year < selected.year);
  const earlierYear = earlier.length ? earlier[earlier.length - 1].year : undefined;
  const laterYear = eligible.find((event) => event.year > selected.year)?.year;
  const inYear = (year: number | undefined) =>
    eligible.find((event) => event.year === year && event.photos.some((photo) => photo.kind === 'image')) ??
    eligible.find((event) => event.year === year && event.photos.some((photo) => photo.kind === 'blank')) ??
    eligible.find((event) => event.year === year) ??
    null;
  return {
    previous: inYear(earlierYear),
    next: inYear(laterYear),
  };
}
