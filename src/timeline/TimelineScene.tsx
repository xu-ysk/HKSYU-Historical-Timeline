import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TimelineDataset, Locale } from '../domain/timeline';
import { localized } from '../domain/timeline';
import { toCards } from '../domain/normalizeTimeline';
import { messages } from '../i18n/messages';
import { anchor, cardPose } from './layout';
import { PhotoCard } from './PhotoCard';
import { TimelineController } from './TimelineController';
import type { DetailState } from './timelineReducer';
export function TimelineScene({
  data,
  endYear,
  locale,
  mode,
  onMode,
  onProgress,
  controllerRef,
  focusYear,
  onDetail,
}: {
  data: TimelineDataset;
  endYear: number;
  locale: Locale;
  mode: 'overview' | 'browse';
  onMode: (mode: 'overview' | 'browse') => void;
  onProgress: (year: number, eventId: string) => void;
  controllerRef: React.RefObject<TimelineController | null>;
  focusYear: number;
  onDetail: (state: DetailState) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const cards = useMemo(() => toCards(data), [data]);
  useLayoutEffect(() => {
    if (!controllerRef.current)
      controllerRef.current = new TimelineController(
        ref.current!,
        cards,
        endYear,
        onProgress,
        onMode,
        onDetail,
      );
    else controllerRef.current.updateData(cards, endYear);
  }, [cards, controllerRef, endYear, onMode, onProgress, onDetail]);
  useLayoutEffect(
    () => () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    },
    [controllerRef],
  );
  const values = { focus: 0, zoom: 0, endYear },
    m = messages[locale];
  const education = data.educationEvents.reduce<(typeof data.educationEvents)[number] | undefined>(
    (best, event) =>
      !best || Math.abs(event.year - focusYear) < Math.abs(best.year - focusYear) ? event : best,
    undefined,
  );
  return (
    <div
      ref={ref}
      className="timeline-scene"
      data-testid="scene"
      data-phase="idle"
      data-mode={mode}
    >
      <div className="school-label">
        <span className="lane-number">01 /</span>
        <span>{m.school}</span>
        <span className="label-rule" />
      </div>
      <svg className="track-lines" width="100%" height="100%" aria-hidden="true">
        {(['axis', 'education'] as const).map((lane) => {
          const a = anchor(1949, lane, view, values),
            b = anchor(endYear, lane, view, values);
          return (
            <line
              key={lane}
              data-track={lane}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={lane === 'axis' ? '#c4bfb5' : '#ded9d1'}
              strokeWidth="1"
            />
          );
        })}
      </svg>
      {cards.map((card) => (
        <PhotoCard
          key={card.id}
          card={card}
          locale={locale}
          pose={cardPose(card, view, values)}
          onSelect={(id) => controllerRef.current?.open(id)}
        />
      ))}
      <div className="detail-scrim" hidden />
      {[1949, 1960, 1980, 2000, endYear].map((year) => {
        const p = anchor(year, 'axis', view, values);
        return (
          <span key={year} className="year-tick" style={{ left: p.x, top: p.y }} data-year={year}>
            {year}
          </span>
        );
      })}
      {data.educationEvents.map((event) => {
        const p = anchor(event.year, 'education', view, values);
        return (
          <button
            key={event.id}
            className="education-dot"
            style={{ left: p.x, top: p.y }}
            aria-label={localized(event.title, locale)}
            title={localized(event.title, locale)}
            data-education-year={event.year}
            onClick={() => controllerRef.current?.goYear(event.year)}
          >
            <span />
          </button>
        );
      })}
      <aside className="education-panel" data-testid="education-panel">
        <div className="eyebrow">
          <span>02 /</span> {m.education}
        </div>
        {education ? (
          <div className="education-copy">
            <span className="education-year">{education.year}</span>
            <div>
              <h2>{localized(education.title, locale)}</h2>
              <p>{localized(education.body, locale)}</p>
            </div>
          </div>
        ) : (
          <p>{m.empty}</p>
        )}
      </aside>
    </div>
  );
}
