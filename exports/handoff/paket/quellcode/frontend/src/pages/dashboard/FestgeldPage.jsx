import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  PieChart as PieChartIcon,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Table as TableIcon,
  TrendingUp,
  Wallet,
  Percent,
} from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import ProductIcon from '@/components/ProductIcon';

const FestgeldIcon = PRODUCT_ICONS.festgeld;
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
import MaturityTimelineChart from '@/components/dashboard/charts/MaturityTimelineChart';
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
  buildMaturityTimeline,
  buildPortfolioAccrualSeries,
} from '@/lib/dashboardMetrics';
import {
  formatDate,
  formatEUR,
  formatPctSigned,
} from '@/lib/dashboardFormatters';

const FestgeldPage = () => {
  const navigate = useNavigate();
  const {
    contractsByType,
    depotLoading,
    festgeldTotal,
    festgeldAggregate,
    bankInsuranceExposure,
    taxPrefs,
    inflationRatePct,
    computeContractMetrics,
  } = useDashboardData();
  const items = useMemo(
    () => contractsByType.festgeld || [],
    [contractsByType.festgeld],
  );
  const contractsListRef = useAutoAnimateRef(!depotLoading && items.length > 0);
  const agg = useMemo(() => festgeldAggregate || {}, [festgeldAggregate]);
  const buckets = agg.maturityBuckets || { d30: 0, d60: 0, d90: 0, beyond: 0 };
  const cashIn = agg.expectedNetCashIn || { d30: 0, d60: 0, d90: 0 };
  const calendarTotal = (buckets.d30 || 0) + (buckets.d60 || 0) + (buckets.d90 || 0);
  const cashInTotal = (cashIn.d30 || 0) + (cashIn.d60 || 0) + (cashIn.d90 || 0);
  const insuranceWarnings = (bankInsuranceExposure || []).filter(
    (b) => b.isOverLimit || b.isNearLimit,
  );

  const accrualSeries = useMemo(
    () =>
      buildPortfolioAccrualSeries(items, {
        taxPrefs,
        stepDays: items.some((c) => c.is_active) ? 7 : 1,
      }),
    [items, taxPrefs],
  );

  const maturityRows = useMemo(
    () => buildMaturityTimeline(items, { taxPrefs }),
    [items, taxPrefs],
  );

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
            faelligkeit: c.active_until,
            laufzeit: c.laufzeit_monate ? `${c.laufzeit_monate} Mo.` : '–',
            restlaufzeit: m.totalDays > 0 ? `${m.daysRemaining} Tage` : '–',
            anlage: m.amount,
            zinssatz: m.rate,
            brutto: m.gesamtzinsen,
            steuer: m.netMaturityTax,
            netto: m.netMaturityInterest,
            auszahlungNetto: m.netMaturityPayout,
            realPct: m.realReturnPct,
            earlyNet: m.earlyWithdrawalPayoutTodayNet,
          };
        })
        .sort((a, b) => new Date(a.faelligkeit) - new Date(b.faelligkeit)),
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
        key: 'fall',
        header: 'Fällig',
        value: (r) => r.faelligkeit,
        render: (_, v) => formatDate(v),
        sortValue: (r) => (r.faelligkeit ? new Date(r.faelligkeit).getTime() : 0),
      },
      {
        key: 'rest',
        header: 'Restlaufzeit',
        value: (r) => r.restlaufzeit,
        sortValue: (r) => parseInt(r.restlaufzeit, 10) || 0,
      },
      {
        key: 'anlage',
        header: 'Anlage',
        value: (r) => r.anlage,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'rate',
        header: 'Zins p.a.',
        value: (r) => r.zinssatz,
        align: 'right',
        render: (_, v) => `${Number(v || 0).toLocaleString('de-DE')} %`,
      },
      {
        key: 'brutto',
        header: 'Brutto-Zinsen',
        value: (r) => r.brutto,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'steuer',
        header: 'Steuer',
        value: (r) => r.steuer,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'netto',
        header: 'Netto-Zinsen',
        value: (r) => r.netto,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'payout',
        header: 'Auszahlung netto',
        value: (r) => r.auszahlungNetto,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'real',
        header: 'Real % p.a.',
        value: (r) => r.realPct,
        align: 'right',
        render: (_, v) => (v == null ? '–' : formatPctSigned(v)),
      },
      {
        key: 'early',
        header: 'Bei Kündigung',
        value: (r) => r.earlyNet,
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
      { header: 'Fällig', value: (r) => formatDate(r.faelligkeit) },
      { header: 'Restlaufzeit', value: 'restlaufzeit' },
      { header: 'Anlage (EUR)', value: (r) => Number(r.anlage || 0).toFixed(2), align: 'right' },
      { header: 'Zins p.a. (%)', value: (r) => Number(r.zinssatz || 0).toFixed(2), align: 'right' },
      { header: 'Brutto-Zinsen', value: (r) => Number(r.brutto || 0).toFixed(2), align: 'right' },
      { header: 'Steuer', value: (r) => Number(r.steuer || 0).toFixed(2), align: 'right' },
      { header: 'Netto-Zinsen', value: (r) => Number(r.netto || 0).toFixed(2), align: 'right' },
      {
        header: 'Auszahlung netto',
        value: (r) => Number(r.auszahlungNetto || 0).toFixed(2),
        align: 'right',
      },
      {
        header: 'Real (%)',
        value: (r) => (r.realPct == null ? '' : Number(r.realPct).toFixed(2)),
        align: 'right',
      },
      {
        header: 'Bei Kündigung netto',
        value: (r) => Number(r.earlyNet || 0).toFixed(2),
        align: 'right',
      },
    ],
    [],
  );

  const kpis = useMemo(
    () => [
      { label: 'Gesamt angelegt', value: formatEUR(festgeldTotal), hint: `${agg.activeCount || 0} Verträge` },
      {
        label: 'Ø Zinssatz (gewichtet)',
        value: `${(agg.weightedAvgRate || 0).toFixed(2)} %`,
        hint: 'nach Anlagebetrag',
      },
      {
        label: 'Erwarteter Netto-Ertrag',
        value: formatEUR(agg.netMaturityInterestTotal || 0),
        hint: 'Abgeltung + Soli + KiSt',
      },
      {
        label: 'Auszahlung netto (gesamt)',
        value: formatEUR(agg.netMaturityPayoutTotal || 0),
        hint: 'Anlage + Netto-Zinsen',
      },
    ],
    [festgeldTotal, agg],
  );

  return (
    <PageContainer>
      <PortfolioPageLayout>
      <VermoegenBreadcrumb current="Festgeld" />
      <VermoegenSubNav />
      <PageHeader
        eyebrow="Vermögen"
        title="Festgeld"
        icon={PRODUCT_ICONS.festgeld}
        description="Sicher und planbar — Ihre Festgeldanlagen mit fester Laufzeit und garantiertem Zinssatz."
        actions={
          <Button
            variant="primary"
            size="default"
            onClick={() => window.open('/comparison?product=festgeld', '_blank', 'noopener')}
          >
            <Plus size={14} strokeWidth={1.5} /> Neues Festgeld eröffnen
          </Button>
        }
      />

      <DashboardStagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <DashboardStaggerItem><StatTile icon={Wallet} label="Gesamt angelegt" value={formatEUR(festgeldTotal)} sub={`${agg.activeCount || 0} aktive Verträge`} tone="pos" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Percent} label="Ø Zinssatz (gewichtet)" value={`${(agg.weightedAvgRate || 0).toFixed(2)} %`} sub="nach Anlagebetrag gewichtet" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={TrendingUp} label="Erwarteter Netto-Ertrag" value={formatEUR(agg.netMaturityInterestTotal || 0)} sub="Abgeltung + Soli + KiSt" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Landmark} label="Auszahlung netto (gesamt)" value={formatEUR(agg.netMaturityPayoutTotal || 0)} sub="Anlage + Netto-Zinsen" /></DashboardStaggerItem>
      </DashboardStagger>

      <DashboardContentReveal
        loading={depotLoading}
        skeleton={<div className="mb-6"><CardListSkeleton count={3} /></div>}
      >
        {items.length === 0 ? (
<div className="mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm py-12 text-center">
          <ProductIcon product="festgeld" size="empty" showBubble={false} className="mx-auto mb-4 text-bank-primary/55" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
            Keine aktiven Verträge
          </p>
          <h3 className="dashboard-page-title mt-2 text-[1.15rem] font-semibold leading-tight text-bank-text">
            Noch kein Festgeld eröffnet
          </h3>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-bank-text-muted">
            Vergleichen Sie Festgeld-Angebote über «Neues Festgeld eröffnen» oben rechts.
          </p>
        </div>
        ) : (
        <div ref={contractsListRef} className="mb-6 space-y-4">
          {items.map((c) => (
            <ContractCard key={c.id} contract={c} accent="amber" />
          ))}
        </div>
        )}
      </DashboardContentReveal>

      <DashboardStagger className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardStaggerItem>
          <DashboardPanel index={0}>
          <SectionTitle kicker="Kalender">
            <span className="inline-flex items-center gap-2">
              <FestgeldIcon size={14} strokeWidth={1.5} className="text-bank-primary" /> Fälligkeitsverlauf
            </span>
          </SectionTitle>
          <MaturityTimelineChart rows={maturityRows} />
          </DashboardPanel>
        </DashboardStaggerItem>
        <DashboardStaggerItem>
          <DashboardPanel index={1}>
          <SectionTitle kicker="Performance">
            <span className="inline-flex items-center gap-2">
              <TrendingUp size={14} strokeWidth={1.5} className="text-bank-primary" /> Zins-Aufbau (kumuliert)
            </span>
          </SectionTitle>
          <AccrualCurveChart data={accrualSeries} />
          </DashboardPanel>
        </DashboardStaggerItem>
      </DashboardStagger>

      <DashboardPanel index={2} className="mb-6">
        <SectionTitle kicker="Verteilung">
          <span className="inline-flex items-center gap-2">
            <PieChartIcon size={14} strokeWidth={1.5} className="text-bank-primary" /> Bankverteilung & Einlagensicherung
          </span>
        </SectionTitle>
        <BankAllocationChart rows={bankRows} className="mt-1" />
      </DashboardPanel>

      {(calendarTotal > 0 || cashInTotal > 0) && (
  <div className="mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm">
          <SectionTitle kicker="30 / 60 / 90 Tage">
            <span className="inline-flex items-center gap-2">
              <FestgeldIcon size={14} strokeWidth={1.5} className="text-bank-primary" /> Fälligkeitskalender
            </span>
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { label: 'in ≤ 30 Tagen', amount: buckets.d30, cash: cashIn.d30 },
              { label: 'in 31–60 Tagen', amount: buckets.d60, cash: cashIn.d60 },
              { label: 'in 61–90 Tagen', amount: buckets.d90, cash: cashIn.d90 },
            ].map((slot) => (
              <div
                key={slot.label}
                className="border border-bank-border bg-white px-4 py-3"
              >
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                  {slot.label}
                </p>
                <p className="rate-figure mt-1.5 text-[1.25rem] tabular-nums text-bank-text">
                  {formatEUR(slot.amount || 0)}
                </p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-emerald-700">
                  Erwartet netto: {formatEUR(slot.cash || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {insuranceWarnings.length > 0 && (
  <div className="mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm">
          <SectionTitle kicker="Risiko">
            <span className="inline-flex items-center gap-2">
              <ShieldAlert size={14} strokeWidth={1.5} className="text-amber-600" /> Einlagensicherung-Auslastung
            </span>
          </SectionTitle>
          <ul className="space-y-2 text-sm">
            {insuranceWarnings.map((row) => (
              <li
                key={row.bankId}
                className="flex items-center justify-between gap-3 border border-amber-300/55 bg-amber-50/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-bank-text">{row.bankName}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                    {formatEUR(row.exposureEur)} von {formatEUR(row.limitEur)}
                    {row.isOverLimit ? ' · Limit überschritten' : ' · Limit fast erreicht'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] ${
                    row.isOverLimit
                      ? 'border-rose-300/55 bg-rose-50 text-rose-700'
                      : 'border-amber-300/55 bg-amber-50 text-amber-700'
                  }`}
                >
                  {row.isOverLimit ? <ShieldAlert size={11} strokeWidth={1.5} /> : <ShieldCheck size={11} strokeWidth={1.5} />}
                  {row.utilizationPct.toFixed(0)} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

<div className="mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm">
        <SectionTitle
          kicker="Detail"
          action={
            <ExportActions
              fileBase="festgeld-report"
              title="Festgeld-Report"
              subtitle="Übersicht aller aktiven Festgeldverträge"
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
          emptyHint="Keine aktiven Festgeldverträge."
        />
      </div>
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default FestgeldPage;
