import { getApiBase } from '@/lib/apiBase';
// Historical price series for sparklines / detail charts.
// Uses the FastAPI backend (`/api/news-markte/market/sparkline/{symbol}`),
// which serves a 15-min cached hourly series with deterministic synthetic
// fallback for unsupported symbols. Never touches the deprecated Supabase
// stock-history edge function anymore.

const API_ROOT = (getApiBase() || '').replace(/\/$/, '');

// Backend `_SPARKLINE_SUPPORTED` = {"DAX", "SPX", "NDX", "DJI"}. Alle anderen
// Symbole (Einzelaktien, Anleihen, ETFs, Rohstoffe mit Sonderzeichen) sind
// nicht unterstützt und werden Frontend-seitig kurzgeschlossen — verhindert
// unnötige 404-Requests + Console-Noise.
const SUPPORTED_SPARKLINE_SYMBOLS = new Set(['DAX', 'SPX', 'NDX', 'DJI']);

const EMPTY_RESULT = Object.freeze({
  points: [],
  ohlc: [],
  currency: 'USD',
  price: null,
  prevClose: null,
  fiftyTwoWeekHigh: null,
  fiftyTwoWeekLow: null,
});

// Remember symbols the backend does not support so we do not hammer 404s.
const UNSUPPORTED = new Set();

/**
 * Fetch raw history points for a symbol.
 * @returns {Promise<{points: {t:string,c:number}[], currency:string, price:number|null, prevClose:number|null}>}
 */
export async function fetchStockHistory(symbol, _range = '1mo', _interval) {
  if (!symbol) return { ...EMPTY_RESULT };
  const sym = String(symbol).toUpperCase();
  if (UNSUPPORTED.has(sym)) return { ...EMPTY_RESULT };
  if (!SUPPORTED_SPARKLINE_SYMBOLS.has(sym)) {
    UNSUPPORTED.add(sym);
    return { ...EMPTY_RESULT };
  }

  try {
    const res = await fetch(
      `${API_ROOT}/api/news-markte/market/sparkline/${encodeURIComponent(sym)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.status === 404) {
      UNSUPPORTED.add(sym);
      return { ...EMPTY_RESULT };
    }
    if (!res.ok) return { ...EMPTY_RESULT };
    const data = await res.json();
    return {
      points: Array.isArray(data?.points) ? data.points : [],
      ohlc: [],
      currency: 'EUR',
      price: null,
      prevClose: data?.prev_close ?? null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[stockHistoryService] skipped:', err?.message || err);
    }
    return { ...EMPTY_RESULT };
  }
}

/** Convenience: close-price array for a compact sparkline. */
export async function fetchSparkline(symbol, range = '1mo') {
  const { points } = await fetchStockHistory(symbol, range);
  return points.map((p) => p.c).filter((c) => typeof c === 'number');
}
