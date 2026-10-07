import { useCallback, useEffect, useRef, useState } from 'react';
import type { Locale, TimelineDataset, ThemeId } from '../domain/timeline';
import { useCurrentYear } from '../domain/useCurrentYear';
import { mockProvider } from '../data/mockProvider';
import { realProvider } from '../data/realProvider';
import { messages } from '../i18n/messages';
import { LanguageSwitcher, ThemeSwitcher } from '../components/Controls';
import { TimelineScene } from '../timeline/TimelineScene';
import { TimelineController } from '../timeline/TimelineController';
import { EventDetail } from '../components/EventDetail';
import { initialDetail } from '../timeline/timelineReducer';
import { localized, localizedYearLabel } from '../domain/timeline';
import '../styles/timeline.css';
import '../styles/detail.css';
export default function App() {
  const [data, setData] = useState<TimelineDataset | null>(null),
    [locale, setLocale] = useState<Locale>('zh-Hant'),
    [active, setActive] = useState<ThemeId | null>(null),
    [error, setError] = useState(false);
  const [mode, setMode] = useState<'overview' | 'browse'>('overview'),
    [year, setYear] = useState(1949),
    [eventId, setEventId] = useState('');
  const controllerRef = useRef<TimelineController | null>(null);
  const [detail, setDetail] = useState(initialDetail);
  const detailPhaseRef = useRef(detail.phase);
  const closeDetail = useCallback(() => controllerRef.current?.close(), []);
  const handleProgress = useCallback((nextYear: number, nextEventId: string) => {
    setYear(nextYear);
    setEventId(nextEventId);
  }, []);
  const handleMode = useCallback((nextMode: 'overview' | 'browse') => setMode(nextMode), []);
  const handleTheme = (theme: ThemeId | null) => {
    setActive(theme);
    controllerRef.current?.setTheme(theme);
  };
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    detailPhaseRef.current = detail.phase;
  }, [detail.phase]);
  const m = messages[locale],
    endYear = useCurrentYear();
  const [loadAttempt, setLoadAttempt] = useState(0);
  const provider =
    import.meta.env.MODE === 'test' || import.meta.env.VITE_TIMELINE_SOURCE === 'mock'
      ? mockProvider
      : realProvider;
  const selected = data?.schoolEvents.find((e) => e.id === detail.eventId),
    focused = data?.schoolEvents.find((e) => e.id === eventId),
    focusedLabel = focused
      ? localized(focused.title, locale) ||
        localized(focused.body, locale).slice(0, 72) ||
        localizedYearLabel(focused, locale)
      : '—',
    detailActive = detail.phase !== 'idle';
  useEffect(() => {
    const abort = new AbortController();
    let inFlight = false;
    let currentSnapshot: string | null = null;
    const refresh = async () => {
      if (
        inFlight ||
        (provider === realProvider && (document.hidden || detailPhaseRef.current !== 'idle'))
      )
        return;
      inFlight = true;
      try {
        const result = await provider.load(abort.signal);
        if (abort.signal.aborted || (provider === realProvider && detailPhaseRef.current !== 'idle'))
          return;
        const nextSnapshot = JSON.stringify(result);
        if (nextSnapshot !== currentSnapshot) {
          currentSnapshot = nextSnapshot;
          setData(result);
        }
        setError(false);
      } catch {
        if (!abort.signal.aborted) setError(true);
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    const timer =
      provider === realProvider ? window.setInterval(() => void refresh(), 15000) : undefined;
    if (provider === realProvider) document.addEventListener('visibilitychange', onVisible);
    return () => {
      abort.abort();
      if (timer !== undefined) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [endYear, loadAttempt, provider]);
  return (
    <main
      className="museum-app"
      data-mode={mode}
      data-detail-active={detailActive}
      data-active-theme={active ?? 'all'}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="masthead">
        <div className="header-top">
          <LanguageSwitcher locale={locale} onChange={setLocale} />
        </div>
      </header>
      {error && data && <p className="sync-warning" role="status">{m.updateError}</p>}
      {data ? (
        <TimelineScene
          data={data}
          endYear={endYear}
          locale={locale}
          mode={mode}
          onMode={handleMode}
          onProgress={handleProgress}
          controllerRef={controllerRef}
          focusYear={year}
          onDetail={setDetail}
        />
      ) : (
        <div className="loading">
          <p>{error ? m.error : m.loading}</p>
          {error && <button onClick={() => setLoadAttempt((a) => a + 1)}>{m.retry}</button>}
        </div>
      )}
      {selected && (
        <EventDetail event={selected} locale={locale} phase={detail.phase} onClose={closeDetail} />
      )}
      <div className="view-switch" data-testid="view-switch">
        <button
          disabled={detailActive}
          data-testid="view-overview"
          aria-pressed={mode === 'overview'}
          onClick={() => controllerRef.current?.setMode('overview')}
        >
          {m.overview}
        </button>
        <button
          disabled={detailActive}
          data-testid="view-browse"
          aria-pressed={mode === 'browse'}
          onClick={() => controllerRef.current?.setMode('browse')}
        >
          {m.browse} ↗
        </button>
      </div>
      <footer className="bottom-panel">
        <div className="navigation-panel" data-testid="navigation-panel">
          <div className="current-year" data-testid="current-year">
            {year}
            <span>— {endYear}</span>
          </div>
          <input
            disabled={detailActive}
            aria-label={m.timeline}
            data-testid="year-slider"
            className="year-slider"
            type="range"
            min="1949"
            max={endYear}
            step="1"
            value={year}
            onChange={(e) => controllerRef.current?.goYear(Number(e.target.value))}
          />
          <div className="event-navigation">
            <button
              disabled={detailActive}
              aria-label={m.previous}
              data-testid="previous-event"
              onClick={() => controllerRef.current?.step(-1)}
            >
              ←
            </button>
            <button
              disabled={detailActive}
              className="open-focused"
              data-testid="open-focused"
              onClick={() => focused && controllerRef.current?.open(focused.id)}
            >
              {focusedLabel} ↗
            </button>
            <button
              disabled={detailActive}
              aria-label={m.next}
              data-testid="next-event"
              onClick={() => controllerRef.current?.step(1)}
            >
              →
            </button>
          </div>
          <p>{m.hint}</p>
          <span className="demo-label">
            <i />
            {m.demo}
          </span>
          <span className="sr-only" data-testid="focused-event">
            {eventId}
          </span>
        </div>
        <ThemeSwitcher locale={locale} active={active} onChange={handleTheme} />
      </footer>
    </main>
  );
}
