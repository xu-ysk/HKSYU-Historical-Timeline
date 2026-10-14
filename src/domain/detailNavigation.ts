import type { SchoolEvent, ThemeId } from './timeline';

/** Follow every recorded event in chronological order, including events in the same year. */
export function detailEventNeighbors(
  events: SchoolEvent[],
  selected: SchoolEvent,
  theme: ThemeId | null,
): { previous: SchoolEvent | null; next: SchoolEvent | null } {
  const eligible = events
    .filter((event) => !theme || event.themeId === theme)
    .sort((a, b) => a.year - b.year || a.orderInYear - b.orderInYear || a.id.localeCompare(b.id));
  const index = eligible.findIndex((event) => event.id === selected.id);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: eligible[index - 1] ?? null,
    next: eligible[index + 1] ?? null,
  };
}
