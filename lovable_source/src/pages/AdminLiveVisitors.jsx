import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VisitorSessionDetailModal from '@/components/admin/VisitorSessionDetailModal';
import {
  YesterdayComparison,
  KpiCard,
  RankList,
  EventRow,
  FunnelChart,
  HeatmapPanel,
} from '@/components/admin/LiveVisitorWidgets';
import {
  exportActiveSessionsCsv,
  exportEventsCsv,
  exportOverviewCsv,
} from '@/lib/visitorAnalyticsExport';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  AdminToolbarCard,
} from '@/components/admin/AdminSubpageChrome';
import {
  Radio,
  Users,
  Eye,
  MousePointerClick,
  Flame,
  Ghost,
  Timer,
  RefreshCw,
  Monitor,
  Smartphone,
  Globe,
  AlertTriangle,
  Activity,
  Filter,
  Target,
  Bug,
  Megaphone,
  Bot,
  Download,
  Bell,
  BellOff,
  MapPin,
  TrendingUp,
} from 'lucide-react';

const POLL_MS = 1000;
const ACTIVE_SECONDS = 120;
const REALTIME_REFETCH_MS = 400;
const CONVERSION_ALERTS_KEY = 'br_admin_conversion_alerts';

const playConversionChime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    /* optional */
  }
};

const formatInt = (v) => Number(v || 0).toLocaleString('de-DE');

const formatTime = (iso) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatRelative = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 5) return 'gerade eben';
  if (diff < 60) return `vor ${Math.floor(diff)} s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} min`;
  return `vor ${Math.floor(diff / 3600)} h`;
};

