import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  X,
  LineChart,
  Wallet,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';

const AnleihenIcon = PRODUCT_ICONS.anleihen;
const IpoIcon = PRODUCT_ICONS.ipo;
import { formatEUR, formatEURSigned } from '@/lib/dashboardFormatters';

// Order amounts are stored in EUR; non-EUR records are not reformatted.
const fmtOrderEur = (v, o) =>
  v == null || (o.currency || 'EUR') !== 'EUR'
    ? '–'
    : Number(v).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const fxHint = (o) =>
  o.original_currency && o.original_currency !== 'EUR' && o.fx_rate
    ? `Handelswährung ${o.original_currency} · ${o.fx_pair} ${Number(o.fx_rate).toLocaleString('de-DE', { maximumFractionDigits: 4 })}${o.native_limit_price ? ` · Limit ≈ ${Number(o.native_limit_price).toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${o.original_currency}` : ''}`
    : undefined;
import { fromBackendValuation, fmtEurSigned, fmtPctSigned, toneClass } from '@/lib/ipoEstimate';
import { fetchEurBasedRates } from '@/services/forexService';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/context/DashboardDataContext';
import { PageContainer, PageHeader } from '@/components/dashboard/PageHeader';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import ExportActions from '@/components/dashboard/ExportActions';
import { CardListSkeleton } from '@/components/Skeleton';
import { cn } from '@/lib/utils';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import BondOffersPanel from '@/components/dashboard/bonds/BondOffersPanel';

const SUB_LABELS = {
  pending: 'Ausstehend', executed: 'Ausgeführt', rejected: 'Abgelehnt', cancelled: 'Storniert',
  approved: 'Genehmigt', allocated: 'Zugeteilt', requested: 'Angefragt', submitted: 'Eingereicht',
  completed: 'Abgeschlossen', deposit: 'Einzahlung', withdrawal: 'Auszahlung', adjustment: 'Korrektur',
  stock_purchase: 'Aktienkauf (intern)', stock_sale: 'Aktienverkauf (intern)', bond_purchase: 'Anleihekauf',
  ipo_purchase: 'IPO-Zuteilung',
};

const STATUS_META = {
  pending: {
    cls: 'border-amber-300/55 bg-amber-50 text-amber-700',
    icon: Clock,
    label: 'Ausstehend',
  },
  executed: {
    cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-700',
    icon: CheckCircle,
    label: 'Ausgeführt',
  },
  rejected: {
    cls: 'border-rose-300/55 bg-rose-50 text-rose-700',
    icon: XCircle,
    label: 'Abgelehnt',
  },
  cancelled: {
    cls: 'border-bank-border bg-bank-bg/45 text-bank-text-muted',
    icon: X,
    label: 'Storniert',
  },
};

const BOND_STATUS_META = {
  pending: {
    cls: 'border-amber-300/55 bg-amber-50 text-amber-700',
    icon: Clock,
    label: 'Ausstehend',
  },
  approved: {
    cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-700',
    icon: CheckCircle,
    label: 'Genehmigt',
  },
  rejected: {
    cls: 'border-rose-300/55 bg-rose-50 text-rose-700',
    icon: XCircle,
    label: 'Abgelehnt',
  },
  // Session 82.37 · Bond-Execution finaler Status.
  executed: {
    cls: 'border-sky-300/55 bg-sky-50 text-sky-700',
    icon: CheckCircle,
    label: 'Ausgeführt',
  },
  cancelled: {
    cls: 'border-rose-300/55 bg-rose-50 text-rose-700',
    icon: XCircle,
    label: 'Storniert',
  },
};

// Session 82.36 · IPO-Requests kennen zusätzlich den Status 'allocated'
// (Admin-Zuteilung erfolgt via IPO-Allocation-Saga → Depotposition entsteht).
const IPO_STATUS_META = {
  ...BOND_STATUS_META,
  allocated: {
    cls: 'border-sky-300/55 bg-sky-50 text-sky-700',
    icon: CheckCircle,
    label: 'Zugeteilt',
  },
};

const StatusPill = ({ meta }) => {
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
        meta.cls,
      )}
    >
      <Icon size={11} strokeWidth={1.5} /> {meta.label}
    </span>
  );
};

