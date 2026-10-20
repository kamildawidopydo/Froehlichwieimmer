import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Table as TableIcon,
  TrendingUp,
  PieChart as PieChartIcon,
  Percent,
  Wallet,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import ProductIcon from '@/components/ProductIcon';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/context/DashboardDataContext';
import {
  PageContainer,
  PageHeader,
  SectionTitle,
} from '@/components/dashboard/PageHeader';
import StatTile from '@/components/dashboard/StatTile';
import ContractCard from '@/components/dashboard/ContractCard';
import { CardListSkeleton } from '@/components/Skeleton';
import AccrualCurveChart from '@/components/dashboard/charts/AccrualCurveChart';
import BankAllocationChart from '@/components/dashboard/charts/BankAllocationChart';
import ContractsTable from '@/components/dashboard/ContractsTable';
import ExportActions from '@/components/dashboard/ExportActions';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import { DashboardStagger, DashboardStaggerItem } from '@/components/dashboard/motion/DashboardStagger';
import DashboardPanel from '@/components/dashboard/motion/DashboardPanel';
import DashboardContentReveal from '@/components/dashboard/motion/DashboardContentReveal';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import VermoegenBreadcrumb from '@/components/dashboard/VermoegenBreadcrumb';
import VermoegenSubNav from '@/components/dashboard/VermoegenSubNav';
import {
  buildPortfolioAccrualSeries,
} from '@/lib/dashboardMetrics';
import { formatDate, formatEUR } from '@/lib/dashboardFormatters';

