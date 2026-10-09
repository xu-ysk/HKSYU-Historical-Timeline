import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TimelineDataset, Locale, ThemeId } from '../domain/timeline';
import { educationYearLabel, localized, localizedYearLabel } from '../domain/timeline';
import { toCards } from '../domain/normalizeTimeline';
import { messages } from '../i18n/messages';
import { anchor, cardPose, trackEndpoints } from './layout';
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
  activeTheme,
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
  activeTheme: ThemeId | null;
  onDetail: (state: DetailState) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const cards = useMemo(() => toCards(data), [data]);
  const activeThemeYears = useMemo(
    () =>
      activeTheme
        ? new Set(
            data.schoolEvents
              .filter((event) => event.themeId === activeTheme)
              .map((event) => event.year),
          )
        : null,
    [activeTheme, data.schoolEvents],
  );
  const overviewYears = useMemo(
    () =>
      [
        ...new Set([...data.upperRailEvents, ...data.educationEvents].map((event) => event.year)),
      ].sort((a, b) => a - b),
    [data],
  );
  useLayoutEffect(() => {
    if (!controllerRef.current)
      controllerRef.current = new TimelineController(
        ref.current!,
        cards,
        endYear,
        overviewYears,
        onProgress,
        onMode,
        onDetail,
      );
    else controllerRef.current.updateData(cards, endYear, overviewYears);
  }, [cards, controllerRef, endYear, overviewYears, onMode, onProgress, onDetail]);
  useLayoutEffect(
    () => () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    },
    [controllerRef],
  );
  const values = { focus: 0, zoom: 0, endYear, overviewYears },
    m = messages[locale];
  const visibleEducationEvents = activeThemeYears
    ? data.educationEvents.filter((event) => activeThemeYears.has(event.year))
    : data.educationEvents;
  const visibleUpperRailEvents = activeThemeYears
    ? data.upperRailEvents.filter((event) => activeThemeYears.has(event.year))
    : data.upperRailEvents;
  const education = visibleEducationEvents.reduce<(typeof data.educationEvents)[number] | undefined>(
    (best, event) =>
      !best || Math.abs(event.year - focusYear) < Math.abs(best.year - focusYear) ? event : best,
    undefined,
  );
  const upperRail = visibleUpperRailEvents.reduce<(typeof data.upperRailEvents)[number] | undefined>(
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
      <svg className="track-lines" width="100%" height="100%" aria-hidden="true">
        {(['axis', 'upper', 'education'] as const).map((lane) => {
          const { first: a, last: b } = trackEndpoints(lane, view, values);
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
      <aside
        className="upper-rail-panel"
        data-testid="upper-rail-panel"
        data-has-event={upperRail?.year === focusYear}
        aria-hidden={upperRail?.year !== focusYear}
      >
        <div className="eyebrow">
          <span>01/</span> {locale === 'en' ? 'Shue Yan history' : m.school}
        </div>
        {upperRail ? (
          <div className="upper-rail-copy">
            <span className="upper-rail-year" data-testid="upper-rail-year">
              {localizedYearLabel(upperRail, locale)}
            </span>
            <div>
              <h2 data-testid="upper-rail-title">{localized(upperRail.title, locale)}</h2>
              <p data-testid="upper-rail-body">{localized(upperRail.body, locale)}</p>
            </div>
          </div>
        ) : (
          <p>{m.empty}</p>
        )}
      </aside>
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
      {[1949, 1960, 1980, 2000, endYear]
        .filter((year) => !visibleEducationEvents.some((event) => event.year === year))
        .filter((year) => !activeThemeYears || activeThemeYears.has(year))
        .map((year) => {
          const p = anchor(year, 'education', view, values);
          return (
            <span
              key={year}
              className="year-tick"
              style={{ left: p.x, top: p.y }}
              data-education-label={year}
            >
              {year}
            </span>
          );
        })}
      {visibleUpperRailEvents.map((event) => {
        const p = anchor(event.year, 'upper', view, values);
        return (
          <button
            key={event.id}
            className="upper-rail-marker"
            style={{ left: p.x, top: p.y }}
            aria-label={`${event.year} · ${localized(event.title, locale)}`}
            title={`${event.year} · ${localized(event.title, locale)}`}
            data-testid={`upper-year-${event.year}`}
            data-upper-year={event.year}
            onClick={() => controllerRef.current?.goYear(event.year)}
          >
            <span className="upper-year-label">{event.year}</span>
            <span className="upper-year-dot" aria-hidden="true" />
          </button>
        );
      })}
      {visibleEducationEvents.map((event, index) => {
        const p = anchor(event.year, 'education', view, values);
        const firstInYear =
          visibleEducationEvents.findIndex((item) => item.year === event.year) === index;
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
            <span className="education-year-dot" aria-hidden="true" />
            {firstInYear && (
              <span className="education-year-label" aria-hidden="true">
                {event.year}
              </span>
            )}
          </button>
        );
      })}
      <aside
        className="education-panel"
        data-testid="education-panel"
        data-has-event={education?.year === focusYear}
        aria-hidden={education?.year !== focusYear}
      >
        <div className="eyebrow">
          <span>02 /</span> {m.education}
        </div>
        {education ? (
          <div className="education-copy">
            <span className="education-year">{educationYearLabel(education, locale)}</span>
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
