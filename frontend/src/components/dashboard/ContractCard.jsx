import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Landmark,
  Lock,
  PauseCircle,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import BankLogo from '@/components/BankLogo';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import LockProgressBar from '@/components/dashboard/LockProgressBar';
import FlexgeldMonthTimeline from '@/components/dashboard/FlexgeldMonthTimeline';
import { useDashboardData } from '@/context/DashboardDataContext';
import {
  formatEUR,
  formatEURSigned,
  formatDate,
} from '@/lib/dashboardFormatters';
import { PRODUCT_BADGE, PRODUCT_LABEL } from '@/lib/dashboardMetrics';

const PRIMARY_ACCENT = {
  bubble: 'bg-bank-primary/10',
  icon: 'text-bank-primary',
  rate: 'text-bank-primary',
  bar: 'bg-bank-primary',
};

const ACCENTS = {
  amber: PRIMARY_ACCENT,
  emerald: PRIMARY_ACCENT,
  violet: PRIMARY_ACCENT,
  rose: PRIMARY_ACCENT,
  primary: PRIMARY_ACCENT,
};

const ContractCard = ({ contract, accent = 'amber', detailed = true, onClick }) => {
  const { computeContractMetrics } = useDashboardData();
  const m = computeContractMetrics(contract);
  const c = contract;
  const colors = ACCENTS[accent] || ACCENTS.amber;
  const productType = c.product_type;
  const isFestgeld = productType === 'festgeld';
  const isTagesgeld = productType === 'tagesgeld';
  const isFlexgeld = productType === 'flexgeld';
  const bankCountry =
    c.banks?.country_code ||
    c.banks?.country ||
    c.banks?.deposit_guarantee_country_code ||
    null;
  const hasInsurance =
    !!(c.banks?.deposit_protection || c.banks?.deposit_protection_amount || c.banks?.deposit_guarantee_country_code);
  const Container = onClick ? 'button' : 'div';
  const containerProps = onClick
    ? {
        type: 'button',
        onClick,
        'data-testid': `contract-card-${c.id}`,
        className: `group w-full text-left bg-white border rounded-lg overflow-hidden transition-all hover:border-bank-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/30 ${c.is_active ? 'border-bank-border/80' : 'border-bank-border/60 opacity-75'}`,
      }
    : {
        'data-testid': `contract-card-${c.id}`,
        className: `bg-white border rounded-lg overflow-hidden ${c.is_active ? 'border-bank-border/80' : 'border-bank-border/60 opacity-75'}`,
      };

  return (
    <Container {...containerProps}>
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-bank-border/70">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`flex shrink-0 items-center justify-center ${c.banks?.logo_url ? '' : `h-11 w-11 rounded-md ${colors.bubble}`}`}
          >
            {c.banks?.logo_url ? (
              <BankLogo logo={c.banks.logo_url} bankName={c.banks?.name} size="sm" className="!h-11 !w-11" />
            ) : (
              <Landmark size={20} className={colors.icon} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-semibold text-bank-text truncate" data-testid="contract-bank-name">
                {c.banks?.name || PRODUCT_LABEL[c.product_type] || 'Vertrag'}
              </p>
              <ChevronRight size={14} className="shrink-0 text-bank-text-muted" aria-hidden />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-bank-text-muted">
              {bankCountry && (
                <span className="inline-flex items-center gap-1.5" data-testid="contract-country">
                  <CountryFlagIcon country={bankCountry} size="xs" />
                  <span className="text-bank-text-muted">{c.banks?.country || bankCountry}</span>
                </span>
              )}
              <span className="text-bank-text-muted/60">·</span>
              <span className="font-medium text-bank-text-muted">
                {PRODUCT_LABEL[c.product_type] || c.product_type}
              </span>
            </div>
            {hasInsurance && (
              <span
                className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700"
                data-testid="contract-insurance-badge"
              >
                <ShieldCheck size={11} strokeWidth={2} />
                Einlagensicherung
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 flex items-start gap-2">
          <div>
            <p className={`text-2xl font-semibold tabular-nums ${colors.rate}`}>
              {c.zinssatz != null ? `${Number(c.zinssatz).toLocaleString('de-DE')}% ` : '– '}
              <span className="text-sm font-medium text-bank-text-muted">p.a.</span>
            </p>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border mt-1 ${c.is_active ? 'bg-bank-success/10 text-bank-success border-bank-success/25' : 'bg-bank-border/20 text-bank-text-muted border-bank-border'}`}
            >
              {c.is_active ? <CheckCircle size={10} /> : <PauseCircle size={10} />}
              {c.is_active ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          {onClick && (
            <ChevronRight size={20} className="shrink-0 text-bank-text-muted mt-2 transition-transform group-hover:translate-x-0.5" aria-hidden />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 py-4 border-b border-bank-border/50">
        <div>
          <p className="text-xs text-bank-text-muted mb-1">Anlagebetrag</p>
          <p className="font-semibold text-bank-text">{formatEUR(m.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-bank-text-muted mb-1">Zinssatz</p>
          <p className="font-semibold text-bank-text">
            {c.zinssatz != null ? `${Number(c.zinssatz).toLocaleString('de-DE')}% p.a.` : '–'}
          </p>
        </div>
        {detailed && (
          <>
            <div>
              <p className="text-xs text-bank-text-muted mb-1">Gesamtzinsen (Laufzeit)</p>
              <p className="font-semibold text-emerald-600">{formatEURSigned(m.gesamtzinsen)}</p>
              <p className="text-[11px] text-bank-text-muted mt-0.5">
                Netto: {formatEUR(m.netMaturityInterest)}
              </p>
            </div>
            <div>
              <p className="text-xs text-bank-text-muted mb-1">Auszahlung bei Fälligkeit</p>
              <p className="font-semibold text-bank-text">{formatEUR(m.auszahlung)}</p>
              <p className="text-[11px] text-bank-text-muted mt-0.5">
                Netto: {formatEUR(m.netMaturityPayout)}
              </p>
            </div>
          </>
        )}
        {!detailed && (
          <>
            <div>
              <p className="text-xs text-bank-text-muted mb-1">Aufgelaufene Zinsen</p>
              <p className="font-semibold text-emerald-600">
                {formatEURSigned(m.aufgelaufeneZinsen)}
              </p>
              <p className="text-[11px] text-bank-text-muted mt-0.5">
                Netto: {formatEUR(m.netAccruedInterest)}
              </p>
            </div>
            <div>
              <p className="text-xs text-bank-text-muted mb-1">
                Aktuell verfügbar
              </p>
              <p className="font-semibold text-bank-text" data-testid="contract-available-amount">
                {formatEUR(isFlexgeld && m.isLocked ? 0 : m.amount + m.aufgelaufeneZinsen)}
              </p>
              {isFlexgeld && m.isLocked && (
                <p className="text-[11px] text-bank-text-muted mt-0.5">
                  Frei ab {formatDate(m.lockUntil)}
                </p>
              )}
              {m.dailyInterestGross > 0 && (
                <p className="text-[11px] text-bank-text-muted mt-0.5">
                  Heute: {formatEURSigned(m.dailyInterestNet)} netto
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 py-4 border-b border-bank-border/50">
        <div>
          <p className="text-xs text-bank-text-muted mb-1">Startdatum</p>
          <p className="font-medium text-bank-text">{formatDate(c.active_from)}</p>
        </div>
        <div>
          <p className="text-xs text-bank-text-muted mb-1">Enddatum</p>
          <p className="font-medium text-bank-text">{formatDate(c.active_until)}</p>
        </div>
        {isTagesgeld && (
          <div>
            <p className="text-xs text-bank-text-muted mb-1">Tageszins (heute, netto)</p>
            <p className="font-semibold text-emerald-600">{formatEURSigned(m.dailyInterestNet)}</p>
            <p className="text-[11px] text-bank-text-muted mt-0.5">
              Monat bisher: {formatEUR(m.netInterestMtd)}
            </p>
          </div>
        )}
        {isFlexgeld && (
          <div>
            <p className="text-xs text-bank-text-muted mb-1">Festbindung bis</p>
            <p
              className={`font-semibold ${m.isLocked ? 'text-bank-primary' : 'text-emerald-600'}`}
            >
              {m.lockUntil ? formatDate(m.lockUntil) : 'Keine Festbindung'}
            </p>
            {m.lockUntil && (
              <p className="text-[11px] text-bank-text-muted mt-0.5">
                {m.isLocked
                  ? `Noch ${m.lockDaysRemaining} Tage gebunden`
                  : `Frei verfügbar seit ${formatDate(m.lockUntil)}`}
              </p>
            )}
          </div>
        )}
        {isFestgeld && (
          <div>
            <p className="text-xs text-bank-text-muted mb-1">Aufgelaufene Zinsen</p>
            <p className="font-semibold text-emerald-600">{formatEURSigned(m.aufgelaufeneZinsen)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-bank-text-muted mb-1">Restlaufzeit</p>
          <p className="font-medium text-bank-text">
            {m.totalDays > 0 ? `${m.daysRemaining} Tage` : '–'}
          </p>
        </div>
      </div>

      {/* Product-specific status row */}
      {(isFestgeld && m.totalDays > 0) ||
      (isFlexgeld && m.lockUntil) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-5 py-3 border-b border-bank-border/50 bg-bank-bg/30">
          {isFestgeld && m.totalDays > 0 && (
            <div className="flex items-start gap-2 text-xs">
              <TrendingDown size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-bank-text-muted">Bei vorzeitiger Kündigung heute</p>
                <p className="font-semibold text-bank-text">
                  ~ {formatEUR(m.earlyWithdrawalPayoutTodayNet)}
                </p>
                {m.earlyWithdrawalPenaltyEur > 0 && (
                  <p className="text-[11px] text-rose-600">
                    Strafe: {formatEUR(m.earlyWithdrawalPenaltyEur)}
                  </p>
                )}
              </div>
            </div>
          )}
          {isFlexgeld && m.lockUntil && (
            <div className="flex items-start gap-2 text-xs md:col-span-2">
              <Lock
                size={14}
                className={`mt-0.5 shrink-0 ${m.isLocked ? 'text-bank-primary' : 'text-emerald-600'}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-bank-text-muted">
                    {m.isLocked ? 'Festbindung läuft' : 'Frei verfügbar'}
                  </p>
                  <p className="font-semibold text-bank-text">
                    Festbindung bis: {formatDate(m.lockUntil)}
                  </p>
                </div>
                <LockProgressBar
                  activeFrom={c.active_from}
                  lockUntil={m.lockUntil}
                  isLocked={m.isLocked}
                  lockProgressPct={
                    c.active_from && m.lockUntil
                      ? (() => {
                          const start = new Date(c.active_from).getTime();
                          const lock = new Date(m.lockUntil).getTime();
                          const now = Date.now();
                          const total = Math.max(1, lock - start);
                          return Math.min(
                            100,
                            Math.max(0, ((now - start) / total) * 100),
                          );
                        })()
                      : 0
                  }
                  daysRemaining={m.lockDaysRemaining}
                />
              </div>
            </div>
          )}
          {m.realReturnPct != null && (
            <div className="flex items-start gap-2 text-xs">
              <Clock size={14} className="text-bank-text-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-bank-text-muted">Reale Rendite p.a. (nach Inflation)</p>
                <p
                  className={`font-semibold ${m.realReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {m.realReturnPct >= 0 ? '+' : ''}
                  {m.realReturnPct.toFixed(2)} %
                </p>
                {m.inflationRatePct != null && (
                  <p className="text-[11px] text-bank-text-muted">
                    Inflation: {m.inflationRatePct.toFixed(1)} % p.a.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {isFlexgeld && c.active_from && (
        <FlexgeldMonthTimeline
          activeFrom={c.active_from}
          activeUntil={c.active_until}
          laufzeitMonate={c.laufzeit_monate}
        />
      )}

      {m.totalDays > 0 && (
        <div className="px-5 py-4">
          <div className="flex items-center justify-between text-xs text-bank-text-muted mb-1.5">
            <span>Laufzeit-Fortschritt</span>
            <span className="font-medium text-bank-text">{m.progress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-bank-border/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colors.bar}`}
              style={{ width: `${m.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-bank-text-muted mt-1.5">
            <span>{m.daysPassed} Tage vergangen</span>
            <span>{m.daysRemaining} Tage verbleibend</span>
          </div>
          {isFestgeld && m.maturityBucket != null && m.maturityBucket <= 90 && (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <AlertTriangle size={11} /> Fälligkeit in {'<='}{m.maturityBucket} Tagen
            </div>
          )}
        </div>
      )}
    </Container>
  );
};

export default ContractCard;
