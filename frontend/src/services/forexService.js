// Live FX rates for Währungsrechner (Yahoo via stock-prices edge function).

import { supabase } from '@/lib/supabase';

/** Yahoo pair is always EUR{currency}=X → price = units of currency per 1 EUR. */
export const FX_CURRENCIES = [
  { code: 'EUR', label: 'Euro' },
  { code: 'USD', label: 'Dollar', yahoo: 'EURUSD=X' },
  { code: 'GBP', label: 'Britische Pfund', yahoo: 'EURGBP=X' },
  { code: 'CHF', label: 'Schweizer Franken', yahoo: 'EURCHF=X' },
  { code: 'JPY', label: 'Japanischer Yen', yahoo: 'EURJPY=X' },
  { code: 'CAD', label: 'Kanadischer Dollar', yahoo: 'EURCAD=X' },
  { code: 'AUD', label: 'Australischer Dollar', yahoo: 'EURAUD=X' },
];

const PAIR_SYMBOLS = FX_CURRENCIES.map((c) => c.yahoo).filter(Boolean);

let ratesCache = null;
let ratesCacheAt = 0;
const RATES_TTL = 120_000;

/** @returns {Record<string, number|null>} currency units received per 1 EUR */
export async function fetchEurBasedRates() {
  if (ratesCache && Date.now() - ratesCacheAt < RATES_TTL) {
    return ratesCache;
  }

  const { data, error } = await supabase.functions.invoke('stock-prices', {
    body: { symbols: PAIR_SYMBOLS },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));

  const quoteMap = {};
  (data?.quotes ?? []).forEach((q) => {
    if (q?.symbol) quoteMap[String(q.symbol).toUpperCase()] = q;
  });

  const out = { EUR: 1 };
  for (const cur of FX_CURRENCIES) {
    if (cur.code === 'EUR') continue;
    const q = quoteMap[cur.yahoo?.toUpperCase() ?? ''];
    const price = q?.price != null ? Number(q.price) : null;
    out[cur.code] = price != null && price > 0 ? price : null;
  }

  ratesCache = out;
  ratesCacheAt = Date.now();
  return out;
}

export function convertFx(amount, fromCode, toCode, eurRates, bankSpreadPct = 0) {
  const fromRate = eurRates[fromCode];
  const toRate = eurRates[toCode];
  if (fromRate == null || toRate == null || fromRate <= 0) return null;

  const inEur = Number(amount) / fromRate;
  let result = inEur * toRate;
  const spread = Number(bankSpreadPct) || 0;
  if (spread !== 0) {
    result *= 1 + spread / 100;
  }
  return result;
}

export const formatFxAmount = (value, code) => {
  if (value == null || Number.isNaN(value)) return '–';
  const decimals = code === 'JPY' ? 2 : 2;
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatFxInput = (value, code) => {
  if (value == null || Number.isNaN(value)) return '';
  const decimals = code === 'JPY' ? 2 : 2;
  return `${formatFxAmount(value, code)} ${code}`;
};
