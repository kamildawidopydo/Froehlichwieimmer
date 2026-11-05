import React from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

export const EVENT_META = {
  page_view: { label: 'Seitenaufruf', tone: 'slate' },
  click: { label: 'Klick', tone: 'blue' },
  rage_click: { label: 'Rage-Klick', tone: 'rose' },
  dead_click: { label: 'Dead Click', tone: 'amber' },
  scroll_depth: { label: 'Scroll', tone: 'emerald' },
  outbound_click: { label: 'Externer Link', tone: 'violet' },
  heartbeat: { label: 'Heartbeat', tone: 'slate' },
  tab_hidden: { label: 'Tab verlassen', tone: 'slate' },
  tab_visible: { label: 'Tab aktiv', tone: 'slate' },
  session_end: { label: 'Session Ende', tone: 'slate' },
  js_error: { label: 'JS-Fehler', tone: 'rose' },
  form_abandon: { label: 'Formular abgebrochen', tone: 'amber' },
  form_field_focus: { label: 'Formular-Fokus', tone: 'blue' },
  form_field_blur: { label: 'Formular-Feld', tone: 'slate' },
  conversion: { label: 'Conversion', tone: 'emerald' },
};

const TONE = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-700',
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  violet: 'bg-violet-100 text-violet-700',
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

const deltaPct = (today, yesterday) => {
  const t = Number(today || 0);
  const y = Number(yesterday || 0);
  if (y === 0) return t > 0 ? 100 : 0;
  return ((t - y) / y) * 100;
};

