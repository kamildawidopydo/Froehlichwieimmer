import React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatEUR } from '@/lib/dashboardFormatters';
import { OPEN_LABELS, fmtDateDE } from '@/lib/adminCustomers';
import { cn } from '@/lib/utils';

const STATUS_CLS = {
  active: 'border-emerald-300/60 bg-emerald-50 text-emerald-800',
  inactive: 'border-bank-border bg-bank-bg text-bank-text-muted',
  blocked: 'border-rose-300/60 bg-rose-50 text-rose-700',
};

export const StatusBadge = ({ c }) => (
  <span className="inline-flex flex-wrap gap-1">
    <span className={cn('inline-flex border px-2 py-0.5 text-[10.5px] font-medium', STATUS_CLS[c.status])} data-testid={`customer-status-${c.id}`}>
      {c.status_label}
    </span>
    {c.login_locked && (
      <span className="inline-flex border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10.5px] text-amber-800" title="Nach mehreren Fehlversuchen vorübergehend gesperrt">
        Anmeldung gesperrt
      </span>
    )}
    {c.role === 'admin' && <span className="inline-flex border border-bank-gold/55 bg-bank-gold/10 px-2 py-0.5 text-[10.5px] text-bank-gold">Admin</span>}
    {c.is_test_account && <span className="inline-flex border border-bank-border px-2 py-0.5 text-[10.5px] text-bank-text-muted">Testkonto</span>}
  </span>
);

const openTitle = (c) =>
  Object.entries(c.open_breakdown || {}).map(([k, n]) => `${OPEN_LABELS[k] || k}: ${n}`).join(' · ') || 'Keine offenen Vorgänge';

export const OpenCount = ({ c }) => (
  <span title={openTitle(c)} className={cn('tabular-nums', c.open_requests > 0 ? 'font-semibold text-amber-700' : 'text-bank-text-muted')} data-testid={`customer-open-${c.id}`}>
    {c.open_requests}
  </span>
);

export const PositionsCell = ({ c }) => (
  <span className="whitespace-nowrap tabular-nums" title={`${c.positions} Wertpapiere (davon ${c.ipo_positions} IPO) · ${c.contracts} Zinsanlagen`}>
    {c.positions}
    {c.contracts > 0 && <span className="text-bank-text-muted"> + {c.contracts} Zins</span>}
    {c.fallback_positions > 0 && <span className="ml-1 text-[10.5px] text-amber-800" title="Ersatzbewertung zum Einstand – kein aktueller Marktwert">({c.fallback_positions} Ersatzbew.)</span>}
  </span>
);

export const CustomerActions = ({ c, onOpen, onDelete, suffix = '' }) => (
  <div className="flex flex-nowrap justify-end gap-1.5">
    <Button size="sm" variant="outline-ink" className="whitespace-nowrap" onClick={() => onOpen(c)} data-testid={`admin-users-open-btn${suffix}-${c.id}`}>
      <Eye size={12} strokeWidth={1.5} /> Kunde öffnen
    </Button>
    {c.role !== 'admin' && (
      <Button size="sm" variant="outline" className="whitespace-nowrap border-red-300 text-red-700 hover:bg-red-50" onClick={() => onDelete(c)} data-testid={`admin-users-delete-btn${suffix}-${c.id}`} title="Kunde löschen">
        <Trash2 size={12} strokeWidth={1.5} />
      </Button>
    )}
  </div>
);

export const CustomerRow = ({ c, onOpen, onDelete }) => (
  <tr className="border-b border-bank-border last:border-b-0 hover:bg-bank-bg/40" data-testid={`admin-users-row-${c.id}`}>
    <td className="max-w-[170px] truncate px-2.5 py-3 text-[13.5px] font-medium text-bank-text" title={c.name || ''}>{c.name || '–'}</td>
    <td className="whitespace-nowrap px-2.5 py-3 font-mono text-[12px] text-bank-text-muted" data-testid={`customer-number-${c.id}`}>{c.customer_number}</td>
    <td className="max-w-[210px] truncate px-2.5 py-3 text-[13px] text-bank-text-muted" title={c.email || ''}>{c.email || '–'}</td>
    <td className="px-2.5 py-3"><StatusBadge c={c} /></td>
    <td className="whitespace-nowrap px-2.5 py-3 text-right font-semibold tabular-nums" data-testid={`customer-total-${c.id}`}>{formatEUR(c.total_assets)}</td>
    <td className="whitespace-nowrap px-2.5 py-3 text-right tabular-nums" data-testid={`customer-cash-${c.id}`}>{formatEUR(c.cash_available)}</td>
    <td className="px-2.5 py-3 text-right"><PositionsCell c={c} /></td>
    <td className="px-2.5 py-3 text-right"><OpenCount c={c} /></td>
    <td className="whitespace-nowrap px-2.5 py-3 font-mono text-[12px] tabular-nums text-bank-text-muted">{fmtDateDE(c.last_activity)}</td>
    <td className="px-2.5 py-3"><CustomerActions c={c} onOpen={onOpen} onDelete={onDelete} /></td>
  </tr>
);

export const CustomerCard = ({ c, onOpen, onDelete }) => (
  <li className="border-b border-bank-border p-4 last:border-b-0" data-testid={`admin-users-card-${c.id}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-bank-text">{c.name || '–'}</p>
        <p className="truncate text-[12px] text-bank-text-muted">{c.email}</p>
        <p className="font-mono text-[11px] text-bank-text-muted">{c.customer_number}</p>
      </div>
      <StatusBadge c={c} />
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
      <div><dt className="text-bank-text-muted">Gesamtvermögen</dt><dd className="font-semibold tabular-nums">{formatEUR(c.total_assets)}</dd></div>
      <div><dt className="text-bank-text-muted">Verfügbar</dt><dd className="tabular-nums">{formatEUR(c.cash_available)}</dd></div>
      <div><dt className="text-bank-text-muted">Positionen</dt><dd><PositionsCell c={c} /></dd></div>
      <div><dt className="text-bank-text-muted">Offene Vorgänge</dt><dd><OpenCount c={c} /></dd></div>
      <div className="col-span-2"><dt className="text-bank-text-muted">Letzte Aktivität</dt><dd className="tabular-nums">{fmtDateDE(c.last_activity, true)}</dd></div>
    </dl>
    <div className="mt-3"><CustomerActions c={c} onOpen={onOpen} onDelete={onDelete} suffix="-card" /></div>
  </li>
);
