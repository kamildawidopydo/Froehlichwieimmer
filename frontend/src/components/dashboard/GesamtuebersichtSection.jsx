import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Wallet,
  Landmark,
  TrendingUp,
  Percent,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import { useDashboardData } from '@/context/DashboardDataContext';
import BankLogo from '@/components/BankLogo';
import StockLogo from '@/components/StockLogo';
import BondLogo from '@/components/BondLogo';
import AssetAllocationDonut from '@/components/AssetAllocationDonut';
import Sparkline from '@/components/dashboard/charts/Sparkline';
import PortfolioHeroChart from '@/components/dashboard/charts/PortfolioHeroChart';
import { fetchSparkline } from '@/services/stockHistoryService';
import { formatEUR, formatEURSigned } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';
import { positiveNegativeColor } from '@/components/dashboard/charts/chartTheme';
import { DashboardStagger, DashboardStaggerItem } from '@/components/dashboard/motion/DashboardStagger';
import IpoPositionsTable from '@/components/dashboard/IpoPositionsTable';
import DashboardTabPanel from '@/components/dashboard/motion/DashboardTabPanel';
import { useDashboardMotion } from '@/components/dashboard/motion/dashboardMotion';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import AnimatedNumber from '@/components/AnimatedNumber';

const MIN_SNAPSHOTS_FOR_PERIOD_CHANGE = 3;

const RANGES = [
  { key: 1, label: '1T' },
  { key: 7, label: '1W' },
  { key: 30, label: '1M' },
  { key: -1, label: 'YTD' },
  { key: 180, label: '6M' },
  { key: 365, label: '1J' },
  { key: 9999, label: 'Gesamt' },
];

const PRIMARY_RANGE_KEYS = [7, 30, 365];
const EXTRA_RANGE_KEYS = [1, -1, 180, 9999];

const PRODUCT_LABELS = {
  tagesgeld: 'Tagesgeldkonto',
  flexgeld: 'Flexgeldkonto',
  festgeld: 'Festgeldkonto',
};

