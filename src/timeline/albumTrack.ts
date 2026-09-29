import type { SchoolEvent } from '../domain/timeline';

/** Small, ordered slots inside a year, independent of how many photos an event has. */
export function eventPositions(events: SchoolEvent[], endYear: number) {
  const groups = new Map<number, SchoolEvent[]>();
  for (const event of events) groups.set(event.year, [...(groups.get(event.year) ?? []), event]);
  const positions = new Map<string, number>();
  for (const [year, group] of groups) {
    const ordered = [...group].sort(
      (a, b) => a.orderInYear - b.orderInYear || a.id.localeCompare(b.id),
    );
    ordered.forEach((event, index) => {
      // The final event is reachable at the end stop. All slots still round to their true year.
      const slot = year === endYear ? index - ordered.length + 1 : index;
      positions.set(event.id, year + (slot * 0.48) / ordered.length);
    });
  }
  return positions;
}
