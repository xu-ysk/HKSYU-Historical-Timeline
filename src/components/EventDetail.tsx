import { useEffect, useRef } from 'react';
import type { Locale, SchoolEvent } from '../domain/timeline';
import { localized, localizedYearLabel } from '../domain/timeline';
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
  const closeRef = useRef<HTMLButtonElement>(null),
    bodyRef = useRef<HTMLDivElement>(null),
    m = messages[locale],
    title = localized(event.title, locale),
    body = localized(event.body, locale),
    hasText = Boolean(title || body),
    placeholderOnly = !event.photos.some((photo) => photo.kind !== 'placeholder');
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (body && !placeholderOnly && bodyRef.current && document.activeElement === closeRef.current)
          bodyRef.current.focus({ preventScroll: true });
        else closeRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [body, placeholderOnly]);
  return (
    <section
      className={'event-detail' + (placeholderOnly ? ' event-detail-placeholder' : '')}
      role="dialog"
      aria-modal="true"
      aria-labelledby={hasText ? 'event-title' : undefined}
      aria-describedby={hasText ? 'detail-body detail-dismiss-hint' : 'detail-dismiss-hint'}
      data-testid="event-detail"
      data-event={event.id}
      data-phase={phase}
      data-placeholder-only={placeholderOnly ? 'true' : 'false'}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="sr-only" id="detail-dismiss-hint">
        {m.dismissDetail}
      </span>
      <button
        ref={closeRef}
        type="button"
        className="detail-close"
        data-testid="close-detail"
        aria-label={m.close}
        title={m.close}
        onClick={onClose}
      >
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M25 16H7m0 0 7-7m-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {hasText && (
        <div className="detail-text" data-testid="detail-text">
          <div className="detail-year">
            {localizedYearLabel(event, locale)}
            <span>—</span>
          </div>
          <div className="detail-theme" style={{ color: themes[event.themeId].color }}>
            {themes[event.themeId].label[locale]}
          </div>
          {title && <h2 id="event-title">{title}</h2>}
          {body && (
            <div
              ref={bodyRef}
              id="detail-body"
              className="detail-body"
              data-testid="detail-body"
              tabIndex={0}
            >
              {body}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
