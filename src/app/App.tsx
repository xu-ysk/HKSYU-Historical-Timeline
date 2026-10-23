import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Locale, TimelineDataset, ThemeId } from '../domain/timeline';
import { useCurrentYear } from '../domain/useCurrentYear';
import { mockProvider } from '../data/mockProvider';
import { realProvider } from '../data/realProvider';
import { messages } from '../i18n/messages';
import { LanguageSwitcher, ThemeSwitcher } from '../components/Controls';
import { TimelineScene } from '../timeline/TimelineScene';
import { TimelineController } from '../timeline/TimelineController';
import { EventDetail } from '../components/EventDetail';
import { HelpOverlay } from '../components/HelpOverlay';
import type { RailSelection } from '../components/RailHistoryPanel';
import { initialDetail } from '../timeline/timelineReducer';
import { localized, localizedYearLabel } from '../domain/timeline';
import { detailEventNeighbors } from '../domain/detailNavigation';
import '../styles/timeline.css';
import '../styles/detail.css';
import '../styles/help.css';
export default function App() {
  const [helpOpen, setHelpOpen] = useState(() => {
    try {
      return window.sessionStorage.getItem('museum-help-seen') !== 'true';
    } catch {
      return true;
    }
  });
  const appRef = useRef<HTMLElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [data, setData] = useState<TimelineDataset | null>(null),
    [locale, setLocale] = useState<Locale>('zh-Hant'),
    [active, setActive] = useState<ThemeId | null>(null),
    [error, setError] = useState(false);
  const [mode, setMode] = useState<'overview'>('overview'),
    [year, setYear] = useState(1949),
    [eventId, setEventId] = useState('');
  const controllerRef = useRef<TimelineController | null>(null);
  const [detail, setDetail] = useState(initialDetail);
  const [railSelections, setRailSelections] = useState<Partial<Record<RailSelection['lane'], string>>>({});
  const selectRailEvent = useCallback((selection: RailSelection) => {
    setRailSelections((previous) => ({ ...previous, [selection.lane]: selection.eventId }));
  }, []);
  const detailPhaseRef = useRef(detail.phase);
  const returnToOverviewRef = useRef(false);
  const closeDetail = useCallback(() => controllerRef.current?.close(), []);
  const returnToOverview = useCallback(() => {
    setRailSelections({});
    setActive(null);
    controllerRef.current?.setTheme(null);
    if (detailPhaseRef.current === 'idle') {
      controllerRef.current?.startMode('overview');
    } else {
      returnToOverviewRef.current = true;
      controllerRef.current?.close();
    }
  }, []);
  const closeHelp = useCallback(() => {
    try {
      window.sessionStorage.setItem('museum-help-seen', 'true');
    } catch {
      // The guide remains usable when browser storage is unavailable.
    }
    setHelpOpen(false);
    window.requestAnimationFrame(() =>
      (document.querySelector<HTMLButtonElement>('.detail-close') ?? helpButtonRef.current)?.focus(),
    );
  }, []);
  useLayoutEffect(() => {
    const app = appRef.current;
    if (app) app.inert = helpOpen;
    return () => {
      if (app) app.inert = false;
    };
  }, [helpOpen]);
  useEffect(() => {
    if (helpOpen) return;
    let idleTimer: number;
    const restart = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setHelpOpen(true), 3 * 60 * 1000);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.buttons) restart();
    };
    window.addEventListener('pointerdown', restart);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('wheel', restart);
    window.addEventListener('keydown', restart);
    restart();
    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener('pointerdown', restart);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('wheel', restart);
      window.removeEventListener('keydown', restart);
    };
  }, [helpOpen]);
  useEffect(() => {
    if (!detail.eventId) return;
    const timer = window.setTimeout(closeDetail, 3 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [detail.eventId, closeDetail]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(returnToOverview, 3 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [active, returnToOverview]);
  useEffect(() => {
    if (detail.phase !== 'idle' || !returnToOverviewRef.current) return;
    returnToOverviewRef.current = false;
    controllerRef.current?.startMode('overview');
  }, [detail.phase]);
  const handleProgress = useCallback((nextYear: number, nextEventId: string) => {
    setYear(nextYear);
    setEventId(nextEventId);
  }, []);
  const handleMode = useCallback((nextMode: 'overview') => setMode(nextMode), []);
  const handleTheme = (theme: ThemeId) => {
    if (theme === active) return;
    returnToOverviewRef.current = false;
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
  const detailNeighbors = selected && data
    ? detailEventNeighbors(data.schoolEvents, selected, active)
    : null;
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
      ref={appRef}
      className="museum-app"
      data-mode={mode}
      data-detail-active={detailActive}
      data-active-theme={active ?? 'all'}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="masthead">
        <div className="header-top">
          <LanguageSwitcher locale={locale} onChange={setLocale} />
          <div className="view-switch" data-testid="view-switch">
            <button
              disabled={detailActive}
              data-testid="view-overview"
              aria-pressed={mode === 'overview'}
              onClick={() => {
                setRailSelections({});
                controllerRef.current?.startMode('overview');
              }}
            >
              {m.overview}
            </button>
          </div>
          <button
            ref={helpButtonRef}
            type="button"
            className="help-trigger"
            data-testid="help-trigger"
            onClick={() => setHelpOpen(true)}
          >
            <span aria-hidden="true">?</span> {m.help}
          </button>
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
          activeTheme={active}
          onReturnToOverview={returnToOverview}
          homeDisabled={detailActive}
          onDetail={setDetail}
          railSelections={railSelections}
          onRailSelect={selectRailEvent}
        />
      ) : (
        <div className="loading">
          <p>{error ? m.error : m.loading}</p>
          {error && <button onClick={() => setLoadAttempt((a) => a + 1)}>{m.retry}</button>}
        </div>
      )}
      {selected && (
        <EventDetail
          event={selected}
          locale={locale}
          onLocaleChange={setLocale}
          phase={detail.phase}
          onClose={closeDetail}
          onPrevious={detailNeighbors?.previous
            ? () => controllerRef.current?.switchDetail(detailNeighbors.previous!.id)
            : undefined}
          onNext={detailNeighbors?.next
            ? () => controllerRef.current?.switchDetail(detailNeighbors.next!.id)
            : undefined}
        />
      )}
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
      <HelpOverlay open={helpOpen} locale={locale} onClose={closeHelp} onLocaleChange={setLocale} />
    </main>
  );
}
