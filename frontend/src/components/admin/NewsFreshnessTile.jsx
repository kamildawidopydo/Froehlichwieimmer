import { getApiBase } from '@/lib/apiBase';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  Clock, Lock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });

const REFRESH_MS = 60 * 1000;

const fmtAbs = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtRel = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'gerade eben';
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  const d = Math.floor(s / 86400);
  return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
};

const STATUS_MAP = {
  fresh: {
    label: 'Aktuell',
    Icon: CheckCircle2,
    bar: 'bg-bank-mint text-bank-primary-strong border-bank-primary/45',
    dot: 'bg-bank-primary',
  },
  stale: {
    label: 'Veraltet',
    Icon: AlertTriangle,
    bar: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
  error: {
    label: 'Fehler',
    Icon: XCircle,
    bar: 'bg-red-50 text-red-800 border-red-300',
    dot: 'bg-red-500',
  },
};

const Stat = ({ label, value }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</span>
    <span className="truncate text-[13px] font-medium text-bank-text tabular-nums">{value ?? '—'}</span>
  </div>
);

const TimeStat = ({ label, iso }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">{label}</span>
    <span className="truncate text-[13px] font-medium text-bank-text tabular-nums">
      {fmtAbs(iso)}
      {iso ? <span className="ml-2 font-normal text-bank-text-muted">· {fmtRel(iso)}</span> : null}
    </span>
  </div>
);

const NewsFreshnessTile = () => {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [errorText, setErrorText] = useState('');
  const [details, setDetails] = useState(false);
  const lastFetchRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setState('loading');
    try {
      const res = await api.get('/news/admin/status');
      setData(res.data);
      setState('ready');
      setErrorText('');
      lastFetchRef.current = Date.now();
    } catch (err) {
      if (!silent) {
        const status = err?.response?.status;
        setErrorText(status ? `Status ${status}` : (err?.message || 'unbekannter Fehler'));
        setState('error');
      }
      // eslint-disable-next-line no-console
      console.warn('[NewsFreshnessTile] fetch failed', err?.message || err);
    }
  }, []);

  useEffect(() => {
    load(false);
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      load(true);
    }, REFRESH_MS);
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current >= REFRESH_MS) load(true);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      clearInterval(id);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [load]);

  const freshness = data?.freshness || 'error';
  const map = STATUS_MAP[freshness] || STATUS_MAP.error;
  const StatusIcon = map.Icon;

  return (
    <section
      data-testid="admin-news-freshness-tile"
      className="mb-10 overflow-hidden rounded-lg border border-bank-border bg-white shadow-editorial-sm"
    >
      {/* Status bar */}
      <div className={cn('flex items-center justify-between border-b px-5 py-3', map.bar)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-40', map.dot)} />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', map.dot)} />
          </span>
          <StatusIcon size={15} strokeWidth={1.75} aria-hidden />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em]">
            News-Pipeline · {map.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => load(false)}
          data-testid="admin-news-freshness-refresh"
          className="inline-flex items-center gap-1.5 rounded border border-current/30 bg-white/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
          aria-label="Freshness-Status manuell aktualisieren"
        >
          <RefreshCw size={11} strokeWidth={1.75} className={state === 'loading' ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Body */}
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-3">
        {state === 'error' ? (
          <div className="lg:col-span-3">
            <p className="text-[13px] text-red-800">
              Status konnte nicht geladen werden ({errorText || 'unbekannt'}).
            </p>
            <button
              type="button"
              onClick={() => load(false)}
              className="mt-2 inline-flex items-center gap-1.5 rounded border border-bank-border bg-white px-3 py-1.5 text-[12px] font-medium text-bank-text hover:border-bank-primary"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <>
            {/* Fetch column */}
            <div className="flex flex-col gap-3 border-l-2 border-bank-primary/30 pl-4">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong">
                News-Fetch
              </p>
              <TimeStat label="Letzter Erfolg" iso={data?.fetch?.last_success_at} />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Fetched" value={data?.fetch?.last_summary?.fetched} />
                <Stat label="Relevant" value={data?.fetch?.last_summary?.relevant} />
                <Stat label="Neu" value={data?.fetch?.last_summary?.new} />
                <Stat label="Errors" value={data?.fetch?.last_summary?.errors ?? 0} />
              </div>
              <Stat label="Dauer (s)" value={data?.fetch?.last_summary?.duration_s} />
              <div className="flex items-center gap-1.5 text-[11px]">
                <Lock size={11} strokeWidth={1.75} aria-hidden className={data?.fetch?.lock_active ? 'text-amber-600' : 'text-bank-text-muted'} />
                <span className={data?.fetch?.lock_active ? 'font-semibold text-amber-700' : 'text-bank-text-muted'}>
                  Fetch-Lock: {data?.fetch?.lock_active ? 'aktiv' : 'idle'}
                </span>
              </div>
            </div>

            {/* Synthesize column */}
            <div className="flex flex-col gap-3 border-l-2 border-bank-primary/30 pl-4">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong">
                Synthese
              </p>
              <TimeStat label="Letzter Erfolg" iso={data?.synthesize?.last_success_at} />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Published" value={data?.synthesize?.last_summary?.published} />
                <Stat label="Needs Review" value={data?.synthesize?.last_summary?.needs_review} />
                <Stat label="Duplicates" value={data?.synthesize?.last_summary?.skipped_duplicate} />
                <Stat label="LLM-Fehler" value={data?.synthesize?.last_summary?.llm_failed} />
              </div>
              <div className="text-[11px] text-bank-text-muted">
                {data?.synthesize?.last_success_at ? null : 'Noch kein Lauf seit letztem Deploy.'}
              </div>
            </div>

            {/* Content column */}
            <div className="flex flex-col gap-3 border-l-2 border-bank-primary/30 pl-4">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong">
                Inhalte
              </p>
              <TimeStat label="Neuester Artikel" iso={data?.content?.newest_published_at} />
              <div className="grid grid-cols-2 gap-3">
                <Stat label="24 Std." value={data?.content?.articles_last_24h} />
                <Stat label="7 Tage" value={data?.content?.articles_last_7d} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Details toggle */}
      {state !== 'error' && (
        <div className="border-t border-bank-border">
          <button
            type="button"
            onClick={() => setDetails((v) => !v)}
            data-testid="admin-news-freshness-details-toggle"
            className="flex w-full items-center justify-between gap-3 px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted transition-colors hover:bg-bank-panel"
            aria-expanded={details}
          >
            <span className="inline-flex items-center gap-2">
              <Clock size={11} strokeWidth={1.75} aria-hidden />
              Details {details ? 'ausblenden' : 'anzeigen'}
            </span>
            {details ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {details && (
            <div className="grid gap-4 border-t border-bank-border bg-bank-panel px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
              <TimeStat label="Fetch gestartet" iso={data?.fetch?.last_started_at} />
              <Stat label="Fetch Trigger" value={data?.fetch?.last_trigger_source} />
              <TimeStat label="Synthese gestartet" iso={data?.synthesize?.last_started_at} />
              <TimeStat label="Server-Zeit" iso={data?.server_time} />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default NewsFreshnessTile;
