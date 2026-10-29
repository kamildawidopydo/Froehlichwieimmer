import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import {
  Plus,
  CheckCircle,
  PauseCircle,
  LineChart,
  CalendarClock,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Coins,
  Percent,
  Clock,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import ProductIcon from '@/components/ProductIcon';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/context/DashboardDataContext';
import { PageContainer, PageHeader } from '@/components/dashboard/PageHeader';
import { cn } from '@/lib/utils';
import { CardListSkeleton } from '@/components/Skeleton';
import {
  formatEUR,
  formatEURSigned,
  formatDate,
  pnlTone,
  pnlToneKey,
} from '@/lib/dashboardFormatters';
import BondMaturityBarChart from '@/components/dashboard/charts/BondMaturityBarChart';
import BondLogo from '@/components/BondLogo';
import BondMarktwertPieChart from '@/components/dashboard/charts/BondMarktwertPieChart';
import BondCashflowChart from '@/components/dashboard/charts/BondCashflowChart';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import ChartCard from '@/components/dashboard/charts/ChartCard';
import { DashboardStagger, DashboardStaggerItem } from '@/components/dashboard/motion/DashboardStagger';
import VermoegenBreadcrumb from '@/components/dashboard/VermoegenBreadcrumb';
import VermoegenSubNav from '@/components/dashboard/VermoegenSubNav';
import ExportActions from '@/components/dashboard/ExportActions';
import { SectionTitle } from '@/components/dashboard/PageHeader';

const StatTile = ({ icon: Icon, label, value, sub, tone = 'neutral' }) => (
  <div className="rounded-xl border border-bank-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-center gap-2 text-bank-text-muted">
      {Icon && <Icon size={14} strokeWidth={1.7} />}
      <p className="text-[11px] font-medium uppercase tracking-[0.04em]">{label}</p>
    </div>
    <p
      className={cn(
        'mt-1.5 text-[18px] font-semibold tabular-nums',
        tone === 'pos' ? 'text-bank-success' : tone === 'neg' ? 'text-bank-error' : 'text-bank-text',
      )}
    >
      {value}
    </p>
    {sub && <p className="mt-0.5 text-[11px] text-bank-text-muted">{sub}</p>}
  </div>
);

const Metric = ({ label, value, sub, tone = 'neutral' }) => (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-bank-text-muted">{label}</p>
    <p
      className={cn(
        'mt-1 text-[14px] font-semibold tabular-nums',
        tone === 'pos' ? 'text-bank-success' : tone === 'neg' ? 'text-bank-error' : 'text-bank-text',
      )}
    >
      {value}
    </p>
    {sub && <p className="mt-0.5 text-[10.5px] text-bank-text-muted">{sub}</p>}
  </div>
);

const AnleihenPage = () => {
  const {
    bondPositions,
    bondsLoading,
    bondsMarktwert,
    bondsEinstand,
    bondsGV,
    activeBonds,
    computeBondMetrics,
    stockMetrics,
    depotWert,
    depotGV,
    stocksLoading,
  } = useDashboardData();
  const bondListRef = useAutoAnimateRef((bondPositions || []).length > 0);

  const yieldPct = bondsEinstand > 0 ? (bondsGV / bondsEinstand) * 100 : 0;

  const bondMaturityRows = useMemo(
    () =>
      bondPositions.map((b) => {
        const m = computeBondMetrics(b);
        return {
          id: b.id,
          bondName: b.bond_name || b.isin || 'Anleihe',
          faelligkeitsdatum: b.faelligkeitsdatum,
          restTage: m.restTage,
          marktwert: m.marktwert,
          einstand: m.einstand,
        };
      }),
    [bondPositions, computeBondMetrics],
  );

  const bondPieItems = useMemo(
    () =>
      bondPositions.map((b) => {
        const m = computeBondMetrics(b);
        return { id: b.id, name: b.bond_name || b.isin || 'Anleihe', isin: b.isin, marktwert: m.marktwert };
      }),
    [bondPositions, computeBondMetrics],
  );

  const cashflowBonds = useMemo(
    () =>
      activeBonds.map((b) => {
        const m = computeBondMetrics(b);
        return { jahresKupon: m.jahresKupon, nominal: m.nominal, faelligkeitsdatum: b.faelligkeitsdatum };
      }),
    [activeBonds, computeBondMetrics],
  );

  // Portfolio-level coupon income + weighted averages (active bonds only).
  const aggregates = useMemo(() => {
    let kuponPa = 0;
    let nominalSum = 0;
    let mwSum = 0;
    let restJahreWeighted = 0;
    activeBonds.forEach((b) => {
      const m = computeBondMetrics(b);
      kuponPa += m.jahresKupon;
      nominalSum += m.nominal;
      mwSum += m.marktwert;
      if (b.faelligkeitsdatum) restJahreWeighted += m.restJahre * m.marktwert;
    });
    return {
      kuponPa,
      avgKupon: nominalSum > 0 ? (kuponPa / nominalSum) * 100 : 0,
      avgRestJahre: mwSum > 0 ? restJahreWeighted / mwSum : 0,
    };
  }, [activeBonds, computeBondMetrics]);

  const topStocks = useMemo(
    () => [...stockMetrics].sort((a, b) => Math.abs(b.gv) - Math.abs(a.gv)).slice(0, 5),
    [stockMetrics],
  );

  const exportRows = useMemo(
    () =>
      bondPositions.map((b) => {
        const m = computeBondMetrics(b);
        return {
          name: b.bond_name || '–',
          isin: b.isin || '–',
          issuer: b.issuer || '–',
          nominal: m.nominal,
          marktwert: m.marktwert,
          einstand: m.einstand,
          kursgv: m.kursgv,
          rendite: m.rendite,
          kupon: b.kupon_rate != null ? Number(b.kupon_rate) : null,
          faelligkeit: b.faelligkeitsdatum || '',
          status: b.is_active ? 'Aktiv' : 'Inaktiv',
        };
      }),
    [bondPositions, computeBondMetrics],
  );

  const exportColumns = useMemo(
    () => [
      { header: 'Anleihe', value: 'name' },
      { header: 'ISIN', value: 'isin' },
      { header: 'Emittent', value: 'issuer' },
      { header: 'Nominal (EUR)', value: (r) => Number(r.nominal || 0).toFixed(2), align: 'right' },
      { header: 'Marktwert (EUR)', value: (r) => Number(r.marktwert || 0).toFixed(2), align: 'right' },
      { header: 'Kurs-G/V (EUR)', value: (r) => Number(r.kursgv || 0).toFixed(2), align: 'right' },
      { header: 'Rendite (%)', value: (r) => Number(r.rendite || 0).toFixed(2), align: 'right' },
      {
        header: 'Kupon (%)',
        value: (r) => (r.kupon != null ? Number(r.kupon).toFixed(2) : ''),
        align: 'right',
      },
      { header: 'Fälligkeit', value: (r) => (r.faelligkeit ? formatDate(r.faelligkeit) : '–') },
      { header: 'Status', value: 'status' },
    ],
    [],
  );

  const exportKpis = useMemo(
    () => [
      { label: 'Marktwert', value: formatEUR(bondsMarktwert) },
      { label: 'Kurs-G/V', value: formatEURSigned(bondsGV) },
      { label: 'Kuponertrag p.a.', value: formatEUR(aggregates.kuponPa) },
      { label: 'Positionen', value: String(bondPositions.length) },
    ],
    [bondsMarktwert, bondsGV, aggregates.kuponPa, bondPositions.length],
  );

  return (
    <PageContainer>
      <PortfolioPageLayout>
      <VermoegenBreadcrumb current="Anleihen" />
      <VermoegenSubNav />
      <PageHeader
        eyebrow="Vermögen"
        title="Anleihen-Portfolio"
        icon={PRODUCT_ICONS.anleihen}
        description="Festverzinsliche Wertpapiere — Kuponzahlungen, Kursgewinne und Restlaufzeiten im Überblick."
        actions={
          <Button asChild variant="primary" size="default">
            <Link to="/dashboard/anleihen/kaufen">
              <Plus size={14} strokeWidth={1.5} /> Neue Anleihe kaufen
            </Link>
          </Button>
        }
      />

      {/* KPI strip */}
      <DashboardStagger className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <DashboardStaggerItem><StatTile icon={Wallet} label="Marktwert" value={formatEUR(bondsMarktwert)} sub={`${activeBonds.length} aktive Bonds`} /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={PRODUCT_ICONS.anleihen} label="Einstand" value={formatEUR(bondsEinstand)} /></DashboardStaggerItem>
        <DashboardStaggerItem>
        <StatTile
          icon={TrendingUp}
          label="Kurs-G/V"
          value={formatEURSigned(bondsGV)}
          sub={`${bondsGV >= 0 ? '+' : ''}${yieldPct.toFixed(2)} %`}
          tone={pnlToneKey(bondsGV)}
        />
        </DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Coins} label="Kuponertrag p.a." value={formatEUR(aggregates.kuponPa)} sub="Jährlich" tone="pos" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Percent} label="Ø Kupon" value={`${aggregates.avgKupon.toFixed(2).replace('.', ',')} %`} sub="Nominalgewichtet" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Clock} label="Ø Restlaufzeit" value={`${aggregates.avgRestJahre.toFixed(1).replace('.', ',')} J.`} sub="Marktwertgewichtet" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={PRODUCT_ICONS.anleihen} label="Positionen" value={String(bondPositions.length)} sub="inkl. inaktive" /></DashboardStaggerItem>
      </DashboardStagger>

      {bondsLoading ? (
        <CardListSkeleton count={3} />
      ) : bondPositions.length === 0 ? (
        <div className="rounded-xl border border-bank-border bg-white p-12 text-center shadow-sm">
          <ProductIcon product="anleihen" size="empty" showBubble={false} className="mx-auto mb-4 text-bank-text-muted/50" />
          <h3 className="text-[18px] font-semibold text-bank-text">Noch keine Anleihen-Positionen</h3>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] text-bank-text-muted">
            Entdecken Sie festverzinsliche Wertpapiere mit planbaren Kuponzahlungen.
          </p>
          <div className="mt-5">
            <Button asChild variant="primary" size="default">
              <Link to="/dashboard/anleihen/kaufen">
                <Plus size={14} strokeWidth={1.5} /> Anleihen entdecken
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cashflow projection — full width */}
          <ChartCard icon={CalendarClock} title="Erwartete Zahlungen (Kupon + Tilgung)" index={0}>
            <BondCashflowChart bonds={cashflowBonds} height={280} />
          </ChartCard>

          {/* Maturity ladder + allocation */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard icon={Clock} title="Marktwert nach Restlaufzeit" index={1}>
              <BondMaturityBarChart rows={bondMaturityRows} height={280} />
            </ChartCard>
            <ChartCard icon={PieChartIcon} title="Marktwert je Anleihe" index={2}>
              <BondMarktwertPieChart items={bondPieItems} height={280} />
            </ChartCard>
          </div>

          <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
            <SectionTitle
              kicker="Export"
              action={
                <ExportActions
                  fileBase="anleihen-report"
                  title="Anleihen-Report"
                  subtitle="Übersicht aller Anleihenpositionen"
                  kpis={exportKpis}
                  columns={exportColumns}
                  rows={exportRows}
                />
              }
            >
              Positions-Export
            </SectionTitle>
          </div>

          {/* Bond position cards */}
          <div ref={bondListRef} className="space-y-4">
            {bondPositions.map((b) => {
              const m = computeBondMetrics(b);
              const gvPositive = m.kursgv >= 0;
              return (
                <div
                  key={b.id}
                  className={cn(
                    'overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md',
                    b.is_active ? 'border-bank-border' : 'border-bank-border opacity-75',
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4 border-b border-bank-border px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <BondLogo bond={b} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-bank-text">{b.bond_name}</p>
                        <p className="mt-0.5 truncate text-[11.5px] text-bank-text-muted">
                          {b.isin ? `ISIN ${b.isin}` : ''}
                          {b.isin && b.issuer ? ' · ' : ''}
                          {b.issuer || ''}
                          {b.kupon_rate != null ? ` · Kupon ${Number(b.kupon_rate).toLocaleString('de-DE')}%` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn('text-[20px] font-semibold tabular-nums', pnlTone(m.kursgv))}>
                        {formatEURSigned(m.kursgv)}
                      </p>
                      <p
                        className={cn(
                          'mt-0.5 inline-flex items-center justify-end gap-0.5 text-[12px] font-medium tabular-nums',
                          pnlTone(m.kursgv),
                        )}
                      >
                        {gvPositive ? <ArrowUpRight size={12} strokeWidth={1.8} /> : <ArrowDownRight size={12} strokeWidth={1.8} />}
                        {gvPositive ? '+' : ''}
                        {m.rendite.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Values */}
                  <div className="grid grid-cols-2 gap-4 border-b border-bank-border px-5 py-4 md:grid-cols-4">
                    <Metric label="Nominalbetrag" value={formatEUR(m.nominal)} />
                    <Metric label="Jährl. Kuponertrag" value={formatEURSigned(m.jahresKupon)} tone="pos" />
                    <Metric
                      label="Einstandswert"
                      value={formatEUR(m.einstand)}
                      sub={`Kaufkurs · ${b.kaufkurs != null ? `${Number(b.kaufkurs).toLocaleString('de-DE')}%` : '–'}`}
                    />
                    <Metric
                      label="Marktwert"
                      value={formatEUR(m.marktwert)}
                      sub={`Akt. Kurs · ${b.aktueller_kurs != null ? `${Number(b.aktueller_kurs).toLocaleString('de-DE')}%` : '–'}`}
                    />
                  </div>

                  {/* Dates / status */}
                  <div className="grid grid-cols-2 gap-4 border-b border-bank-border px-5 py-4 md:grid-cols-4">
                    <Metric label="Kaufdatum" value={formatDate(b.kaufdatum)} />
                    <Metric label="Fälligkeit" value={formatDate(b.faelligkeitsdatum)} />
                    <Metric
                      label="Restlaufzeit"
                      value={b.faelligkeitsdatum ? `${m.restTage} T · ${m.restJahre.toFixed(2)} J.` : '–'}
                    />
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-bank-text-muted">Status</p>
                      <span
                        className={cn(
                          'mt-1.5 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                          b.is_active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-bank-border bg-bank-bg text-bank-text-muted',
                        )}
                      >
                        {b.is_active ? <CheckCircle size={11} strokeWidth={1.7} /> : <PauseCircle size={11} strokeWidth={1.7} />}
                        {b.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </div>

                  {/* Yields */}
                  <div className="grid grid-cols-2 gap-4 bg-bank-bg/60 px-5 py-4 md:grid-cols-3">
                    <Metric
                      label="Aktuelle Rendite"
                      value={m.currentYield != null ? `${m.currentYield.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '–'}
                      sub="Kupon ÷ aktueller Kurs"
                    />
                    <Metric
                      label="Approx. YTM"
                      value={m.approxYtm != null ? `${m.approxYtm.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '–'}
                      sub="Yield-to-Maturity (Näherung)"
                    />
                    <Metric
                      label="Kursgewinn (%)"
                      value={`${gvPositive ? '+' : ''}${m.rendite.toFixed(2)}%`}
                      sub="Marktwert vs. Einstand"
                      tone={pnlToneKey(m.rendite)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aktien-Depot Kurzüberblick (kompakt) */}
          <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
                <LineChart size={16} strokeWidth={1.6} className="text-bank-primary" /> Aktien-Depot (Kurzüberblick)
              </h3>
              <Link
                to="/dashboard/aktien"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-bank-primary hover:underline"
              >
                Vollständiges Depot <ChevronRight size={13} strokeWidth={1.7} />
              </Link>
            </div>

            {stocksLoading ? (
              <CardListSkeleton count={2} />
            ) : stockMetrics.length === 0 ? (
              <div className="rounded-lg border border-dashed border-bank-border bg-bank-bg/50 px-4 py-6 text-center">
                <p className="text-[13px] text-bank-text-muted">Noch keine Aktienpositionen.</p>
                <div className="mt-4">
                  <Button variant="primary" size="default" asChild>
                    <Link to="/dashboard/handeln">
                      <LineChart size={14} strokeWidth={1.5} /> Zum Aktienmarkt
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Marktwert" value={formatEUR(depotWert)} />
                  <Metric label="Kurs-G/V" value={formatEURSigned(depotGV)} tone={pnlToneKey(depotGV)} />
                  <Metric label="Positionen" value={String(stockMetrics.length)} />
                </div>
                <div className="divide-y divide-bank-border/70 rounded-lg border border-bank-border">
                  {topStocks.map((m) => {
                    const up = m.gv >= 0;
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-bank-text">{m.symbol}</p>
                          <p className="mt-0.5 text-[11px] text-bank-text-muted">
                            {Number(m.qty).toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk · Ø {formatEUR(m.avg)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[13px] font-semibold tabular-nums text-bank-text">{formatEUR(m.marktwert)}</p>
                          <p
                            className={cn(
                              'mt-0.5 inline-flex items-center justify-end gap-0.5 text-[11px] font-medium tabular-nums',
                              pnlTone(m.gv),
                            )}
                          >
                            {up ? <ArrowUpRight size={11} strokeWidth={1.8} /> : <ArrowDownRight size={11} strokeWidth={1.8} />}
                            {up ? '+' : ''}
                            {m.pct.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default AnleihenPage;
