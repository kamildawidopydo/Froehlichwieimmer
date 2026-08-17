// Market index, commodity and FX quotes for the news sidebar widget.

import { supabase } from '@/lib/supabase';

export const MARKET_INDICES = [
  { symbol: '^GDAXI', label: 'DAX', compareColor: '#1e3a5f' },
  { symbol: '^TECDAX', label: 'TecDAX', compareColor: '#16a34a' },
  { symbol: '^DJI', label: 'Dow Jones', compareColor: '#ea580c' },
  { symbol: '^IXIC', label: 'Nasdaq', compareColor: '#7c3aed' },
];

export const MARKET_COMMODITIES = [
  { symbol: 'GC=F', label: 'Gold' },
  { symbol: 'SI=F', label: 'Silber' },
  { symbol: 'CL=F', label: 'Öl' },
  { symbol: 'NG=F', label: 'Erdgas' },
];

/** German consumer labels (finanzen.net style). */
export const MARKET_FOREX = [
  { symbol: 'EURUSD=X', label: 'Dollarkurs', decimals: 2 },
  { symbol: 'USDJPY=X', label: 'Japanischer Yen', decimals: 2 },
  { symbol: 'EURGBP=X', label: 'Britische Pfund', decimals: 2 },
  { symbol: 'EURCHF=X', label: 'Schweizer Franken', decimals: 2 },
];

export const SIDEBAR_FOOTER_LINKS = {
  rohstoffe: { label: 'alle Rohstoff-Charts in der Übersicht »', to: '/news/rohstoffcharts' },
  devisen: { label: 'Währungsrechner »', to: '/news/waehrungsrechner' },
};

export const normalizeMarketSymbol = (symbol) =>
  String(symbol || '')
    .toUpperCase()
    .replace(/^\^/, '');

const mapQuotesToConfig = (quotes, config) => {
  const map = {};
  (quotes || []).forEach((q) => {
    if (q?.symbol) map[normalizeMarketSymbol(q.symbol)] = q;
  });
  return config.map((i) => {
    const q = map[normalizeMarketSymbol(i.symbol)] || {};
    const price = q.price != null ? Number(q.price) : null;
    const changePct =
      q.change_pct != null
        ? Number(q.change_pct)
        : q.changePct != null
          ? Number(q.changePct)
          : null;
    return {
      symbol: i.symbol,
      label: i.label,
      price,
      changePct,
      currency: q.currency ?? null,
      decimals: i.decimals ?? null,
      compareColor: i.compareColor ?? null,
    };
  });
};

async function fetchQuotes(symbols) {
  try {
    const { data, error } = await supabase.functions.invoke('stock-prices', {
      body: { symbols },
    });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
    return data?.quotes ?? [];
  } catch (err) {
    // Public/unauthenticated callers (e.g. MarktuebersichtSidebar on /news) will get 401 here.
    // Suppress console noise; components fall back to their default empty state.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[marketService] fetchQuotes skipped:', err?.message || err);
    }
    return [];
  }
}

/** Fetch live quotes for indices, commodities, FX symbols. */
export async function fetchMarketQuotes(symbols) {
  return fetchQuotes(symbols);
}

async function fetchStocksWithPrices({ exchangeFilter, limit = 80, sortByChange = false }) {
  let stockQuery = supabase
    .from('stocks')
    .select('symbol, name, exchange, display_order')
    .eq('is_active', true);

  if (exchangeFilter) {
    stockQuery = stockQuery.in('exchange', exchangeFilter);
  }

  const [{ data: stocks }, { data: cache }] = await Promise.all([
    stockQuery.order('display_order', { ascending: true }).limit(limit),
    supabase.from('stock_prices_cache').select('symbol, price, change_pct, currency'),
  ]);

  const map = {};
  (cache ?? []).forEach((c) => {
    map[c.symbol] = c;
  });

  const rows = (stocks ?? [])
    .map((s) => ({
      name: s.name,
      symbol: s.symbol,
      exchange: s.exchange,
      displayOrder: s.display_order ?? 9999,
      price: map[s.symbol]?.price != null ? Number(map[s.symbol].price) : null,
      changePct: map[s.symbol]?.change_pct != null ? Number(map[s.symbol].change_pct) : null,
      currency: map[s.symbol]?.currency ?? 'EUR',
    }))
    .filter((r) => r.price != null && r.changePct != null);

  if (sortByChange) {
    return rows.sort((a, b) => Number(b.changePct) - Number(a.changePct));
  }
  return rows.sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function fetchMarketIndices() {
  try {
    const quotes = await fetchQuotes(MARKET_INDICES.map((i) => i.symbol));
    return mapQuotesToConfig(quotes, MARKET_INDICES);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[fetchMarketIndices]', err);
    }
    return mapQuotesToConfig([], MARKET_INDICES);
  }
}

export async function fetchMarketCommodities() {
  try {
    const quotes = await fetchQuotes(MARKET_COMMODITIES.map((i) => i.symbol));
    return mapQuotesToConfig(quotes, MARKET_COMMODITIES);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[fetchMarketCommodities]', err);
    }
    return mapQuotesToConfig([], MARKET_COMMODITIES);
  }
}

export async function fetchMarketForex() {
  try {
    const quotes = await fetchQuotes(MARKET_FOREX.map((i) => i.symbol));
    return mapQuotesToConfig(quotes, MARKET_FOREX);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[fetchMarketForex]', err);
    }
    return mapQuotesToConfig([], MARKET_FOREX);
  }
}

/** Top % gainers on XETRA / Frankfurt. */
export async function fetchFrankfurtWinners(limit = 12) {
  try {
    const rows = await fetchStocksWithPrices({
      exchangeFilter: ['XETRA', 'FRA'],
      limit: 120,
      sortByChange: true,
    });
    return rows.filter((r) => Number(r.changePct) > 0).slice(0, limit);
  } catch {
    return [];
  }
}

/** Curated „meistgesuchte“ Aktien by display_order. */
export async function fetchFeaturedStocks(limit = 12) {
  try {
    const rows = await fetchStocksWithPrices({
      exchangeFilter: null,
      limit: 60,
      sortByChange: false,
    });
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchTopMovers(limit = 8) {
  try {
    const rows = await fetchStocksWithPrices({
      exchangeFilter: null,
      limit: 80,
      sortByChange: true,
    });
    return rows.slice(0, limit);
  } catch {
    return [];
  }
}

export const formatMarketPrice = (value, { decimals, label } = {}) => {
  if (value == null || Number.isNaN(Number(value))) return '–';
  const n = Number(value);
  const maxDec = decimals ?? (n >= 1000 ? 2 : n >= 100 ? 2 : 4);
  const minDec = decimals ?? (n >= 1000 ? 2 : 2);
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec,
  });
};

export const formatChangePct = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '–';
  const n = Math.abs(Number(value));
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};
