import React, { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard, AdminToolbarCard } from '@/components/admin/AdminSubpageChrome';
import { panelApi } from '@/lib/panelApi';
import { useLoad, State, Table, Input, dt } from './_ui';

const ENT = { customer: 'Kunde', portfolio: 'Depot', position: 'Position', product: 'Produkt', transaction: 'Auftrag', kyc_document: 'KYC-Dokument', settings: 'Einstellungen', staff: 'Mitarbeiter' };

export default function PanelAudit() {
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const { data, error, loading, reload } = useLoad(() => panelApi.get('audit', { q, entity }), [q, entity]);
  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader title="Audit-Log" titleIcon={ScrollText} description="Unveränderliches Protokoll aller sensiblen Aktionen. Einträge können nicht bearbeitet oder gelöscht werden." />
      <AdminToolbarCard className="flex flex-wrap gap-3">
        <Input className="max-w-sm" placeholder="Aktion, Person oder Begründung" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="h-10 border border-bank-border bg-white px-3 text-sm" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">Alle Bereiche</option>{Object.entries(ENT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </AdminToolbarCard>
      <AdminSurfaceCard>
        <State loading={loading} error={error} onRetry={reload}>
          <Table head={['Zeitpunkt', 'Aktion', 'Bereich', 'Von', 'Alter Wert', 'Neuer Wert', 'Begründung']} empty={data?.items?.length ? null : 'Keine Einträge.'}>
            {(data?.items || []).map((a) => (
              <tr key={a.id} className="align-top">
                <td className="whitespace-nowrap">{dt(a.created_at)}</td><td className="font-mono text-xs">{a.action}</td><td>{ENT[a.entity] || a.entity}</td><td>{a.actor_email || 'System'}</td>
                <td className="max-w-[240px] break-words font-mono text-[11px]">{a.old_value ? JSON.stringify(a.old_value) : '–'}</td>
                <td className="max-w-[240px] break-words font-mono text-[11px]">{a.new_value ? JSON.stringify(a.new_value) : '–'}</td>
                <td>{a.reason || '–'}</td>
              </tr>
            ))}
          </Table>
        </State>
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
}
