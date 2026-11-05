import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  PieChart as PieChartIcon,
  Plus,
  Table as TableIcon,
  TrendingUp,
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
import LockTimelineChart from '@/components/dashboard/charts/LockTimelineChart';
import BankAllocationChart from '@/components/dashboard/charts/BankAllocationChart';
import ContractsTable from '@/components/dashboard/ContractsTable';
import ExportActions from '@/components/dashboard/ExportActions';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import VermoegenBreadcrumb from '@/components/dashboard/VermoegenBreadcrumb';
import VermoegenSubNav from '@/components/dashboard/VermoegenSubNav';
import { DashboardStagger, DashboardStaggerItem } from '@/components/dashboard/motion/DashboardStagger';
import DashboardPanel from '@/components/dashboard/motion/DashboardPanel';
import DashboardContentReveal from '@/components/dashboard/motion/DashboardContentReveal';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
import LockProgressBar from '@/components/dashboard/LockProgressBar';
import {
  buildLockTimeline,
  buildPortfolioAccrualSeries,
} from '@/lib/dashboardMetrics';
import { formatDate, formatEUR } from '@/lib/dashboardFormatters';

const FlexgeldPage = () => {
  const navigate = useNavigate();
  const {
    contractsByType,
    depotLoading,
    flexgeldTotal,
    flexgeldAggregate,
    bankInsuranceExposure,
    taxPrefs,
    inflationRatePct,
    computeContractMetrics,
  } = useDashboardData();
  const items = useMemo(
    () => contractsByType.flexgeld || [],
    [contractsByType.flexgeld],
  );
  const contractsListRef = useAutoAnimateRef(!depotLoading && items.length > 0);
  const agg = useMemo(() => flexgeldAggregate || {}, [flexgeldAggregate]);

  const lockTimeline = useMemo(() => buildLockTimeline(items), [items]);
  const lockedContracts = useMemo(
    () => lockTimeline.filter((r) => r.isLocked && r.lockUntil),
    [lockTimeline],
  );

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
            contract: c,
            metrics: m,
            bankName: c.banks?.name || 'Bank',
            beginn: c.active_from,
            lockUntil: m.lockUntil,
            lockDaysRemaining: m.lockDaysRemaining,
            isLocked: m.isLocked,
            anlage: m.amount,
            zinssatz: m.rate,
            verfuegbar: m.withdrawableNow,
            tageszinsNet: m.dailyInterestNet,
            mtdNet: m.netInterestMtd,
            ytdNet: m.netInterestYtd,
          };
        })
        .sort((a, b) => b.anlage - a.anlage),
    [items, computeContractMetrics, taxPrefs, inflationRatePct],
  );

  const totalWithdrawableNow = useMemo(
    () => tableRows.reduce((s, r) => s + (r.verfuegbar || 0), 0),
    [tableRows],
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
        key: 'lockEnd',
        header: 'Festbindung bis',
        value: (r) => r.lockUntil,
        render: (_, v) => (v ? formatDate(v) : '—'),
        sortValue: (r) => (r.lockUntil ? new Date(r.lockUntil).getTime() : 0),
      },
      {
        key: 'restbindung',
        header: 'Restbindung',
        value: (r) => (r.isLocked ? `${r.lockDaysRemaining} Tage` : 'Frei'),
        sortValue: (r) =>
          r.isLocked ? r.lockDaysRemaining || 0 : Number.MAX_SAFE_INTEGER,
      },
      {
        key: 'lockBar',
        header: 'Fortschritt',
        sortable: false,
        value: (r) => r,
        render: (r) =>
          r.contract?.active_from && r.lockUntil ? (
            <LockProgressBar
              activeFrom={r.contract.active_from}
              lockUntil={r.lockUntil}
              isLocked={r.isLocked}
              lockProgressPct={
                (() => {
                  const start = new Date(r.contract.active_from).getTime();
                  const lock = new Date(r.lockUntil).getTime();
                  const total = Math.max(1, lock - start);
                  return Math.min(
                    100,
                    Math.max(0, ((Date.now() - start) / total) * 100),
                  );
                })()
              }
              daysRemaining={r.lockDaysRemaining}
              className="min-w-[140px]"
            />
          ) : (
            <span className="text-bank-text-muted">—</span>
          ),
      },
      {
        key: 'anlage',
        header: 'Anlage',
        value: (r) => r.anlage,
        align: 'right',
        render: (_, v) => formatEUR(v),
      },
      {
        key: 'zins',
        header: 'Zins p.a.',
        value: (r) => r.zinssatz,
        align: 'right',
        render: (_, v) => `${Number(v || 0).toLocaleString('de-DE')} %`,
      },
      {
        key: 'verfuegbar',
        header: 'Verfügbar',
        value: (r) => r.verfuegbar,
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
      { header: 'Festbindung bis', value: (r) => (r.lockUntil ? formatDate(r.lockUntil) : '') },
      {
        header: 'Restbindung',
        value: (r) => (r.isLocked ? `${r.lockDaysRemaining} Tage` : 'Frei'),
      },
      { header: 'Anlage (EUR)', value: (r) => Number(r.anlage || 0).toFixed(2), align: 'right' },
      { header: 'Zins p.a. (%)', value: (r) => Number(r.zinssatz || 0).toFixed(2), align: 'right' },
      { header: 'Verfügbar (EUR)', value: (r) => Number(r.verfuegbar || 0).toFixed(2), align: 'right' },
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
      {
        label: 'Gesamtwert',
        value: formatEUR(flexgeldTotal),
        hint: `inkl. ${formatEUR(agg.accruedGrossTotal || 0)} aufgelaufener Zinsen`,
      },
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
        label: 'Aktuell verfügbar',
        value: formatEUR(totalWithdrawableNow),
        hint: 'Festbindung berücksichtigt',
      },
    ],
    [flexgeldTotal, agg, totalWithdrawableNow],
  );

  return (
    <PageContainer>
      <PortfolioPageLayout>
      <VermoegenBreadcrumb current="Flexgeld" />
      <VermoegenSubNav />
      <PageHeader
        eyebrow="Vermögen"
        title="Flexgeld"
        icon={PRODUCT_ICONS.flexgeld}
        description="Hybride Anlage mit Tageszugriff und attraktiver Verzinsung."
        actions={
          <Button
            variant="primary"
            size="default"
            onClick={() => window.open('/comparison?product=flexgeld', '_blank', 'noopener')}
          >
            <Plus size={14} strokeWidth={1.5} /> Flexgeld eröffnen
          </Button>
        }
      />

      <DashboardStagger className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <DashboardStaggerItem><StatTile icon={PRODUCT_ICONS.flexgeld} label="Gesamtwert" value={formatEUR(flexgeldTotal)} sub={`inkl. ${formatEUR(agg.accruedGrossTotal || 0)} aufgelaufener Zinsen`} tone="pos" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Percent} label="Ø Zinssatz (gewichtet)" value={`${(agg.weightedAvgRate || 0).toFixed(2)} %`} sub="nach Anlagebetrag gewichtet" /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={TrendingUp} label="Tageszins (heute, netto)" value={formatEUR(agg.dailyInterestNetTotal || 0)} sub={`Brutto: ${formatEUR(agg.dailyInterestGrossTotal || 0)}`} /></DashboardStaggerItem>
        <DashboardStaggerItem><StatTile icon={Wallet} label="Aktuell verfügbar" value={formatEUR(totalWithdrawableNow)} sub="Festbindung berücksichtigt" /></DashboardStaggerItem>
      </DashboardStagger>

      <DashboardContentReveal
        loading={depotLoading}
        skeleton={(
          <div className="mb-6">
            <CardListSkeleton count={2} />
          </div>
        )}
      >
        {items.length === 0 ? (
<div className="mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm py-12 text-center">
          <ProductIcon product="flexgeld" size="empty" showBubble={false} className="mx-auto mb-4 text-bank-primary/55" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
            Keine aktiven Verträge
          </p>
          <h3 className="dashboard-page-title mt-2 text-[1.15rem] font-semibold leading-tight text-bank-text">
            Noch kein Flexgeld eröffnet
          </h3>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-bank-text-muted">
            Starten Sie über «Flexgeld eröffnen» oben rechts.
          </p>
        </div>
        ) : (
        <div ref={contractsListRef} className="mb-6 space-y-4">
          {items.map((c) => (
            <ContractCard key={c.id} contract={c} accent="violet" detailed={false} />
          ))}
        </div>
        )}
      </DashboardContentReveal>

      <DashboardStagger className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardStaggerItem>
          <DashboardPanel index={0}>
          <SectionTitle kicker="Bindung">
            <span className="inline-flex items-center gap-2">
              <Lock size={14} strokeWidth={1.5} className="text-bank-primary" /> Festbindung-Zeitachse
            </span>
          </SectionTitle>
          <LockTimelineChart rows={lockTimeline} />
          </DashboardPanel>
        </DashboardStaggerItem>
        <DashboardStaggerItem>
          <DashboardPanel index={1}>
          <SectionTitle kicker="Performance">
            <span className="inline-flex items-center gap-2">
              <TrendingUp size={14} strokeWidth={1.5} className="text-bank-primary" /> Zinsentwicklung (Jahr bisher)
            </span>
          </SectionTitle>
          <AccrualCurveChart
            data={accrualSeries}
            emptyHint="Noch keine Flexgeld-Bewegungen in diesem Jahr."
          />
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

      {lockedContracts.length > 0 && (
  <div className="mb-6 rounded-lg border border-bank-border bg-white p-5 shadow-sm">
          <SectionTitle kicker="Lock-Status">
            <span className="inline-flex items-center gap-2">
              <Lock size={14} strokeWidth={1.5} className="text-bank-primary" /> Festbindung läuft
            </span>
          </SectionTitle>
          <ul className="space-y-2 text-sm">
            {lockedContracts.map((row) => (
              <li
                key={row.contractId}
                className="border border-bank-primary/20 bg-bank-primary/5 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-bank-text">{row.bankName}</p>
                    <p className="mt-0.5 text-[10.5px] text-bank-text-muted">
                      Festbindung bis: {formatDate(row.lockUntil)} · noch {row.daysRemaining} Tage
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-bank-primary">
                    {formatEUR(row.amount)}
                  </span>
                </div>
                <div className="mt-2.5">
                  <LockProgressBar
                    activeFrom={row.activeFrom}
                    lockUntil={row.lockUntil}
                    isLocked={row.isLocked}
                    lockProgressPct={row.lockProgressPct}
                    daysRemaining={row.daysRemaining}
                  />
                </div>
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
              fileBase="flexgeld-report"
              title="Flexgeld-Report"
              subtitle="Übersicht aller aktiven Flexgeld-Verträge"
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
          emptyHint="Keine aktiven Flexgeld-Verträge."
        />
      </div>
      </PortfolioPageLayout>
    </PageContainer>
  );
};

export default FlexgeldPage;
