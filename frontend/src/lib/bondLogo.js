import { extractDomainFromUrl } from '@/lib/ipoLogo';
import eonBundledLogo from '@/assets/bond-logos/eon.png';

/** Vite/CRA-bundled logos — always available in dev + production builds. */
const BUNDLED_LOGO_BY_ISIN = {
  XS2639220164: eonBundledLogo,
};

const EON_LOGO_URL = eonBundledLogo;

/** Self-hosted issuer logos (see scripts/download-bond-logos.mjs). */
export const CURATED_BOND_LOGO_ASSETS = {
  'bundesrepublik deutschland': '/assets/bond-logos/de.png',
  'republique francaise': '/assets/bond-logos/fr.png',
  'repubblica italiana': '/assets/bond-logos/it.png',
  'reino de espana': '/assets/bond-logos/es.png',
  'royaume de belgique': '/assets/bond-logos/be.png',
  'republik osterreich': '/assets/bond-logos/at.png',
  'koninkrijk der nederlanden': '/assets/bond-logos/nl.png',
  'volkswagen leasing': '/assets/bond-logos/volkswagen.png',
  'mercedes-benz group': '/assets/bond-logos/mercedes-benz.png',
  'bmw finance': '/assets/bond-logos/bmw.png',
  'basf se': '/assets/bond-logos/basf.png',
  siemens: '/assets/bond-logos/siemens.png',
  'allianz se': '/assets/bond-logos/allianz.png',
  'deutsche bank': '/assets/bond-logos/deutsche-bank.png',
  'bnp paribas': '/assets/bond-logos/bnp-paribas.png',
  'ing groep': '/assets/bond-logos/ing.png',
  unicredit: '/assets/bond-logos/unicredit.png',
  santander: '/assets/bond-logos/santander.png',
  vodafone: '/assets/bond-logos/vodafone.png',
  'deutsche telekom': '/assets/bond-logos/deutsche-telekom.png',
  telefonica: '/assets/bond-logos/telefonica.png',
  enel: '/assets/bond-logos/enel.png',
  iberdrola: '/assets/bond-logos/iberdrola.png',
  engie: '/assets/bond-logos/engie.png',
  'e on': EON_LOGO_URL,
  thyssenkrupp: '/assets/bond-logos/thyssenkrupp.png',
  edf: '/assets/bond-logos/edf.png',
  lvmh: '/assets/bond-logos/lvmh.png',
  sanofi: '/assets/bond-logos/sanofi.png',
  bayer: '/assets/bond-logos/bayer.png',
  heineken: '/assets/bond-logos/heineken.png',
  'anheuser-busch inbev': '/assets/bond-logos/ab-inbev.png',
};

const SOVEREIGN_FLAG_CODES = {
  'bundesrepublik deutschland': 'de',
  'republique francaise': 'fr',
  'repubblica italiana': 'it',
  'reino de espana': 'es',
  'royaume de belgique': 'be',
  'republik osterreich': 'at',
  'koninkrijk der nederlanden': 'nl',
};

/** Issuer substring → corporate website domain. */
const ISSUER_DOMAIN_OVERRIDES = {
  'volkswagen leasing': 'volkswagen.com',
  'mercedes-benz group': 'mercedes-benz.com',
  'bmw finance': 'bmw.com',
  'basf se': 'basf.com',
  'siemens financieringsmaatschappij': 'siemens.com',
  siemens: 'siemens.com',
  thyssenkrupp: 'thyssenkrupp.com',
  'allianz se': 'allianz.com',
  'deutsche bank': 'db.com',
  'bnp paribas': 'bnpparibas.com',
  'ing groep': 'ing.com',
  unicredit: 'unicreditgroup.eu',
  santander: 'santander.com',
  'vodafone group': 'vodafone.com',
  'deutsche telekom': 'telekom.com',
  'telefonica emisiones': 'telefonica.com',
  telefonica: 'telefonica.com',
  'enel finance': 'enel.com',
  enel: 'enel.com',
  'electricite de france': 'edf.fr',
  'électricité de france': 'edf.fr',
  edf: 'edf.fr',
  iberdrola: 'iberdrola.com',
  engie: 'engie.com',
  'e on': 'eon.com',
  lvmh: 'lvmh.com',
  sanofi: 'sanofi.com',
  'bayer ag': 'bayer.com',
  bayer: 'bayer.com',
  heineken: 'heineken.com',
  'anheuser-busch inbev': 'ab-inbev.com',
  'bundesrepublik deutschland': 'bundesregierung.de',
  'republique francaise': 'gouvernement.fr',
  'repubblica italiana': 'governo.it',
  'reino de espana': 'boe.es',
  'royaume de belgique': 'belgium.be',
  'republik osterreich': 'bundeskanzleramt.gv.at',
  'koninkrijk der nederlanden': 'government.nl',
};

