import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TimelineDataset, Locale, ThemeId } from '../domain/timeline';
import { toCards } from '../domain/normalizeTimeline';
import { messages } from '../i18n/messages';
import { cardPose, trackEndpoints } from './layout';
import { PhotoCard } from './PhotoCard';
import { TimelineController } from './TimelineController';
import type { DetailState } from './timelineReducer';

/** The original album composition, with both history rails moved to their own page. */
export function TimelineScene({
  data,
  endYear,
  locale,
  onProgress,
  controllerRef,
  activeTheme,
  onReturnToOverview,
  homeDisabled,
  onDetail,
}: {
  data: TimelineDataset;
  endYear: number;
  locale: Locale;
  onProgress: (year: number, eventId: string) => void;
  controllerRef: React.RefObject<TimelineController | null>;
  activeTheme: ThemeId | null;
  onReturnToOverview: () => void;
  homeDisabled: boolean;
  onDetail: (state: DetailState) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const cards = useMemo(() => toCards(data), [data]);
  // Keep the original year spacing so splitting pages does not move the album.
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
      );
    } else controllerRef.current.updateData(cards, endYear, overviewYears);
  }, [cards, controllerRef, endYear, overviewYears, onProgress, onDetail]);
  useLayoutEffect(() => {
    controllerRef.current?.setTheme(activeTheme);
  }, [activeTheme, cards, controllerRef]);
  useLayoutEffect(
    () => () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    },
    [controllerRef],
  );
  const values = { focus: 0, zoom: 0, endYear, overviewYears };
  const { first, last } = trackEndpoints('axis', view, values);
  const m = messages[locale];
  return (
    <div
      ref={ref}
      className="timeline-scene"
      data-testid="scene"
      data-phase="idle"
      data-mode="overview"
      data-locale={locale}
    >
      <svg className="track-lines" width="100%" height="100%" aria-hidden="true">
        <line
          data-track="axis"
          x1={first.x}
          y1={first.y}
          x2={last.x}
          y2={last.y}
          stroke="#c4bfb5"
          strokeWidth="1"
        />
      </svg>
      {activeTheme &&
        (['upper', 'education'] as const).map((lane) => (
          <div
            key={lane}
            className={`swipe-guide swipe-guide-${lane} swipe-guide-with-home album-reset`}
            data-swipe-guide={lane}
          >
            <button
              type="button"
              className="theme-home"
              data-testid={`theme-home-${lane}`}
              aria-label={m.returnToOverview}
              title={m.returnToOverview}
              disabled={homeDisabled}
              onClick={onReturnToOverview}
            >
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M5 14.5 16 6l11 8.5M8 13.5V26h16V13.5M13 26v-8h6v8" />
              </svg>
            </button>
            <span>{m.all}</span>
          </div>
        ))}
      {cards.map((card) => (
        <PhotoCard
          key={card.id}
          card={card}
          locale={locale}
          revision={data.revision}
          pose={cardPose(card, view, values)}
          onSelect={(id) => controllerRef.current?.open(id)}
        />
      ))}
      <div className="detail-scrim" hidden />
    </div>
  );
}
