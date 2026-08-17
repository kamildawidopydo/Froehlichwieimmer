import React, { useEffect, useMemo, useState } from 'react';
import { Coins } from 'lucide-react';
import StockLogo from '@/components/StockLogo';
import { fetchDividends } from '@/services/dividendService';

const fmtMoney = (v, currency = 'EUR') =>
  v == null
    ? '–'
    : Number(v).toLocaleString('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 });

const fmtDate = (iso) => {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Dividenden-Kalender: trailing-12-month dividend income estimate per held
 * position plus the most recent ex-dividend date. `positions` are the user's
 * owned stocks ({ symbol, name, logoUrl, qty }).
 */
const DividendPanel = ({ positions = [] }) => {
  const [divMap, setDivMap] = useState({});
  const [loaded, setLoaded] = useState(false);

  const symbolsKey = positions.map((p) => p.symbol).join(',');

  useEffect(() => {
    let active = true;
    const symbols = symbolsKey ? symbolsKey.split(',').filter(Boolean) : [];
    if (symbols.length === 0) {
      setDivMap({});
      setLoaded(true);
      return undefined;
    }
    setLoaded(false);
    fetchDividends(symbols)
      .then((map) => {
        if (active) {
          setDivMap(map);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [symbolsKey]);

  const rows = useMemo(
    () =>
      positions
        .map((p) => {
          const d = divMap[p.symbol];
          if (!d || d.ttmDividend <= 0) return null;
          return {
            ...p,
            currency: d.currency,
            ttmDividend: d.ttmDividend,
            annualIncome: d.ttmDividend * Number(p.qty || 0),
            lastAmount: d.lastAmount,
            lastDate: d.lastDate,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.annualIncome - a.annualIncome),
    [positions, divMap],
  );

  const totalIncome = rows.reduce((s, r) => s + r.annualIncome, 0);

  // Nothing to show (no positions or none pay dividends) → hide once resolved.
  if (loaded && rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
          <Coins size={16} strokeWidth={1.6} className="text-bank-primary" />
          Dividenden (12 Monate)
        </h3>
        {rows.length > 0 && (
          <span className="text-[13px] font-semibold tabular-nums text-emerald-600">
            ~ {fmtMoney(totalIncome, rows[0]?.currency || 'EUR')} p.a.
          </span>
        )}
      </div>
      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-bank-surface-elev" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-bank-border/70">
          {rows.map((r) => (
            <div key={r.symbol} className="flex items-center gap-3 py-2.5">
              <StockLogo symbol={r.symbol} name={r.name} logoUrl={r.logoUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-bank-text">{r.name}</p>
                <p className="truncate text-[11px] text-bank-text-muted">
                  Letzte Ausschüttung: {fmtMoney(r.lastAmount, r.currency)} · {fmtDate(r.lastDate)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13.5px] font-semibold tabular-nums text-emerald-600">
                  {fmtMoney(r.annualIncome, r.currency)}
                </p>
                <p className="text-[11px] tabular-nums text-bank-text-muted">geschätzt p.a.</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DividendPanel;
