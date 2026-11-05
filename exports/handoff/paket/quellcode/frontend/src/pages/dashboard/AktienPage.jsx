import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  X,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  RefreshCw,
  Wallet,
  PieChart as PieChartIcon,
  Activity,
  Briefcase,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import ProductIcon from '@/components/ProductIcon';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/context/DashboardDataContext';
import { PageContainer, PageHeader } from '@/components/dashboard/PageHeader';
import VermoegenBreadcrumb from '@/components/dashboard/VermoegenBreadcrumb';
import VermoegenSubNav from '@/components/dashboard/VermoegenSubNav';
import { cn } from '@/lib/utils';
import { CardListSkeleton } from '@/components/Skeleton';
import { formatEUR, formatEURSigned, pnlTone, pnlBadgeTone, pnlToneKey } from '@/lib/dashboardFormatters';
import StockLogo from '@/components/StockLogo';
import Sparkline from '@/components/dashboard/charts/Sparkline';
import BondMarktwertPieChart from '@/components/dashboard/charts/BondMarktwertPieChart';
import ChartCard from '@/components/dashboard/charts/ChartCard';
import { fetchSparkline } from '@/services/stockHistoryService';
import { DashboardStagger, DashboardStaggerItem } from '@/components/dashboard/motion/DashboardStagger';
import DashboardTabPanel from '@/components/dashboard/motion/DashboardTabPanel';
import DashboardContentReveal from '@/components/dashboard/motion/DashboardContentReveal';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import AnimatedNumber from '@/components/AnimatedNumber';
import StatTile from '@/components/dashboard/StatTile';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import ExportActions from '@/components/dashboard/ExportActions';
import IpoPositionsTable from '@/components/dashboard/IpoPositionsTable';

const fmtDe = (v) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PctBadge = ({ value }) => {
  if (value == null) return <span className="text-[12px] text-bank-text-muted">–</span>;
  const up = value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold tabular-nums',
        pnlBadgeTone(value),
      )}
    >
      {up ? <ArrowUpRight size={11} strokeWidth={2} /> : <ArrowDownRight size={11} strokeWidth={2} />}
      {up ? '+' : ''}
      {fmtDe(value)} %
    </span>
  );
};

