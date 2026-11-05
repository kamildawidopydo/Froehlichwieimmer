import { getPositionLogoCandidates } from '@/lib/ipoLogo';
import { normalizeStockSymbolForLogo } from '@/lib/logoShared';

export { normalizeStockSymbolForLogo };

function isBrokenDbLogo(url) {
  const u = String(url || '').trim();
  if (!u) return true;
  return /logo\.clearbit\.com/i.test(u);
}

function basicStockCandidates(symbol, dbLogoUrl) {
  const candidates = [];
  const trimmed = String(dbLogoUrl || '').trim();
  if (trimmed && !isBrokenDbLogo(trimmed)) candidates.push(trimmed);
  const key = normalizeStockSymbolForLogo(symbol);
  if (key) {
    candidates.push(`https://financialmodelingprep.com/image-stock/${key}.png`);
  }
  return candidates;
}

/** IPO depot positions use extended resolver; listed stocks use DB + FMP only. */
export function getStockLogoCandidates(symbol, dbLogoUrl, opts = {}) {
  const sym = String(symbol || '').trim();
  const basic = basicStockCandidates(sym, dbLogoUrl);

  const ipoLike =
    sym.startsWith('IPO-') ||
    opts.isTradable === false ||
    opts.isIpoDepot === true;

  if (!ipoLike) {
    return [...new Set(basic)];
  }

  const extended = getPositionLogoCandidates({
    symbol: sym,
    name: opts.name,
    logoUrl: dbLogoUrl,
    exchange: opts.exchange,
    market: opts.market,
  });

  return [...new Set([...extended, ...basic])];
}

export function getStockLogoUrl(symbol, dbLogoUrl, opts) {
  return getStockLogoCandidates(symbol, dbLogoUrl, opts)[0] || null;
}
