import { useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { EducationEvent, Locale, UpperRailEvent } from '../domain/timeline';
import { educationYearLabel, localized, localizedYearLabel } from '../domain/timeline';
import { messages } from '../i18n/messages';
import { LanguageSwitcher } from './Controls';
import '../styles/rail-detail.css';

export interface RailSelection {
  lane: 'upper' | 'education';
  eventId: string;
}

export function RailEventDetail({
  events,
  lane,
  locale,
  onLocaleChange,
  onHome,
  suspended,
}: {
  events: readonly (UpperRailEvent | EducationEvent)[];
  lane: RailSelection['lane'];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onHome: () => void;
  suspended: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const homeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const event = events[0];
  const m = messages[locale];
  const section = lane === 'upper' ? m.school : m.education;

  useLayoutEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    homeRef.current?.focus({ preventScroll: true });
    return () => {
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      });
    };
  }, []);

  return createPortal(
    <div className="rail-detail-overlay" inert={suspended}>
      <section
        ref={dialogRef}
        className="rail-event-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-testid="rail-event-detail"
        data-lane={lane}
        data-event={event.id}
        data-year={event.year}
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          const buttons = Array.from(dialogRef.current?.querySelectorAll('button') ?? []);
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          e.preventDefault();
          buttons[(index + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length]?.focus();
        }}
      >
        <header className="rail-detail-heading">
          <button
            ref={homeRef}
            type="button"
            className="rail-detail-home"
            data-testid="rail-detail-home"
            aria-label={m.returnToOverview}
            title={m.returnToOverview}
            onClick={onHome}
          >
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M5 14.5 16 6l11 8.5M8 13.5V26h16V13.5M13 26v-8h6v8" />
            </svg>
          </button>
          <div className="rail-detail-section" id={headingId}>
            <span>{lane === 'upper' ? '01 /' : '02 /'}</span> {section}
          </div>
          <LanguageSwitcher locale={locale} onChange={onLocaleChange} testIdPrefix="rail-language-" />
        </header>
        <div className="rail-detail-copy">
          <div className="rail-detail-year">
            {lane === 'education' ? educationYearLabel(event, locale) : localizedYearLabel(event, locale)}
          </div>
          <div className="rail-detail-records">
            {events.map((record) => (
              <article key={record.id} data-rail-record={record.id}>
                {localized(record.title, locale) && <h2>{localized(record.title, locale)}</h2>}
                {localized(record.body, locale) && <p>{localized(record.body, locale)}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