const formatDuration = (sec) => {
  const s = Number(sec || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
};

const emptyOverview = {
  liveNow: 0,
  todaySessions: 0,
  todayPageViews: 0,
  todayUniqueVisitors: 0,
  weekSessions: 0,
  avgDurationToday: 0,
  bounceRateToday: 0,
  rageClicksToday: 0,
  deadClicksToday: 0,
  jsErrorsToday: 0,
  formAbandonmentsToday: 0,
  conversionsToday: 0,
  botsFilteredToday: 0,
  rageSpikeActive: false,
  rageRecent10m: 0,
  topPages: [],
  topClicks: [],
  funnel: [],
  conversionsByGoal: [],
  utmCampaigns: [],
  heatmapPoints: [],
  deviceBreakdown: [],
  referrers: [],
  hourlyToday: [],
  sessionsLast30m: [],
  yesterdayComparison: {},
  countriesToday: [],
  ghostSessionCount: 0,
  activeSessions: [],
  recentEvents: [],
};

function AdminLiveVisitors() {
  const [data, setData] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [eventFilter, setEventFilter] = useState('all');
  const [newEventCount, setNewEventCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);
  const [heatmapPath, setHeatmapPath] = useState('/');
  const [pageFilter, setPageFilter] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [conversionAlertsEnabled, setConversionAlertsEnabled] = useState(() => {
    try {
      return localStorage.getItem(CONVERSION_ALERTS_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const channelRef = useRef(null);
  const pollRef = useRef(null);
  const refetchTimerRef = useRef(null);
  const prevConversionsRef = useRef(null);

  const fetchOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: overview, error } = Promise.resolve({data: null, error: null}); // 82.91c neutralized
      if (error) throw error;
      setData({ ...emptyOverview, ...(overview || {}) });
      setLastUpdated(new Date());
      setNewEventCount(0);
      setFetchError(null);
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn('[AdminLiveVisitors]', msg);
      setFetchError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      refetchTimerRef.current = null;
      fetchOverview(true);
    }, REALTIME_REFETCH_MS);
  }, [fetchOverview]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!liveEnabled) {
      if (pollRef.current) clearInterval(pollRef.current);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      if (channelRef.current) {
        channelRef.current = null;
      }
      return undefined;
    }

    pollRef.current = setInterval(() => fetchOverview(true), POLL_MS);

    // Session 82.103c · Realtime-Kanal entfernt (Supabase realtime nicht mehr verwendet — Polling ersetzt).
    channelRef.current = null;

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      if (channelRef.current) {
        channelRef.current = null;
      }
    };
  }, [liveEnabled, fetchOverview, scheduleRefetch, conversionAlertsEnabled]);

  useEffect(() => {
    const curr = data.conversionsToday;
    if (
      prevConversionsRef.current !== null
      && curr > prevConversionsRef.current
      && conversionAlertsEnabled
    ) {
      playConversionChime();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Neue Conversion', {
          body: `${curr} Conversions heute`,
          tag: 'visitor-conversion',
        });
      }
    }
    prevConversionsRef.current = curr;
  }, [data.conversionsToday, conversionAlertsEnabled]);

  const toggleConversionAlerts = useCallback(() => {
    setConversionAlertsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CONVERSION_ALERTS_KEY, String(next));
      } catch {
        /* ignore */
      }
      if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      return next;
    });
  }, []);

  const openSessionDetail = useCallback((sessionId) => {
    setSelectedSessionId(sessionId);
    setSessionModalOpen(true);
  }, []);

  const filteredEvents = useMemo(() => {
    const events = data.recentEvents || [];
    if (eventFilter === 'all') return events.filter((e) => e.event_type !== 'heartbeat');
    if (eventFilter === 'problems') {
      return events.filter((e) =>
        ['rage_click', 'dead_click', 'js_error', 'form_abandon'].includes(e.event_type),
      );
    }
    return events.filter((e) => e.event_type === eventFilter);
  }, [data.recentEvents, eventFilter]);

  const hourlyChart = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, sessions: 0 }));
    (data.hourlyToday || []).forEach((h) => {
      if (h.hour >= 0 && h.hour < 24) hours[h.hour].sessions = h.sessions;
    });
    const max = Math.max(1, ...hours.map((h) => h.sessions));
    return hours.map((h) => ({ ...h, pct: (h.sessions / max) * 100 }));
  }, [data.hourlyToday]);

  const heatmapByPath = useMemo(() => {
    const map = new Map();
    (data.heatmapPoints || []).forEach((p) => {
      const key = p.path || '/';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return map;
  }, [data.heatmapPoints]);

  const pageFilterOptions = useMemo(() => {
    const paths = new Set();
    (data.topPages || []).forEach((p) => { if (p.path) paths.add(p.path); });
    (data.activeSessions || []).forEach((s) => { if (s.current_path) paths.add(s.current_path); });
    return ['all', ...Array.from(paths).sort()];
  }, [data.topPages, data.activeSessions]);

  const filteredActiveSessions = useMemo(() => {
    const sessions = data.activeSessions || [];
    if (pageFilter === 'all') return sessions;
    return sessions.filter((s) => (s.current_path || '').startsWith(pageFilter));
  }, [data.activeSessions, pageFilter]);

  const last30mChart = useMemo(() => {
    const buckets = Array.from({ length: 30 }, (_, i) => ({ minute: 29 - i, sessions: 0 }));
    (data.sessionsLast30m || []).forEach((b) => {
      const idx = 29 - Number(b.minute);
      if (idx >= 0 && idx < 30) buckets[idx].sessions = b.sessions;
    });
    const max = Math.max(1, ...buckets.map((b) => b.sessions));
    return buckets.map((b) => ({ ...b, pct: (b.sessions / max) * 100 }));
  }, [data.sessionsLast30m]);

  useEffect(() => {
    const top = data.topPages?.[0]?.path;
    if (top && !heatmapByPath.has(heatmapPath)) {
      setHeatmapPath(top);
    }
  }, [data.topPages, heatmapByPath, heatmapPath]);

  const kpis = [
    {
      label: 'Live jetzt',
      value: formatInt(data.liveNow),
      sub: 'aktiv (≤2 Min.)',
      icon: Radio,
      tone: 'emerald',
      pulse: data.liveNow > 0,
    },
    {
      label: 'Heute Besucher',
      value: formatInt(data.todaySessions),
      sub: `${formatInt(data.todayUniqueVisitors)} unique Sessions`,
      icon: Users,
      tone: 'blue',
    },
    {
      label: 'Seitenaufrufe heute',
      value: formatInt(data.todayPageViews),
      sub: `${formatInt(data.weekSessions)} diese Woche`,
      icon: Eye,
      tone: 'primary',
    },
    {
      label: 'Ø Verweildauer',
      value: formatDuration(data.avgDurationToday),
      sub: `Absprungrate ${data.bounceRateToday}%`,
      icon: Timer,
      tone: 'slate',
    },
    {
      label: 'Rage-Klicks',
      value: formatInt(data.rageClicksToday),
      sub: 'Frustrations-Signale',
      icon: Flame,
      tone: 'rose',
    },
    {
      label: 'Dead Clicks',
      value: formatInt(data.deadClicksToday),
      sub: 'Klicks ohne Reaktion',
      icon: Ghost,
      tone: 'amber',
    },
    {
      label: 'Conversions',
      value: formatInt(data.conversionsToday),
      sub: 'Ziele heute erreicht',
      icon: Target,
      tone: 'emerald',
    },
    {
      label: 'JS-Fehler',
      value: formatInt(data.jsErrorsToday),
      sub: `${formatInt(data.formAbandonmentsToday)} Form-Abbrüche`,
      icon: Bug,
      tone: 'rose',
    },
    {
      label: 'Bots gefiltert',
      value: formatInt(data.botsFilteredToday),
      sub: 'Heute ausgeschlossen',
      icon: Bot,
      tone: 'slate',
    },
  ];

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Live Analytics"
        title="Besucher Live"
        titleIcon={Radio}
        description="Echtzeit-Tracking: wer ist online, welche Seiten werden besucht, wo klicken Besucher — inkl. Rage- und Dead-Clicks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLiveEnabled((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shadow-sm ${
                liveEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-bank-text-muted border-bank-border'
              }`}
            >
              <Radio size={13} className={liveEnabled ? 'animate-pulse' : ''} />
              {liveEnabled ? 'Live an' : 'Live aus'}
            </button>
            <button
              type="button"
              onClick={toggleConversionAlerts}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shadow-sm ${
                conversionAlertsEnabled
                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : 'bg-white text-bank-text-muted border-bank-border'
              }`}
              title="Ton & Browser-Benachrichtigung bei Conversions"
            >
              {conversionAlertsEnabled ? <Bell size={13} /> : <BellOff size={13} />}
              Conversion-Alarm
            </button>
            <button
              type="button"
              onClick={() => exportOverviewCsv(data)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-bank-border bg-white text-bank-text hover:bg-bank-bg transition-colors shadow-sm"
            >
              <Download size={13} />
              CSV Übersicht
            </button>
            <button
              type="button"
              onClick={() => exportActiveSessionsCsv(filteredActiveSessions)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-bank-border bg-white text-bank-text hover:bg-bank-bg transition-colors shadow-sm"
            >
              <Download size={13} />
              CSV Besucher
            </button>
            <button
              type="button"
              onClick={() => exportEventsCsv(filteredEvents)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-bank-border bg-white text-bank-text hover:bg-bank-bg transition-colors shadow-sm"
            >
              <Download size={13} />
              CSV Events
            </button>
            <button
              type="button"
              onClick={() => fetchOverview()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-bank-border bg-white text-bank-text hover:bg-bank-bg transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Aktualisieren
            </button>
          </div>
        }
      />

      {lastUpdated && (
        <p className="mb-4 text-xs text-bank-text-muted">
          Zuletzt aktualisiert: {formatTime(lastUpdated.toISOString())}
          {liveEnabled && ' · Auto-Refresh jede Sekunde'}
          {newEventCount > 0 && (
            <span className="ml-2 text-emerald-600 font-medium">+{newEventCount} neue Events</span>
          )}
        </p>
      )}

      {fetchError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Daten konnten nicht geladen werden</p>
            <p className="text-xs mt-0.5 font-mono break-all">{fetchError}</p>
            <p className="text-xs mt-1 text-amber-800">
              Prüfen Sie, ob die Supabase-Migrationen (visitor_analytics) angewendet wurden und Sie als Admin eingeloggt sind.
            </p>
          </div>
        </div>
      )}

      {data.ghostSessionCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Ghost size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Ghost-Sessions erkannt</p>
            <p className="text-xs mt-0.5">
              {formatInt(data.ghostSessionCount)} aktive Session(s) ohne Seitenaufruf — möglicherweise
              Tracking-Blocker, Cookie-Ablehnung oder fehlerhafte Initialisierung.
            </p>
          </div>
        </div>
      )}

      {data.rageSpikeActive && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Rage-Klick Alarm</p>
            <p className="text-xs mt-0.5">
              {formatInt(data.rageRecent10m)} Frustrations-Klicks in den letzten 10 Minuten — UI-Probleme prüfen.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <AdminSurfaceCard className="p-5 mb-6">
        <h3 className="text-base font-semibold text-bank-text flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-bank-primary" />
          Heute vs. Gestern
        </h3>
        <YesterdayComparison today={data} yesterday={data.yesterdayComparison || {}} />
      </AdminSurfaceCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        {/* Active sessions */}
        <AdminSurfaceCard className="xl:col-span-2 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-bank-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-bank-text flex items-center gap-2">
                <Activity size={16} className="text-emerald-600" />
                Aktive Besucher
              </h3>
              <p className="text-xs text-bank-text-muted mt-0.5">
                Sessions mit Aktivität in den letzten {ACTIVE_SECONDS / 60} Minuten · Klick für Details
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
                className="text-xs border border-bank-border rounded-lg px-2 py-1.5 bg-white"
              >
                <option value="all">Alle Seiten</option>
                {pageFilterOptions.filter((p) => p !== 'all').map((path) => (
                  <option key={path} value={path}>{path}</option>
                ))}
              </select>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {formatInt(filteredActiveSessions.length)} / {formatInt(data.liveNow)}
              </span>
            </div>
          </div>
          {filteredActiveSessions.length === 0 ? (
            <div className="p-10 text-center text-sm text-bank-text-muted">
              {pageFilter === 'all' ? 'Keine aktiven Besucher' : `Keine Besucher auf ${pageFilter}`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-bank-text-muted border-b border-bank-border">
                    <th className="text-left py-2.5 px-5 font-medium">Besucher</th>
                    <th className="text-left py-2.5 px-2 font-medium">Aktuelle Seite</th>
                    <th className="text-left py-2.5 px-2 font-medium">Quelle / UTM</th>
                    <th className="text-left py-2.5 px-2 font-medium">Gerät / Ort</th>
                    <th className="text-right py-2.5 px-5 font-medium">Scroll / Aktiv</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveSessions.map((s) => {
                    const name = s.user_id
                      ? [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email || 'User'
                      : 'Anonym';
                    const geo = [s.city, s.country].filter(Boolean).join(', ');
                    const utm = [s.utm_source, s.utm_campaign].filter(Boolean).join(' · ');
                    const refShort = s.referrer
                      ? (() => { try { return new URL(s.referrer).hostname; } catch { return s.referrer.slice(0, 30); } })()
                      : 'Direkt';
                    return (
                      <tr
                        key={s.id}
                        onClick={() => openSessionDetail(s.id)}
                        className={`border-t border-bank-border hover:bg-bank-bg/40 cursor-pointer ${s.is_ghost ? 'bg-amber-50/30' : ''}`}
                      >
                        <td className="py-3 px-5">
                          <p className="font-medium text-bank-text truncate max-w-[140px]">{name}</p>
                          <p className="text-[10px] text-bank-text-muted font-mono truncate max-w-[140px]">
                            {String(s.id).slice(0, 8)}…
                            {s.is_ghost && <span className="ml-1 text-amber-600">Ghost</span>}
                          </p>
                        </td>
                        <td className="py-3 px-2">
                          <p className="text-bank-text truncate max-w-[180px]">{s.current_path || '–'}</p>
                          <p className="text-[10px] text-bank-text-muted">{s.page_views} Seiten · {s.browser}</p>
                        </td>
                        <td className="py-3 px-2 text-xs text-bank-text-muted max-w-[160px]">
                          <p className="truncate" title={s.referrer || ''}>{refShort}</p>
                          {utm && <p className="text-[10px] truncate text-violet-600">{utm}</p>}
                        </td>
                        <td className="py-3 px-2 text-xs text-bank-text-muted">
                          {s.device_type === 'mobile' ? (
                            <span className="inline-flex items-center gap-1"><Smartphone size={12} /> Mobile</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><Monitor size={12} /> Desktop</span>
                          )}
                          {geo && (
                            <p className="text-[10px] truncate mt-0.5 inline-flex items-center gap-0.5">
                              <MapPin size={10} /> {geo}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right text-xs text-bank-text-muted whitespace-nowrap">
                          <p className="tabular-nums">{s.scroll_depth > 0 ? `${s.scroll_depth}%` : '–'}</p>
                          <span className="inline-flex items-center justify-end gap-1.5">
                            {(Date.now() - new Date(s.last_seen_at).getTime()) / 1000 < 15 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Gerade aktiv" />
                            )}
                            {formatRelative(s.last_seen_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfaceCard>

        <div className="space-y-4">
          <AdminSurfaceCard className="p-5">
            <h3 className="text-base font-semibold text-bank-text mb-1">Live (letzte 30 Min.)</h3>
            <p className="text-xs text-bank-text-muted mb-3">Aktive Sessions pro Minute</p>
            <div className="flex items-end gap-px h-28">
              {last30mChart.map((b) => (
                <div key={b.minute} className="flex-1 flex flex-col items-center min-w-0">
                  <div
                    className="w-full bg-emerald-500/30 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(b.pct, b.sessions > 0 ? 6 : 0)}%` }}
                    title={`vor ${b.minute} min — ${b.sessions} Sessions`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-bank-text-muted mt-1">
              <span>−30 min</span>
              <span>jetzt</span>
            </div>
          </AdminSurfaceCard>

          {/* Hourly chart */}
          <AdminSurfaceCard className="p-5">
          <h3 className="text-base font-semibold text-bank-text mb-1">Besucher heute (Stunden)</h3>
          <p className="text-xs text-bank-text-muted mb-4">Sessions pro Stunde (Europe/Berlin)</p>
          <div className="flex items-end gap-0.5 h-32">
            {hourlyChart.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full bg-bank-primary/20 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(h.pct, h.sessions > 0 ? 4 : 0)}%` }}
                  title={`${h.hour}:00 — ${h.sessions} Sessions`}
                />
                {h.hour % 4 === 0 && (
                  <span className="text-[9px] text-bank-text-muted">{h.hour}</span>
                )}
              </div>
            ))}
          </div>
        </AdminSurfaceCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <AdminSurfaceCard className="p-5">
          <h3 className="text-base font-semibold text-bank-text flex items-center gap-2 mb-3">
            <Target size={16} className="text-emerald-600" /> Conversion-Funnel (heute)
          </h3>
          <FunnelChart steps={data.funnel || []} />
        </AdminSurfaceCard>

        <AdminSurfaceCard className="p-5">
          <h3 className="text-base font-semibold text-bank-text flex items-center gap-2 mb-3">
            <Megaphone size={16} className="text-bank-primary" /> UTM-Kampagnen
          </h3>
          {(data.utmCampaigns || []).length === 0 ? (
            <p className="text-sm text-bank-text-muted">Keine UTM-Parameter heute</p>
          ) : (
            <div className="space-y-2">
              {(data.utmCampaigns || []).map((u, i) => (
                <div key={`${u.source}-${u.campaign}-${i}`} className="text-sm border-b border-bank-border pb-2 last:border-0">
                  <p className="font-medium text-bank-text truncate">{u.campaign}</p>
                  <p className="text-[10px] text-bank-text-muted">{u.source} · {u.medium}</p>
                  <p className="text-xs text-bank-text-muted tabular-nums">{formatInt(u.sessions)} Sessions</p>
                </div>
              ))}
            </div>
          )}
        </AdminSurfaceCard>

        <AdminSurfaceCard className="p-5">
          <h3 className="text-base font-semibold text-bank-text flex items-center gap-2 mb-3">
            <Target size={16} className="text-bank-primary" /> Conversions nach Ziel
          </h3>
          <RankList
            items={(data.conversionsByGoal || []).map((c) => ({
              label: c.goal,
              value: c.count,
            }))}
            empty="Noch keine Conversions"
            compact
          />
        </AdminSurfaceCard>
      </div>

      <AdminSurfaceCard className="p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-bank-text flex items-center gap-2">
              <MousePointerClick size={16} className="text-bank-primary" /> Klick-Heatmap (heute)
            </h3>
            <p className="text-xs text-bank-text-muted mt-0.5">Aggregierte Klickzonen (40px Raster)</p>
          </div>
          <select
            value={heatmapPath}
            onChange={(e) => setHeatmapPath(e.target.value)}
            className="text-xs border border-bank-border rounded-lg px-2 py-1.5 bg-white"
          >
            {[...(data.topPages || []).map((p) => p.path), ...(heatmapByPath.has(heatmapPath) ? [] : [heatmapPath])]
              .filter((v, i, a) => v && a.indexOf(v) === i)
              .map((path) => (
                <option key={path} value={path}>{path}</option>
              ))}
          </select>
        </div>
        <HeatmapPanel points={(heatmapByPath.get(heatmapPath) || []).slice(0, 40)} />
      </AdminSurfaceCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <AdminSurfaceCard className="p-5">
          <h3 className="text-base font-semibold text-bank-text flex items-center gap-2 mb-3">
            <Eye size={16} className="text-bank-primary" /> Top Seiten heute
          </h3>
          <RankList
            items={(data.topPages || []).map((p) => ({
              label: p.path,
              value: p.views,
              suffix: 'Aufrufe',
            }))}
            empty="Noch keine Seitenaufrufe"
          />
        </AdminSurfaceCard>

        <AdminSurfaceCard className="p-5">
          <h3 className="text-base font-semibold text-bank-text flex items-center gap-2 mb-3">
            <MousePointerClick size={16} className="text-bank-primary" /> Top Klicks
          </h3>
          <RankList
            items={(data.topClicks || []).map((c) => ({
              label: c.label || c.selector,
              sub: c.path,
              value: c.clicks,
              suffix: 'Klicks',
            }))}
            empty="Noch keine Klickdaten"
          />
        </AdminSurfaceCard>

        <AdminSurfaceCard className="p-5">
          <h3 className="text-base font-semibold text-bank-text flex items-center gap-2 mb-3">
            <Globe size={16} className="text-bank-primary" /> Quellen & Geräte
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-bank-text-muted mb-2">Referrer</p>
              <RankList
                items={(data.referrers || []).map((r) => ({
                  label: r.source === 'direct' ? 'Direkt / Bookmark' : r.source,
                  value: r.count,
                }))}
                empty="–"
                compact
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-bank-text-muted mb-2">Geräte</p>
              <RankList
                items={(data.deviceBreakdown || []).map((d) => ({
                  label: d.device,
                  value: d.count,
                }))}
                empty="–"
                compact
              />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-bank-text-muted mb-2">Länder heute</p>
              <RankList
                items={(data.countriesToday || []).map((c) => ({
                  label: c.country,
                  value: c.count,
                }))}
                empty="–"
                compact
              />
            </div>
          </div>
        </AdminSurfaceCard>
      </div>

      {/* Live event feed */}
      <AdminToolbarCard className="mb-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-bank-text-muted" />
          {[
            { key: 'all', label: 'Alle' },
            { key: 'page_view', label: 'Seiten' },
            { key: 'click', label: 'Klicks' },
            { key: 'problems', label: 'Probleme' },
            { key: 'rage_click', label: 'Rage' },
            { key: 'scroll_depth', label: 'Scroll' },
            { key: 'conversion', label: 'Conversion' },
            { key: 'js_error', label: 'Fehler' },
            { key: 'form_abandon', label: 'Formular' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setEventFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                eventFilter === f.key
                  ? 'bg-bank-ink text-white border-bank-ink'
                  : 'bg-white text-bank-text-muted border-bank-border hover:bg-bank-bg'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-bank-border">
          <h3 className="text-base font-semibold text-bank-text">Live Event-Feed</h3>
          <p className="text-xs text-bank-text-muted mt-0.5">Klicks, Seitenwechsel, Scroll-Tiefen, Frustrations-Signale</p>
        </div>
        {filteredEvents.length === 0 ? (
          <div className="p-10 text-center text-sm text-bank-text-muted">Keine Events im Filter</div>
        ) : (
          <div className="divide-y divide-bank-border max-h-[520px] overflow-y-auto">
            {filteredEvents.map((ev) => (
              <EventRow key={ev.id} event={ev} onSessionClick={openSessionDetail} />
            ))}
          </div>
        )}
      </AdminSurfaceCard>

      <VisitorSessionDetailModal
        sessionId={selectedSessionId}
        open={sessionModalOpen}
        onOpenChange={setSessionModalOpen}
      />
    </AdminSubpageLayout>
  );
}

export default AdminLiveVisitors;