/** Issuer / bond name substring → FMP ticker for reliable corporate logos. */
const ISSUER_FMP_TICKERS = {
  thyssenkrupp: 'TKA.DE',
  'e on': 'EOAN.DE',
  edf: 'EDF.PA',
  'electricite de france': 'EDF.PA',
};

const LEGAL_SUFFIX =
  /^(inc|incorporated|ltd|limited|llc|plc|corp|corporation|holdings|co|company|group|sa|nv|ag|gmbh|iii|ii|iv|spa|s\.p\.a\.?|sau|se)$/i;

function normalizeIssuerKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isBrokenLogoUrl(url) {
  const u = String(url || '').trim();
  if (!u) return true;
  return /logo\.clearbit\.com/i.test(u);
}

function domainLogoCandidates(domain) {
  if (!domain) return [];
  return [
    `https://unavatar.io/${domain}?fallback=false`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
}

function isEonBond(issuer, bondName) {
  const raw = `${issuer || ''} ${bondName || ''}`.toLowerCase();
  return /\be\.?\s*o\.?\s*n\b/.test(raw);
}

function resolveCuratedAsset(issuer, bondName) {
  const keys = [normalizeIssuerKey(issuer), normalizeIssuerKey(bondName)].filter(Boolean);
  for (const key of keys) {
    for (const [needle, asset] of Object.entries(CURATED_BOND_LOGO_ASSETS)) {
      if (key.includes(needle)) return asset;
    }
  }
  return null;
}

function resolveFmpTicker(issuer, bondName) {
  const keys = [normalizeIssuerKey(issuer), normalizeIssuerKey(bondName)].filter(Boolean);
  for (const key of keys) {
    for (const [needle, ticker] of Object.entries(ISSUER_FMP_TICKERS)) {
      if (key.includes(needle)) return ticker;
    }
  }
  return null;
}

function fmpLogoUrl(ticker) {
  if (!ticker) return null;
  return `https://financialmodelingprep.com/image-stock/${ticker}.png`;
}

function resolveSovereignFlag(issuer) {
  const key = normalizeIssuerKey(issuer);
  for (const [needle, code] of Object.entries(SOVEREIGN_FLAG_CODES)) {
    if (key.includes(needle)) return `https://flagcdn.com/w80/${code}.png`;
  }
  return null;
}

function resolveIssuerDomains(issuer) {
  const key = normalizeIssuerKey(issuer);
  const domains = [];
  for (const [needle, domain] of Object.entries(ISSUER_DOMAIN_OVERRIDES)) {
    if (key.includes(needle)) domains.push(domain);
  }
  return [...new Set(domains)];
}

function guessDomainsFromIssuer(issuer) {
  const words = String(issuer || '')
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

/** Best-effort logo URL list for a bond catalog entry or user position. */
export function getBondLogoCandidates(bond) {
  const candidates = [];

  const isin = String(bond?.isin || '').trim().toUpperCase();
  if (BUNDLED_LOGO_BY_ISIN[isin]) candidates.push(BUNDLED_LOGO_BY_ISIN[isin]);
  if (isEonBond(bond?.issuer, bond?.bond_name)) candidates.push(EON_LOGO_URL);

  const dbUrl = String(bond?.logo_url || '').trim();
  if (dbUrl && !isBrokenLogoUrl(dbUrl)) candidates.push(dbUrl);

  const curated = resolveCuratedAsset(bond?.issuer, bond?.bond_name);
  if (curated) candidates.push(curated);

  const fmpTicker = resolveFmpTicker(bond?.issuer, bond?.bond_name);
  const fmpUrl = fmpLogoUrl(fmpTicker);
  if (fmpUrl) candidates.push(fmpUrl);

  const flag = resolveSovereignFlag(bond?.issuer);
  if (flag) candidates.push(flag);

  const fromUrl = extractDomainFromUrl(bond?.logo_url);
  if (fromUrl) candidates.push(...domainLogoCandidates(fromUrl));

  const domains = [
    ...resolveIssuerDomains(bond?.issuer),
    ...guessDomainsFromIssuer(bond?.issuer),
  ];
  for (const domain of [...new Set(domains)]) {
    candidates.push(...domainLogoCandidates(domain));
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function getBondIssuerInitials(bond) {
  const issuer = String(bond?.issuer || '').trim();
  if (issuer) {
    const parts = issuer
      .split(/\s+/)
      .map((p) => p.replace(/[.,]/g, ''))
      .filter((p) => p.length > 0 && !LEGAL_SUFFIX.test(p));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  }

  const name = String(bond?.bond_name || '').trim();
  if (name) {
    const first = name.split(/\s+/).find((w) => w.length > 1);
    if (first) return first.slice(0, 2).toUpperCase();
  }

  const isin = String(bond?.isin || '').trim();
  if (isin.length >= 2) return isin.slice(0, 2).toUpperCase();

  return 'AN';
}