const formatPct = (v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(2).replace('.', ',')}%`;

const PctBadge = ({ value, className }) => {
  const up = Number(value) >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums',
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
        className,
      )}
    >
      {up ? <ArrowUpRight size={11} strokeWidth={2} /> : <ArrowDownRight size={11} strokeWidth={2} />}
      {formatPct(value)}
    </span>
  );
};

const OverviewCard = ({ title, total, children, footerTo, footerLabel }) => (
  <div className="flex h-full flex-col rounded-lg border border-bank-border bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <h3 className="text-[15px] font-semibold text-bank-text">{title}</h3>
      {total != null && (
        <p className="rate-figure text-right text-[1.35rem] font-semibold leading-none tabular-nums text-bank-text">
          {formatEUR(total)}
        </p>
      )}
    </div>
    <div className="flex-1 space-y-3">{children}</div>
    {footerTo && (
      <Link
        to={footerTo}
        className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary hover:underline"
      >
        {footerLabel}
        <ChevronRight size={14} strokeWidth={1.5} />
      </Link>
    )}
  </div>
);

const RowItem = ({ logo, bankName, title, subtitle, value, pct }) => (
  <div className="flex items-center gap-3 border-b border-bank-border/70 pb-3 last:border-0 last:pb-0">
    <BankLogo logo={logo} bankName={bankName} size="sm" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[14px] font-medium text-bank-text">{title}</p>
      {subtitle && <p className="truncate text-[12px] text-bank-text-muted">{subtitle}</p>}
    </div>
    <div className="shrink-0 text-right">
      <p className="text-[14px] font-semibold tabular-nums text-bank-text">{value}</p>
      {pct != null && (
        <p className="text-[12px] font-medium tabular-nums text-bank-text-muted">{Number(pct).toFixed(2).replace('.', ',')}%</p>
      )}
    </div>
  </div>
);

const AssetClassRow = ({ icon: Icon, label, value, pct }) => (
  <div className="flex items-center gap-3 border-b border-bank-border/70 pb-3 last:border-0 last:pb-0">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-bank-primary/20 bg-bank-primary/5 text-bank-primary">
      <Icon size={18} strokeWidth={1.5} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-medium text-bank-text">{label}</p>
    </div>
    <div className="shrink-0 text-right">
      <p className="text-[14px] font-semibold tabular-nums text-bank-text">{value}</p>
      {pct != null && <PctBadge value={pct} />}
    </div>
  </div>
);

/** Compact KPI tile for the account metrics strip (IBKR-style). */
const StatTile = ({ icon: Icon, label, value, sub, tone = 'neutral', compact = false }) => (
  <div
    className={cn(
      'rounded-xl border border-bank-border bg-white shadow-sm transition-all duration-300 hover:border-bank-primary/15 hover:shadow-editorial-sm',
      compact ? 'p-2.5' : 'p-4',
    )}
  >
    <div className="flex items-center gap-1.5 text-bank-text-muted">
      {Icon && <Icon size={compact ? 12 : 13} strokeWidth={1.6} className="shrink-0" />}
      <p
        className={cn(
          'min-w-0 font-medium text-bank-text-muted',
          compact
            ? 'text-[10px] leading-tight text-bank-text'
            : 'truncate text-[11px] uppercase tracking-[0.04em]',
        )}
      >
        {label}
      </p>
    </div>
    <p
      className={cn(
        'rate-figure font-semibold leading-none tabular-nums',
        compact ? 'mt-1.5 text-[1.05rem]' : 'mt-2 text-[1.3rem]',
        tone === 'pos' && 'text-emerald-600',
        tone === 'neg' && 'text-rose-600',
        tone === 'neutral' && 'text-bank-text',
      )}
    >
      {value}
    </p>
    {sub && (
      <p className={cn('truncate text-bank-text-muted', compact ? 'mt-1 text-[10px]' : 'mt-1.5 text-[12px]')}>
        {sub}
      </p>
    )}
  </div>
);

const TopPositionsTable = ({ rows, sparklines }) => {
  const listRef = useAutoAnimateRef(rows.length > 0);

  return (
  <div className="overflow-hidden">
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-bank-border pb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted sm:grid-cols-[1fr_76px_auto_auto_auto]">
      <span>Position</span>
      <span className="hidden text-center sm:block">30 Tage</span>
      <span className="hidden text-right sm:block">Kurs</span>
      <span className="text-right">Marktwert</span>
      <span className="w-16 text-right">Tag</span>
    </div>
    <div ref={listRef} className="divide-y divide-bank-border/70">
      {rows.map((r) => {
        const up = (r.dayPct ?? r.gvPct ?? 0) >= 0;
        const spark = sparklines?.[r.symbol];
        return (
          <div
            key={r.id || r.symbol}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5 sm:grid-cols-[1fr_76px_auto_auto_auto]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {r.kind === 'bond' ? (
                <BondLogo bond={r.bond} size="sm" eager />
              ) : (
                <StockLogo symbol={r.symbol} name={r.name} logoUrl={r.logoUrl} exchange={r.exchange} isTradable={r.isTradable} size="sm" />
              )}
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-bank-text">{r.name}</p>
                <p className="truncate font-mono text-[11px] text-bank-text-muted">{r.symbol}</p>
              </div>
            </div>
            <div className="hidden items-center justify-center sm:flex">
              <Sparkline values={spark} up={up} />
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-medium tabular-nums text-bank-text">{r.last ?? '–'}</p>
              {r.isIpoValuation ? (
                <p className="text-[10px] text-bank-text-muted">
                  Lots {Number(r.qty).toLocaleString('de-DE')} · Listing
                </p>
              ) : null}
              {r.gvPct != null && (
                <p
                  className={cn(
                    'text-[11px] font-medium tabular-nums',
                    r.gvPct >= 0 ? 'text-emerald-600' : 'text-rose-600',
                  )}
                >
                  G/V {formatPct(r.gvPct)}
                  {r.isIpoValuation && r.gvAbs != null ? ` · ${formatEURSigned(r.gvAbs)}` : ''}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[13.5px] font-semibold tabular-nums text-bank-text">{r.value}</p>
            </div>
            <div className="flex w-16 justify-end">
              {r.dayPct != null ? (
                <PctBadge value={r.dayPct} />
              ) : (
                <span className="text-[12px] text-bank-text-muted">–</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
  );
};

export default function GesamtuebersichtSection({ loading, showcase = false }) {
  const { panel } = useDashboardMotion();
  const {
    cashBalance,
    cashAvailable,
    gesamtvermoegen,
    heroSnapshots,
    activeContracts,
    depotWert,
    depotGV,
    depotEinstand,
    bondsMarktwert,
    bondsGV,
    bondsEinstand,
    contractsTotal,
    stockMetrics,
    watchlistItems,
    stockPriceMap,
    stockCatalog,
    activeBonds,
    computeBondMetrics,
    portfolioAggregate,
    realizedPnlTotal,
    dailyPortfolioPnl,
    computeContractMetrics,
  } = useDashboardData();

  const [rangeDays, setRangeDays] = useState(365);
  const [chartMode, setChartMode] = useState('value'); // 'value' | 'performance'
  const [showChartOptions, setShowChartOptions] = useState(false);
  const [showExtraKpis, setShowExtraKpis] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);

  const { chartData, snapshotCount, chartReliable } = useMemo(() => {
    const snaps = [...(heroSnapshots || [])].sort((a, b) =>
      String(a.snapshot_date).localeCompare(String(b.snapshot_date)),
    );
    let filtered = snaps;
    if (rangeDays < 9999) {
      const from = new Date();
      if (rangeDays === -1) {
        from.setMonth(0, 1);
        from.setHours(0, 0, 0, 0);
      } else {
        from.setDate(from.getDate() - rangeDays);
      }
      const fromKey = from.toISOString().slice(0, 10);
      filtered = snaps.filter((s) => String(s.snapshot_date) >= fromKey);
    }
    const historicalCount = filtered.length;
    const rows = filtered.map((s) => ({
      date: s.snapshot_date,
      total: Number(s.total_value || 0),
    }));
    const today = new Date().toISOString().slice(0, 10);
    const lastRow = rows[rows.length - 1];
    if (historicalCount >= 2) {
      if (!lastRow || lastRow.date !== today) {
        rows.push({ date: today, total: gesamtvermoegen });
      } else {
        rows[rows.length - 1] = { date: today, total: gesamtvermoegen };
      }
    } else if (historicalCount === 1 && lastRow?.date !== today) {
      rows.push({ date: today, total: gesamtvermoegen });
    }
    const base = rows[0]?.total || 0;
    const enriched = rows.map((r) => ({
      ...r,
      pct: base > 0 ? ((r.total - base) / base) * 100 : 0,
    }));
    return {
      chartData: enriched,
      snapshotCount: historicalCount,
      chartReliable: historicalCount >= MIN_SNAPSHOTS_FOR_PERIOD_CHANGE,
    };
  }, [heroSnapshots, rangeDays, gesamtvermoegen]);

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const changeAbs = first && last ? last.total - first.total : 0;
  const changePct = first && first.total > 0 ? (changeAbs / first.total) * 100 : 0;
  const up = changeAbs >= 0;
  const lineColor = positiveNegativeColor(up);

  const rangeHint =
    rangeDays === -1
      ? 'seit Jahresbeginn'
      : rangeDays === 365
        ? 'in diesem Jahr'
        : rangeDays >= 9999
          ? 'gesamt'
          : 'im Zeitraum';

  const cashEinlagenTotal = Number(cashBalance || 0) + Number(contractsTotal || 0);
  const wertpapiereTotal = Number(depotWert || 0) + Number(bondsMarktwert || 0);
  const unrealizedPL = Number(depotGV || 0) + Number(bondsGV || 0);
  const wpEinstand = Number(depotEinstand || 0) + Number(bondsEinstand || 0);
  const unrealizedPct = wpEinstand > 0 ? (unrealizedPL / wpEinstand) * 100 : 0;
  const stocksPct = depotEinstand > 0 ? (depotGV / depotEinstand) * 100 : 0;
  const bondsPct = bondsEinstand > 0 ? (bondsGV / bondsEinstand) * 100 : 0;
  const weightedAvgRate = portfolioAggregate?.weightedAvgRate || 0;
  const dailyInterestNet = portfolioAggregate?.dailyInterestNetTotal || 0;

  const cashRows = useMemo(() => {
    const rows = [];
    if (Number(cashBalance) > 0) {
      rows.push({
        key: 'cash',
        bankName: 'Fröhlich',
        logo: '/assets/logo/frohlich-logo.png?v=4',
        title: 'Fröhlich',
        subtitle: 'Kontoguthaben',
        value: formatEUR(cashBalance),
        pct: null,
      });
    }
    const contracts = [...(activeContracts || [])]
      .map((c) => {
        const m = computeContractMetrics(c);
        return {
          key: c.id,
          bankName: c.banks?.name || 'Partnerbank',
          logo: c.banks?.logo_url,
          title: c.banks?.name || 'Partnerbank',
          subtitle:
            c.product_type === 'festgeld' && c.end_date
              ? `${PRODUCT_LABELS.festgeld} · Laufzeit bis ${new Date(c.end_date).toLocaleDateString('de-DE')}`
              : PRODUCT_LABELS[c.product_type] || c.product_type,
          value: formatEUR(m.currentValueGross),
          pct: c.zinssatz != null ? Number(c.zinssatz) : null,
          amount: m.currentValueGross,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    return [...rows, ...contracts];
  }, [activeContracts, cashBalance, computeContractMetrics]);

  const topStocks = useMemo(
    () => [...(stockMetrics || [])].sort((a, b) => b.marktwert - a.marktwert).slice(0, 5),
    [stockMetrics],
  );

  const hasIpoPositions = (stockMetrics || []).some((m) => m.isIpoValuation);

  const topBonds = useMemo(
    () =>
      [...(activeBonds || [])]
        .map((b) => {
          const m = computeBondMetrics(b);
          return { bond: b, marktwert: m.marktwert, rendite: m.rendite };
        })
        .sort((a, b) => b.marktwert - a.marktwert)
        .slice(0, 3),
    [activeBonds, computeBondMetrics],
  );

  // Top-Positionen: Aktien + Anleihen; sonst Watchlist/Katalog.
  const positionRows = useMemo(() => {
    const stockRows =
      topStocks.length > 0
        ? topStocks.map((s) => {
            const p = stockPriceMap?.[s.symbol];
            return {
              symbol: s.symbol,
              name: s.stockName || s.symbol,
              logoUrl: s.logoUrl,
              exchange: s.exchange,
              isTradable: s.isTradable,
              isIpoValuation: s.isIpoValuation,
              ipoEinstandPerLot: s.ipoEinstandPerLot,
              ipoListingPerLot: s.ipoListingPerLot,
              qty: s.qty,
              gvAbs: s.gv,
              kind: 'stock',
              marktwertNum: s.marktwert,
              value: formatEUR(s.marktwert),
              last:
                s.isIpoValuation && s.ipoListingPerLot != null
                  ? Number(s.ipoListingPerLot).toLocaleString('de-DE', {
                      style: 'currency',
                      currency: s.currency || 'EUR',
                    })
                  : p?.price != null
                  ? Number(p.price).toLocaleString('de-DE', {
                      style: 'currency',
                      currency: s.currency || 'EUR',
                    })
                  : null,
              gvPct: s.pct != null ? Number(s.pct) : null,
              dayPct: p?.change_pct != null ? Number(p.change_pct) : null,
            };
          })
        : [];

    const bondRows = topBonds.map((b) => ({
      id: `bond-${b.bond.id}`,
      symbol: b.bond.bond_name || b.bond.isin || 'Anleihe',
      name: 'Anleihe',
      bond: b.bond,
      kind: 'bond',
      marktwertNum: b.marktwert,
      value: formatEUR(b.marktwert),
      last: null,
      gvPct: b.rendite != null ? Number(b.rendite) : null,
      dayPct: null,
    }));

    const combined = [...stockRows, ...bondRows]
      .sort((a, b) => b.marktwertNum - a.marktwertNum)
      .slice(0, 5);

    if (combined.length > 0) return combined;
    const fallback = [...(watchlistItems || [])].slice(0, 5);
    const source =
      fallback.length > 0
        ? fallback.map((w) => ({ symbol: w.symbol, name: w.stocks?.name || w.symbol, logoUrl: w.stocks?.logo_url || null }))
        : [...(stockCatalog || [])].slice(0, 5).map((s) => ({ symbol: s.symbol, name: s.name || s.symbol, logoUrl: s.logo_url || null }));
    return source.map((s) => {
      const p = stockPriceMap?.[s.symbol];
      return {
        symbol: s.symbol,
        name: s.name,
        logoUrl: s.logoUrl,
        value:
          p?.price != null
            ? Number(p.price).toLocaleString('de-DE', { style: 'currency', currency: p?.currency || 'USD' })
            : '–',
        gvPct: null,
        dayPct: p?.change_pct != null ? Number(p.change_pct) : null,
      };
    });
  }, [topStocks, topBonds, watchlistItems, stockPriceMap, stockCatalog]);

  const hasOwnedPositions = topStocks.length > 0 || topBonds.length > 0;

  // 30-day sparklines for the visible positions (via stock-history edge fn).
  const [sparklines, setSparklines] = useState({});
  const positionSymbolsKey = positionRows.map((r) => r.symbol).join(',');
  useEffect(() => {
    let active = true;
    const symbols = positionSymbolsKey ? positionSymbolsKey.split(',').filter(Boolean) : [];
    if (symbols.length === 0) {
      setSparklines({});
      return undefined;
    }
    Promise.all(
      symbols.map(async (s) => {
        try {
          const values = await fetchSparkline(s, '1mo');
          return [s, values];
        } catch {
          return [s, null];
        }
      }),
    ).then((entries) => {
      if (!active) return;
      const map = {};
      entries.forEach(([s, v]) => {
        if (v && v.length > 1) map[s] = v;
      });
      setSparklines(map);
    });
    return () => {
      active = false;
    };
  }, [positionSymbolsKey]);

  if (loading) {
    return (
      <div className="mb-8 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-bank-border/60" />
        <div className="h-64 animate-pulse rounded-xl bg-bank-border/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-bank-border/40" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-xl bg-bank-border/40 lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-xl bg-bank-border/40" />
        </div>
      </div>
    );
  }

  const dailyPnl = Number(dailyPortfolioPnl || 0);
  const dailyUp = dailyPnl >= 0;

  const segmentBtn = (active) =>
    cn(
      'rounded px-2.5 py-1 text-[12px] font-medium transition-colors',
      active ? 'bg-bank-primary text-white shadow-sm' : 'text-bank-text-muted hover:text-bank-text',
    );

  const visibleRanges = showcase
    ? RANGES.filter((r) => PRIMARY_RANGE_KEYS.includes(r.key))
    : RANGES.filter((r) => PRIMARY_RANGE_KEYS.includes(r.key));

  const extraRangeActive = EXTRA_RANGE_KEYS.includes(rangeDays);
  const activeExtraLabel = RANGES.find((r) => r.key === rangeDays)?.label;

  const closeChartOptions = () => {
    setShowChartOptions(false);
    setChartMode('value');
  };

  return (
    <section className={showcase ? 'mb-0' : 'mb-8'}>
      <div className={cn('flex flex-wrap items-center justify-between gap-3', showcase ? 'mb-3' : 'mb-4')}>
        <h2
          className={cn(
            'dashboard-page-title font-semibold text-bank-text',
            showcase ? 'text-[1.15rem]' : 'text-[1.35rem]',
          )}
        >
          Gesamtübersicht
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex max-w-full flex-wrap rounded-md border border-bank-border bg-white p-0.5">
            {visibleRanges.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeDays(r.key)}
                className={segmentBtn(rangeDays === r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {!showcase && (
            <label className="relative inline-block cursor-pointer rounded-md border border-bank-border bg-white py-1.5 pl-2.5 pr-7">
              <span className="pointer-events-none text-[12px] font-medium text-bank-text">
                {extraRangeActive ? activeExtraLabel : 'Mehr…'}
              </span>
              <select
                value={extraRangeActive ? String(rangeDays) : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setRangeDays(Number(v));
                }}
                aria-label="Weitere Zeiträume"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                <option value="" disabled={extraRangeActive}>
                  Mehr…
                </option>
                {RANGES.filter((r) => EXTRA_RANGE_KEYS.includes(r.key)).map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2 top-1/2 shrink-0 -translate-y-1/2 text-bank-text-muted"
                aria-hidden
              />
            </label>
          )}
          {!showcase && (
            <button
              type="button"
              onClick={() => (showChartOptions ? closeChartOptions() : setShowChartOptions(true))}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                showChartOptions
                  ? 'border-bank-primary bg-bank-primary/10 text-bank-primary'
                  : 'border-bank-border bg-white text-bank-text-muted hover:text-bank-text',
              )}
            >
              {showChartOptions ? 'Chart schließen' : 'Performance'}
            </button>
          )}
        </div>
      </div>

      {!showcase && showChartOptions && (
        <div className="mb-4 inline-flex rounded-md border border-bank-border bg-white p-0.5">
          {[
            { k: 'value', l: 'Wert' },
            { k: 'performance', l: 'Performance' },
          ].map((m) => (
            <button
              key={m.k}
              type="button"
              onClick={() => setChartMode(m.k)}
              className={segmentBtn(chartMode === m.k)}
            >
              {m.l}
            </button>
          ))}
        </div>
      )}

      {showcase && (
        <div className="mb-3 inline-flex rounded-md border border-bank-border bg-white p-0.5">
          {[
            { k: 'value', l: 'Wert' },
            { k: 'performance', l: 'Performance' },
          ].map((m) => (
            <button
              key={m.k}
              type="button"
              onClick={() => setChartMode(m.k)}
              className={segmentBtn(chartMode === m.k)}
            >
              {m.l}
            </button>
          ))}
        </div>
      )}

      {/* Hero card — IBKR-style portfolio header */}
      <motion.div
        {...panel}
        className={cn(
          'rounded-lg border border-bank-border bg-white shadow-sm',
          showcase ? 'mb-3 p-4' : 'mb-4 p-5 sm:p-6',
        )}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.65fr] lg:items-stretch">
          <div className="flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted">
              Gesamtvermögen
            </p>
            <p
              className={cn(
                'mt-1 font-semibold leading-none tabular-nums text-bank-text',
                showcase ? 'text-[1.85rem]' : 'text-[2.25rem] sm:text-[2.65rem]',
              )}
            >
              <AnimatedNumber value={gesamtvermoegen} format={formatEUR} />
            </p>
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-[13px] font-medium tabular-nums',
                dailyUp ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {dailyUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {formatEURSigned(dailyPnl)} heute
            </p>

            {chartReliable && chartData.length > 1 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PctBadge value={changePct} className="text-[12px]" />
                <span className="text-[12px] tabular-nums text-bank-text-muted">
                  {formatEURSigned(changeAbs)} · {rangeHint}
                </span>
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-bank-text-muted">
                Zeitraum-Performance erscheint nach mehreren Tages-Snapshots.
              </p>
            )}

            <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-bank-border/70 pt-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-bank-text-muted">Guthaben</p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-bank-text">{formatEUR(cashBalance)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-bank-text-muted">Wertpapiere</p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-bank-text">{formatEUR(wertpapiereTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-bank-text-muted">Verträge</p>
                <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-bank-text">{formatEUR(contractsTotal)}</p>
              </div>
            </div>
          </div>

          <div className={showcase ? 'min-h-[160px]' : 'min-h-[240px] sm:min-h-[260px]'}>
            <DashboardTabPanel tabKey={`${chartMode}-${rangeDays}`}>
              <PortfolioHeroChart
                data={chartData}
                mode={chartMode}
                lineColor={lineColor}
                height={showcase ? 160 : 260}
                snapshotCount={snapshotCount}
                rangeDays={rangeDays}
                emptyHint="Verlauf erscheint nach dem ersten Snapshot."
                emptySub={`${snapshotCount} Snapshot${snapshotCount === 1 ? '' : 's'} gespeichert`}
              />
            </DashboardTabPanel>
            {!chartReliable && chartData.length >= 2 && (
              <p className="mt-1 text-center text-[10px] text-bank-text-muted">
                Chart basiert auf {snapshotCount} Snapshot{snapshotCount === 1 ? '' : 's'} — Verlauf noch nicht repräsentativ
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPI strip — 4 primary metrics; rest behind "Mehr anzeigen" */}
      <DashboardStagger className={cn('grid gap-3', showcase ? 'mb-0 grid-cols-4 gap-2' : 'mb-4 grid-cols-2 lg:grid-cols-4')}>
        <DashboardStaggerItem>
          <StatTile icon={Wallet} label="Verfügbar" value={formatEUR(cashAvailable)} sub="Verfügbar zum Handeln" compact={showcase} />
        </DashboardStaggerItem>
        <DashboardStaggerItem>
        <StatTile
          icon={TrendingUp}
          label="Heute"
          value={formatEURSigned(dailyPnl)}
          sub="Tagesperformance"
          tone={dailyPnl >= 0 ? 'pos' : 'neg'}
          compact={showcase}
        />
        </DashboardStaggerItem>
        <DashboardStaggerItem>
        <StatTile
          icon={LineChart}
          label="Unrealisierter G/V"
          value={formatEURSigned(unrealizedPL)}
          sub={`${formatPct(unrealizedPct)} vom Einstand`}
          tone={unrealizedPL >= 0 ? 'pos' : 'neg'}
          compact={showcase}
        />
        </DashboardStaggerItem>
        <DashboardStaggerItem>
        <StatTile icon={LineChart} label="Wertpapiere" value={formatEUR(wertpapiereTotal)} sub="Aktien & Anleihen" compact={showcase} />
        </DashboardStaggerItem>
        {!showcase && showExtraKpis && (
          <>
            <DashboardStaggerItem>
            <StatTile icon={Landmark} label="Einlagen" value={formatEUR(contractsTotal)} sub="Verträge" />
            </DashboardStaggerItem>
            <DashboardStaggerItem>
            <StatTile icon={PRODUCT_ICONS.anleihen} label="Anleihen" value={formatEUR(bondsMarktwert)} sub="Marktwert" />
            </DashboardStaggerItem>
            <DashboardStaggerItem>
            <StatTile
              icon={Coins}
              label="Realisierter G/V"
              value={formatEURSigned(realizedPnlTotal || 0)}
              sub="Aus Verkäufen"
              tone={(realizedPnlTotal || 0) > 0 ? 'pos' : (realizedPnlTotal || 0) < 0 ? 'neg' : 'neutral'}
            />
            </DashboardStaggerItem>
            <DashboardStaggerItem>
            <StatTile
              icon={Percent}
              label="Ø-Zins gewichtet"
              value={`${weightedAvgRate.toFixed(2).replace('.', ',')} %`}
              sub={`Tageszins netto: ${formatEUR(dailyInterestNet)}`}
            />
            </DashboardStaggerItem>
          </>
        )}
      </DashboardStagger>

      {!showcase && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowExtraKpis((v) => !v)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-bank-text-muted hover:text-bank-primary"
          >
            <ChevronDown size={14} className={cn('transition-transform', showExtraKpis && 'rotate-180')} />
            {showExtraKpis ? 'Weniger Kennzahlen' : 'Weitere Kennzahlen anzeigen'}
          </button>
        </div>
      )}

      {showcase && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-lg border border-bank-border bg-white p-3.5 shadow-sm">
            <p className="mb-2 text-[13px] font-semibold text-bank-text">Top-Positionen</p>
            {positionRows.slice(0, 3).map((row) => (
              <div
                key={row.id || row.symbol}
                className="flex items-center justify-between gap-3 border-b border-bank-border/70 py-2 last:border-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {row.kind === 'bond' ? (
                    <BondLogo bond={row.bond} size="sm" eager />
                  ) : (
                    <StockLogo symbol={row.symbol} name={row.name} logoUrl={row.logoUrl} exchange={row.exchange} size="sm" eager />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-bank-text">{row.name}</p>
                    <p className="truncate font-mono text-[10.5px] text-bank-text-muted">{row.symbol}</p>
                  </div>
                </div>
                <p className="shrink-0 text-[13px] font-semibold tabular-nums text-bank-text">{row.value}</p>
              </div>
            ))}
          </div>
          <div className="min-h-0 [&>div]:p-3.5">
            <AssetAllocationDonut
              cash={cashBalance}
              stocks={depotWert}
              bonds={bondsMarktwert}
              contracts={contractsTotal}
            />
          </div>
        </div>
      )}

      {!showcase && (
      <>
      {hasIpoPositions && (
        <IpoPositionsTable
          metrics={stockMetrics}
          stockPriceMap={stockPriceMap}
          className="mb-4"
        />
      )}
      {/* Top positions + optional allocation */}
      <div className={cn('mb-4 grid gap-4', showAllocation && 'lg:grid-cols-3')}>
        <div
          className={cn(
            'flex h-full flex-col rounded-xl border border-bank-border bg-white p-5 shadow-sm',
            showAllocation ? 'lg:col-span-2' : '',
          )}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-bank-text">
              {hasOwnedPositions ? 'Top-Positionen' : 'Aktien im Blick'}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              {!showAllocation && (
                <button
                  type="button"
                  onClick={() => setShowAllocation(true)}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-bank-text-muted hover:text-bank-primary"
                >
                  <PieChart size={14} />
                  Verteilung anzeigen
                </button>
              )}
              <Link
                to={hasOwnedPositions ? '/dashboard/uebersicht?tab=positionen' : '/dashboard/aktien'}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary hover:underline"
              >
                {hasOwnedPositions ? 'Alle Positionen' : 'Alle Aktien'}
                <ChevronRight size={14} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
          {positionRows.length === 0 ? (
            <p className="text-[13px] text-bank-text-muted">Keine Aktien verfügbar.</p>
          ) : (
            <TopPositionsTable rows={positionRows} sparklines={sparklines} />
          )}
        </div>

        {showAllocation && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAllocation(false)}
              className="absolute right-3 top-3 z-10 text-[11px] font-medium text-bank-text-muted hover:text-bank-text"
            >
              Ausblenden
            </button>
            <AssetAllocationDonut
              cash={cashBalance}
              stocks={depotWert}
              bonds={bondsMarktwert}
              contracts={contractsTotal}
            />
          </div>
        )}
      </div>

      {/* Compact product summary → full detail on demand */}
      <div className="mb-4 rounded-xl border border-bank-border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-bank-text">Meine Produkte</p>
            <p className="mt-1 text-[12px] text-bank-text-muted">
              Cash {formatEUR(cashBalance)} · Wertpapiere {formatEUR(wertpapiereTotal)} · Verträge{' '}
              {formatEUR(contractsTotal)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProductDetails((v) => !v)}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-bank-text-muted hover:text-bank-primary"
            >
              <ChevronDown size={14} className={cn('transition-transform', showProductDetails && 'rotate-180')} />
              {showProductDetails ? 'Details ausblenden' : 'Details anzeigen'}
            </button>
            <Link
              to="/dashboard/vermoegen"
              className="inline-flex items-center gap-1 rounded-lg border border-bank-primary/30 bg-bank-primary/5 px-3 py-1.5 text-[13px] font-medium text-bank-primary hover:bg-bank-primary/10"
            >
              Mein Vermögen
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {showProductDetails && (
          <div className="mt-4 grid gap-4 border-t border-bank-border/70 pt-4 lg:grid-cols-2">
            <OverviewCard
              title="Cash & Einlagen"
              total={cashEinlagenTotal}
              footerTo="/dashboard/tagesgeld"
              footerLabel="Alle Cash-Konten anzeigen"
            >
              {cashRows.length === 0 ? (
                <p className="text-[13px] text-bank-text-muted">Noch keine Einlagen.</p>
              ) : (
                cashRows.map((row) => (
                  <RowItem
                    key={row.key}
                    logo={row.logo}
                    bankName={row.bankName}
                    title={row.title}
                    subtitle={row.subtitle}
                    value={row.value}
                    pct={row.pct}
                  />
                ))
              )}
            </OverviewCard>

            <OverviewCard
              title="Wertpapiere"
              total={wertpapiereTotal}
              footerTo="/dashboard/vermoegen"
              footerLabel="Alle Wertpapiere anzeigen"
            >
              <AssetClassRow icon={PRODUCT_ICONS.aktien} label="Aktien" value={formatEUR(depotWert)} pct={stocksPct} />
              <AssetClassRow icon={PRODUCT_ICONS.anleihen} label="Anleihen" value={formatEUR(bondsMarktwert)} pct={bondsPct} />
            </OverviewCard>
          </div>
        )}
      </div>
      </>
      )}
    </section>
  );
}