const SidePill = ({ side }) => (
  <span
    className={cn(
      'inline-flex items-center border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em]',
      side === 'buy'
        ? 'border-emerald-300/55 bg-emerald-50 text-emerald-700'
        : 'border-rose-300/55 bg-rose-50 text-rose-700',
    )}
  >
    {side === 'buy' ? 'Kauf' : 'Verkauf'}
  </span>
);

/** Clean section heading. */
const SectionHead = ({ icon: Icon, kicker, children }) => (
  <div className="mb-4">
    {kicker && <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-bank-text-muted">{kicker}</p>}
    <h2 className="mt-1 inline-flex items-center gap-2 text-[1.15rem] font-semibold text-bank-text">
      {Icon && <Icon size={16} strokeWidth={1.6} className="text-bank-primary" />}
      {children}
    </h2>
  </div>
);

const EditorialTable = ({ children, headers, tbodyRef }) => (
  <div className="hidden overflow-hidden rounded-xl border border-bank-border bg-white shadow-sm md:block">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-bank-border bg-bank-bg/60">
          <tr>
            {headers.map((h, idx) => (
              <th
                key={idx}
                className={cn(
                  'px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted',
                  h.align === 'right' ? 'text-right' : 'text-left',
                  h.className,
                )}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tbodyRef}>{children}</tbody>
      </table>
    </div>
  </div>
);

const fmtDateTime = (iso) =>
  `${new Date(iso).toLocaleDateString('de-DE')} · ${new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

const OrdersPage = () => {
  const navigate = useNavigate();
  const {
    stockOrders,
    stocksLoading,
    bondPurchaseRequests,
    bondRequestsLoading,
    refreshBondRequests,
    ipoSubscriptionRequests,
    ipoRequestsLoading,
    cancelOrder,
    cashHistory,
    refreshCashHistory,
  } = useDashboardData();
  const stockOrdersListRef = useAutoAnimateRef((stockOrders || []).length > 0);
  const bondOrdersListRef = useAutoAnimateRef((bondPurchaseRequests || []).length > 0);
  const stockOrdersDesktopRef = useAutoAnimateRef((stockOrders || []).length > 0);
  const bondOrdersDesktopRef = useAutoAnimateRef((bondPurchaseRequests || []).length > 0);
  const [activityFilter, setActivityFilter] = useState('all');
  const [eurRates, setEurRates] = useState({ EUR: 1 });

  useEffect(() => {
    let active = true;
    fetchEurBasedRates()
      .then((rates) => {
        if (active) setEurRates(rates || { EUR: 1 });
      })
      .catch(() => {
        if (active) setEurRates({ EUR: 1 });
      });
    return () => {
      active = false;
    };
  }, []);

  const activity = useMemo(() => {
    const items = [];
    (stockOrders || []).forEach((o) => {
      items.push({
        id: `stock-${o.id}`,
        type: 'stock',
        at: o.executed_at || o.created_at,
        label: `${o.side === 'buy' ? 'Kauf' : 'Verkauf'} ${o.symbol}`,
        sub: o.status,
        amount: o.net_amount ?? o.gross_amount,
      });
    });
    (bondPurchaseRequests || []).forEach((b) => {
      items.push({
        id: `bond-${b.id}`,
        type: 'bond',
        at: b.updated_at || b.created_at,
        label: `Anleihe ${b.isin || b.bond_name || ''}`.trim(),
        sub: b.status,
        amount: b.nominal_betrag,
      });
    });
    (ipoSubscriptionRequests || []).forEach((r) => {
      items.push({
        id: `ipo-${r.id}`,
        type: 'ipo',
        at: r.created_at,
        label: `IPO ${r.company_name || r.ticker || ''}`.trim(),
        sub: r.status,
        amount: r.amount_eur,
      });
    });
    (cashHistory || []).slice(0, 20).forEach((t) => {
      items.push({
        id: `cash-${t.id}`,
        type: 'cash',
        at: t.created_at,
        label: t.description || t.type,
        sub: t.type,
        amount: t.amount,
      });
    });
    return items.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 25);
  }, [stockOrders, bondPurchaseRequests, ipoSubscriptionRequests, cashHistory]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return activity;
    return activity.filter((a) => a.type === activityFilter);
  }, [activity, activityFilter]);

  const hasStockOrders = stockOrders.length > 0;
  const hasBondRequests = bondPurchaseRequests.length > 0;
  const hasIpoRequests = (ipoSubscriptionRequests || []).length > 0;
  const hasAnyOrder = hasStockOrders || hasBondRequests || hasIpoRequests;
  const listLoading = stocksLoading || bondRequestsLoading || ipoRequestsLoading;
  const showFullPageSkeleton = listLoading && !hasAnyOrder;

  const exportRows = useMemo(() => {
    const rows = [];
    (stockOrders || []).forEach((o) => {
      rows.push({
        typ: 'Aktien',
        datum: o.executed_at || o.created_at,
        beschreibung: `${o.side === 'buy' ? 'Kauf' : 'Verkauf'} ${o.symbol}`,
        status: o.status,
        betrag: o.net_amount ?? o.gross_amount ?? null,
        menge: o.quantity,
        hinweis: o.rejection_reason || '',
      });
    });
    (bondPurchaseRequests || []).forEach((b) => {
      rows.push({
        typ: 'Anleihe',
        datum: b.updated_at || b.created_at,
        beschreibung: b.bond_name || b.isin || 'Anleihe',
        status: b.status,
        betrag: b.amount_eur ?? null,
        menge: null,
        hinweis: b.decision_note || '',
      });
    });
    (ipoSubscriptionRequests || []).forEach((r) => {
      rows.push({
        typ: 'IPO',
        datum: r.created_at,
        beschreibung: r.company_name || r.ticker || 'IPO',
        status: r.status,
        betrag: r.amount_eur ?? null,
        menge: r.shares_requested,
        hinweis: r.decision_note || '',
      });
    });
    return rows.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  }, [stockOrders, bondPurchaseRequests, ipoSubscriptionRequests]);

  const exportColumns = useMemo(
    () => [
      { header: 'Typ', value: 'typ' },
      {
        header: 'Datum',
        value: (r) =>
          r.datum
            ? new Date(r.datum).toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '–',
      },
      { header: 'Beschreibung', value: 'beschreibung' },
      { header: 'Status', value: 'status' },
      {
        header: 'Betrag (EUR)',
        value: (r) => (r.betrag != null ? Number(r.betrag).toFixed(2) : ''),
        align: 'right',
      },
      {
        header: 'Menge',
        value: (r) => (r.menge != null ? Number(r.menge).toFixed(4) : ''),
        align: 'right',
      },
      { header: 'Hinweis', value: 'hinweis' },
    ],
    [],
  );

  const exportKpis = useMemo(
    () => [
      { label: 'Aktien-Aufträge', value: String(stockOrders.length) },
      { label: 'Anleihen-Anfragen', value: String(bondPurchaseRequests.length) },
      { label: 'IPO-Anfragen', value: String((ipoSubscriptionRequests || []).length) },
      {
        label: 'Ausstehend',
        value: String(
          (stockOrders || []).filter((o) => o.status === 'pending').length +
            (bondPurchaseRequests || []).filter((b) => b.status === 'pending').length +
            (ipoSubscriptionRequests || []).filter((r) => r.status === 'pending').length,
        ),
      },
    ],
    [stockOrders, bondPurchaseRequests, ipoSubscriptionRequests],
  );

  return (
    <PageContainer>
      <PortfolioPageLayout>
      <PageHeader
        eyebrow="Aktivität"
        title="Aufträge"
        icon={ClipboardList}
        description="Status Ihrer Aktienorders, Anleihen- und IPO-Anfragen (Ausstehend = in Prüfung durch die Bank)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hasAnyOrder && (
              <ExportActions
                fileBase="auftraege-report"
                title="Aufträge-Report"
                subtitle="Aktienorders und Anleihen-Anfragen"
                kpis={exportKpis}
                columns={exportColumns}
                rows={exportRows}
              />
            )}
            <Button
              variant="outline-ink"
              size="default"
              onClick={() => navigate('/dashboard/anleihen/kaufen')}
            >
              <AnleihenIcon size={14} strokeWidth={1.5} /> Anleihe anfragen
            </Button>
            <Button
              variant="outline-ink"
              size="default"
              onClick={() => navigate('/dashboard/ipo')}
            >
              <IpoIcon size={14} strokeWidth={1.5} /> IPO anfragen
            </Button>
            <Button variant="primary" size="default" onClick={() => navigate('/dashboard/handeln')}>
              <LineChart size={14} strokeWidth={1.5} /> Neuer Aktien-Auftrag
            </Button>
          </div>
        }
      />

      {activity.length > 0 && (
        <section className="mb-8 rounded-xl border border-bank-border bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <SectionHead icon={Wallet} kicker="Timeline">
              Letzte Aktivität
            </SectionHead>
            <div className="inline-flex rounded-lg border border-bank-border p-0.5">
              {[
                { id: 'all', label: 'Alle' },
                { id: 'stock', label: 'Aktien' },
                { id: 'bond', label: 'Anleihen' },
                { id: 'ipo', label: 'IPO' },
                { id: 'cash', label: 'Cash' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setActivityFilter(f.id);
                    if (f.id === 'cash' || f.id === 'all') refreshCashHistory();
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium',
                    activityFilter === f.id ? 'bg-bank-primary text-white' : 'text-bank-text-muted',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="divide-y divide-bank-border/70">
            {filteredActivity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-bank-text">{a.label}</p>
                  <p className="text-[11px] text-bank-text-muted">{SUB_LABELS[a.sub] || 'Sonstiges'}</p>
                </div>
                <div className="text-right shrink-0">
                  {a.amount != null && (
                    <p className="font-semibold tabular-nums text-bank-text">{formatEUR(Number(a.amount))}</p>
                  )}
                  <p className="text-[11px] text-bank-text-muted">
                    {a.at ? new Date(a.at).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showFullPageSkeleton ? (
        <CardListSkeleton count={4} />
      ) : !hasAnyOrder ? (
        <div className="rounded-xl border border-bank-border bg-white py-12 text-center shadow-sm">
          <Clock size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-text-muted/50" />
          <h3 className="text-[1.25rem] font-semibold text-bank-text">Noch keine Aufträge</h3>
          <p className="mt-2 text-[13px] text-bank-text-muted">Starten Sie mit Ihrem ersten Handelsauftrag.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline-ink"
              onClick={() => navigate('/dashboard/anleihen/kaufen')}
            >
              <AnleihenIcon size={14} strokeWidth={1.5} /> Zur Anleihe
            </Button>
            <Button variant="primary" onClick={() => navigate('/dashboard/handeln')}>
              <LineChart size={14} strokeWidth={1.5} /> Zum Aktienmarkt
            </Button>
          </div>
        </div>
      ) : (
        <>
          {hasStockOrders && (
            <section className={hasBondRequests ? 'mb-8' : undefined}>
              <SectionHead icon={LineChart} kicker="Wertpapiere">
                Aktien-Aufträge
              </SectionHead>

              {/* MOBILE */}
              <div ref={stockOrdersListRef} className="space-y-3 md:hidden">
                {stockOrders.map((o) => {
                  const meta = STATUS_META[o.status] || STATUS_META.pending;
                  return (
                    <div
                      key={o.id}
                      className="rounded-xl border border-bank-border bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-[14px] font-medium text-bank-text">{o.symbol}</p>
                            <SidePill side={o.side} />
                          </div>
                          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                            {fmtDateTime(o.created_at)}
                          </p>
                        </div>
                        <StatusPill meta={meta} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-bank-border pt-2.5 sm:grid-cols-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Stück</p>
                          <p className="mt-1 font-mono text-[13px] tabular-nums text-bank-text">
                            {Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Ref.</p>
                          <p className="mt-1 font-mono text-[13px] tabular-nums text-bank-text" title={fxHint(o)}>
                            {fmtOrderEur(o.requested_price, o)}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Rabatt</p>
                          <p className="mt-1 font-mono text-[13px] tabular-nums text-emerald-700">
                            {o.side === 'buy' &&
                            o.discount_percent_snapshot != null &&
                            Number(o.discount_percent_snapshot) > 0
                              ? `${Number(o.discount_percent_snapshot).toLocaleString('de-DE', {
                                  maximumFractionDigits: 2,
                                })}%`
                              : '–'}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Ausf.</p>
                          <p className="mt-1 font-mono text-[13px] tabular-nums text-bank-text">
                            {fmtOrderEur(o.executed_price, o)}
                          </p>
                        </div>
                      </div>
                      {o.rejection_reason && (
                        <p className="mt-3 border-t border-bank-border pt-2.5 text-[12px] leading-snug text-rose-600">
                          <span className="font-mono uppercase tracking-[0.16em]">Grund</span> · {o.rejection_reason}
                        </p>
                      )}
                      {o.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelOrder(o.id)}
                          className="mt-3 w-full border-rose-300/55 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Stornieren
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP */}
              <EditorialTable
                tbodyRef={stockOrdersDesktopRef}
                headers={[
                  { label: 'Datum', align: 'left' },
                  { label: 'Symbol', align: 'left' },
                  { label: 'Seite', align: 'left' },
                  { label: 'Stück', align: 'right' },
                  { label: 'Ref.-Kurs', align: 'right' },
                  { label: 'Rabatt', align: 'right' },
                  { label: 'Ausf.-Kurs', align: 'right' },
                  { label: 'Status', align: 'left' },
                  { label: '', align: 'right' },
                ]}
              >
                {stockOrders.map((o) => {
                  const meta = STATUS_META[o.status] || STATUS_META.pending;
                  return (
                    <tr key={o.id} className="border-b border-bank-border last:border-b-0 transition-colors hover:bg-bank-bg/45">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                        {fmtDateTime(o.created_at)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[13.5px] font-medium text-bank-text">
                        {o.symbol}
                      </td>
                      <td className="px-4 py-3"><SidePill side={o.side} /></td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-bank-text">
                        {Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-bank-text-muted" title={fxHint(o)} data-testid={`order-ref-price-${o.id}`}>
                        {fmtOrderEur(o.requested_price, o)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-emerald-700">
                        {o.side === 'buy' &&
                        o.discount_percent_snapshot != null &&
                        Number(o.discount_percent_snapshot) > 0
                          ? `${Number(o.discount_percent_snapshot).toLocaleString('de-DE', {
                              maximumFractionDigits: 2,
                            })}%`
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rate-figure text-[13.5px] tabular-nums text-bank-text">
                          {fmtOrderEur(o.executed_price, o)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill meta={meta} />
                        {o.rejection_reason && (
                          <p
                            className="mt-1 max-w-[200px] text-[10.5px] leading-snug text-rose-600"
                            title={o.rejection_reason}
                          >
                            {o.rejection_reason.length > 40
                              ? o.rejection_reason.slice(0, 40) + '…'
                              : o.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelOrder(o.id)}
                            className="border-rose-300/55 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                          >
                            Stornieren
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </EditorialTable>
            </section>
          )}

          {hasBondRequests && (
            <section>
              <SectionHead icon={AnleihenIcon} kicker="Festverzinslich">
                Anleihen-Kaufanfragen
              </SectionHead>

              <div ref={bondOrdersListRef} className="space-y-3 md:hidden">
                {bondPurchaseRequests.map((b) => {
                  const meta = BOND_STATUS_META[b.status] || BOND_STATUS_META.pending;
                  return (
                    <div
                      key={b.id}
                      className="relative border border-bank-border bg-white p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-display text-[1rem] font-semibold leading-tight text-bank-text">
                            {b.bond_name || b.isin || 'Anleihe'}
                          </p>
                          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                            {fmtDateTime(b.created_at)}
                          </p>
                          {b.isin && (
                            <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                              ISIN · {b.isin}
                            </p>
                          )}
                        </div>
                        <StatusPill meta={meta} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 border-t border-bank-border pt-2.5">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Volumen</p>
                          <p className="rate-figure mt-1 text-[14px] tabular-nums text-bank-text">
                            {formatEUR(b.amount_eur)}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Kupon (Ind.)</p>
                          <p className="rate-figure mt-1 text-[14px] tabular-nums text-bank-text">
                            {b.kupon_rate != null
                              ? `${Number(b.kupon_rate).toLocaleString('de-DE', { maximumFractionDigits: 4 })} %`
                              : '–'}
                          </p>
                        </div>
                      </div>
                      {b.decision_note && (
                        <p className="mt-3 border-t border-bank-border pt-2.5 text-[12.5px] leading-snug text-bank-text-muted">
                          <span className="font-mono uppercase tracking-[0.16em]">Hinweis</span> · {b.decision_note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <EditorialTable
                tbodyRef={bondOrdersDesktopRef}
                headers={[
                  { label: 'Datum', align: 'left' },
                  { label: 'Anleihe', align: 'left' },
                  { label: 'ISIN', align: 'left' },
                  { label: 'Volumen', align: 'right' },
                  { label: 'Status', align: 'left' },
                  { label: 'Hinweis', align: 'left' },
                ]}
              >
                {bondPurchaseRequests.map((b) => {
                  const meta = BOND_STATUS_META[b.status] || BOND_STATUS_META.pending;
                  return (
                    <tr key={b.id} className="border-b border-bank-border last:border-b-0 transition-colors hover:bg-bank-bg/45">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                        {fmtDateTime(b.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] font-medium text-bank-text">
                        {b.bond_name || '–'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                        {b.isin || '–'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rate-figure text-[13.5px] tabular-nums text-bank-text">
                          {formatEUR(b.amount_eur)}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusPill meta={meta} /></td>
                      <td className="max-w-[220px] px-4 py-3 text-[12px] leading-snug text-bank-text-muted">
                        {b.offer && !b.decision_note
                          ? ({ offered: 'Individuelles Angebot liegt vor', accepted: 'Angebot angenommen – in Prüfung', declined: 'Angebot abgelehnt', expired: 'Angebot abgelaufen' }[b.offer.status] || '–')
                          : b.decision_note
                          ? b.decision_note.length > 80
                            ? b.decision_note.slice(0, 80) + '…'
                            : b.decision_note
                          : '–'}
                      </td>
                  </tr>
                  );
                })}
              </EditorialTable>
              <BondOffersPanel requests={bondPurchaseRequests} onDecided={refreshBondRequests} />
            </section>
          )}

          {hasIpoRequests && (
            <section>
              <SectionHead icon={IpoIcon} kicker="Börsengang">
                IPO-Zeichnungsanfragen
              </SectionHead>
              <EditorialTable
                headers={[
                  { label: 'Datum', align: 'left' },
                  { label: 'Unternehmen', align: 'left' },
                  { label: 'Ticker', align: 'left' },
                  { label: 'Volumen', align: 'right' },
                  { label: 'Stück', align: 'right' },
                  { label: 'IPO-Kaufpreis', align: 'right' },
                  { label: 'Gesch. Wert/Aktie', align: 'right' },
                  { label: 'Gesch. Gewinn', align: 'right' },
                  { label: 'Status', align: 'left' },
                  { label: 'Hinweis', align: 'left' },
                ]}
              >
                {(ipoSubscriptionRequests || []).map((r) => {
                  const meta = IPO_STATUS_META[r.status] || IPO_STATUS_META.pending;
                  // Backend estimate (allocated shares once allocated; nothing when values are missing).
                  const est = r.use_admin_valuation !== false ? fromBackendValuation(r.valuation) : null;
                  return (
                    <tr key={r.id} className="border-b border-bank-border last:border-b-0 transition-colors hover:bg-bank-bg/45">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px] text-bank-text-muted">
                        {fmtDateTime(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] font-medium">{r.company_name || '–'}</td>
                      <td className="px-4 py-3 font-mono text-[12.5px]">{r.ticker || '–'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatEUR(r.amount_eur)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.status === 'allocated' && r.allocated_shares != null ? r.allocated_shares : r.shares_requested}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[12px]">
                        {r.subscription_price_per_share != null
                          ? Number(r.subscription_price_per_share).toLocaleString('de-DE', {
                              style: 'currency', currency: 'EUR',
                              maximumFractionDigits: 4,
                            })
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[12px]">
                        {r.listing_price_per_share != null
                          ? Number(r.listing_price_per_share).toLocaleString('de-DE', {
                              style: 'currency', currency: 'EUR',
                              maximumFractionDigits: 4,
                            })
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[12px]" data-testid={`ipo-request-profit-${r.id}`}>
                        {est && est.profit != null ? (
                          <>
                            <span className={toneClass(est.profit)}>{fmtEurSigned(est.profit)}</span>
                            <br />
                            <span className={`text-[10px] ${toneClass(est.returnPct)}`}>{fmtPctSigned(est.returnPct)}</span>
                          </>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusPill meta={meta} /></td>
                      <td className="max-w-[220px] px-4 py-3 text-[12px] text-bank-text-muted">
                        {r.decision_note || '–'}
                      </td>
                    </tr>
                  );
                })}
              </EditorialTable>
            </section>
          )}
        </>
      )}
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default OrdersPage;
