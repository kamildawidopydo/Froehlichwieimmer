import { normalizeStockSymbolForLogo } from '@/lib/logoShared';

/** Self-hosted / stable URLs for curated pre-IPO entries. */
export const CURATED_IPO_LOGO_ASSETS = {
  'sec_filed:openai': '/assets/ipo-logos/openai.svg',
  'sec_filed:anthropic': '/assets/ipo-logos/anthropic.svg',
  'sec_filed:discord': '/assets/ipo-logos/discord.svg',
  'sec_filed:kraken': '/assets/ipo-logos/kraken.png',
  'manual:stripe': '/assets/ipo-logos/stripe.svg',
  'manual:canva': '/assets/ipo-logos/canva.png',
  'manual:xai': '/assets/ipo-logos/xai.svg',
  'manual:revolut': '/assets/ipo-logos/revolut.png',
  'manual:anduril': '/assets/ipo-logos/anduril.png',
  'manual:databricks': '/assets/ipo-logos/databricks.png',
  'manual:figure-ai': '/assets/ipo-logos/figure-ai.png',
};

/** Scraped IPO tickers with verified local logos. */
export const TICKER_IPO_LOGO_ASSETS = {
  ITG: '/assets/ipo-logos/itg.png',
};

/** Ticker or normalized company name → website domain (pre-IPO / SPAC). */
const COMPANY_DOMAIN_OVERRIDES = {
  lime: 'li.me',
  bsp: 'bendingspoons.com',
  aac: 'aresacquisitioncorp.com',
  itg: 'itgcomm.com',
  spcx: 'spacex.com',
  spacex: 'spacex.com',
  anduril: 'anduril.com',
  openai: 'openai.com',
  anthropic: 'anthropic.com',
  discord: 'discord.com',
  kraken: 'kraken.com',
  databricks: 'databricks.com',
  stripe: 'stripe.com',
  canva: 'canva.com',
  waymo: 'waymo.com',
  revolut: 'revolut.com',
  'figure-ai': 'figure.ai',
  'bending spoons': 'bendingspoons.com',
  'neutron holdings': 'li.me',
  'ares acquisition': 'aresacquisitioncorp.com',
  'itg, inc': 'itgcomm.com',
  'itg inc': 'itgcomm.com',
  'space exploration technologies': 'spacex.com',
  'anduril industries': 'anduril.com',
  'le slip francais': 'leslipfrancais.fr',
};

const LEGAL_SUFFIX =
  /^(inc|incorporated|ltd|limited|llc|plc|corp|corporation|holdings|co|company|group|sa|nv|ag|gmbh|iii|ii|iv|spa|s\.p\.a\.?)$/i;

export function extractDomainFromUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return u.hostname.replace(/^www\./i, '') || null;
  } catch {
    return null;
  }
}

function isBrokenLogoUrl(url) {
  const u = String(url || '').trim();
  if (!u) return true;
  if (/logo\.clearbit\.com/i.test(u)) return true;
  // Old wiki photo pulls (not logos)
  if (/wikimedia\.org.*Close_shot_of_Anduril/i.test(u)) return true;
  if (u.endsWith('/anduril.jpg') || u.includes('ipo-logos/anduril.jpg')) return true;
  return false;
}

function normalizeCompanyKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[.,']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessDomainsFromCompanyName(companyName) {
  const key = normalizeCompanyKey(companyName);
  for (const [needle, domain] of Object.entries(COMPANY_DOMAIN_OVERRIDES)) {
    if (key.includes(needle)) return [domain];
  }

  const words = String(companyName || '')
    .split(/\s+/)
    .map((w) => w.replace(/[.,]/g, ''))
    .filter((w) => w.length > 1 && !LEGAL_SUFFIX.test(w));

  if (words.length === 0) return [];

  const slug = words
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .join('');
  if (slug.length < 4) return [];

  const domains = [`${slug}.com`];
  if (words.length >= 2) {
    const two = words
      .slice(0, 2)
      .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
      .join('');
    if (two.length >= 4) domains.push(`${two}.com`);
  }
  return [...new Set(domains)];
}

function exchangeSuffix(ipo) {
  const ex = `${ipo?.exchange || ''} ${ipo?.market || ''}`.toLowerCase();
  if (ex.includes('paris') || ex.includes('euronext')) return '.PA';
  if (ex.includes('amsterdam')) return '.AS';
  if (ex.includes('brussels')) return '.BR';
  if (ex.includes('frankfurt') || ex.includes('xetra')) return '.DE';
  if (ex.includes('london') || ex.includes('lse')) return '.L';
  if (ex.includes('milan')) return '.MI';
  return '';
}