export function YesterdayComparison({ today, yesterday }) {
  const rows = [
    { label: 'Sessions', today: today.todaySessions, yesterday: yesterday.sessions },
    { label: 'Seitenaufrufe', today: today.todayPageViews, yesterday: yesterday.pageViews },
    { label: 'Unique Besucher', today: today.todayUniqueVisitors, yesterday: yesterday.uniqueVisitors },
    { label: 'Conversions', today: today.conversionsToday, yesterday: yesterday.conversions },
    { label: 'Ø Verweildauer', today: today.avgDurationToday, yesterday: yesterday.avgDuration, suffix: 's' },
    { label: 'Absprungrate', today: today.bounceRateToday, yesterday: yesterday.bounceRate, suffix: '%' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {rows.map((r) => {
        const d = deltaPct(r.today, r.yesterday);
        const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
        const tone = d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-600' : 'text-bank-text-muted';
        return (
          <div key={r.label} className="rounded-xl border border-bank-border bg-bank-bg/20 p-3">
            <p className="text-[10px] uppercase text-bank-text-muted tracking-wider">{r.label}</p>
            <p className="text-lg font-bold text-bank-text tabular-nums mt-0.5">
              {formatInt(r.today)}{r.suffix || ''}
            </p>
            <p className="text-[10px] text-bank-text-muted">Gestern: {formatInt(r.yesterday)}{r.suffix || ''}</p>
            <p className={`text-xs font-medium mt-1 inline-flex items-center gap-0.5 ${tone}`}>
              <Icon size={12} />
              {d >= 0 ? '+' : ''}{d.toFixed(1)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function KpiCard({ label, value, sub, icon: Icon, tone, pulse }) {
  const tones = {
    primary: 'bg-bank-primary/10 text-bank-primary',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    rose: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  const t = tones[tone] || tones.primary;
  return (
    <div className="bg-bank-surface border border-bank-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-bank-text-muted uppercase tracking-wider font-medium">{label}</p>
        <div className={`w-7 h-7 rounded-md ${t} flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-xl font-bold text-bank-text tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-bank-text-muted mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export function RankList({ items, empty, compact, suffix = '' }) {
  if (!items?.length) {
    return <p className="text-sm text-bank-text-muted">{empty}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`}>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-bank-text">{item.label}</span>
            <span className="shrink-0 tabular-nums text-bank-text-muted text-xs">
              {formatInt(item.value)}{suffix ? ` ${suffix}` : ''}
            </span>
          </div>
          {item.sub && <p className="text-[10px] text-bank-text-muted truncate">{item.sub}</p>}
          {!compact && (
            <div className="mt-1 h-1 bg-bank-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-bank-primary/40 rounded-full"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function EventRow({ event, onSessionClick }) {
  const meta = EVENT_META[event.event_type] || { label: event.event_type, tone: 'slate' };
  const payload = event.event_payload || {};
  const isProblem = ['rage_click', 'dead_click', 'js_error', 'form_abandon'].includes(event.event_type);

  let detail = event.page_path || '';
  if (event.event_type === 'page_view') {
    detail = payload.title ? `${payload.path || event.page_path} — ${payload.title}` : detail;
  } else if (event.event_type === 'click' || event.event_type === 'rage_click' || event.event_type === 'dead_click') {
    detail = `"${payload.label || payload.tag || 'Element'}" @ ${event.page_path}`;
    if (payload.x != null) detail += ` (${payload.x}, ${payload.y})`;
  } else if (event.event_type === 'scroll_depth') {
    detail = `${payload.depth}% auf ${event.page_path}`;
  } else if (event.event_type === 'outbound_click') {
    detail = payload.href || '';
  } else if (event.event_type === 'js_error') {
    detail = `${payload.message || 'Fehler'}${payload.source ? ` · ${payload.source}` : ''}`;
  } else if (event.event_type === 'form_abandon') {
    detail = `Formular ${payload.formId || ''} — Felder: ${(payload.fieldsTouched || []).join(', ')}`;
  } else if (event.event_type === 'conversion') {
    detail = `Ziel: ${payload.goal || 'unknown'}${payload.product ? ` (${payload.product})` : ''}`;
  } else if (event.event_type === 'form_field_focus' || event.event_type === 'form_field_blur') {
    detail = `${payload.field || 'Feld'} @ ${event.page_path}`;
  }

  return (
    <div className={`px-5 py-3 flex items-start gap-3 ${isProblem ? 'bg-rose-50/40' : 'hover:bg-bank-bg/30'}`}>
      <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide ${TONE[meta.tone]}`}>
        {isProblem && <AlertTriangle size={10} />}
        {meta.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-bank-text truncate">{detail}</p>
        <p className="text-[10px] text-bank-text-muted font-mono truncate">
          <button
            type="button"
            onClick={() => onSessionClick?.(event.session_id)}
            className="hover:text-bank-primary hover:underline"
          >
            Session {String(event.session_id).slice(0, 8)}…
          </button>
          {payload.selector && ` · ${payload.selector}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-bank-text-muted whitespace-nowrap">{formatTime(event.created_at)}</p>
        <p className="text-[10px] text-bank-text-muted">{formatRelative(event.created_at)}</p>
      </div>
    </div>
  );
}

export function FunnelChart({ steps }) {
  if (!steps?.length) {
    return <p className="text-sm text-bank-text-muted">Noch keine Funnel-Daten</p>;
  }
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="space-y-2.5">
      {steps.map((s) => (
        <div key={s.path}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-bank-text font-medium">{s.step}</span>
            <span className="text-bank-text-muted tabular-nums text-xs">
              {formatInt(s.count)} · {s.rate}%
            </span>
          </div>
          <div className="h-2 bg-bank-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500/70 rounded-full transition-all"
              style={{ width: `${(s.count / max) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-bank-text-muted mt-0.5 font-mono">{s.path}</p>
        </div>
      ))}
    </div>
  );
}

export function HeatmapPanel({ points }) {
  if (!points?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-bank-text-muted border border-dashed border-bank-border rounded-lg">
        Noch keine Klickdaten für diese Seite
      </div>
    );
  }
  const vw = points[0]?.vw || 1200;
  const vh = points[0]?.vh || 800;
  const maxHits = Math.max(...points.map((p) => p.hits), 1);

  return (
    <div
      className="relative h-56 bg-slate-100 border border-bank-border rounded-lg overflow-hidden"
      style={{ aspectRatio: `${vw} / ${vh}` }}
    >
      {points.map((p, i) => {
        const left = ((p.bx * 40) / vw) * 100;
        const top = ((p.by * 40) / vh) * 100;
        const intensity = p.hits / maxHits;
        return (
          <div
            key={`${p.bx}-${p.by}-${i}`}
            title={`${p.hits} Klicks`}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${Math.max(12, 20 * intensity)}px`,
              height: `${Math.max(12, 20 * intensity)}px`,
              backgroundColor: `rgba(239, 68, 68, ${0.25 + intensity * 0.65})`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </div>
  );
}
