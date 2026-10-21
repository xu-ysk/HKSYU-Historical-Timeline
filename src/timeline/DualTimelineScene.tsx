import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Locale, ThemeId, TimelineDataset } from '../domain/timeline';
import { educationYearLabel, localized, localizedYearLabel } from '../domain/timeline';
import { messages } from '../i18n/messages';
import { TapButton } from '../components/TapButton';
import { HorizontalTimelineController } from './HorizontalTimelineController';
import { START_YEAR } from './timeScale';
import '../styles/dual-timeline.css';

export function DualTimelineScene({
  data,
  endYear,
  locale,
  activeTheme,
  onReturnToOverview,
}: {
  data: TimelineDataset;
  endYear: number;
  locale: Locale;
  activeTheme: ThemeId | null;
  onReturnToOverview: () => void;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const controllerRef = useRef<HorizontalTimelineController | null>(null);
  const yearRef = useRef(START_YEAR);
  const [year, setYear] = useState(START_YEAR);
  const m = messages[locale];
  const events = useMemo(() => {
    const themeYears = activeTheme
      ? new Set(
          data.schoolEvents
            .filter((event) => event.themeId === activeTheme)
            .map((event) => event.year),
        )
      : null;
    return {
      upper: data.upperRailEvents.filter((event) => !themeYears || themeYears.has(event.year)),
      education: data.educationEvents.filter((event) => !themeYears || themeYears.has(event.year)),
    };
  }, [activeTheme, data]);
  const ticks = useMemo(
    () =>
      [START_YEAR, 1960, 2000, endYear]
        .filter((item) => item !== 2026)
        .filter((item) => !events.education.some((event) => event.year === item))
        .filter(
          (item) =>
            !activeTheme ||
            data.schoolEvents.some((event) => event.themeId === activeTheme && event.year === item),
        ),
    [activeTheme, data, endYear, events],
  );
  const years = useMemo(
    () =>
      [
        ...new Set([
          START_YEAR,
          endYear,
          ...ticks,
          ...events.upper.map((event) => event.year),
          ...events.education.map((event) => event.year),
        ]),
      ].sort((a, b) => a - b),
    [endYear, events, ticks],
  );
  useLayoutEffect(() => {
    const controller = new HorizontalTimelineController(
      rootRef.current!,
      endYear,
      years,
      yearRef.current,
      (nextYear) => {
        yearRef.current = nextYear;
        setYear(nextYear);
      },
    );
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [endYear, years]);

  const upper = events.upper.find((event) => event.year === year);
  const education = events.education.find((event) => event.year === year);
  const goYear = (next: number) => controllerRef.current?.goYear(next);
  return (
    <section
      ref={rootRef}
      className="dual-timeline-scene"
      data-testid="dual-timeline-scene"
      data-phase="idle"
      data-locale={locale}
      aria-label={m.browse}
      tabIndex={0}
    >
      <div className="dual-history-row dual-history-row-upper" data-testid="upper-history-row">
        <h1 className="dual-rail-heading">
          <span>01 |</span> {m.school}
        </h1>
        <aside
          className="dual-history-panel"
          data-timeline-panel="upper"
          data-testid="upper-rail-panel"
          data-event-year={upper?.year}
          data-has-event={Boolean(upper)}
          aria-hidden={!upper}
        >
          {upper && (
            <>
              <span className="dual-panel-year" data-testid="upper-rail-year">
                {localizedYearLabel(upper, locale)}
              </span>
              <div>
                <h2 data-testid="upper-rail-title">{localized(upper.title, locale)}</h2>
                <p data-testid="upper-rail-body">{localized(upper.body, locale)}</p>
              </div>
            </>
          )}
        </aside>
      </div>
      <div className="dual-rail dual-rail-upper" data-testid="upper-rail">
        <div className="dual-rail-line" data-track="upper" />
        <div className="dual-rail-content" data-rail-content="upper">
          {events.upper.map((event, index) => (
            <TapButton
              key={event.id}
              className="dual-year-marker"
              data-timeline-year={event.year}
              data-upper-year={event.year}
              data-testid={`upper-year-${event.year}`}
              data-label-row={index % 2}
              aria-label={`${event.year} · ${localized(event.title, locale)}`}
              title={`${event.year} · ${localized(event.title, locale)}`}
              aria-pressed={year === event.year}
              onActivate={() => goYear(event.year)}
            >
              <span className="dual-year-dot" aria-hidden="true" />
              <span className="dual-year-label">{event.year}</span>
            </TapButton>
          ))}
        </div>
      </div>
      <div className="dual-middle" data-testid="dual-drag-area">
        <div className="dual-swipe-guide" data-testid="dual-swipe-guide">
          {activeTheme && (
            <TapButton
              type="button"
              className="dual-reset"
              onActivate={onReturnToOverview}
              aria-label={m.returnToOverview}
            >
              {m.all} ↗
            </TapButton>
          )}
          <span aria-hidden="true">←</span>
          <span>{m.swipeBlank}</span>
          <span aria-hidden="true">→</span>
          <span className="dual-focus-year" data-testid="dual-current-year">
            {year}
          </span>
        </div>
      </div>
      <div className="dual-rail dual-rail-education" data-testid="education-rail">
        <div className="dual-rail-line" data-track="education" />
        <div className="dual-rail-content" data-rail-content="education">
          {events.education.map((event, index) => (
            <TapButton
              key={event.id}
              className="dual-year-marker"
              data-timeline-year={event.year}
              data-education-year={event.year}
              data-label-row={index % 2}
              aria-label={`${event.year} · ${localized(event.title, locale)}`}
              title={`${event.year} · ${localized(event.title, locale)}`}
              aria-pressed={year === event.year}
              onActivate={() => goYear(event.year)}
            >
              <span className="dual-year-dot" aria-hidden="true" />
              {events.education.findIndex((item) => item.year === event.year) === index && (
                <span className="dual-year-label">{event.year}</span>
              )}
            </TapButton>
          ))}
          {ticks.map((tick) => (
            <span
              key={tick}
              className="dual-year-tick"
              data-timeline-year={tick}
              data-education-label={tick}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
      <div
        className="dual-history-row dual-history-row-education"
        data-testid="education-history-row"
      >
        <h2 className="dual-rail-heading">
          <span>02 |</span> {m.education}
        </h2>
        <aside
          className="dual-history-panel"
          data-timeline-panel="education"
          data-testid="education-panel"
          data-event-year={education?.year}
          data-has-event={Boolean(education)}
          aria-hidden={!education}
        >
          {education && (
            <>
              <span className="dual-panel-year">{educationYearLabel(education, locale)}</span>
              <div>
                <h2>{localized(education.title, locale)}</h2>
                <p>{localized(education.body, locale)}</p>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