function fmpLogoUrl(symbol, suffix = '') {
  const key = normalizeStockSymbolForLogo(symbol);
  if (!key) return null;
  return `https://financialmodelingprep.com/image-stock/${key}${suffix}.png`;
}

function domainLogoCandidates(domain) {
  if (!domain) return [];
  return [
    `https://unavatar.io/${domain}?fallback=false`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
}

function resolveDomains(ipo) {
  const domains = [];
  const fromUrl = extractDomainFromUrl(ipo?.prospectus_url);
  if (fromUrl) domains.push(fromUrl);

  const ticker = String(ipo?.ticker_proposed || '').toLowerCase();
  if (ticker && COMPANY_DOMAIN_OVERRIDES[ticker]) {
    domains.push(COMPANY_DOMAIN_OVERRIDES[ticker]);
  }

  const slug = String(ipo?.external_key || '').split(':').pop()?.toLowerCase();
  if (slug && COMPANY_DOMAIN_OVERRIDES[slug]) {
    domains.push(COMPANY_DOMAIN_OVERRIDES[slug]);
  }

  domains.push(...guessDomainsFromCompanyName(ipo?.company_name));
  return [...new Set(domains.filter(Boolean))];
}

/** Best-effort logo URL list (first match wins in IpoLogo). */
export function getIpoLogoCandidates(ipo) {
  const candidates = [];
  const curated = CURATED_IPO_LOGO_ASSETS[ipo?.external_key];
  if (curated) candidates.push(curated);

  const key = normalizeStockSymbolForLogo(ipo?.ticker_proposed);
  const tickerAsset = key ? TICKER_IPO_LOGO_ASSETS[key] : null;
  if (tickerAsset) candidates.push(tickerAsset);

  // Company website (best for pre-IPO / SPAC before generic FMP placeholders)
  for (const domain of resolveDomains(ipo)) {
    candidates.push(...domainLogoCandidates(domain));
  }

  const ticker = ipo?.ticker_proposed;
  const suffix = exchangeSuffix(ipo);

  if (key) {
    candidates.push(fmpLogoUrl(key));
    if (suffix) candidates.push(fmpLogoUrl(key, suffix));
    candidates.push(`https://img.stockanalysis.com/logos1/US/${key.toLowerCase()}.png`);
    candidates.push(`https://companiesmarketcap.com/img/company-logos/128/${key}.png`);
  }

  const dbUrl = String(ipo?.logo_url || '').trim();
  if (dbUrl && !isBrokenLogoUrl(dbUrl)) candidates.push(dbUrl);

  return [...new Set(candidates)];
}

export function getCompanyInitials(name, ticker) {
  const t = String(ticker || '').trim().toUpperCase();
  if (t && !t.startsWith('IPO-')) return t.slice(0, 4);
  if (t.startsWith('IPO-')) return t.slice(4, 8) || t.slice(0, 4);

  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[.,]/g, ''))
    .filter((p) => p.length > 0 && !LEGAL_SUFFIX.test(p));

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

/** Map depot symbol / company name → curated IPO external_key when possible. */
export function inferExternalKeyFromSymbol(symbol, companyName) {
  const sym = String(symbol || '').trim().toUpperCase();
  if (sym.startsWith('IPO-')) {
    const slug = sym.slice(4).toLowerCase();
    for (const prefix of ['sec_filed', 'manual']) {
      const key = `${prefix}:${slug}`;
      if (CURATED_IPO_LOGO_ASSETS[key]) return key;
    }
    const short = slug.slice(0, 8);
    for (const ek of Object.keys(CURATED_IPO_LOGO_ASSETS)) {
      if (ek.endsWith(`:${short}`) || ek.includes(slug.slice(0, 6))) return ek;
    }
  }

  const nameKey = normalizeCompanyKey(companyName);
  const nameToKey = {
    openai: 'sec_filed:openai',
    anthropic: 'sec_filed:anthropic',
    discord: 'sec_filed:discord',
    kraken: 'sec_filed:kraken',
    databricks: 'manual:databricks',
    stripe: 'manual:stripe',
    canva: 'manual:canva',
    xai: 'manual:xai',
    waymo: 'manual:waymo',
    anduril: 'manual:anduril',
    revolut: 'manual:revolut',
    'figure ai': 'manual:figure-ai',
  };
  for (const [needle, ek] of Object.entries(nameToKey)) {
    if (nameKey.includes(needle)) return ek;
  }
  return null;
}

/** Logo candidates for depot positions (reuses IPO resolver). */
export function getPositionLogoCandidates({ symbol, name, logoUrl, exchange, market }) {
  return getIpoLogoCandidates({
    ticker_proposed: symbol,
    company_name: name,
    logo_url: logoUrl,
    exchange,
    market,
    external_key: inferExternalKeyFromSymbol(symbol, name),
  });
}
