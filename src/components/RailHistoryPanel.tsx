import { useId, useLayoutEffect, useRef } from 'react';
import type { EducationEvent, Locale, UpperRailEvent } from '../domain/timeline';
import { educationYearLabel, localized, localizedYearLabel } from '../domain/timeline';
import { messages } from '../i18n/messages';
import '../styles/rail-panel.css';

export interface RailSelection {
  lane: 'upper' | 'education';
  eventId: string;
}

export function RailHistoryPanel({ events, lane, locale, visible }: {
  events: readonly (UpperRailEvent | EducationEvent)[];
  lane: RailSelection['lane'];
  locale: Locale;
  visible: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const headingId = useId();
  const event = events[0];
  const m = messages[locale];
  const prefix = lane === 'upper' ? 'upper-rail' : 'education';

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !visible) return;
    const fit = () => {
      const maximum = Math.max(220, Math.min(460, window.innerHeight * 0.35));
      panel.style.setProperty('--rail-copy-scale', '1');
      // Fit the complete copy to its side of the exhibition screen, without a
      // nested scrollbar or truncating any of the selected year's records.
      const baseFont = Number.parseFloat(getComputedStyle(panel.querySelector('p') ?? panel).fontSize);
      const minimum = Math.ceil(Math.max(0.8, 10 / baseFont) * 100);
      for (let scale = 98; panel.getBoundingClientRect().height > maximum && scale >= minimum; scale -= 2) {
        panel.style.setProperty('--rail-copy-scale', (scale / 100).toFixed(2));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    // Observe the viewport instead of the fitted text to avoid resize loops.
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [events, locale, visible]);

  return (
    <aside
      ref={panelRef}
      id={lane === 'upper' ? 'upper-history-panel' : 'education-history-panel'}
      className={`${prefix}-panel rail-side-panel`}
      data-testid={`${prefix}-panel`}
      data-event={event?.id}
      data-event-year={event?.year}
      data-has-event={visible}
      data-lane={lane}
      data-multiple-records={events.length > 1}
      aria-hidden={!visible}
      aria-labelledby={headingId}
    >
      <div className="eyebrow" id={headingId}>
        <span>{lane === 'upper' ? '01 /' : '02 /'}</span> {lane === 'upper' ? m.school : m.education}
      </div>
      {event && (
        <>
          <div className="rail-side-copy" aria-live="polite" aria-atomic="true">
            <span className={`${prefix}-year rail-side-year`} data-testid={`${prefix}-year`}>
              {lane === 'education' ? educationYearLabel(event, locale) : localizedYearLabel(event, locale)}
            </span>
            <div className="rail-side-records">
              {events.map((record) => (
                <article key={record.id} data-rail-record={record.id}>
                  {localized(record.title, locale) && <h2 data-testid={`${prefix}-title`}>{localized(record.title, locale)}</h2>}
                  {localized(record.body, locale) && (
                    <p data-testid={`${prefix}-body`}>
                      {localized(record.body, locale).split(/(\(S6-7\))/).map((part, index) =>
                        part === '(S6-7)' ? <span className="rail-no-wrap" key={index}>{part}</span> : part,
                      )}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
