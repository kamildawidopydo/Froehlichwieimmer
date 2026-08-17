export function extractDomainFromUrl(url: string | null): string | null {
  const raw = String(url || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, '') || null;
  } catch {
    return null;
  }
}

export function normalizeTickerForLogo(ticker: string | null): string {
  const raw = String(ticker || '').trim().toUpperCase();
  if (!raw) return '';
  return raw.split('.')[0] || raw;
}

function exchangeSuffix(exchange: string | null, market: string | null): string {
  const ex = `${exchange || ''} ${market || ''}`.toLowerCase();
  if (ex.includes('paris') || ex.includes('euronext')) return '.PA';
  if (ex.includes('amsterdam')) return '.AS';
  if (ex.includes('frankfurt') || ex.includes('xetra')) return '.DE';
  if (ex.includes('london') || ex.includes('lse')) return '.L';
  return '';
}

/** FMP (with EU suffix when applicable) or unavatar from company website. */
export function resolveIpoLogoUrl(
  ticker: string | null,
  prospectusUrl: string | null,
  exchange: string | null = null,
  market: string | null = null,
): string | null {
  const key = normalizeTickerForLogo(ticker);
  if (key) {
    const suffix = exchangeSuffix(exchange, market);
    return `https://financialmodelingprep.com/image-stock/${key}${suffix}.png`;
  }
  const domain = extractDomainFromUrl(prospectusUrl);
  if (domain) {
    return `https://unavatar.io/${domain}?fallback=false`;
  }
  return null;
}
