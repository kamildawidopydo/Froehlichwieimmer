// Live FX rates for Währungsrechner (FastAPI/yfinance native).
// Session 82.86 — Supabase-Cutover: `functions.invoke('stock-prices')` durch
// `GET /api/forex/quotes?pairs=…` ersetzt. Keine Supabase-Imports mehr.

import { getApiBase } from '@/lib/apiBase';

/** EUR-basierte FX-Paare mit yahoo-Notation (nur informativ, kein Supabase-Call). */
export const FX_CURRENCIES = [
  { code: 'EUR', label: 'Euro' },
  { code: 'USD', label: 'Dollar', pair: 'EURUSD' },
  { code: 'GBP', label: 'Britische Pfund', pair: 'EURGBP' },
  { code: 'CHF', label: 'Schweizer Franken', pair: 'EURCHF' },
  { code: 'JPY', label: 'Japanischer Yen', pair: 'EURJPY' },
  { code: 'CAD', label: 'Kanadischer Dollar', pair: 'EURCAD' },
  { code: 'AUD', label: 'Australischer Dollar', pair: 'EURAUD' },
];

const PAIR_LIST = FX_CURRENCIES.map((c) => c.pair).filter(Boolean);

let ratesCache = null;
let ratesCacheAt = 0;
const RATES_TTL = 120_000;

/**
 * @returns {Record<string, number|null>} currency units received per 1 EUR
 *   (Wert `null`, wenn Provider unavailable/stale ist — Consumer zeigen dann –).
 */
export async function fetchEurBasedRates() {
  if (ratesCache && Date.now() - ratesCacheAt < RATES_TTL) {
    return ratesCache;
  }

  const base = getApiBase() || '';
  const url = `${base}/api/forex/quotes?pairs=${encodeURIComponent(PAIR_LIST.join(','))}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`forex_api_${res.status}`);
  const payload = await res.json();

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const byPair = {};
  for (const it of items) {
    if (it?.pair) byPair[String(it.pair).toUpperCase()] = it;
  }

  const out = { EUR: 1 };
  for (const cur of FX_CURRENCIES) {
    if (cur.code === 'EUR') continue;
    const it = byPair[cur.pair?.toUpperCase() ?? ''];
    // Nur `fresh` und `stale`-Werte als nutzbar akzeptieren; `unavailable` → null.
    // stale ist ein echter Provider-Wert, nur älter → für Konvertierung ok,
    // aber wir vermeiden ihn nicht künstlich als "fresh" auszuweisen.
    const isUsable = it && it.rate != null && (it.data_status === 'fresh' || it.data_status === 'stale');
    out[cur.code] = isUsable && Number(it.rate) > 0 ? Number(it.rate) : null;
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
