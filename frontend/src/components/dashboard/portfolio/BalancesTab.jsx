import React from 'react';
import { Wallet, Landmark, LineChart, Clock } from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';

const AktienIcon = PRODUCT_ICONS.aktien;
const AnleihenIcon = PRODUCT_ICONS.anleihen;
import { useDashboardData } from '@/context/DashboardDataContext';
import { formatEUR } from '@/lib/dashboardFormatters';
import StatTile from '@/components/dashboard/StatTile';

const BalancesTab = () => {
  const {
    cashBalance,
    cashAvailable,
    cashUnsettled,
    buyingPower,
    cashSettlements,
    contractsTotal,
    depotWert,
    bondsMarktwert,
    activeContracts,
    computeContractMetrics,
  } = useDashboardData();

  const wertpapiere = Number(depotWert || 0) + Number(bondsMarktwert || 0);
  const total = Number(cashBalance || 0) + Number(contractsTotal || 0) + wertpapiere;

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-5">
        <StatTile icon={Wallet} label="Gesamt" value={formatEUR(total)} />
        <StatTile icon={Wallet} label="Verfügbar" value={formatEUR(cashAvailable)} sub="Sofort handelbar" />
        <StatTile icon={Clock} label="Valuta T+2" value={formatEUR(cashUnsettled)} sub="Aus Verkäufen" />
        <StatTile icon={Wallet} label="Kaufkraft" value={formatEUR(buyingPower)} sub="Abzgl. offene Käufe" />
        <StatTile icon={LineChart} label="Wertpapiere" value={formatEUR(wertpapiere)} />
      </div>

      {(cashSettlements || []).length > 0 && (
        <div className="mb-6 rounded-xl border border-bank-border bg-white shadow-sm">
          <div className="border-b border-bank-border px-5 py-3">
            <h3 className="text-[15px] font-semibold text-bank-text">Ausstehende Valuta (T+2)</h3>
          </div>
          <ul className="divide-y divide-bank-border/70">
            {cashSettlements.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3 text-[13px]">
                <div>
                  <p className="font-medium text-bank-text">{formatEUR(s.amount)}</p>
                  <p className="text-[11px] text-bank-text-muted">
                    Handel {new Date(s.trade_date).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <p className="text-[12px] font-medium text-amber-700">
                  Valuta{' '}
                  {new Date(s.settlement_date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-bank-border bg-white shadow-sm">
        <div className="border-b border-bank-border px-5 py-3">
          <h3 className="text-[15px] font-semibold text-bank-text">Salden nach Konto</h3>
        </div>
        <ul className="divide-y divide-bank-border/70">
          <li className="flex items-center justify-between px-5 py-3">
            <span className="text-[13px] text-bank-text">Kapitalmitte — verfügbar</span>
            <span className="font-semibold tabular-nums">{formatEUR(cashAvailable)}</span>
          </li>
          {Number(cashUnsettled) > 0 && (
            <li className="flex items-center justify-between px-5 py-3">
              <span className="text-[13px] text-bank-text">Kapitalmitte — Valuta T+2</span>
              <span className="font-semibold tabular-nums text-amber-700">{formatEUR(cashUnsettled)}</span>
            </li>
          )}
          <li className="flex items-center justify-between px-5 py-3 border-t border-bank-border/70 bg-bank-bg/30">
            <span className="text-[13px] font-medium text-bank-text">Cash gesamt</span>
            <span className="font-semibold tabular-nums">{formatEUR(cashBalance)}</span>
          </li>
          {(activeContracts || []).map((c) => {
            const m = computeContractMetrics(c);
            return (
              <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-bank-text">{c.banks?.name || 'Vertrag'}</p>
                  <p className="text-[11px] text-bank-text-muted">{c.product_type}</p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{formatEUR(m.currentValueGross)}</span>
              </li>
            );
          })}
          {depotWert > 0 && (
            <li className="flex items-center justify-between px-5 py-3">
              <span className="inline-flex items-center gap-2 text-[13px]">
                <AktienIcon size={14} /> Aktien-Depot
              </span>
              <span className="font-semibold tabular-nums">{formatEUR(depotWert)}</span>
            </li>
          )}
          {bondsMarktwert > 0 && (
            <li className="flex items-center justify-between px-5 py-3">
              <span className="inline-flex items-center gap-2 text-[13px]">
                <AnleihenIcon size={14} /> Anleihen
              </span>
              <span className="font-semibold tabular-nums">{formatEUR(bondsMarktwert)}</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default BalancesTab;
