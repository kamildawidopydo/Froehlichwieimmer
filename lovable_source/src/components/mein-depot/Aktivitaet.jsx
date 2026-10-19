import React, { useMemo, useState } from 'react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR, formatEURSigned } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';

/**
 * Aktivitaet — Timeline der letzten Depot-/Kontobewegungen auf /mein-depot (Schritt 5/7).
 *
 * Datenquellen (bereits in DashboardDataContext geladen; 0 zusätzliche Requests):
 *   - `cashHistory`             (user_cash_transactions, limit 100)
 *   - `cashSettlements`         (user_cash_settlements, unsettled)
 *   - `stockOrders`             (user_stock_orders, limit 50)
 *   - `bondPurchaseRequests`
 *   - `ipoSubscriptionRequests`
 *
 * Kategorien werden AUS den `kind`- bzw. `side`-Feldern der jeweiligen Tabelle
 * abgeleitet und mit deutschsprachigen Labels versehen. KEINE erfundenen
 * Ereignisse. Fehlende Felder → „—".
 *
 * Datum: ISO-Timestamps werden per `de-DE` formatiert; wenn nur ein Datum ohne
 * Uhrzeit vorliegt, wird KEIN Uhrzeitfeld erzeugt.
 *
 * Filter (clientseitig, Δ0 Requests): Alle · Cash · Orders · Zinsen · Anfragen
 * Zeitraum: 30T · 90T · 1J · Alle — nur wenn genügend Historie im Set.
 *
 * Beträge in Originalwährung. Für user_cash_transactions und user_stock_orders
 * ist EUR fach-standard (Broker-Cash-Konto), keine Konvertierung.
 */

const CASH_KIND_LABEL = {
  deposit: 'Einzahlung',
  withdrawal: 'Auszahlung',
  interest: 'Zinsgutschrift',
  fee: 'Gebühr',
  tax: 'Steuer',
  settlement: 'Settlement',
  stock_buy: 'Aktien-Kauf',
  stock_sell: 'Aktien-Verkauf',
  bond_buy: 'Anleihe-Kauf',
  bond_sell: 'Anleihe-Verkauf',
  transfer: 'Umbuchung',
};

const humanKind = (raw) => {
  if (!raw) return 'Buchung';
  if (CASH_KIND_LABEL[raw]) return CASH_KIND_LABEL[raw];
  return raw
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const humanOrderStatus = (s) => {
  const m = { pending: 'In Ausführung', executed: 'Ausgeführt', cancelled: 'Storniert', rejected: 'Abgelehnt', filled: 'Ausgeführt' };
  return m[(s || '').toLowerCase()] || (s || '—');
};

const humanRequestStatus = (s) => {
  const m = { pending: 'In Prüfung', approved: 'Freigegeben', rejected: 'Abgelehnt', executed: 'Ausgeführt' };
  return m[(s || '').toLowerCase()] || (s || '—');
};

const fmtDateTime = (iso) => {
  if (!iso) return { text: '—', dateOnly: true };
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { text: '—', dateOnly: true };
    // If time part is exactly midnight UTC AND source has no T, treat as date only
    const dateOnly = typeof iso === 'string' && iso.length === 10;
    const opts = dateOnly
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return { text: d.toLocaleString('de-DE', opts), dateOnly };
  } catch {
    return { text: '—', dateOnly: true };
  }
};

const RANGE_DAYS = { '30': 30, '90': 90, '1J': 365, all: Infinity };

