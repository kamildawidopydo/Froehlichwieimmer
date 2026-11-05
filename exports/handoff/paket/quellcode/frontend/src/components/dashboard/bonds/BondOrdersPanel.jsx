import React from 'react';
import { Package } from 'lucide-react';
import { eurDe, pctDe, dateTimeDe } from '@/lib/bondDisplay';

const STATUS = {
  awaiting_bank: { label: 'Order in Bearbeitung – wartet auf Bankbestätigung', cls: 'border-amber-300/55 bg-amber-50 text-amber-700' },
  bank_submitted: { label: 'Order in Bearbeitung – bei der Partnerbank', cls: 'border-amber-300/55 bg-amber-50 text-amber-700' },
  executed: { label: 'Ausgeführt', cls: 'border-sky-300/55 bg-sky-50 text-sky-700' },
  rejected: { label: 'Abgelehnt – Reservierung aufgehoben', cls: 'border-rose-300/55 bg-rose-50 text-rose-700' },
  cancelled: { label: 'Storniert – Reservierung aufgehoben', cls: 'border-rose-300/55 bg-rose-50 text-rose-700' },
};

const Item = ({ l, v }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">{l}</p>
    <p className="mt-0.5 text-[13px] tabular-nums text-bank-text">{v}</p>
  </div>
);

const OrderCard = ({ r }) => {
  const q = r.order_quote || {};
  const meta = STATUS[r.status] || STATUS.awaiting_bank;
  return (
    <div className="border border-bank-border bg-white p-4" data-testid={`bond-order-${r.id}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-[1rem] font-semibold text-bank-text">{r.bond_name}</p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
            ISIN · {r.isin} · Transaktion {r.transaction_no}
          </p>
        </div>
        <span className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${meta.cls}`} data-testid={`bond-order-status-${r.id}`}>
          {meta.label}
        </span>
      </div>
      {r.status === 'executed' && (
        <p className="mb-3 border-l-2 border-emerald-400 bg-emerald-50 p-2.5 text-[12.5px] text-emerald-900" data-testid={`bond-order-executed-msg-${r.id}`}>
          Ihr Kaufauftrag für die {r.bond_name} wurde erfolgreich ausgeführt. Die Anleihe wurde Ihrem Depot gutgeschrieben.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 border-t border-bank-border pt-3 sm:grid-cols-4">
        <Item l="Nennwert" v={eurDe(r.executed_nominal ?? q.nominal)} />
        <Item l="Kaufkurs" v={pctDe(r.execution_price_pct ?? q.price_pct, 2, 4)} />
        <Item l={r.status === 'executed' ? 'Abgerechnet' : 'Reserviert'} v={eurDe(r.total_amount ?? q.total)} />
        <Item l="Auftrag vom" v={dateTimeDe(r.requested_at || r.created_at)} />
      </div>
    </div>
  );
};

export const BondOrdersPanel = ({ requests }) => {
  const orders = (requests || []).filter((r) => r.order_type === 'direct');
  if (orders.length === 0) return null;
  return (
    <div className="mt-5 space-y-3" data-testid="bond-orders-panel">
      <p className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
        <Package size={13} className="text-bank-gold" /> Kaufaufträge aus dem Guthaben
      </p>
      {orders.map((r) => <OrderCard key={r.id} r={r} />)}
    </div>
  );
};

export default BondOrdersPanel;
