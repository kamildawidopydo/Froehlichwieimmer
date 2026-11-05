const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export const yearsRemaining = (b) => {
  if (b?.is_perpetual) return Infinity;
  if (!b?.faelligkeitsdatum) return null;
  return (new Date(b.faelligkeitsdatum).getTime() - Date.now()) / YEAR_MS;
};

export const formatDePct = (value, digits = 2) => {
  if (value == null || !Number.isFinite(Number(value))) return '–';
  return `${Number(value).toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
};

export const formatSigned = (value, digits = 2, suffix = '') => {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  const sign = n > 0 ? '+' : n < 0 ? '−' : '±';
  return `${sign}${Math.abs(n).toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
};

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

const couponVariants = (k) => {
  if (k == null || !Number.isFinite(Number(k))) return [];
  const n = Number(k);
  return [0, 1, 2, 3].map((d) => n.toFixed(d)).flatMap((s) => [s, s.replace('.', ',')]).map((s) => `${s}%`);
};

export const matchesBondSearch = (b, query) => {
  const q = norm(query);
  if (!q) return true;
  const hay = [b.bond_name, b.isin, b.issuer, b.wkn, b.legal_issuer, ...couponVariants(b.kupon_rate)]
    .map(norm)
    .join('|');
  return hay.includes(q) || hay.includes(q.replace(/%$/, ''));
};

export const currentYield = (b) => {
  const k = Number(b?.kupon_rate);
  const p = Number(b?.aktueller_kurs);
  return k > 0 && p > 0 ? k / (p / 100) : null;
};

export const isReferencePrice = (b) => b?.kurs_typ === 'reference';
