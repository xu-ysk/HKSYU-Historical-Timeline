import type { DisplayCard, SchoolEvent, ThemeId } from '../domain/timeline';
import type { Pose, Viewport } from './layout';

export interface AlbumGroup {
  id: string;
  event: SchoolEvent;
  cards: DisplayCard[];
  x: number;
  y: number;
  row: number;
  column: number;
  width: number;
  height: number;
}

/** The whole selected collection fits between the page controls and theme buttons. */
export function flatAlbumLayout(
  cards: readonly DisplayCard[],
  view: Viewport,
  theme: ThemeId | null,
) {
  const ordered = [...cards].sort(
    (a, b) =>
      a.event.year - b.event.year ||
      a.event.orderInYear - b.event.orderInYear ||
      a.event.id.localeCompare(b.event.id) ||
      a.slot - b.slot,
  );
  const grouped = new Map<string, DisplayCard[]>();
  for (const card of ordered) {
    if (theme && card.event.themeId !== theme) continue;
    const group = grouped.get(card.event.photoGroupId) ?? [];
    group.push(card);
    grouped.set(card.event.photoGroupId, group);
  }
  const margin = view.width <= 1320 ? 40 : 56;
  const top = 116;
  const bottom = view.height - Math.min(238, Math.max(176, view.width * 0.134));
  const area = {
    x: margin,
    y: top,
    width: view.width - margin * 2,
    height: Math.max(150, bottom - top),
  };
  const count = grouped.size;
  let columns = Math.min(4, Math.max(1, count));
  let bestWidth = 0;
  for (
    let candidate = Math.min(4, Math.max(1, count));
    candidate <= Math.min(Math.max(4, Math.floor(area.width / 68)), count);
    candidate++
  ) {
    const rows = Math.ceil(count / candidate);
    const width = Math.min(
      228,
      (area.width / candidate - 34) / 1.34,
      (area.height / rows - 34) / 1.08,
    );
    // Prefer the reference's four-column rhythm unless extra columns improve readability.
    if (width > bestWidth * 1.25) {
      columns = candidate;
      bestWidth = width;
    }
  }
  const rows = Math.max(1, Math.ceil(count / columns));
  const cellWidth = area.width / columns;
  const cellHeight = area.height / rows;
  const width = Math.max(8, Math.min(228, (cellWidth - 34) / 1.34, (cellHeight - 34) / 1.08));
  const height = width / 1.5;
  const groups: AlbumGroup[] = [...grouped].map(([id, groupCards], index) => {
    const row = Math.floor(index / columns);
    const column = row % 2 ? columns - 1 - (index % columns) : index % columns;
    return {
      id,
      event: groupCards[0].event,
      cards: groupCards,
      row,
      column,
      width,
      height,
      x: area.x + cellWidth * (column + 0.5),
      y: area.y + cellHeight * (row + 0.5) - 14,
    };
  });
  const poses = new Map<string, Pose>();
  for (const [index, group] of groups.entries()) {
    for (const [slot, card] of group.cards.entries()) {
      const offset = flatStackOffset(slot, group.cards.length, width);
      poses.set(card.id, {
        x: group.x + offset.x,
        y: group.y + offset.y,
        width,
        height,
        ry: 0,
        rz: 0,
        skew: 0,
        scale: 1,
        z: 1100 - index * 6 + slot,
      });
    }
  }
  const left = area.x + 6;
  const right = area.x + area.width - 6;
  const points: { x: number; y: number }[] = [];
  if (count) {
    points.push({ x: left, y: groups[0].y - 22 }, { x: left, y: groups[0].y });
    for (let row = 0; row < rows; row++) {
      const y = area.y + cellHeight * (row + 0.5) - 14;
      const endX = row % 2 ? left : right;
      points.push({ x: endX, y });
      if (row < rows - 1) points.push({ x: endX, y: y + cellHeight });
    }
    points.push({ x: points[points.length - 1].x, y: points[points.length - 1].y + 22 });
  }
  return {
    groups,
    poses,
    columns,
    rows,
    area,
    path: points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' '),
  };
}

/** Two photos overlap diagonally; larger groups reveal every sheet in a compact stack. */
export function flatStackOffset(slot: number, count: number, width: number) {
  const spread = width * 0.16;
  const pattern =
    count <= 2
      ? count === 1
        ? [[0, 0]]
        : [
            [-0.5, 0.5],
            [0.5, -0.5],
          ]
      : [
          [-0.65, -0.45],
          [0.65, -0.45],
          [-0.65, 0.45],
          [0.65, 0.45],
          [0, 0],
        ];
  const point = pattern[slot] ?? [0, 0];
  return { x: point[0] * spread, y: point[1] * spread };
}

/** Stagger the sheets while completing every sheet before the opening phase ends. */
export function unfoldProgress(progress: number, slot: number, count: number) {
  const delay = count > 1 ? (slot / (count - 1)) * 0.2 : 0;
  return Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
}