const AktienPage = () => {
  const navigate = useNavigate();
  const {
    stockMetrics,
    stockPriceMap,
    stockPositions,
    watchlistItems,
    stocksLoading,
    stocksRefreshing,
    depotWert,
    depotEinstand,
    depotGV,
    removeFromWatchlist,
    refreshStockPrices,
  } = useDashboardData();
  const [tab, setTab] = useState('positions');
  const [sparklines, setSparklines] = useState({});
  const positionsListRef = useAutoAnimateRef(tab === 'positions' && stockMetrics.length > 0);
  const watchlistGridRef = useAutoAnimateRef(tab === 'watchlist' && watchlistItems.length > 0);

  const yieldPct = depotEinstand > 0 ? (depotGV / depotEinstand) * 100 : 0;
  const hasIpoPositions = stockMetrics.some((m) => m.isIpoValuation);

  const dayChange = useMemo(() => {
    let abs = 0;
    stockMetrics.forEach((m) => {
      const ca = stockPriceMap[m.symbol]?.change_abs;
      if (ca != null) abs += Number(m.qty) * Number(ca);
    });
    return abs;
  }, [stockMetrics, stockPriceMap]);
  const dayChangePct = depotWert - dayChange > 0 ? (dayChange / (depotWert - dayChange)) * 100 : 0;

  const allocationItems = useMemo(
      () => stockMetrics.map((m) => ({
        id: m.id,
        name: m.stockName || m.symbol,
        symbol: m.symbol,
        marktwert: Number(m.marktwert || 0),
      })),
    [stockMetrics],
  );

  const topMovers = useMemo(() => {
    const rows = stockMetrics.map((m) => ({
      ...m,
      dayPct:
        stockPriceMap[m.symbol]?.change_pct != null
          ? Number(stockPriceMap[m.symbol].change_pct)
          : null,
    }));
    return rows
      .sort((a, b) => {
        const aHas = a.dayPct != null;
        const bHas = b.dayPct != null;
        if (aHas && bHas) return Math.abs(b.dayPct) - Math.abs(a.dayPct);
        if (aHas) return -1;
        if (bHas) return 1;
        return (b.marktwert || 0) - (a.marktwert || 0);
      })
      .slice(0, 5);
  }, [stockMetrics, stockPriceMap]);

  // 30-day sparklines for all positions + watchlist symbols.
  const symbolsKey = useMemo(() => {
    const set = new Set([...stockMetrics.map((m) => m.symbol), ...watchlistItems.map((w) => w.symbol)]);
    return Array.from(set).filter(Boolean).join(',');
  }, [stockMetrics, watchlistItems]);

  useEffect(() => {
    let active = true;
    const symbols = symbolsKey ? symbolsKey.split(',') : [];
    if (symbols.length === 0) {
      setSparklines({});
      return undefined;
    }
    Promise.all(
      symbols.map(async (s) => {
        try {
          return [s, await fetchSparkline(s, '1mo')];
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
  }, [symbolsKey]);

  const exportRows = useMemo(
    () =>
      stockMetrics.map((m) => {
        const p = stockPriceMap[m.symbol];
        const currency = p?.currency || 'EUR';
        return {
          symbol: m.symbol,
          name: m.stockName || m.symbol,
          quantity: Number(m.qty || 0),
          avgCost: Number(m.avg || 0),
          price: m.price != null ? Number(m.price) : null,
          currency,
          marktwert: Number(m.marktwert || 0),
          gv: Number(m.gv || 0),
          gvPct: Number(m.pct || 0),
          dayPct: p?.change_pct != null ? Number(p.change_pct) : null,
        };
      }),
    [stockMetrics, stockPriceMap],
  );

  const exportColumns = useMemo(
    () => [
      { header: 'Symbol', value: 'symbol' },
      { header: 'Name', value: 'name' },
      { header: 'Stück', value: (r) => Number(r.quantity).toFixed(4), align: 'right' },
      { header: 'Ø Einstand', value: (r) => Number(r.avgCost).toFixed(2), align: 'right' },
      {
        header: 'Kurs',
        value: (r) => (r.price != null ? Number(r.price).toFixed(2) : ''),
        align: 'right',
      },
      { header: 'Währung', value: 'currency' },
      { header: 'Marktwert (EUR)', value: (r) => Number(r.marktwert).toFixed(2), align: 'right' },
      { header: 'G/V (EUR)', value: (r) => Number(r.gv).toFixed(2), align: 'right' },
      { header: 'G/V (%)', value: (r) => Number(r.gvPct).toFixed(2), align: 'right' },
      {
        header: 'Tag (%)',
        value: (r) => (r.dayPct != null ? Number(r.dayPct).toFixed(2) : ''),
        align: 'right',
      },
    ],
    [],
  );

  const exportKpis = useMemo(
    () => [
      { label: 'Marktwert', value: formatEUR(depotWert) },
      { label: 'G/V', value: formatEURSigned(depotGV) },
      { label: 'Tagesveränderung', value: formatEURSigned(dayChange) },
      { label: 'Positionen', value: String(stockMetrics.length) },
    ],
    [depotWert, depotGV, dayChange, stockMetrics.length],
  );

  return (
    <PageContainer>
      <PortfolioPageLayout>
      <VermoegenBreadcrumb current="Aktien" />
      <VermoegenSubNav />
      <PageHeader
        eyebrow="Vermögen"
        title="Aktien-Depot"
        icon={PRODUCT_ICONS.aktien}
        description="Ihre Aktienpositionen, Watchlist und Live-Marktdaten."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline-ink" size="default" onClick={refreshStockPrices} disabled={stocksRefreshing}>
              <RefreshCw size={13} strokeWidth={1.5} className={stocksRefreshing ? 'animate-spin' : ''} />
              {stocksRefreshing ? 'Aktualisiere…' : 'Aktualisieren'}
            </Button>
            <Button variant="primary" size="default" onClick={() => navigate('/dashboard/handeln')}>
              <TrendingUp size={14} strokeWidth={1.5} /> Zum Markt
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <DashboardStagger className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
        <DashboardStaggerItem><StatTile icon={Wallet} label="Marktwert" value={<AnimatedNumber value={depotWert} format={formatEUR} />} sub={`${stockPositions.length} Positionen`} /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Briefcase} label="Einstand" value={formatEUR(depotEinstand)} /></DashboardStaggerItem>
        <DashboardStaggerItem>
        <StatTile
          icon={TrendingUp}
          label="Gewinn / Verlust"
          value={formatEURSigned(depotGV)}
          sub={`${pnlToneKey(depotGV) === 'pos' ? '+' : ''}${fmtDe(yieldPct)} %`}
          tone={{ pos: 'gain', neg: 'neg' }[pnlToneKey(depotGV)] || 'neutral'}
        />
        </DashboardStaggerItem>
        <DashboardStaggerItem>
        <StatTile
          icon={Activity}
          label="Tagesveränderung"
          value={formatEURSigned(dayChange)}
          sub={`${pnlToneKey(dayChange) === 'pos' ? '+' : ''}${fmtDe(dayChangePct)} %`}
          tone={{ pos: 'gain', neg: 'neg' }[pnlToneKey(dayChange)] || 'neutral'}
        />
        </DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={PRODUCT_ICONS.aktien} label="Positionen" value={String(stockMetrics.length)} /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Star} label="Watchlist" value={String(watchlistItems.length)} sub="beobachtet" /></DashboardStaggerItem>
      </DashboardStagger>

      {/* Charts: allocation + top movers */}
      {!stocksLoading && stockMetrics.length > 0 && (
        <DashboardStagger className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DashboardStaggerItem>
            <ChartCard icon={PieChartIcon} title="Depot-Allokation" index={0}>
              <BondMarktwertPieChart items={allocationItems} height={220} />
            </ChartCard>
          </DashboardStaggerItem>
          <DashboardStaggerItem>
            <ChartCard icon={Activity} title="Top-Bewegungen (heute)" index={1}>
            {topMovers.length === 0 ? (
              <p className="text-[13px] text-bank-text-muted">Keine Positionen im Depot.</p>
            ) : (
              <div className="divide-y divide-bank-border/70">
                {topMovers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <StockLogo symbol={m.symbol} name={m.stockName} logoUrl={m.logoUrl} exchange={m.exchange} isTradable={m.isTradable} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-bank-text">{m.stockName || m.symbol}</p>
                      <p className="truncate font-mono text-[11px] text-bank-text-muted">{m.symbol}</p>
                    </div>
                    <Sparkline values={sparklines[m.symbol]} up={(m.dayPct ?? 0) >= 0} />
                    <div className="w-20 text-right">
                      <PctBadge value={m.dayPct} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            </ChartCard>
          </DashboardStaggerItem>
        </DashboardStagger>
      )}

      {/* Tabs */}
      <div role="tablist" className="mb-4 inline-flex rounded-lg border border-bank-border bg-white p-1">
        {[
          { id: 'positions', label: 'Meine Positionen', count: stockPositions.length },
          { id: 'watchlist', label: 'Watchlist', count: watchlistItems.length },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                active ? 'bg-bank-primary text-white shadow-sm' : 'text-bank-text-muted hover:text-bank-text',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'inline-flex h-4 min-w-[18px] items-center justify-center rounded px-1 text-[10.5px] tabular-nums',
                  active ? 'bg-white/20 text-white' : 'bg-bank-bg text-bank-text-muted',
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <DashboardTabPanel tabKey={tab}>
      {tab === 'positions' && stockMetrics.length > 0 && (
        <div className="mb-4 flex justify-end">
          <ExportActions
            fileBase="aktien-report"
            title="Aktien-Depot Report"
            subtitle="Übersicht aller Aktienpositionen"
            kpis={exportKpis}
            columns={exportColumns}
            rows={exportRows}
          />
        </div>
      )}

      {tab === 'positions' ? (
        <DashboardContentReveal
          loading={stocksLoading}
          skeleton={<CardListSkeleton count={3} />}
        >
        {stockPositions.length === 0 ? (
          <div className="rounded-xl border border-bank-border bg-white p-12 text-center shadow-sm">
            <ProductIcon product="aktien" size="empty" showBubble={false} className="mx-auto mb-4 text-bank-text-muted/50" />
            <h3 className="text-[18px] font-semibold text-bank-text">Sie halten noch keine Aktien</h3>
            <p className="mt-1.5 text-[13px] text-bank-text-muted">Starten Sie mit Ihrer ersten Position.</p>
            <div className="mt-5">
              <Button variant="primary" size="default" onClick={() => navigate('/dashboard/handeln')}>
                <TrendingUp size={14} strokeWidth={1.5} /> Zum Markt
              </Button>
            </div>
          </div>
        ) : (
          <>
            {hasIpoPositions && (
              <IpoPositionsTable
                metrics={stockMetrics}
                stockPriceMap={stockPriceMap}
                onRowClick={(m) => navigate(`/dashboard/aktien/${encodeURIComponent(m.symbol)}`)}
                className="mb-4"
              />
            )}
            {/* Mobile cards */}
            <div ref={positionsListRef} className="space-y-3 md:hidden">
              {stockMetrics.map((m) => {
                const up = pnlToneKey(m.gv) === 'pos';
                const p = stockPriceMap[m.symbol];
                const currency = p?.currency || m?.currency || 'EUR';
                const dayPct = p?.change_pct != null ? Number(p.change_pct) : null;
                return (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/dashboard/aktien/${encodeURIComponent(m.symbol)}`)}
                    className="cursor-pointer rounded-xl border border-bank-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <StockLogo symbol={m.symbol} name={m.stockName} logoUrl={m.logoUrl} exchange={m.exchange} isTradable={m.isTradable} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-bank-text">{m.stockName || m.symbol}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-bank-text-muted">
                            {m.symbol} · {Number(m.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk
                            {m.isIpoValuation && (
                              <span className="ml-1.5 rounded border border-violet-200 bg-violet-50 px-1 py-0.5 text-[9px] font-medium uppercase text-violet-700">
                                IPO
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <PctBadge value={dayPct} />
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <Sparkline values={sparklines[m.symbol]} up={up} width={90} height={30} />
                      <div className="text-right">
                        <p className="text-[15px] font-semibold tabular-nums text-bank-text">
                          {Number(m.marktwert).toLocaleString('de-DE', { style: 'currency', currency })}
                        </p>
                        <p className={cn('text-[12px] font-medium tabular-nums', m.hasValuation === false ? 'text-bank-text-muted' : pnlTone(m.gv))}>
                          {m.hasValuation === false ? '–' : (
                            <>
                              {up ? '+' : ''}
                              {Number(m.gv).toLocaleString('de-DE', { style: 'currency', currency })} ({up ? '+' : ''}
                              {fmtDe(m.pct)} %)
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {m.isIpoValuation && (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-bank-border/70 pt-3 text-[11px]">
                        <div>
                          <p className="text-bank-text-muted">Lots</p>
                          <p className="font-medium tabular-nums">{Number(m.qty).toLocaleString('de-DE')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-bank-text-muted">Einstand/Lot</p>
                          <p className="font-medium tabular-nums">
                            {Number(m.ipoEinstandPerLot ?? m.avg).toLocaleString('de-DE', { style: 'currency', currency })}
                          </p>
                        </div>
                        <div>
                          <p className="text-bank-text-muted">Listing</p>
                          <p className="font-medium tabular-nums">
                            {Number(m.ipoListingPerLot ?? m.price).toLocaleString('de-DE', { style: 'currency', currency })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-bank-text-muted">Gewinn</p>
                          <p className={cn('font-medium tabular-nums', pnlTone(m.gv))}>
                            {up ? '+' : ''}
                            {Number(m.gv).toLocaleString('de-DE', { style: 'currency', currency })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-bank-border bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-bank-border bg-bank-bg/60">
                    <tr>
                      {[
                        { label: 'Position', align: 'left' },
                        { label: '30 Tage', align: 'center' },
                        { label: 'Stück', align: 'right' },
                        { label: 'Ø Einstand', align: 'right' },
                        { label: 'Kurs', align: 'right' },
                        { label: 'Marktwert', align: 'right' },
                        { label: 'Tag', align: 'right' },
                        { label: 'G/V', align: 'right' },
                      ].map((h, idx) => (
                        <th
                          key={idx}
                          className={cn(
                            'px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-bank-text-muted',
                            h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left',
                          )}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bank-border/70">
                    {stockMetrics.map((m) => {
                      const up = pnlToneKey(m.gv) === 'pos';
                      const p = stockPriceMap[m.symbol];
                      const currency = p?.currency || m?.currency || 'EUR';
                      const dayPct = p?.change_pct != null ? Number(p.change_pct) : null;
                      return (
                        <tr
                          key={m.id}
                          className="cursor-pointer transition-colors hover:bg-bank-bg/50"
                          onClick={() => navigate(`/dashboard/aktien/${encodeURIComponent(m.symbol)}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <StockLogo symbol={m.symbol} name={m.stockName} logoUrl={m.logoUrl} exchange={m.exchange} isTradable={m.isTradable} size="sm" />
                              <div className="min-w-0">
                                <p className="text-[13.5px] font-medium text-bank-text">{m.stockName || m.symbol}</p>
                                <p className="font-mono text-[11px] text-bank-text-muted">
                                  {m.symbol}
                                  {m.isIpoValuation && (
                                    <span className="ml-1.5 rounded border border-violet-200 bg-violet-50 px-1 py-0.5 text-[9px] font-medium uppercase text-violet-700">
                                      IPO-Bewertung
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <Sparkline values={sparklines[m.symbol]} up={(dayPct ?? (up ? 1 : -1)) >= 0} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-[13px] tabular-nums text-bank-text-muted">
                            {Number(m.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-4 py-3 text-right text-[13px] tabular-nums text-bank-text-muted">
                            {Number(m.avg).toLocaleString('de-DE', { style: 'currency', currency })}
                          </td>
                          <td className="px-4 py-3 text-right text-[13px] tabular-nums text-bank-text">
                            {m.price != null ? Number(m.price).toLocaleString('de-DE', { style: 'currency', currency }) : '–'}
                          </td>
                          <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-bank-text">
                            {Number(m.marktwert).toLocaleString('de-DE', { style: 'currency', currency })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <PctBadge value={dayPct} />
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 text-right text-[13px] font-medium tabular-nums',
                              m.hasValuation === false ? 'text-bank-text-muted' : pnlTone(m.gv),
                            )}
                          >
                            {m.hasValuation === false ? '–' : `${up ? '+' : ''}${fmtDe(m.pct)} %`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        </DashboardContentReveal>
      ) : (
        <DashboardContentReveal
          loading={stocksLoading}
          skeleton={<CardListSkeleton count={4} />}
        >
        {watchlistItems.length === 0 ? (
        <div className="rounded-xl border border-bank-border bg-white p-12 text-center shadow-sm">
          <Star size={32} strokeWidth={1.4} className="mx-auto mb-4 text-bank-text-muted/50" />
          <h3 className="text-[18px] font-semibold text-bank-text">Noch keine Werte beobachtet</h3>
          <p className="mt-1.5 text-[13px] text-bank-text-muted">Fügen Sie Aktien zu Ihrer Watchlist hinzu.</p>
          <div className="mt-5">
            <Button variant="primary" size="default" onClick={() => navigate('/dashboard/handeln')}>
              <TrendingUp size={14} strokeWidth={1.5} /> Zum Markt
            </Button>
          </div>
        </div>
      ) : (
        <div ref={watchlistGridRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {watchlistItems.map((w) => {
            const p = stockPriceMap[w.symbol];
            const chg = p?.change_pct != null ? Number(p.change_pct) : null;
            const up = (chg ?? 0) >= 0;
            const currency = p?.currency || m?.currency || 'EUR';
            return (
              <div
                key={w.id}
                className="group cursor-pointer rounded-xl border border-bank-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => navigate(`/dashboard/aktien/${encodeURIComponent(w.symbol)}`)}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[14px] font-semibold text-bank-text">{w.symbol}</p>
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-bank-text-muted">{w.stocks?.name || ''}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWatchlist(w.symbol);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bank-border text-bank-text-muted transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                    title="Entfernen"
                    aria-label="Aus Watchlist entfernen"
                  >
                    <X size={13} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[1.5rem] font-semibold leading-none tabular-nums text-bank-text">
                      {p?.price != null ? Number(p.price).toLocaleString('de-DE', { style: 'currency', currency }) : '–'}
                    </p>
                    {chg != null && (
                      <p
                        className={cn(
                          'mt-1.5 inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums',
                          pnlTone(chg),
                        )}
                      >
                        {up ? <ArrowUpRight size={12} strokeWidth={1.8} /> : <ArrowDownRight size={12} strokeWidth={1.8} />}
                        {up ? '+' : ''}
                        {fmtDe(chg)} %
                      </p>
                    )}
                  </div>
                  <Sparkline values={sparklines[w.symbol]} up={up} width={90} height={32} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-bank-border pt-3">
                  <span className="text-[11px] text-bank-text-muted">{w.stocks?.sector || '–'}</span>
                  <span className="text-[11px] font-medium text-bank-primary">Details →</span>
                </div>
              </div>
            );
          })}
        </div>
        )}
        </DashboardContentReveal>
      )}
      </DashboardTabPanel>
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default AktienPage;
