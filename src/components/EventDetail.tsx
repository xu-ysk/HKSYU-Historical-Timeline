import { useEffect, useRef } from 'react';
import type { Locale, SchoolEvent } from '../domain/timeline';
import { localized } from '../domain/timeline';
import { themes } from '../config/themes';
import { messages } from '../i18n/messages';
import type { DetailPhase } from '../timeline/timelineReducer';
export function EventDetail({
  event,
  locale,
  phase,
  onClose,
}: {
  event: SchoolEvent;
  locale: Locale;
  phase: DetailPhase;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null),
    bodyRef = useRef<HTMLDivElement>(null),
    m = messages[locale];
  useEffect(() => {
    dialogRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        bodyRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <section
      ref={dialogRef}
      className="event-detail"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-labelledby="event-title"
      aria-describedby="detail-body detail-dismiss-hint"
      data-testid="event-detail"
      data-event={event.id}
      data-phase={phase}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <span className="sr-only" id="detail-dismiss-hint">
        {m.dismissDetail}
      </span>
      <div className="detail-text" data-testid="detail-text">
        <div className="eyebrow">
          {m.sample} / {event.year}
        </div>
        <div className="detail-year">
          {event.year}
          <span>—</span>
        </div>
        <div className="detail-theme" style={{ color: themes[event.themeId].color }}>
          <span>{event.themeId}</span>
          {themes[event.themeId].label[locale]}
        </div>
        <h2 id="event-title">{localized(event.title, locale)}</h2>
        <div
          ref={bodyRef}
          id="detail-body"
          className="detail-body"
          data-testid="detail-body"
          tabIndex={0}
        >
          {localized(event.body, locale)}
        </div>
        <div className="detail-caption">
          {event.photos.length
            ? String(event.photos.length).padStart(2, '0') + ' / ' + m.photos
            : m.textOnly}
        </div>
      </div>
    </section>
  );
}
