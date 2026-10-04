import type { TimelineDataset, DisplayCard } from './timeline';
import { themes } from '../config/themes';
export function normalizeTimeline(data: TimelineDataset, endYear: number): TimelineDataset {
  const ids = new Set<string>();
  if (data.schemaVersion !== 1) throw new Error('Unsupported timeline schema');
  for (const event of [...data.upperRailEvents, ...data.schoolEvents, ...data.educationEvents]) {
    if (!event.id || ids.has(event.id))
      throw new Error(`Duplicate or missing event ID: ${event.id}`);
    ids.add(event.id);
    if (!Number.isInteger(event.year) || event.year < 1949 || event.year > endYear)
      throw new Error(`Invalid year: ${event.id}`);
    if (!Number.isInteger(event.orderInYear) || event.orderInYear < 0)
      throw new Error(`Invalid event order: ${event.id}`);
  }
  const photoIds = new Set<string>();
  const photoGroupSizes = new Map<string, number>();
  for (const event of data.schoolEvents) {
    if (!(event.themeId in themes)) throw new Error(`Invalid theme: ${event.id}`);
    if (!event.photoGroupId) throw new Error(`Missing photo group ID: ${event.id}`);
    photoGroupSizes.set(
      event.photoGroupId,
      (photoGroupSizes.get(event.photoGroupId) ?? 0) + Math.max(1, event.photos.length),
    );
    for (const photo of event.photos) {
      if (!photo.id || photoIds.has(photo.id)) throw new Error(`Duplicate photo ID: ${photo.id}`);
      photoIds.add(photo.id);
      if (!(photo.width > 0 && photo.height > 0 && Number.isFinite(photo.width + photo.height)))
        throw new Error(`Invalid photo size: ${photo.id}`);
      if (photo.kind === 'image' && !photo.src)
        throw new Error(`Missing photo source: ${photo.id}`);
    }
  }
  for (const [groupId, size] of photoGroupSizes)
    if (size > 4) throw new Error(`Photo group exceeds four photos: ${groupId}`);
  const compare = (a: { year: number; orderInYear: number; id: string }, b: typeof a) =>
    a.year - b.year || a.orderInYear - b.orderInYear || a.id.localeCompare(b.id);
  return {
    ...data,
    upperRailEvents: [...data.upperRailEvents].sort(compare),
    schoolEvents: [...data.schoolEvents].sort(compare),
    educationEvents: [...data.educationEvents].sort(compare),
  };
}
export function toCards(data: TimelineDataset): DisplayCard[] {
  const cards = data.schoolEvents.flatMap((event) =>
    (event.photos.length ? event.photos : [null]).map((photo) => ({
      id: `${event.id}/${photo?.id ?? 'text-only'}`,
      event,
      photo,
      slot: 0,
      countInYear: 0,
    })),
  );
  const groups = new Map<number, DisplayCard[]>();
  cards.forEach((card) =>
    groups.set(card.event.year, [...(groups.get(card.event.year) ?? []), card]),
  );
  groups.forEach((group) =>
    group.forEach((card, slot) => {
      card.slot = slot;
      card.countInYear = group.length;
    }),
  );
  return cards;
}
