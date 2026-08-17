/** Shared symbol normalization for stock + IPO logo CDNs. */
export function normalizeStockSymbolForLogo(symbol) {
  const raw = String(symbol || '').trim().toUpperCase();
  if (!raw) return '';
  const base = raw.split('.')[0];
  return base || raw;
}
