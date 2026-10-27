import React, { useMemo } from 'react';
import BankLogoSquare from '@/components/bank/BankLogo';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  TrendingUp,
  ListTodo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/context/DashboardDataContext';
import {
  PageContainer,
  PageHeader,
  SectionTitle,
} from '@/components/dashboard/PageHeader';
import { formatEUR, formatEURSigned } from '@/lib/dashboardFormatters';
import { cn } from '@/lib/utils';
import StockLogo from '@/components/StockLogo';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import VermoegenSubNav from '@/components/dashboard/VermoegenSubNav';
import StatTile from '@/components/dashboard/StatTile';
import AssetAllocationDonut from '@/components/AssetAllocationDonut';
import { DashboardStagger, DashboardStaggerItem } from '@/components/dashboard/motion/DashboardStagger';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import AnimatedNumber from '@/components/AnimatedNumber';
import AnlageprodukteSection from '@/components/dashboard/portfolio/AnlageprodukteSection';
import ExportActions from '@/components/dashboard/ExportActions';

const contractRoute = (productType) => {
  const t = String(productType || '').toLowerCase();
  if (t.includes('tages')) return '/dashboard/tagesgeld';
  if (t.includes('flex')) return '/dashboard/flexgeld';
  return '/dashboard/festgeld';
};

const EmptyHint = ({ children, to, label }) => (
  <div className="py-2">
    <p className="text-[13px] text-bank-text-muted">{children}</p>
    {to && (
      <Link to={to} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary hover:underline">
        {label} <ChevronRight size={12} />
      </Link>
    )}
  </div>
);

