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

export const pctDe = (v, min = 0, max = 3) =>
  v == null || !Number.isFinite(Number(v))
    ? '–'
    : `${Number(v).toLocaleString('de-DE', { minimumFractionDigits: min, maximumFractionDigits: max })} %`;

export const eurDe = (v) =>
  v == null || !Number.isFinite(Number(v))
    ? '–'
    : Number(v).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

export const dateDe = (v) =>
  v ? new Date(v).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';

export const dateTimeDe = (v) =>
  v
    ? new Date(v).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '–';

export const parseDeNumber = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(
    s.includes(',')
      ? s.replace(/\./g, '').replace(',', '.')
      : /^\d{1,3}(\.\d{3})+$/.test(s)
        ? s.replace(/\./g, '')
        : s,
  );
  return Number.isFinite(n) ? n : null;
};
