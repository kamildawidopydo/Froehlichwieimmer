import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard, AdminToolbarCard } from '@/components/admin/AdminSubpageChrome';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, Table, KycBadge, Input, eur } from './_ui';

export default function PanelPortfolios() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('total');
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(() => panelApi.get('portfolios'));
  const t = q.toLowerCase();
  const items = (data?.items || [])
    .filter((p) => !t || [p.portfolio_no, p.customer?.customer_no, p.customer?.email, p.customer?.first_name, p.customer?.last_name].some((x) => String(x || '').toLowerCase().includes(t)))
    .sort((a, b) => (sort === 'total' ? b.total - a.total : sort === 'cash' ? b.cash_balance - a.cash_balance : a.portfolio_no.localeCompare(b.portfolio_no)));
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="Depots" titleIcon={Briefcase} description="Jeder Kunde hat genau ein Depot. Klicken Sie ein Depot an, um Bestände zu buchen." />
      <AdminToolbarCard className="flex flex-wrap gap-3">
        <Input className="max-w-sm" placeholder="Depot-Nr., Kunden-ID, Name oder E-Mail" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-10 border border-bank-border bg-white px-3 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="total">Nach Gesamtwert</option><option value="cash">Nach Liquidität</option><option value="no">Nach Depot-Nr.</option>
        </select>
      </AdminToolbarCard>
      <AdminSurfaceCard>
        <State loading={loading} error={error} onRetry={reload}>
          <Table head={['Depot-Nr.', 'Kunde', 'Kunden-ID', 'Verifizierung', 'Positionen', 'Angelegt', 'Liquidität', 'Gesamtwert']} empty={items.length ? null : 'Keine Depots.'}>
            {items.map((p) => (
              <tr key={p.id} className="cursor-pointer" onClick={() => navigate(`/admin/depots/${p.customer?.id}`)}>
                <td className="font-mono text-xs">{p.portfolio_no}</td>
                <td>{[p.customer?.first_name, p.customer?.last_name].filter(Boolean).join(' ') || p.customer?.email}</td>
                <td className="font-mono text-xs">{p.customer?.customer_no}</td>
                <td><KycBadge s={p.customer?.kyc_status} /></td>
                <td>{p.positions_count}</td><td>{eur(p.invested)}</td><td>{eur(p.cash_balance)}</td><td className="font-medium">{eur(p.total)}</td>
              </tr>
            ))}
          </Table>
        </State>
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
}
