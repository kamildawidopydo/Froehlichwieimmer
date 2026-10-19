// Session 93 · Phase 5 — Admin-Dashboard für die Savings-Comparison-Plattform.
// Read-only KPIs. Kein Demo-Mode-Toggle: das Backend besitzt (noch) keinen
// authentifizierten Write-Endpoint dafür, deshalb wird der Status ausschliesslich
// angezeigt und die Umschaltung erfolgt via ENV/Deploy.
import React, { useEffect, useState, useCallback } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  RefreshCw, LayoutDashboard, Building2, CircleGauge, Activity,
  AlertTriangle, BadgeCheck, Clock, ShieldAlert, Database, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const fetchDashboard = async () => {
  const _axios = (await import('axios')).default;
  const _api = (await import('@/lib/apiBase')).getApiBase();
  const { data } = await _axios.get(`${_api}/api/admin/savings/dashboard`, {
    withCredentials: true,
  });
  return data;
};

function KpiTile({ label, value, hint, icon: Icon, tone = 'neutral', testid }) {
  const toneMap = {
    neutral: 'text-bank-text',
    warn: 'text-amber-700',
    danger: 'text-red-700',
    success: 'text-emerald-700',
    info: 'text-bank-primary',
  };
  return (
    <div
      data-testid={testid}
      className="relative border border-bank-border bg-white p-5 transition-shadow duration-300 hover:shadow-editorial-sm"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/25 to-transparent"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
            {label}
          </p>
          <p className={`mt-3 font-display text-[1.9rem] font-light leading-none tabular-nums ${toneMap[tone]}`}>
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-[12px] leading-snug text-bank-text-muted">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-bank-border bg-bank-bg/40 text-bank-text-muted">
            <Icon size={16} strokeWidth={1.5} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { to: '/admin/savings/reviews', label: 'Review-Queue', icon: ShieldAlert, hint: 'offene Vorschläge prüfen' },
  { to: '/admin/savings/import', label: 'Import', icon: Database, hint: 'JSON/CSV Upload → Dry-Run → Apply' },
  { to: '/admin/savings/sources', label: 'Datenquellen', icon: BadgeCheck, hint: 'Trust-Level, Provider, Monitoring' },
  { to: '/admin/savings/audit', label: 'Audit-Log', icon: Activity, hint: 'jede Admin-Aktion nachvollziehen' },
  { to: '/admin/savings/demo-replace', label: 'Demo → Real', icon: ArrowRight, hint: 'Demo-Angebot mit echten Daten ersetzen' },
];

export default function AdminSavingsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await fetchDashboard();
      setData(d);
    } catch (err) {
      console.error('savings dashboard', err);
      toast.error('Dashboard konnte nicht geladen werden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cfg = data?.config || {};
  const demoModeEnabled = Boolean(cfg.demo_mode_enabled);
  const totalActive = Number(data?.offers_active || 0);
  const real = Number(data?.offers_real || 0);
  const demo = Number(data?.offers_demo || 0);
  const realShare = totalActive > 0 ? Math.round((real / totalActive) * 100) : 0;

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Sparvergleich"
        title="Daten-Operations Dashboard"
        titleIcon={LayoutDashboard}
        description="Zentrale Übersicht über Datenqualität, Freshness, Reviews und Imports. Änderungen an Live-Daten erfolgen ausschliesslich über Import + Review-Queue."
      />

      <AdminToolbarCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span
              data-testid="demo-mode-status"
              className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] ${
                demoModeEnabled
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              <span aria-hidden className={`h-[6px] w-[6px] rounded-full ${demoModeEnabled ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              Demo-Mode {demoModeEnabled ? 'aktiv' : 'aus'}
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
              Fresh ≤ {cfg.fresh_max_days ?? '–'}d · Stale ≤ {cfg.stale_max_days ?? '–'}d · Review ab Δ {cfg.rate_delta_review_pp ?? '–'}pp
            </span>
          </div>
          <Button
            variant="outline"
            onClick={load}
            disabled={refreshing}
            data-testid="savings-dashboard-refresh"
            className="gap-2"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Aktualisieren
          </Button>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-bank-text-muted">
          Der Demo-Mode wird über ENV <code className="font-mono">DEMO_MODE_ENABLED</code> gesteuert. Ein UI-Toggle ist bewusst
          nicht vorhanden — Änderungen erfordern einen Deploy mit expliziter Freigabe.
        </p>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-bank-text-muted/70" />
            <p className="text-sm text-bank-text-muted">Dashboard wird geladen…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile testid="kpi-banks-active" label="Aktive Banken" value={data?.banks_active ?? 0} icon={Building2} />
            <KpiTile testid="kpi-offers-active" label="Aktive Angebote" value={totalActive} icon={CircleGauge} />
            <KpiTile testid="kpi-offers-real" label="Real" value={real} hint={`${realShare}% des Gesamtbestands`} icon={BadgeCheck} tone="success" />
            <KpiTile testid="kpi-offers-demo" label="Demo" value={demo} hint="explizit als Demo-Datensatz markiert" icon={Database} tone={demo > 0 ? 'warn' : 'neutral'} />

            <KpiTile testid="kpi-fresh" label="Fresh" value={data?.fresh ?? 0} hint="verifiziert innerhalb Fresh-Fenster" icon={BadgeCheck} tone="success" />
            <KpiTile testid="kpi-stale" label="Stale" value={data?.stale ?? 0} hint="prüfen empfohlen" icon={Clock} tone="warn" />
            <KpiTile testid="kpi-expired" label="Expired" value={data?.expired ?? 0} hint="valid_until überschritten" icon={AlertTriangle} tone="danger" />
            <KpiTile testid="kpi-needs-review" label="Needs Review" value={data?.needs_review_open ?? 0} hint="offene Vorschläge" icon={ShieldAlert} tone={data?.needs_review_open ? 'danger' : 'neutral'} />

            <KpiTile testid="kpi-imports-24h" label="Imports · 24h" value={data?.imports_24h ?? 0} icon={Activity} />
            <KpiTile testid="kpi-imports-failed-24h" label="Imports fehlgeschlagen · 24h" value={data?.imports_failed_24h ?? 0} tone={data?.imports_failed_24h ? 'danger' : 'neutral'} icon={AlertTriangle} />
            <KpiTile
              testid="kpi-quality-real-share"
              label="Data-Quality · Real-Anteil"
              value={`${realShare}%`}
              hint={`${real} real / ${demo} demo`}
              icon={BadgeCheck}
              tone={realShare >= 80 ? 'success' : realShare >= 40 ? 'warn' : 'danger'}
            />
            <KpiTile
              testid="kpi-demo-mode"
              label="Demo-Mode ENV"
              value={demoModeEnabled ? 'AN' : 'AUS'}
              hint="steuert Sichtbarkeit im Public API"
              icon={Database}
              tone={demoModeEnabled ? 'warn' : 'success'}
            />
          </div>
        )}
      </AdminSurfaceCard>

      <AdminSurfaceCard className="mt-6">
        <div className="border-b border-bank-border/70 px-5 py-4">
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">Werkzeuge</p>
          <h2 className="mt-2 font-display text-[1.15rem] font-light text-bank-text">Schnellzugriff</h2>
        </div>
        <ul className="divide-y divide-bank-border/60">
          {QUICK_LINKS.map((q) => (
            <li key={q.to}>
              <Link
                to={q.to}
                data-testid={`quick-${q.to.split('/').pop()}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-bank-bg/40"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center border border-bank-border bg-bank-bg/40 text-bank-text-muted">
                    <q.icon size={15} strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-bank-text">{q.label}</p>
                    <p className="text-[12px] text-bank-text-muted">{q.hint}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-bank-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
}
