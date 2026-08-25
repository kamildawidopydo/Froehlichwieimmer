import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Archive, ShieldCheck, ShieldAlert, RefreshCw, PlayCircle, AlertCircle, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BASE = process.env.REACT_APP_BACKEND_URL;
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

// Lesbare Dauer aus Minuten: 134 → "2 Std. 14 Min."; 45 → "45 Min."; 4400 → "3 Tage 1 Std."
const fmtDurationMinutes = (mins) => {
  if (!Number.isFinite(mins) || mins < 0) return '—';
  const m = Math.floor(mins);
  if (m < 60) return `${m} Min.`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem ? `${h} Std. ${rem} Min.` : `${h} Std.`;
  const d = Math.floor(h / 24);
  const hRem = h % 24;
  return hRem ? `${d} ${d === 1 ? 'Tag' : 'Tage'} ${hRem} Std.` : `${d} ${d === 1 ? 'Tag' : 'Tage'}`;
};

// Nächster Cron-Slot 03:15 UTC (aus .emergent/crons.yml, news-retention-archive).
// Rein informativ, ohne Netzwerkzugriff.
const nextRetentionRunIso = () => {
  const now = new Date();
  const utcNext = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 15, 0, 0,
  ));
  if (utcNext.getTime() <= now.getTime()) {
    utcNext.setUTCDate(utcNext.getUTCDate() + 1);
  }
  return utcNext.toISOString();
};

const KV = ({ label, value, mono = true, tone }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
      {label}
    </span>
    <span
      className={cn(
        'truncate text-[13px] font-medium',
        mono ? 'tabular-nums' : '',
        tone === 'warn' && 'text-amber-800',
        tone === 'error' && 'text-red-800',
        tone === 'ok' && 'text-emerald-800',
        !tone && 'text-bank-text',
      )}
    >
      {value ?? '—'}
    </span>
  </div>
);

const TimeKV = ({ label, iso }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
      {label}
    </span>
    <span className="truncate text-[13px] font-medium text-bank-text tabular-nums">
      {fmtAbs(iso)}
      {iso ? <span className="ml-2 font-normal text-bank-text-muted">· {fmtRel(iso)}</span> : null}
    </span>
  </div>
);