const TagesgeldPage = () => {
  const navigate = useNavigate();
  const {
    contractsByType,
    depotLoading,
    tagesgeldTotal,
    tagesgeldAggregate,
    bankInsuranceExposure,
    taxPrefs,
    inflationRatePct,
    computeContractMetrics,
  } = useDashboardData();
  const items = useMemo(
    () => contractsByType.tagesgeld || [],
    [contractsByType.tagesgeld],
  );
  const contractsListRef = useAutoAnimateRef(!depotLoading && items.length > 0);
  const agg = useMemo(() => tagesgeldAggregate || {}, [tagesgeldAggregate]);

  const accrualSeries = useMemo(() => {
    const ytdStart = `${new Date().getFullYear()}-01-01`;
    return buildPortfolioAccrualSeries(items, {
      from: ytdStart,
      taxPrefs,
      stepDays: 7,
    });
  }, [items, taxPrefs]);

  const bankRows = useMemo(
    () =>
      (bankInsuranceExposure || []).filter((row) =>
        items.some((c) => c.bank_id === row.bankId || c.banks?.id === row.bankId),
      ),
    [bankInsuranceExposure, items],
  );

  const tableRows = useMemo(
    () =>
      items
        .filter((c) => c.is_active)
        .map((c) => {
          const m = computeContractMetrics(c, { taxPrefs, inflationRatePct });
          return {
            contractId: c.id,
            bankName: c.banks?.name || 'Bank',
            beginn: c.active_from,
            currentRate: m.rate,
            anlage: m.amount,
            tageszinsNet: m.dailyInterestNet,
            mtdNet: m.netInterestMtd,
            ytdNet: m.netInterestYtd,
            netAccrued: m.netAccruedInterest,
          };
        })
        .sort((a, b) => b.anlage - a.anlage),
    [items, computeContractMetrics, taxPrefs, inflationRatePct],
  );

  const tableColumns = useMemo(
    () => [
      { key: 'bank', header: 'Bank', value: (r) => r.bankName, width: 1.4 },
      {
        key: 'beginn',
        header: 'Beginn',
        value: (r) => r.beginn,
        render: (_, v) => formatDate(v),
        sortValue: (r) => (r.beginn ? new Date(r.beginn).getTime() : 0),
      },
      {
        key: 'rate',
        header: 'Akt. Zins',
        value: (r) => r.currentRate,
        align: 'right',
        render: (_, v) => `${Number(v || 0).toLocaleString('de-DE')} %`,
      },
      {
        key: 'anlage',
        header: 'Anlage',
        value: (r) => r.anlage,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'tagNet',
        header: 'Tageszins netto',
        value: (r) => r.tageszinsNet,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'mtd',
        header: 'Monat netto',
        value: (r) => r.mtdNet,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'ytd',
        header: 'Jahr netto',
        value: (r) => r.ytdNet,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
    ],
    [],
  );

  const exportColumns = useMemo(
    () => [
      { header: 'Bank', value: 'bankName' },
      { header: 'Beginn', value: (r) => formatDate(r.beginn) },
      { header: 'Akt. Zins (%)', value: (r) => Number(r.currentRate || 0).toFixed(2), align: 'right' },
      { header: 'Anlage (EUR)', value: (r) => Number(r.anlage || 0).toFixed(2), align: 'right' },
      {
        header: 'Tageszins netto',
        value: (r) => Number(r.tageszinsNet || 0).toFixed(4),
        align: 'right',
      },
      { header: 'Monat netto', value: (r) => Number(r.mtdNet || 0).toFixed(2), align: 'right' },
      { header: 'Jahr netto', value: (r) => Number(r.ytdNet || 0).toFixed(2), align: 'right' },
    ],
    [],
  );

  const kpis = useMemo(
    () => [
      { label: 'Gesamt verfügbar', value: formatEUR(tagesgeldTotal), hint: 'täglich verfügbar' },
      {
        label: 'Ø Zinssatz (gewichtet)',
        value: `${(agg.weightedAvgRate || 0).toFixed(2)} %`,
        hint: 'nach Anlagebetrag',
      },
      {
        label: 'Tageszins netto',
        value: formatEUR(agg.dailyInterestNetTotal || 0),
        hint: `Brutto: ${formatEUR(agg.dailyInterestGrossTotal || 0)}`,
      },
      {
        label: 'Monat netto',
        value: formatEUR(agg.monthInterestNetTotal || 0),
        hint: `Jahr: ${formatEUR(agg.yearInterestNetTotal || 0)}`,
      },
    ],
    [tagesgeldTotal, agg],
  );

  return (
    <PageContainer>
      <PortfolioPageLayout>
      <VermoegenBreadcrumb current="Tagesgeld" />
      <VermoegenSubNav />
      <PageHeader
        eyebrow="Vermögen"
        title="Tagesgeld"
        icon={PRODUCT_ICONS.tagesgeld}
        description="Täglich verfügbar — Ihre Tagesgeldkonten mit flexibler Verfügbarkeit."
        actions={
          <Button
            variant="primary"
            size="default"
            onClick={() => window.open('/comparison?product=tagesgeld', '_blank', 'noopener')}
          >
            <Plus size={14} strokeWidth={1.5} /> Tagesgeld eröffnen
          </Button>
        }
      />

      <DashboardStagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <DashboardStaggerItem><StatTile icon={PRODUCT_ICONS.tagesgeld} label="Gesamt verfügbar" value={formatEUR(tagesgeldTotal)} sub="täglich verfügbar" tone="pos" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Percent} label="Ø Zinssatz (gewichtet)" value={`${(agg.weightedAvgRate || 0).toFixed(2)} %`} sub="nach Anlagebetrag gewichtet" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={TrendingUp} label="Tageszins (heute, netto)" value={formatEUR(agg.dailyInterestNetTotal || 0)} sub={`Brutto: ${formatEUR(agg.dailyInterestGrossTotal || 0)}`} /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Wallet} label="Diesen Monat netto" value={formatEUR(agg.monthInterestNetTotal || 0)} sub={`Jahr bisher: ${formatEUR(agg.yearInterestNetTotal || 0)}`} /></DashboardStaggerItem>
      </DashboardStagger>

      <DashboardContentReveal
        loading={depotLoading}
        skeleton={<div className="mb-6"><CardListSkeleton count={2} /></div>}
      >
        {items.length === 0 ? (
<div className="mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm py-12 text-center">
          <ProductIcon product="tagesgeld" size="empty" showBubble={false} className="mx-auto mb-4 text-bank-primary/55" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
            Keine Konten
          </p>
          <h3 className="dashboard-page-title mt-2 text-[1.15rem] font-semibold leading-tight text-bank-text">
            Noch keine Tagesgeldkonten
          </h3>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-bank-text-muted">
            Vergleichen Sie Tagesgeld-Angebote über «Tagesgeld eröffnen» oben rechts.
          </p>
        </div>
        ) : (
        <div ref={contractsListRef} className="mb-6 space-y-4">
          {items.map((c) => (
            <ContractCard key={c.id} contract={c} accent="emerald" detailed={false} />
          ))}
        </div>
        )}
      </DashboardContentReveal>

      <DashboardStagger className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardStaggerItem>
          <DashboardPanel index={0}>
          <SectionTitle kicker="Performance">
            <span className="inline-flex items-center gap-2">
              <TrendingUp size={14} strokeWidth={1.5} className="text-bank-primary" /> Zinsentwicklung (Jahr bisher)
            </span>
          </SectionTitle>
          <AccrualCurveChart
            data={accrualSeries}
            emptyHint="Noch keine Tagesgeld-Bewegungen in diesem Jahr."
          />
          </DashboardPanel>
        </DashboardStaggerItem>
      </DashboardStagger>

      <DashboardPanel index={1} className="mb-6">
        <SectionTitle kicker="Verteilung">
          <span className="inline-flex items-center gap-2">
            <PieChartIcon size={14} strokeWidth={1.5} className="text-bank-primary" /> Bankverteilung & Einlagensicherung
          </span>
        </SectionTitle>
        <BankAllocationChart rows={bankRows} className="mt-1" />
      </DashboardPanel>

<div className="mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm">
        <SectionTitle
          kicker="Detail"
          action={
            <ExportActions
              fileBase="tagesgeld-report"
              title="Tagesgeld-Report"
              subtitle="Übersicht aller aktiven Tagesgeldkonten"
              kpis={kpis}
              columns={exportColumns}
              rows={tableRows}
              disabled={tableRows.length === 0}
            />
          }
        >
          <span className="inline-flex items-center gap-2">
            <TableIcon size={14} strokeWidth={1.5} className="text-bank-primary" /> Detaillierte Vertragstabelle
          </span>
        </SectionTitle>
        <ContractsTable
          columns={tableColumns}
          rows={tableRows}
          emptyHint="Keine aktiven Tagesgeldkonten."
        />
      </div>
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default TagesgeldPage;
