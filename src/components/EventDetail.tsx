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
  onPrevious,
  onNext,
}: {
  event: SchoolEvent;
  locale: Locale;
  phase: DetailPhase;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null),
    previousRef = useRef<HTMLButtonElement>(null),
    nextRef = useRef<HTMLButtonElement>(null),
    bodyRef = useRef<HTMLDivElement>(null),
    m = messages[locale],
    title = localized(event.title, locale),
    body = localized(event.body, locale),
    hasText = Boolean(title || body),
    placeholderOnly = !event.photos.some((photo) => photo.kind !== 'placeholder');
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (!(document.activeElement as HTMLElement | null)?.closest('.event-detail'))
      closeRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const candidates: (HTMLElement | null)[] = [
          closeRef.current,
          body && !placeholderOnly ? bodyRef.current : null,
          previousRef.current?.disabled ? null : previousRef.current,
          nextRef.current?.disabled ? null : nextRef.current,
        ];
        const focusable = candidates.filter((element): element is HTMLElement => element !== null);
        const index = focusable.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        focusable[(index + (e.shiftKey ? focusable.length - 1 : 1)) % focusable.length]?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [body, event.id, placeholderOnly]);
  return (
    <section
      className={'event-detail' +
        (placeholderOnly ? ' event-detail-placeholder' : '') +
        (!hasText || placeholderOnly ? ' event-detail-no-copy' : '')}
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
          <path d="M5 14.5 16 6l11 8.5M8 13.5V26h16V13.5M13 26v-8h6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
      <div className="detail-navigation" role="group" aria-label={m.detailNavigation}>
        {onPrevious && (
          <button
            ref={previousRef}
            type="button"
            data-testid="detail-previous"
            aria-label={m.previousYear}
            title={m.previousYear}
            disabled={phase !== 'detail'}
            onClick={onPrevious}
          >
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M25 16H7m0 0 7-7m-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {onNext && (
          <button
            ref={nextRef}
            type="button"
            data-testid="detail-next"
            aria-label={m.nextYear}
            title={m.nextYear}
            disabled={phase !== 'detail'}
            onClick={onNext}
          >
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M7 16h18m0 0-7-7m7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
