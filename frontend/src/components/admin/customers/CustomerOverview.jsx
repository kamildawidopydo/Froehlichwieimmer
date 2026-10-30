import React, { useMemo, useState } from 'react';
import { RefreshCw, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CUSTOMER_FILTERS, CUSTOMER_SORTS, filterSortCustomers } from '@/lib/adminCustomers';
import { CustomerRow, CustomerCard } from '@/components/admin/customers/CustomerRow';
import { cn } from '@/lib/utils';

const HEAD = ['Kunde', 'Kundennr.', 'E-Mail', 'Status', 'Gesamtvermögen', 'Verfügbar', 'Positionen', 'Offen', 'Letzte Aktivität', ''];
const RIGHT = new Set(['Gesamtvermögen', 'Verfügbar', 'Positionen', 'Offen']);

const Toolbar = ({ query, setQuery, filter, setFilter, sort, setSort, counts, onRefresh, loading }) => (
  <div className="space-y-3 border-b border-bank-border p-4">
    <div className="flex flex-col gap-2 md:flex-row">
      <label className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, E-Mail oder Kundennummer…" className="pl-9" data-testid="admin-users-search-input" />
      </label>
      <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 border border-bank-border bg-white px-3 text-[13px]" data-testid="admin-users-sort-select">
        {CUSTOMER_SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <Button variant="outline-ink" onClick={onRefresh} disabled={loading} data-testid="admin-users-refresh-btn">
        <RefreshCw size={13} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} /> Aktualisieren
      </Button>
    </div>
    <div className="flex flex-wrap gap-1.5" data-testid="admin-users-filters">
      {CUSTOMER_FILTERS.map(([k, l]) => (
        <button key={k} type="button" onClick={() => setFilter(k)} data-testid={`admin-users-filter-${k}`}
          className={cn('rounded-full px-3 py-1 text-[12px]', filter === k ? 'bg-bank-ink text-white' : 'bg-bank-bg text-bank-text-muted hover:text-bank-text')}>
          {l} <span className="tabular-nums opacity-70">{counts[k]}</span>
        </button>
      ))}
    </div>
  </div>
);

const CustomerOverview = ({ data, loading, onRefresh, onOpen, onDelete }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name:asc');
  const items = useMemo(() => data?.items || [], [data]);
  const counts = useMemo(() => Object.fromEntries(CUSTOMER_FILTERS.map(([k, , fn]) => [k, items.filter(fn).length])), [items]);
  const visible = useMemo(() => filterSortCustomers(items, { filter, query, sort }), [items, filter, query, sort]);

  return (
    <div className="border border-bank-border bg-white shadow-editorial-sm" data-testid="admin-customer-overview">
      <Toolbar {...{ query, setQuery, filter, setFilter, sort, setSort, counts, onRefresh, loading }} />
      {loading && !items.length ? (
        <p className="py-16 text-center text-[12px] text-bank-text-muted" data-testid="admin-users-loading">Wird geladen…</p>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center" data-testid="admin-users-empty">
          <User size={26} strokeWidth={1.4} className="mx-auto mb-2 text-bank-gold/55" />
          <p className="text-[12px] text-bank-text-muted">Keine Kunden für diese Auswahl</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block" data-testid="admin-users-table-wrap">
            <table className="w-full">
              <thead className="bg-bank-bg/60 text-[10.5px] uppercase tracking-wide text-bank-text-muted">
                <tr>{HEAD.map((h) => <th key={h} className={cn('px-3 py-2.5 font-medium', RIGHT.has(h) ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
              </thead>
              <tbody>{visible.map((c) => <CustomerRow key={c.id} c={c} onOpen={onOpen} onDelete={onDelete} />)}</tbody>
            </table>
          </div>
          <ul className="xl:hidden">{visible.map((c) => <CustomerCard key={c.id} c={c} onOpen={onOpen} onDelete={onDelete} />)}</ul>
        </>
      )}
      <p className="border-t border-bank-border px-4 py-2.5 text-[11px] leading-snug text-bank-text-muted" data-testid="admin-users-basis">
        {visible.length} von {items.length} Konten · Gesamtvermögen: {data?.basis?.total_assets}. Letzte Aktivität: {data?.basis?.last_activity}.
      </p>
    </div>
  );
};

export default CustomerOverview;
