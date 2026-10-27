import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2, Banknote } from 'lucide-react';
import { apiUrl } from '@/lib/apiBase';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';

const STATUS = {
  pending: ['Wartet auf Freigabe', 'bg-amber-100 text-amber-800'],
  approved: ['Ausgezahlt', 'bg-emerald-100 text-emerald-800'],
  rejected: ['Abgelehnt', 'bg-rose-100 text-rose-700'],
};

const req = async (path, init) => {
  const r = await fetch(apiUrl(path), { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const d = body?.detail;
    throw new Error(Array.isArray(d) ? d.map((x) => x.msg).join(', ') : d || 'Fehler');
  }
  return body;
};

const RequestList = ({ items }) => {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-bank-text-muted">Ihre Anträge</h3>
      <ul className="divide-y divide-bank-border rounded-lg border border-bank-border">
        {items.map((r) => {
          const [label, cls] = STATUS[r.status] || STATUS.pending;
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3" data-testid={`payout-request-${r.id}`}>
              <div className="min-w-0">
                <p className="text-[13px] font-medium tabular-nums">{formatEUR(r.amount)}</p>
                <p className="truncate text-[11.5px] text-bank-text-muted">
                  {new Date(r.created_at).toLocaleDateString('de-DE')} · IBAN …{r.iban.slice(-4)}{r.reason ? ` · ${r.reason}` : ''}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}`}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const PayoutRequestDialog = ({ onClose }) => {
  const { cashSummary, refreshCashBalance, refreshCashHistory } = useDashboardData();
  const [items, setItems] = useState([]);
  const [available, setAvailable] = useState(null);
  const [f, setF] = useState({ amount: '', account_holder: '', iban: '', note: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const load = () => {
    req('/api/portfolio/payout-requests').then(setItems).catch(() => setItems([]));
    req('/api/portfolio/cash?history_limit=1').then((s) => setAvailable(Number(s?.cash_available ?? 0))).catch(() => setAvailable(null));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await req('/api/portfolio/payout-requests', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(f.amount), account_holder: f.account_holder, iban: f.iban, note: f.note || null }),
      });
      toast.success('Auszahlung beantragt. Wir prüfen Ihren Antrag und geben ihn frei.');
      setF({ amount: '', account_holder: '', iban: '', note: '' });
      load();
      refreshCashBalance?.();
      refreshCashHistory?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'h-10 w-full rounded-lg border border-bank-border px-3 text-sm focus:border-bank-primary focus:outline-none';
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-modal flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(8,30,56,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()} data-testid="payout-dialog">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-bank-border bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-bank-text">Auszahlung beantragen</h2>
            <p className="text-[12.5px] text-bank-text-muted">
              Verfügbar: <strong data-testid="payout-available">{formatEUR(available ?? cashSummary?.available ?? 0)}</strong> · Die Auszahlung erfolgt erst nach unserer Freigabe.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" data-testid="payout-close"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className={inputCls} type="number" min="0.01" step="0.01" required placeholder="Betrag in €" value={f.amount} onChange={set('amount')} data-testid="payout-amount" />
          <input className={inputCls} required placeholder="Kontoinhaber" value={f.account_holder} onChange={set('account_holder')} data-testid="payout-holder" />
          <input className={inputCls} required placeholder="IBAN (z. B. DE89 3704 0044 0532 0130 00)" value={f.iban} onChange={set('iban')} data-testid="payout-iban" />
          <input className={inputCls} placeholder="Verwendungszweck / Hinweis (optional)" value={f.note} onChange={set('note')} data-testid="payout-note" />
          <button type="submit" disabled={busy} data-testid="payout-submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-bank-primary px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-bank-primary-hover disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />} Auszahlung beantragen
          </button>
        </form>
        <RequestList items={items} />
      </div>
    </div>
  );
};

export default PayoutRequestDialog;
