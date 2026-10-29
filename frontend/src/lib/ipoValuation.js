import { convertFx } from '@/services/forexService';

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeCurrency = (currency) => String(currency || 'EUR').trim().toUpperCase() || 'EUR';

/**
 * Derive per-share subscription price from EUR volume and IPO price currency.
 * @param {number} amountEur
 * @param {number} shares
 * @param {string} [priceCurrency]
 * @param {Record<string, number|null>} [eurRates] units of currency per 1 EUR
 */
export const deriveSubscriptionFromVolume = (amountEur, shares, priceCurrency = 'EUR', eurRates = null) => {
  const qty = toNumber(shares);
  const amt = toNumber(amountEur);
  if (qty == null || qty <= 0 || amt == null || amt <= 0) return null;

  const cur = normalizeCurrency(priceCurrency);
  if (cur === 'EUR') return amt / qty;

  if (!eurRates || eurRates[cur] == null || eurRates[cur] <= 0) return null;

  const totalInIpoCurrency = convertFx(amt, 'EUR', cur, eurRates);
  if (totalInIpoCurrency == null) return null;
  return totalInIpoCurrency / qty;
};

/**
 * Convert absolute profit from IPO currency to EUR for customer-facing display.
 */
export const profitToEur = (profitAbs, priceCurrency = 'EUR', eurRates = null) => {
  const amount = toNumber(profitAbs);
  if (amount == null) return null;

  const cur = normalizeCurrency(priceCurrency);
  if (cur === 'EUR') return amount;
  if (!eurRates) return null;

  return convertFx(amount, cur, 'EUR', eurRates);
};

/**
 * Compute IPO subscription valuation (subscription vs listing price / profit %).
 * Mirrors DB logic in _ipo_resolve_valuation.
 *
 * @param {object} opts
 * @param {number} opts.shares
 * @param {number} [opts.subscriptionPrice]
 * @param {number} [opts.amountEur] — used when subscriptionPrice omitted
 * @param {number} [opts.listingPrice]
 * @param {number} [opts.profitPct]
 * @param {string} [opts.priceCurrency] — IPO catalog currency (EUR, USD, …)
 * @param {Record<string, number|null>} [opts.eurRates] — live FX rates (units per 1 EUR)
 * @returns {object|null} null when inputs insufficient
 */
export const computeIpoValuation = ({
  shares,
  subscriptionPrice,
  amountEur,
  listingPrice,
  profitPct,
  priceCurrency = 'EUR',
  eurRates = null,
} = {}) => {
  const qty = toNumber(shares);
  if (qty == null || qty <= 0) return null;

  const cur = normalizeCurrency(priceCurrency);

  let sub = toNumber(subscriptionPrice);
  if (sub == null || sub <= 0) {
    const derived = deriveSubscriptionFromVolume(amountEur, qty, cur, eurRates);
    if (derived != null && derived > 0) sub = derived;
  }
  if (sub == null || sub <= 0) return null;

  const listingIn = toNumber(listingPrice);
  const profitIn = toNumber(profitPct);

  let listing = listingIn;
  let profit = profitIn;

  if (listing != null && listing > 0) {
    profit = ((listing - sub) / sub) * 100;
  } else if (profitIn != null && profitIn >= 0) {
    listing = sub * (1 + profitIn / 100);
  } else {
    return null;
  }

  const costBasis = qty * sub;
  const marketValue = qty * listing;
  const profitAbs = marketValue - costBasis;
  const profitPctResolved = costBasis > 0 ? (profitAbs / costBasis) * 100 : 0;
  const profitAbsEur = profitToEur(profitAbs, cur, eurRates) ?? (cur === 'EUR' ? profitAbs : null);

  return {
    shares: qty,
    subscriptionPrice: sub,
    listingPrice: listing,
    profitMarginPct: profit,
    costBasis,
    marketValue,
    profitAbs,
    profitAbsEur,
    profitPct: profitPctResolved,
    priceCurrency: cur,
  };
};

/**
 * Resolve stock symbol for an IPO request (DB position_symbol or catalog fallback).
 */
export const resolveIpoPositionSymbol = (request) => {
  if (!request) return null;
  const stored = String(request.position_symbol || '').trim().toUpperCase();
  if (stored) return stored;

  const ticker = String(request.ticker || '').trim().toUpperCase();
  if (ticker) {
    return ticker.startsWith('IPO-') ? ticker : `IPO-${ticker}`;
  }

  const slug = String(request.company_name || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 12);
  return slug ? `IPO-${slug}` : null;
};

/**
 * Build position_symbol → valuation map from approved IPO requests.
 * When multiple requests share a symbol, the latest valuation_set_at wins.
 */
export const buildIpoValuationMap = (requests = []) => {
  const map = {};
  const sorted = [...requests]
    .filter((r) => {
      if (!['approved', 'allocated'].includes(r.status) || r.use_admin_valuation === false) return false;
      const listing = toNumber(r.listing_price_per_share);
      return listing != null && listing > 0 && !!resolveIpoPositionSymbol(r);
    })
    .sort((a, b) => {
      const ta = a.valuation_set_at || a.approved_at || a.created_at || '';
      const tb = b.valuation_set_at || b.approved_at || b.created_at || '';
      return String(ta).localeCompare(String(tb));
    });

  sorted.forEach((r) => {
    const sym = resolveIpoPositionSymbol(r);
    const listing = toNumber(r.listing_price_per_share);
    if (!sym || listing == null || listing <= 0) return;
    const entry = {
      listingPrice: listing,
      subscriptionPrice: toNumber(r.subscription_price_per_share),
      profitMarginPct: toNumber(r.profit_margin_pct),
      requestId: r.id,
      valuationSetAt: r.valuation_set_at,
      companyName: r.company_name || null,
      allocationDate: r.allocation_date || null,
    };
    map[sym] = entry;
    // Allocation stores the position under the plain ticker.
    const ticker = String(r.ticker || '').trim().toUpperCase();
    if (ticker) map[ticker] = entry;
  });

  return map;
};

/** Serialize live EUR-based rates for Supabase RPC (jsonb). */
export const fxRatesToRpcPayload = (eurRates) => {
  if (!eurRates) return null;
  const out = { EUR: 1 };
  for (const [code, rate] of Object.entries(eurRates)) {
    if (code === 'EUR') continue;
    const n = Number(rate);
    if (Number.isFinite(n) && n > 0) out[code] = n;
  }
  return Object.keys(out).length > 1 ? out : null;
};
