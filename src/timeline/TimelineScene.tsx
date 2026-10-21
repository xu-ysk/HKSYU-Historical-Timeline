import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TimelineDataset, Locale, ThemeId } from '../domain/timeline';
import { localizedYearLabel } from '../domain/timeline';
import { toCards } from '../domain/normalizeTimeline';
import { flatAlbumLayout } from './flatAlbum';
import { PhotoCard } from './PhotoCard';
import { TimelineController } from './TimelineController';
import type { DetailState } from './timelineReducer';
import '../styles/flat-album.css';

/** A single-screen, chronological procession of flat photo stacks. */
export function TimelineScene({
  data,
  endYear,
  locale,
  onProgress,
  controllerRef,
  activeTheme,
  onDetail,
}: {
  data: TimelineDataset;
  endYear: number;
  locale: Locale;
  onProgress: (year: number, eventId: string) => void;
  controllerRef: React.RefObject<TimelineController | null>;
  activeTheme: ThemeId | null;
  onDetail: (state: DetailState) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const cards = useMemo(() => toCards(data), [data]);
  const layout = useMemo(
    () => flatAlbumLayout(cards, view, activeTheme),
    [cards, view, activeTheme],
  );
  const allGroups = useMemo(() => flatAlbumLayout(cards, view, null).groups, [cards, view]);
  // Retain the original year scale for existing detail navigation and return behavior.
  const overviewYears = useMemo(
    () =>
      [
        ...new Set([...data.upperRailEvents, ...data.educationEvents].map((event) => event.year)),
      ].sort((a, b) => a - b),
    [data],
  );
  useLayoutEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new TimelineController(
        ref.current!,
        cards,
        endYear,
        overviewYears,
        onProgress,
        () => {},
        onDetail,
        activeTheme,
      );
    } else controllerRef.current.updateData(cards, endYear, overviewYears);
  }, [cards, controllerRef, endYear, overviewYears, onProgress, onDetail, activeTheme]);
  useLayoutEffect(() => {
    controllerRef.current?.setTheme(activeTheme);
  }, [activeTheme, cards, controllerRef]);
  // A React commit can reapply initial card styles. Restore the controller's
  // current poses before paint, especially after resizing and changing themes.
  useLayoutEffect(() => {
    controllerRef.current?.refresh();
  });
  useLayoutEffect(
    () => () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    },
    [controllerRef],
  );
  return (
    <div
      ref={ref}
      className="timeline-scene flat-album-scene"
      data-testid="scene"
      data-phase="idle"
      data-mode="overview"
      data-locale={locale}
      data-album-layout="serpentine"
    >
      <svg className="track-lines" width="100%" height="100%" aria-hidden="true">
        <defs>
          <marker
            id="album-path-arrow"
            markerWidth="9"
            markerHeight="9"
            refX="7"
            refY="4.5"
            orient="auto"
          >
            <path d="M1 1L7 4.5L1 8" fill="none" stroke="currentColor" strokeWidth="1" />
          </marker>
        </defs>
        <path
          data-album-path="true"
          d={layout.path}
          fill="none"
          stroke="#b7afa2"
          strokeWidth="1.2"
          markerEnd="url(#album-path-arrow)"
        />
      </svg>
      {cards.map((card) => (
        <PhotoCard
          key={card.id}
          card={card}
          locale={locale}
          revision={data.revision}
          pose={
            layout.poses.get(card.id) ?? {
              x: -1000,
              y: -1000,
              width: 1,
              height: 1,
              ry: 0,
              rz: 0,
              scale: 1,
              z: 0,
            }
          }
          onSelect={(id) => controllerRef.current?.open(id)}
        />
      ))}
      <div className="flat-album-years" aria-hidden="true">
        {allGroups.map((group) => (
          <span
            key={group.id}
            className="flat-album-year"
            data-album-group={group.id}
            data-event-id={group.event.id}
          >
            {localizedYearLabel(group.event, locale)}
          </span>
        ))}
      </div>
      <div className="detail-scrim" hidden />
    </div>
  );
}