const NewsOpsTile = () => {
  const [retention, setRetention] = useState(null);
  const [news, setNews] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [errorText, setErrorText] = useState('');
  const [dryRunResult, setDryRunResult] = useState(null);
  const [dryRunBusy, setDryRunBusy] = useState(false);
  // Session 79.4 — Escalation-Rehearsal
  const [rehearsalConfirming, setRehearsalConfirming] = useState(false);
  const [rehearsalBusy, setRehearsalBusy] = useState(false);
  const [rehearsalResult, setRehearsalResult] = useState(null);
  const lastFetchRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setState('loading');
    try {
      const [r1, r2] = await Promise.all([
        api.get('/news/admin/retention/status'),
        api.get('/news/admin/status'),
      ]);
      setRetention(r1.data);
      setNews(r2.data);
      setState('ready');
      setErrorText('');
      lastFetchRef.current = Date.now();
    } catch (err) {
      const status = err?.response?.status;
      const msg = status ? `Status ${status}` : (err?.message || 'unbekannter Fehler');
      if (!silent) {
        setErrorText(msg);
        setState('error');
      }
      // eslint-disable-next-line no-console
      console.warn('[NewsOpsTile] fetch failed', msg);
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

  const runDryRun = async () => {
    setDryRunBusy(true);
    setDryRunResult(null);
    try {
      const res = await api.post('/news/admin/retention/archive?dry_run=true');
      setDryRunResult(res.data);
    } catch (err) {
      const status = err?.response?.status;
      setDryRunResult({
        error: status ? `Status ${status}` : (err?.message || 'unbekannter Fehler'),
      });
    } finally {
      setDryRunBusy(false);
    }
  };

  const runRehearsal = async () => {
    if (rehearsalBusy) return;
    setRehearsalBusy(true);
    setRehearsalResult(null);
    try {
      const res = await api.post('/news/admin/alerts/escalation/test');
      setRehearsalResult(res.data);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      setRehearsalResult({
        ok: false,
        action: 'send_failed',
        error: detail || (status ? `Status ${status}` : (err?.message || 'unbekannter Fehler')),
      });
    } finally {
      setRehearsalBusy(false);
      setRehearsalConfirming(false);
    }
  };

  // --- Derived state --------------------------------------------------------
  const alert = news?.alert || {};
  const alertActive = Boolean(alert.active);
  const escalationSent = Boolean(alert.escalation_sent_at);
  const escalationDue = Boolean(alert.escalation_due);
  const incidentAgeMin = Number.isFinite(alert.incident_age_minutes)
    ? alert.incident_age_minutes
    : null;

  const lastRetentionSummary = retention?.last_summary || null;
  const lastRetentionErrors = Number(lastRetentionSummary?.errors ?? 0);
  const retentionStatus = !retention?.last_success_at
    ? 'pending'
    : lastRetentionErrors > 0
      ? 'error'
      : 'ok';

  const headerTone = state === 'error'
    ? { bar: 'bg-red-50 text-red-800 border-red-300', dot: 'bg-red-500', label: 'API-Fehler', Icon: AlertCircle }
    : alertActive
      ? escalationDue || escalationSent
        ? { bar: 'bg-red-50 text-red-800 border-red-300', dot: 'bg-red-500', label: 'Alarm · Eskalation', Icon: ShieldAlert }
        : { bar: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500', label: 'Alarm aktiv', Icon: ShieldAlert }
      : { bar: 'bg-bank-mint text-bank-primary-strong border-bank-primary/45', dot: 'bg-bank-primary', label: 'Healthy', Icon: ShieldCheck };
  const HeaderIcon = headerTone.Icon;

  return (
    <section
      data-testid="admin-news-ops-tile"
      className="mb-10 overflow-hidden rounded-lg border border-bank-border bg-white shadow-editorial-sm"
    >
      {/* Status bar */}
      <div className={cn('flex items-center justify-between border-b px-5 py-3', headerTone.bar)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            {alertActive && (
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-40', headerTone.dot)} />
            )}
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', headerTone.dot)} />
          </span>
          <HeaderIcon size={15} strokeWidth={1.75} aria-hidden />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em]">
            News-Ops · {headerTone.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => load(false)}
          data-testid="admin-news-ops-refresh"
          className="inline-flex items-center gap-1.5 rounded border border-current/30 bg-white/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
          aria-label="News-Ops manuell aktualisieren"
        >
          <RefreshCw size={11} strokeWidth={1.75} className={state === 'loading' ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Body */}
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        {state === 'error' ? (
          <div className="lg:col-span-2">
            <p className="text-[13px] text-red-800" data-testid="admin-news-ops-error">
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
            {/* Retention column */}
            <div
              className="flex flex-col gap-3 border-l-2 border-bank-primary/30 pl-4"
              data-testid="admin-news-ops-retention"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong">
                  <Archive size={12} strokeWidth={1.75} aria-hidden />
                  Retention · 90 Tage
                </p>
                <button
                  type="button"
                  onClick={runDryRun}
                  disabled={dryRunBusy}
                  data-testid="admin-news-ops-dry-run"
                  className="inline-flex items-center gap-1.5 rounded border border-bank-border bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-primary disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Retention Dry-Run auslösen"
                  title="Zählt Kandidaten ohne DB-Änderung"
                >
                  <PlayCircle size={11} strokeWidth={1.75} className={dryRunBusy ? 'animate-pulse' : ''} />
                  Dry-Run
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <KV label="Live-Artikel" value={retention?.live_count ?? '—'} />
                <KV label="Archiv" value={retention?.archive_count ?? '—'} />
                <KV
                  label="Beim letzten Lauf archiviert"
                  value={lastRetentionSummary?.archived ?? (retention?.last_success_at ? 0 : '—')}
                />
                <KV
                  label="Status"
                  tone={retentionStatus === 'error' ? 'error' : retentionStatus === 'ok' ? 'ok' : undefined}
                  value={
                    retentionStatus === 'error'
                      ? `Fehler (${lastRetentionErrors})`
                      : retentionStatus === 'ok'
                        ? 'OK'
                        : 'noch kein Lauf'
                  }
                />
              </div>

              <TimeKV label="Letzter Lauf" iso={retention?.last_success_at} />
              <TimeKV label="Nächster Cron (03:15 UTC)" iso={nextRetentionRunIso()} />

              {dryRunResult && (
                <div
                  data-testid="admin-news-ops-dry-run-result"
                  className={cn(
                    'mt-1 rounded border px-3 py-2 text-[12px]',
                    dryRunResult.error
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-bank-border bg-bank-panel text-bank-text',
                  )}
                >
                  {dryRunResult.error ? (
                    <span>Dry-Run fehlgeschlagen: {dryRunResult.error}</span>
                  ) : (
                    <span>
                      Dry-Run: <b>{dryRunResult.candidates ?? 0}</b> Kandidat(en) über {dryRunResult.retention_days} Tage.
                      {dryRunResult.candidates > 0 && dryRunResult.oldest_candidate?.published_at ? (
                        <> Ältester: {fmtAbs(dryRunResult.oldest_candidate.published_at)}.</>
                      ) : null}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Incident / Escalation column */}
            <div
              className="flex flex-col gap-3 border-l-2 border-bank-primary/30 pl-4"
              data-testid="admin-news-ops-incident"
            >
              <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.24em] text-bank-primary-strong">
                {alertActive ? (
                  <ShieldAlert size={12} strokeWidth={1.75} aria-hidden />
                ) : (
                  <ShieldCheck size={12} strokeWidth={1.75} aria-hidden />
                )}
                Pipeline-Incident
              </p>

              {!alertActive ? (
                <p className="text-[13px] text-bank-text">
                  Keine offenen Incidents.
                  <span className="ml-1 text-bank-text-muted">
                    Freshness: <b className="uppercase tabular-nums">{news?.freshness || '—'}</b>
                  </span>
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <KV
                    label="Läuft seit"
                    tone="warn"
                    value={incidentAgeMin !== null ? fmtDurationMinutes(incidentAgeMin) : '—'}
                  />
                  <KV
                    label="Aktueller Status"
                    tone={alert.last_status === 'error' ? 'error' : 'warn'}
                    value={(alert.last_status || '—').toString().toUpperCase()}
                  />
                </div>
              )}

              <TimeKV label="Incident-Start" iso={alert.incident_started_at} />
              <TimeKV label="Erstalarm gesendet" iso={alert.first_alert_sent_at} />

              <div className="grid grid-cols-2 gap-3">
                <KV
                  label="Eskalation gesendet"
                  tone={escalationSent ? 'error' : undefined}
                  value={
                    escalationSent
                      ? fmtAbs(alert.escalation_sent_at)
                      : escalationDue
                        ? 'fällig · noch nicht'
                        : 'nein'
                  }
                />
                <KV
                  label="Eskalation fällig"
                  tone={escalationDue && !escalationSent ? 'error' : undefined}
                  value={
                    escalationDue && !escalationSent
                      ? `ja · ≥ ${alert.escalation_threshold_hours ?? 6}h`
                      : 'nein'
                  }
                />
              </div>

              {alert.last_escalation_error ? (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                  Letzter Escalation-Versandfehler: {alert.last_escalation_error}
                </div>
              ) : null}

              {/* Session 79.4 — Rehearsal: Test-Eskalationsmail */}
              <div className="mt-2 border-t border-bank-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">
                    Rehearsal
                  </p>
                  {!rehearsalConfirming && !rehearsalBusy && (
                    <button
                      type="button"
                      onClick={() => { setRehearsalConfirming(true); setRehearsalResult(null); }}
                      data-testid="admin-news-ops-rehearsal-btn"
                      className="inline-flex items-center gap-1.5 rounded border border-bank-border bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-primary"
                      title="Testmail an NEWS_ALERT_ESCALATION_TO — verändert keinen Incident-State"
                    >
                      <Send size={11} strokeWidth={1.75} />
                      Test-Eskalationsmail
                    </button>
                  )}
                </div>

                {rehearsalConfirming && (
                  <div
                    data-testid="admin-news-ops-rehearsal-confirm"
                    className="mt-2 rounded border border-bank-border bg-bank-panel px-3 py-2 text-[12px] text-bank-text"
                  >
                    <p className="mb-2">
                      Es wird eine <b>[TEST]</b>-Mail an den konfigurierten Eskalations­verteiler
                      versendet. Kein Incident-State wird verändert.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={runRehearsal}
                        disabled={rehearsalBusy}
                        data-testid="admin-news-ops-rehearsal-confirm-yes"
                        className="inline-flex items-center gap-1.5 rounded border border-bank-primary bg-bank-primary px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-bank-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send size={11} strokeWidth={1.75} className={rehearsalBusy ? 'animate-pulse' : ''} />
                        {rehearsalBusy ? 'Sende…' : 'Ja, Testmail senden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRehearsalConfirming(false)}
                        disabled={rehearsalBusy}
                        data-testid="admin-news-ops-rehearsal-cancel"
                        className="inline-flex items-center gap-1.5 rounded border border-bank-border bg-white px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text hover:border-bank-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}

                {rehearsalResult && (
                  <div
                    data-testid="admin-news-ops-rehearsal-result"
                    className={cn(
                      'mt-2 rounded border px-3 py-2 text-[12px]',
                      rehearsalResult.ok
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-red-200 bg-red-50 text-red-800',
                    )}
                  >
                    {rehearsalResult.ok ? (
                      <span>
                        Rehearsal versendet — {rehearsalResult.delivered} von {rehearsalResult.attempted} Empfänger(n) bestätigt.
                      </span>
                    ) : rehearsalResult.action === 'no_recipients' ? (
                      <span>
                        Kein Eskalations-Verteiler konfiguriert. Setze <code>NEWS_ALERT_ESCALATION_TO</code>, um die Zustell-Pipeline zu testen.
                      </span>
                    ) : (
                      <span>
                        Rehearsal fehlgeschlagen: {rehearsalResult.error || 'unbekannter Fehler'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default NewsOpsTile;