const DepotPage = ({ showTopSummary = true, showLegacyPositionCards = true, showLegacyContractsSection = true } = {}) => {
  const {
    cashBalance,
    depotWert,
    depotEinstand,
    depotGV,
    bondsMarktwert,
    bondsGV,
    contractsTotal,
    activeContracts,
    activeBonds,
    contractsByType,
    festgeldTotal,
    tagesgeldTotal,
    flexgeldTotal,
    gesamtvermoegen,
    dailyPortfolioPnl,
    realizedPnlTotal,
    pendingOrders,
    stockMetrics,
    bondPositions,
    computeBondMetrics,
  } = useDashboardData();

  const wertpapiereTotal = Number(depotWert || 0) + Number(bondsMarktwert || 0);
  const unrealizedPL = Number(depotGV || 0) + Number(bondsGV || 0);
  const dailyPnl = Number(dailyPortfolioPnl || 0);
  const dailyUp = dailyPnl >= 0;
  const stocksYieldPct = depotEinstand > 0 ? (depotGV / depotEinstand) * 100 : 0;
  const pendingCount = (pendingOrders || []).length;

  const topStocks = useMemo(
    () => [...stockMetrics].sort((a, b) => Number(b.marktwert || 0) - Number(a.marktwert || 0)).slice(0, 5),
    [stockMetrics],
  );

  const topBondRows = useMemo(
    () =>
      bondPositions
        .map((b) => ({ b, m: computeBondMetrics(b) }))
        .sort((a, b) => b.m.marktwert - a.m.marktwert)
        .slice(0, 5),
    [bondPositions, computeBondMetrics],
  );
  const stocksListRef = useAutoAnimateRef(topStocks.length > 0);
  const bondsListRef = useAutoAnimateRef(topBondRows.length > 0);

  const topContracts = useMemo(
    () =>
      [...(activeContracts || [])]
        .sort((a, b) => Number(b.amount_eur || 0) - Number(a.amount_eur || 0))
        .slice(0, 5),
    [activeContracts],
  );

  const productGroups = useMemo(() => {
    const total = Number(gesamtvermoegen) || 0;
    const share = (v) => (total > 0 ? (Number(v || 0) / total) * 100 : 0);

    const festCount = contractsByType.festgeld.filter((c) => c.is_active).length;
    const tagesCount = contractsByType.tagesgeld.filter((c) => c.is_active).length;
    const flexCount = contractsByType.flexgeld.filter((c) => c.is_active).length;

    return {
      einlagen: [
        {
          key: 'festgeld',
          to: '/dashboard/festgeld',
          label: 'Festgeld',
          value: festgeldTotal,
          sharePct: share(festgeldTotal),
          hint: festCount > 0 ? `${festCount} aktive Verträge` : 'Noch keine Verträge',
        },
        {
          key: 'tagesgeld',
          to: '/dashboard/tagesgeld',
          label: 'Tagesgeld',
          value: tagesgeldTotal,
          sharePct: share(tagesgeldTotal),
          hint: tagesCount > 0 ? `${tagesCount} Verträge` : 'Noch keine Verträge',
        },
        {
          key: 'flexgeld',
          to: '/dashboard/flexgeld',
          label: 'Flexgeld',
          value: flexgeldTotal,
          sharePct: share(flexgeldTotal),
          hint: flexCount > 0 ? `${flexCount} Verträge` : 'Noch keine Verträge',
        },
      ],
      wertpapiere: [
        {
          key: 'aktien',
          to: '/dashboard/aktien',
          label: 'Aktien',
          value: depotWert,
          sharePct: share(depotWert),
          hint: stockMetrics.length > 0 ? `${stockMetrics.length} Positionen` : 'Depot eröffnen',
        },
        {
          key: 'anleihen',
          to: '/dashboard/anleihen',
          label: 'Anleihen',
          value: bondsMarktwert,
          sharePct: share(bondsMarktwert),
          hint: activeBonds.length > 0 ? `${activeBonds.length} aktive Bonds` : 'Noch keine Anleihen',
        },
      ],
    };
  }, [
    gesamtvermoegen,
    festgeldTotal,
    tagesgeldTotal,
    flexgeldTotal,
    bondsMarktwert,
    activeBonds.length,
    depotWert,
    stockMetrics.length,
    contractsByType,
  ]);

  const exportRows = useMemo(() => {
    const total = Number(gesamtvermoegen) || 1;
    const anteil = (v) => (total > 0 ? (Number(v) / total) * 100 : 0);
    const rows = [];
    if (Number(cashBalance) > 0) {
      rows.push({
        klasse: 'Cash',
        bezeichnung: 'Kontoguthaben',
        marktwert: cashBalance,
        anteil: anteil(cashBalance),
      });
    }
    if (Number(depotWert) > 0) {
      rows.push({
        klasse: 'Aktien',
        bezeichnung: 'Aktien-Depot (gesamt)',
        marktwert: depotWert,
        anteil: anteil(depotWert),
      });
    }
    if (Number(bondsMarktwert) > 0) {
      rows.push({
        klasse: 'Anleihen',
        bezeichnung: 'Anleihen-Portfolio (gesamt)',
        marktwert: bondsMarktwert,
        anteil: anteil(bondsMarktwert),
      });
    }
    if (Number(contractsTotal) > 0) {
      rows.push({
        klasse: 'Verträge',
        bezeichnung: 'Fest-/Tages-/Flexgeld',
        marktwert: contractsTotal,
        anteil: anteil(contractsTotal),
      });
    }
    stockMetrics.forEach((m) => {
      rows.push({
        klasse: 'Aktie',
        bezeichnung: `${m.symbol} — ${m.stockName || m.symbol}`,
        marktwert: m.marktwert,
        anteil: anteil(m.marktwert),
      });
    });
    bondPositions.forEach((b) => {
      const m = computeBondMetrics(b);
      rows.push({
        klasse: 'Anleihe',
        bezeichnung: b.bond_name || b.isin || 'Anleihe',
        marktwert: m.marktwert,
        anteil: anteil(m.marktwert),
      });
    });
    return rows;
  }, [
    gesamtvermoegen,
    cashBalance,
    depotWert,
    bondsMarktwert,
    contractsTotal,
    stockMetrics,
    bondPositions,
    computeBondMetrics,
  ]);

  const exportColumns = useMemo(
    () => [
      { header: 'Anlageklasse', value: 'klasse' },
      { header: 'Bezeichnung', value: 'bezeichnung' },
      {
        header: 'Marktwert (EUR)',
        value: (r) => Number(r.marktwert || 0).toFixed(2),
        align: 'right',
      },
      {
        header: 'Anteil (%)',
        value: (r) => Number(r.anteil || 0).toFixed(2),
        align: 'right',
      },
    ],
    [],
  );

  const exportKpis = useMemo(
    () => [
      { label: 'Gesamtvermögen', value: formatEUR(gesamtvermoegen) },
      { label: 'Wertpapiere', value: formatEUR(wertpapiereTotal) },
      { label: 'Verträge', value: formatEUR(contractsTotal) },
      { label: 'Cash', value: formatEUR(cashBalance) },
    ],
    [gesamtvermoegen, wertpapiereTotal, contractsTotal, cashBalance],
  );

  return (
    <PageContainer>
      <PortfolioPageLayout>
        {showTopSummary && <VermoegenSubNav />}
        {showTopSummary && (
        <PageHeader
          eyebrow="Vermögen"
          title="Mein Vermögen"
          icon={Briefcase}
          description="Alle Anlageprodukte auf einen Blick — Festgeld, Tagesgeld, Anleihen und Aktien."
          actions={
            <>
              <Button asChild size="sm" className="bg-bank-primary text-white hover:bg-bank-primary-hover">
                <Link to="/dashboard/handeln">
                  <TrendingUp size={14} className="mr-1.5" />
                  Handeln
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/auftraege">
                  <ListTodo size={14} className="mr-1.5" />
                  Aufträge
                  {pendingCount > 0 && (
                    <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-bank-primary px-1.5 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </Button>
            </>
          }
        />
        )}

        {showTopSummary && (
        <DashboardStagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <DashboardStaggerItem>
          <StatTile
            label="Gesamtvermögen"
            value={<AnimatedNumber value={gesamtvermoegen} format={formatEUR} />}
            sub={
              <span className={cn('inline-flex items-center gap-0.5', dailyUp ? 'text-emerald-600' : 'text-rose-600')}>
                {dailyUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {formatEURSigned(dailyPnl)} heute
              </span>
            }
          />
          </DashboardStaggerItem>
          <DashboardStaggerItem><StatTile label="Guthaben" value={formatEUR(cashBalance)} sub="Verfügbares Cash" /></DashboardStaggerItem>
          <DashboardStaggerItem>
          <StatTile
            label="Wertpapiere"
            value={formatEUR(wertpapiereTotal)}
            sub={`${formatEURSigned(unrealizedPL)} unrealisiert`}
            tone={unrealizedPL >= 0 ? 'pos' : 'neg'}
          />
          </DashboardStaggerItem>
          <DashboardStaggerItem>
          <StatTile
            label="Verträge"
            value={formatEUR(contractsTotal)}
            sub={
              Number(realizedPnlTotal || 0) !== 0
                ? `${formatEURSigned(realizedPnlTotal)} realisiert`
                : 'Fest-, Tages- & Flexgeld'
            }
          />
          </DashboardStaggerItem>
        </DashboardStagger>
        )}

        {showTopSummary && (
        <div className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_minmax(320px,380px)]">
          <AnlageprodukteSection groups={productGroups} totalValue={gesamtvermoegen} />
          <AssetAllocationDonut
            cash={cashBalance}
            stocks={depotWert}
            bonds={bondsMarktwert}
            contracts={contractsTotal}
          />
        </div>
        )}

        {showLegacyPositionCards && (
        <div className="mb-3">
          <h2 className="dashboard-page-title text-[1.05rem] font-semibold text-bank-text">Wertpapiere</h2>
        </div>
        )}
        {showLegacyPositionCards && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-bank-border bg-white p-5 shadow-sm">
            <SectionTitle
              kicker="Aktien"
              action={
                <Link
                  to="/dashboard/aktien"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary hover:underline"
                >
                  Alle anzeigen <ChevronRight size={11} strokeWidth={1.5} />
                </Link>
              }
            >
              Top Aktien-Positionen
            </SectionTitle>
            {topStocks.length === 0 ? (
              <EmptyHint to="/dashboard/handeln" label="Aktien entdecken">
                Noch keine Aktien im Depot.
              </EmptyHint>
            ) : (
              <ul ref={stocksListRef} className="divide-y divide-bank-border">
                {topStocks.map((m) => {
                  const up = m.gv >= 0;
                  return (
                    <li key={m.id}>
                      <Link
                        to={`/dashboard/aktien/${encodeURIComponent(m.symbol)}`}
                        className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:bg-bank-bg/60 -mx-2 px-2 rounded-md"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <StockLogo symbol={m.symbol} name={m.stockName} logoUrl={m.logoUrl} exchange={m.exchange} isTradable={m.isTradable} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-bank-text">{m.stockName || m.symbol}</p>
                            <p className="mt-0.5 text-[11px] text-bank-text-muted">
                              {m.symbol} · {Number(m.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk · Ø{' '}
                              {formatEUR(m.avg)}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13.5px] font-semibold tabular-nums text-bank-text">{formatEUR(m.marktwert)}</p>
                          <p
                            className={cn(
                              'mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums',
                              up ? 'text-emerald-700' : 'text-rose-600',
                            )}
                          >
                            {up ? <ArrowUpRight size={10} strokeWidth={1.5} /> : <ArrowDownRight size={10} strokeWidth={1.5} />}
                            {up ? '+' : ''}
                            {m.pct.toFixed(2)}%
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {depotEinstand > 0 && (
              <p className="mt-3 border-t border-bank-border/60 pt-3 text-[11px] text-bank-text-muted">
                Aktien-Depot G/V: {formatEURSigned(depotGV)} ({stocksYieldPct >= 0 ? '+' : ''}
                {stocksYieldPct.toFixed(2)} %)
              </p>
            )}
          </div>

          <div className="rounded-lg border border-bank-border bg-white p-5 shadow-sm">
            <SectionTitle
              kicker="Anleihen"
              action={
                <Link
                  to="/dashboard/anleihen"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary hover:underline"
                >
                  Alle anzeigen <ChevronRight size={11} strokeWidth={1.5} />
                </Link>
              }
            >
              Top Anleihen-Positionen
            </SectionTitle>
            {topBondRows.length === 0 ? (
              <EmptyHint to="/dashboard/anleihen/kaufen" label="Anleihen kaufen">
                Noch keine Anleihen im Depot.
              </EmptyHint>
            ) : (
              <ul ref={bondsListRef} className="divide-y divide-bank-border">
                {topBondRows.map(({ b, m }) => {
                  const up = m.kursgv >= 0;
                  const sub =
                    b.isin && b.kupon_rate != null
                      ? `${b.isin} · ${Number(b.kupon_rate).toLocaleString('de-DE')}% Kupon`
                      : b.isin || (b.kupon_rate != null ? `${Number(b.kupon_rate).toLocaleString('de-DE')}% Kupon` : '–');
                  return (
                    <li key={b.id}>
                      <Link
                        to="/dashboard/anleihen"
                        className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:bg-bank-bg/60 -mx-2 px-2 rounded-md"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-bank-text">{b.bond_name || b.isin || 'Anleihe'}</p>
                          <p className="mt-0.5 text-[11px] text-bank-text-muted">{sub}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13.5px] font-semibold tabular-nums text-bank-text">{formatEUR(m.marktwert)}</p>
                          <p
                            className={cn(
                              'mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums',
                              up ? 'text-emerald-700' : 'text-rose-600',
                            )}
                          >
                            {up ? <ArrowUpRight size={10} strokeWidth={1.5} /> : <ArrowDownRight size={10} strokeWidth={1.5} />}
                            {up ? '+' : ''}
                            {m.rendite.toFixed(2)}%
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        )}

        {showLegacyContractsSection && (
        <div className="rounded-lg border border-bank-border bg-white p-5 shadow-sm">
          <SectionTitle
            kicker="Verträge"
            action={
              <Link
                to="/dashboard/festgeld"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-bank-primary hover:underline"
              >
                Übersicht <ChevronRight size={11} strokeWidth={1.5} />
              </Link>
            }
          >
            Größte Verträge
          </SectionTitle>
          {topContracts.length === 0 ? (
            <EmptyHint to="/dashboard/festgeld" label="Festgeld entdecken">
              Noch keine aktiven Verträge.
            </EmptyHint>
          ) : (
            <ul className="divide-y divide-bank-border">
              {topContracts.map((c) => (
                <li key={c.id}>
                  <Link
                    to={contractRoute(c.product_type)}
                    className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:bg-bank-bg/60 -mx-2 px-2 rounded-md"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <BankLogoSquare bank={c.banks || {}} size={32} />
                      <div className="min-w-0">
                      <p className="text-[13px] font-medium text-bank-text">{c.banks?.name || 'Vertrag'}</p>
                      <p className="mt-0.5 text-[11px] text-bank-text-muted">
                        {c.product_type} · {c.zinssatz != null ? `${c.zinssatz}% p.a.` : '–'}
                      </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-bank-text">{formatEUR(c.amount_eur)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}

        <div className="mt-6 rounded-lg border border-bank-border bg-white p-5 shadow-sm">
          <SectionTitle
            kicker="Export"
            action={
              <ExportActions
                fileBase="depot-report"
                title="Depot-Übersicht"
                subtitle="Allokation und Positionen"
                kpis={exportKpis}
                columns={exportColumns}
                rows={exportRows}
                disabled={exportRows.length === 0}
              />
            }
          >
            Portfolio-Export
          </SectionTitle>
          <p className="text-[13px] text-bank-text-muted">
            CSV oder PDF mit Gesamtallokation und Einzelpositionen herunterladen.
          </p>
        </div>
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default DepotPage;
