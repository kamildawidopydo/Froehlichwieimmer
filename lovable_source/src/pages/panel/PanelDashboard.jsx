import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, Kpi, eur, dt, KycBadge } from './_ui';

export default function PanelDashboard() {
  const { data, error, loading, reload } = useLoad(() => panelApi.get('dashboard'));
  const k = data?.kpis || {};
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader eyebrow="Admin" title="Dashboard" titleIcon={LayoutGrid} backTo="/" description="Kennzahlen zu Kunden, Depots, Aufträgen und Verifizierungen." />
      <State loading={loading} error={error} onRetry={reload}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <Kpi label="Kunden gesamt" value={k.customers_total} hint={`${k.new_customers_30d} neu in 30 Tagen`} />
          <Kpi label="Verifiziert" value={k.verified} />
          <Kpi label="Verifizierung ausstehend" value={k.pending} hint={`${k.review_pending} warten auf Prüfung`} />
          <Kpi label="Abgelehnt" value={k.rejected} />
          <Kpi label="Gesamtwert aller Depots" value={eur(k.depot_value_total)} hint="Marktpreis, sonst Buchungswert" />
          <Kpi label="Volumen Käufe" value={eur(k.volume_buy)} />
          <Kpi label="Volumen Verkäufe" value={eur(k.volume_sell)} />
          <Kpi label="Transaktionen offen / abgeschlossen" value={`${k.tx_open} / ${k.tx_done}`} />
          <Kpi label="Zu prüfende Dokumente" value={k.documents_pending} />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AdminSurfaceCard className="p-5">
            <h2 className="mb-3 font-display text-lg">Warten auf Freigabe</h2>
            {(data?.awaiting || []).length === 0 ? <p className="text-sm text-bank-text-muted">Niemand wartet auf eine Prüfung.</p> : (
              <ul className="divide-y divide-bank-border/60">
                {data.awaiting.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link to={`/admin/kunden/${c.id}`} className="hover:underline">{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email} <span className="text-bank-text-muted">· {c.customer_no}</span></Link>
                    <KycBadge s={c.kyc_status} />
                  </li>
                ))}
              </ul>
            )}
            <Link to="/admin/kyc" className="mt-3 inline-block text-sm text-bank-primary hover:underline">Zur KYC-Prüfung →</Link>
          </AdminSurfaceCard>
          <AdminSurfaceCard className="p-5">
            <h2 className="mb-3 font-display text-lg">Letzte Aktivitäten</h2>
            {(data?.activity || []).length === 0 ? <p className="text-sm text-bank-text-muted">Noch keine Aktivitäten.</p> : (
              <ul className="divide-y divide-bank-border/60">
                {data.activity.map((a) => (
                  <li key={a.id} className="py-2 text-sm">
                    <span className="font-mono text-xs">{a.action}</span> <span className="text-bank-text-muted">· {a.actor_email || 'System'} · {dt(a.created_at)}</span>
                    {a.reason && <p className="text-xs text-bank-text-muted">„{a.reason}“</p>}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/admin/audit-log" className="mt-3 inline-block text-sm text-bank-primary hover:underline">Zum Audit-Log →</Link>
          </AdminSurfaceCard>
        </div>
      </State>
    </AdminSubpageLayout>
  );
}
