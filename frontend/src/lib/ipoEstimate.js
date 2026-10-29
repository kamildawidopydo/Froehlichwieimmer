// Estimated IPO valuation in EUR using integer cents (same formula as the backend).
const toCents = (v) => {
  if (v == null) return null;
  const s = String(v).trim().replace(/\s|€/g, '');
  if (!s) return null;
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  if (!/^\d+(\.\d+)?$/.test(norm)) return null;
  const [i, f = ''] = norm.split('.');
  const cents = Number(i) * 100 + Number((f + '000').slice(0, 3)) / 10;
  const r = Math.round(cents);
  return r > 0 ? r : null;
};

export const parseEurInput = (v) => {
  const c = toCents(v);
  return c == null ? null : c / 100;
};

export const computeIpoEstimate = ({ shares, purchasePrice, estimatedValue }) => {
  const n = Number.parseInt(String(shares ?? '').trim(), 10);
  const qty = Number.isInteger(n) && n > 0 ? n : null;
  const p = toCents(purchasePrice);
  const e = toCents(estimatedValue);
  const cost = qty && p != null ? qty * p : null;
  const total = qty && e != null ? qty * e : null;
  const profit = cost != null && total != null ? total - cost : null;
  return {
    shares: qty,
    totalCost: cost != null ? cost / 100 : null,
    estimatedTotal: total != null ? total / 100 : null,
    profit: profit != null ? profit / 100 : null,
    returnPct: profit != null && cost ? Math.round((profit / cost) * 10000) / 100 : null,
  };
};

export const fromBackendValuation = (v) => {
  if (!v) return null;
  const num = (x) => (x == null ? null : Number(x));
  return {
    shares: v.shares ?? null,
    sharesBasis: v.shares_basis,
    purchasePrice: num(v.purchase_price_per_share),
    estimatedValue: num(v.estimated_value_per_share),
    totalCost: num(v.total_cost),
    estimatedTotal: num(v.estimated_total),
    profit: num(v.estimated_profit),
    returnPct: num(v.estimated_return_pct),
  };
};

export const toneClass = (n) =>
  n == null || n === 0 ? 'text-bank-text' : n > 0 ? 'text-emerald-700' : 'text-rose-700';

const eur = (n) => Number(n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
export const fmtEurPlain = (n) => (n == null ? '–' : eur(n));
export const fmtEurSigned = (n) => (n == null ? '–' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${eur(Math.abs(n))}`);
export const fmtPctSigned = (n) =>
  n == null
    ? '–'
    : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

export const IPO_ESTIMATE_DISCLAIMER =
  'Die dargestellten Werte beruhen auf einer geschätzten Bewertung. Gewinne und Verluste sind nicht realisiert und können vom späteren Börsenkurs abweichen.';