const Aktivitaet = () => {
  const {
    loading,
    cashHistory,
    cashSettlements,
    stockOrders,
    bondPurchaseRequests,
    ipoSubscriptionRequests,
    dashboardFetchHadFailure,
  } = useDashboardData();

  const [filter, setFilter] = useState('all');
  const [range, setRange] = useState('90');

  const events = useMemo(() => {
    const out = [];

    (cashHistory || []).forEach((t) => {
      const amt = Number(t.amount_eur || 0);
      out.push({
        id: `c-${t.id}`,
        group: amt < 0 ? 'cash-out' : 'cash-in',
        cat: 'cash',
        when: t.created_at,
        title: humanKind(t.kind),
        desc: t.description || null,
        amount: amt,
        currency: 'EUR',
        status: null,
      });
    });

    (cashSettlements || []).forEach((s) => {
      out.push({
        id: `s-${s.id}`,
        group: 'settlement',
        cat: 'cash',
        when: s.created_at || s.settlement_date,
        title: 'Offenes Settlement',
        desc: s.description || `Fälligkeit ${s.settlement_date || '—'}`,
        amount: Number(s.amount_eur || 0),
        currency: 'EUR',
        status: s.settled_at ? 'Abgeschlossen' : 'Offen',
      });
    });

    (stockOrders || []).forEach((o) => {
      const isBuy = (o.side || '').toLowerCase() === 'buy';
      const qty = Number(o.quantity || 0);
      const price = Number(o.avg_cost || o.executed_price || 0);
      const gross = qty * price;
      out.push({
        id: `o-${o.id}`,
        group: isBuy ? 'stock-buy' : 'stock-sell',
        cat: 'orders',
        when: o.executed_at || o.created_at,
        title: `${isBuy ? 'Kauf' : 'Verkauf'} ${o.symbol || ''}`.trim(),
        desc: qty ? `${qty.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stück` : null,
        amount: isBuy ? -gross : gross,
        currency: 'EUR',
        status: humanOrderStatus(o.status),
        realizedPnl: o.realized_pnl != null ? Number(o.realized_pnl) : null,
      });
    });

    (bondPurchaseRequests || []).forEach((r) => {
      out.push({
        id: `br-${r.id}`,
        group: 'bond-request',
        cat: 'requests',
        when: r.created_at,
        title: `Anleihe-Anfrage${r.bond_name ? `: ${r.bond_name}` : (r.isin ? `: ${r.isin}` : '')}`,
        desc: null,
        amount: Number(r.amount_eur || r.nominal_betrag || 0) || null,
        currency: 'EUR',
        status: humanRequestStatus(r.status),
      });
    });

    (ipoSubscriptionRequests || []).forEach((r) => {
      const ipoName = r?.ipo_catalog?.name || r?.ipo_catalog?.symbol || r?.symbol || 'IPO';
      out.push({
        id: `ipo-${r.id}`,
        group: 'ipo',
        cat: 'requests',
        when: r.created_at,
        title: `IPO-Zeichnung: ${ipoName}`,
        desc: null,
        amount: Number(r.subscription_amount_eur || r.amount_eur || 0) || null,
        currency: 'EUR',
        status: humanRequestStatus(r.status),
      });
    });

    return out
      .filter((e) => e.when != null)
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  }, [cashHistory, cashSettlements, stockOrders, bondPurchaseRequests, ipoSubscriptionRequests]);

  const availableFilters = useMemo(() => {
    const has = { cash: 0, orders: 0, requests: 0, interest: 0 };
    events.forEach((e) => {
      if (e.cat === 'cash') has.cash++;
      if (e.cat === 'orders') has.orders++;
      if (e.cat === 'requests') has.requests++;
      if (e.group === 'cash-in' && e.title === 'Zinsgutschrift') has.interest++;
    });
    const list = [{ key: 'all', label: 'Alle' }];
    if (has.cash > 0) list.push({ key: 'cash', label: 'Cash' });
    if (has.orders > 0) list.push({ key: 'orders', label: 'Orders' });
    if (has.interest > 0) list.push({ key: 'interest', label: 'Zinsen' });
    if (has.requests > 0) list.push({ key: 'requests', label: 'Anfragen' });
    return list;
  }, [events]);

  const activeFilter = availableFilters.find((f) => f.key === filter) ? filter : 'all';

  const availableRanges = useMemo(() => {
    if (events.length === 0) return [];
    const now = Date.now();
    const oldest = events.reduce((min, e) => Math.min(min, new Date(e.when).getTime()), Infinity);
    const daysBack = Number.isFinite(oldest) ? (now - oldest) / 86400000 : 0;
    const list = [];
    if (daysBack >= 15) list.push({ key: '30', label: '30 Tage' });
    if (daysBack >= 45) list.push({ key: '90', label: '90 Tage' });
    if (daysBack >= 180) list.push({ key: '1J', label: '1 Jahr' });
    list.push({ key: 'all', label: 'Alle' });
    return list;
  }, [events]);

  const activeRange = availableRanges.find((r) => r.key === range) ? range : (availableRanges[0]?.key || 'all');

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[activeRange] ?? Infinity;
    const cutoff = Number.isFinite(days) ? Date.now() - days * 86400000 : -Infinity;
    return events.filter((e) => {
      if (activeFilter === 'cash' && e.cat !== 'cash') return false;
      if (activeFilter === 'orders' && e.cat !== 'orders') return false;
      if (activeFilter === 'requests' && e.cat !== 'requests') return false;
      if (activeFilter === 'interest' && !(e.group === 'cash-in' && e.title === 'Zinsgutschrift')) return false;
      if (new Date(e.when).getTime() < cutoff) return false;
      return true;
    });
  }, [events, activeFilter, activeRange]);

  const showError = !loading && events.length === 0 && dashboardFetchHadFailure;

  return (
    <section aria-labelledby="mein-depot-aktivitaet-title" data-testid="mein-depot-aktivitaet" className="mb-14">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-text-muted">Aktivität</p>
      <h2
        id="mein-depot-aktivitaet-title"
        className="mt-2 font-display text-[1.4rem] font-light tracking-[-0.01em] text-bank-text sm:text-[1.55rem]"
      >
        Ihre letzten Depot- und Kontobewegungen
      </h2>

      {loading ? (
        <div data-testid="mda-skeleton" className="mt-5 h-[240px] animate-pulse rounded-sm bg-bank-border/25" />
      ) : showError ? (
        <div data-testid="mda-error" className="mt-5 rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Verbindung</p>
          <p className="mt-3 text-[14px] font-medium text-bank-text">Ihre Aktivitäten konnten momentan nicht geladen werden.</p>
        </div>
      ) : events.length === 0 ? (
        <div data-testid="mda-empty" className="mt-5 rounded-sm border border-dashed border-bank-border px-6 py-10 text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">Noch keine Aktivität</p>
          <p className="mt-3 text-[14px] font-medium text-bank-text">Noch keine Depotaktivität vorhanden.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Kategorie" className="inline-flex flex-wrap gap-1 rounded-sm border border-bank-border bg-white p-1">
              {availableFilters.map((f) => {
                const active = f.key === activeFilter;
                return (
                  <button
                    key={f.key}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    data-testid={`mda-filter-${f.key}`}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'min-h-[36px] rounded-sm px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold',
                      active ? 'bg-bank-text text-white' : 'text-bank-text-muted hover:bg-bank-bg hover:text-bank-text',
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            {availableRanges.length > 1 && (
              <div role="tablist" aria-label="Zeitraum" className="inline-flex flex-wrap gap-1 rounded-sm border border-bank-border bg-white p-1">
                {availableRanges.map((r) => {
                  const active = r.key === activeRange;
                  return (
                    <button
                      key={r.key}
                      role="tab"
                      type="button"
                      aria-selected={active}
                      data-testid={`mda-range-${r.key}`}
                      onClick={() => setRange(r.key)}
                      className={cn(
                        'min-h-[36px] rounded-sm px-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bank-gold',
                        active ? 'bg-bank-text text-white' : 'text-bank-text-muted hover:bg-bank-bg hover:text-bank-text',
                      )}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <p data-testid="mda-filtered-empty" className="rounded-sm border border-dashed border-bank-border px-6 py-8 text-center text-[13px] text-bank-text-muted">
              Keine Einträge im gewählten Zeitraum.
            </p>
          ) : (
            <ol className="divide-y divide-bank-border/60 rounded-sm border border-bank-border bg-white">
              {filtered.map((e) => {
                const { text: dateText } = fmtDateTime(e.when);
                const pos = (e.amount ?? 0) >= 0;
                return (
                  <li key={e.id} data-testid={`mda-item-${e.id}`} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[110px_1fr_auto_auto] sm:items-center sm:gap-4 sm:px-5">
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted tabular-nums">{dateText}</p>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-bank-text">{e.title}</p>
                      {e.desc && <p className="mt-0.5 text-[11.5px] text-bank-text-muted">{e.desc}</p>}
                    </div>
                    {e.status && (
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text sm:text-right">
                        <span aria-hidden>·</span> {e.status}
                      </p>
                    )}
                    <div className="text-right">
                      {e.amount != null && Number.isFinite(e.amount) && e.amount !== 0 ? (
                        <p className={cn('tabular-nums text-[13.5px] font-semibold', pos ? 'text-emerald-700' : 'text-rose-700')}>
                          <span aria-hidden>{pos ? '+' : ''}</span>
                          <span className="sr-only">{pos ? 'Zufluss ' : 'Abfluss '}</span>
                          {formatEURSigned(e.amount)}
                        </p>
                      ) : (
                        <p className="tabular-nums text-[13.5px] text-bank-text-muted">—</p>
                      )}
                      {e.realizedPnl != null && e.realizedPnl !== 0 && (
                        <p className={cn('mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums', e.realizedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                          Realisiert {formatEURSigned(e.realizedPnl)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
};

export default Aktivitaet;
