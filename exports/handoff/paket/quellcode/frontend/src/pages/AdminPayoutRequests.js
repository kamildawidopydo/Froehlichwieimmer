import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Banknote, RefreshCw, Check, X } from 'lucide-react';
import { apiUrl } from '@/lib/apiBase';
import { AdminSubpageLayout, AdminSubpageHeader, AdminSurfaceCard } from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';

const opts = { withCredentials: true };
const eur = (v) => Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const STATUS = {
  pending: ['Offen', 'bg-amber-100 text-amber-800'],
  approved: ['Freigegeben', 'bg-emerald-100 text-emerald-800'],
  rejected: ['Abgelehnt', 'bg-rose-100 text-rose-700'],
};
const FILTERS = [['pending', 'Offen'], ['approved', 'Freigegeben'], ['rejected', 'Abgelehnt'], ['', 'Alle']];

const Row = ({ r, onDecide }) => {
  const [label, cls] = STATUS[r.status] || STATUS.pending;
  return (
    <tr className="border-t border-bank-border" data-testid={`admin-payout-row-${r.id}`}>
      <td className="px-4 py-3 text-[13px]">
        <p className="font-medium">{r.customer_name || '—'}</p>
        <p className="text-[11.5px] text-bank-text-muted">{r.customer_email}</p>
      </td>
      <td className="px-4 py-3 text-[13px] font-semibold tabular-nums">{eur(r.amount)}</td>
      <td className="px-4 py-3 text-[12.5px]">
        <p>{r.account_holder}</p>
        <p className="font-mono text-[11.5px] text-bank-text-muted">{r.iban}</p>
        {r.note && <p className="text-[11.5px] text-bank-text-muted">{r.note}</p>}
      </td>
      <td className="px-4 py-3 text-[12px] text-bank-text-muted">{new Date(r.created_at).toLocaleString('de-DE')}</td>
      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}`}>{label}</span>{r.reason && <p className="mt-1 text-[11px] text-bank-text-muted">{r.reason}</p>}</td>
      <td className="px-4 py-3 text-right">
        {r.status === 'pending' && (
          <div className="flex justify-end gap-2">
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => onDecide(r, true)} data-testid={`admin-payout-approve-${r.id}`}>
              <Check size={13} /> Freigeben
            </Button>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={() => onDecide(r, false)} data-testid={`admin-payout-reject-${r.id}`}>
              <X size={13} /> Ablehnen
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default function AdminPayoutRequests() {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(apiUrl(`/api/admin/payout-requests${status ? `?status=${status}` : ''}`), opts);
      setItems(data || []);
    } catch {
      toast.error('Anträge konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const decide = async (r, approve) => {
    const msg = approve
      ? `${eur(r.amount)} an ${r.account_holder} (${r.iban}) freigeben? Das Guthaben wird dem Kunden endgültig abgebucht.`
      : 'Antrag ablehnen? Der Betrag wird dem Kunden wieder als verfügbar angezeigt.';
    if (!window.confirm(msg)) return;
    const reason = approve ? null : window.prompt('Grund der Ablehnung (optional):') || null;
    try {
      await axios.post(apiUrl(`/api/admin/payout-requests/${r.id}/${approve ? 'approve' : 'reject'}`), { reason }, opts);
      toast.success(approve ? 'Auszahlung freigegeben' : 'Antrag abgelehnt');
      window.dispatchEvent(new Event('admin-counts-refresh'));
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Aktion fehlgeschlagen');
    }
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Zahlungsverkehr"
        title="Auszahlungsanträge"
        titleIcon={Banknote}
        description="Kunden beantragen Auszahlungen aus ihrem Guthaben. Erst nach Ihrer Freigabe wird das Geld abgebucht."
        actions={<Button variant="outline" onClick={load} className="gap-2 rounded-xl" data-testid="admin-payout-refresh"><RefreshCw size={14} /> Aktualisieren</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <button key={key || 'all'} type="button" onClick={() => setStatus(key)} data-testid={`admin-payout-filter-${key || 'all'}`}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] ${status === key ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border hover:bg-bank-bg'}`}>
            {label}
          </button>
        ))}
      </div>
      <AdminSurfaceCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="text-[11px] uppercase tracking-wider text-bank-text-muted">
              <tr><th className="px-4 py-3">Kunde</th><th className="px-4 py-3">Betrag</th><th className="px-4 py-3">Bankverbindung</th><th className="px-4 py-3">Beantragt</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody>
              {items.map((r) => <Row key={r.id} r={r} onDecide={decide} />)}
            </tbody>
          </table>
          {!loading && !items.length && <p className="p-8 text-center text-[13px] text-bank-text-muted" data-testid="admin-payout-empty">Keine Anträge</p>}
        </div>
      </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
}
