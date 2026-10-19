import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import {
  convertFx,
  fetchEurBasedRates,
  formatFxAmount,
  FX_CURRENCIES,
} from '@/services/forexService';
import { cn } from '@/lib/utils';

const parseGermanNumber = (raw) => {
  const cleaned = String(raw).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const CurrencyConverterCard = () => {
  const [fromCode, setFromCode] = useState('EUR');
  const [toCode, setToCode] = useState('USD');
  const [fromAmount, setFromAmount] = useState(1);
  const [toAmount, setToAmount] = useState(null);
  const [bankSpread, setBankSpread] = useState(0);
  const [rates, setRates] = useState({ EUR: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const recalc = useCallback(
    (amount, from, to, rateMap, spread) => {
      const converted = convertFx(amount, from, to, rateMap, spread);
      setToAmount(converted);
    },
    [],
  );

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const next = await fetchEurBasedRates();
      setRates(next);
      setLastUpdate(new Date());
      recalc(fromAmount, fromCode, toCode, next, bankSpread);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fromAmount, fromCode, toCode, bankSpread, recalc]);

  useEffect(() => {
    loadRates();
    const id = setInterval(loadRates, 120_000);
    return () => clearInterval(id);
  }, [loadRates]);

  const handleFromChange = (raw) => {
    const amount = parseGermanNumber(raw);
    setFromAmount(amount);
    recalc(amount, fromCode, toCode, rates, bankSpread);
  };

  const handleToChange = (raw) => {
    const amount = parseGermanNumber(raw);
    setToAmount(amount);
    const inverted = convertFx(amount, toCode, fromCode, rates, bankSpread);
    if (inverted != null) {
      setFromAmount(inverted);
    }
  };

  const swap = () => {
    const newFrom = toCode;
    const newTo = fromCode;
    const newAmount = toAmount ?? fromAmount;
    setFromCode(newFrom);
    setToCode(newTo);
    setFromAmount(newAmount);
    recalc(newAmount, newFrom, newTo, rates, bankSpread);
  };

  const onFromCurrency = (code) => {
    setFromCode(code);
    recalc(fromAmount, code, toCode, rates, bankSpread);
  };

  const onToCurrency = (code) => {
    setToCode(code);
    recalc(fromAmount, fromCode, code, rates, bankSpread);
  };

  const onSpreadChange = (value) => {
    const spread = Number(value);
    setBankSpread(spread);
    recalc(fromAmount, fromCode, toCode, rates, spread);
  };

  const dateLabel = lastUpdate
    ? lastUpdate.toLocaleDateString('de-DE')
    : new Date().toLocaleDateString('de-DE');

  const title = `Währungsrechner: ${FX_CURRENCIES.find((c) => c.code === fromCode)?.label ?? fromCode} → ${FX_CURRENCIES.find((c) => c.code === toCode)?.label ?? toCode} (${fromCode} in ${toCode})`;

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-bank-border bg-white p-6 shadow-sm dark:border-white/10 dark:bg-bank-ink/30">
      <h1 className="font-display text-lg font-semibold text-bank-text">{title}</h1>

      {error && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          Kurse vorübergehend nicht verfügbar.
        </p>
      )}

      <div className="mt-5 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            defaultValue={formatFxAmount(fromAmount, fromCode)}
            key={`from-${fromCode}-${fromAmount}`}
            onBlur={(e) => handleFromChange(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-bank-border px-3 py-2.5 text-sm tabular-nums text-bank-text dark:border-white/15 dark:bg-bank-ink/40"
            aria-label="Betrag Quellwährung"
          />
          <select
            value={fromCode}
            onChange={(e) => onFromCurrency(e.target.value)}
            className="w-36 shrink-0 rounded-md border border-bank-border bg-white px-2 py-2.5 text-sm text-bank-text dark:border-white/15 dark:bg-bank-ink/40"
          >
            {FX_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={swap}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-bank-ink text-white transition hover:bg-bank-ink/90 dark:bg-white dark:text-bank-ink"
            aria-label="Währungen tauschen"
          >
            <ArrowUpDown size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={toAmount != null ? formatFxAmount(toAmount, toCode) : '–'}
            onChange={(e) => handleToChange(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-bank-border px-3 py-2.5 text-sm tabular-nums text-bank-text dark:border-white/15 dark:bg-bank-ink/40"
            aria-label="Betrag Zielwährung"
          />
          <select
            value={toCode}
            onChange={(e) => onToCurrency(e.target.value)}
            className="w-36 shrink-0 rounded-md border border-bank-border bg-white px-2 py-2.5 text-sm text-bank-text dark:border-white/15 dark:bg-bank-ink/40"
          >
            {FX_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-1 min-w-[140px] flex-col gap-1 text-[11px] text-bank-text-muted">
          Kursdatum
          <input
            type="text"
            readOnly
            value={dateLabel}
            className="rounded-md border border-bank-border bg-bank-bg/40 px-3 py-2 text-sm text-bank-text dark:border-white/15"
          />
        </label>
        <label className="flex flex-1 min-w-[140px] flex-col gap-1 text-[11px] text-bank-text-muted">
          Bankenrate
          <select
            value={bankSpread}
            onChange={(e) => onSpreadChange(e.target.value)}
            className="rounded-md border border-bank-border bg-white px-3 py-2 text-sm text-bank-text dark:border-white/15 dark:bg-bank-ink/40"
          >
            {[-2, -1, 0, 1, 2, 3].map((v) => (
              <option key={v} value={v}>
                {v >= 0 ? `+${v}` : v} %
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={loadRates}
        disabled={loading}
        className={cn(
          'mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60',
        )}
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        Kurse aktualisieren
      </button>
    </div>
  );
};

export default CurrencyConverterCard;
