export const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

// Gain/loss colour: green > 0, red < 0, neutral at 0,00 (rounded to cents) or unknown.
const pnlSign = (v) => {
  if (v == null || !Number.isFinite(Number(v))) return 0;
  return Math.sign(Math.round(Number(v) * 100));
};
export const pnlTone = (v) =>
  ({ 1: 'text-bank-success', '-1': 'text-bank-error' }[pnlSign(v)] || 'text-bank-text');
export const pnlBadgeTone = (v) =>
  ({ 1: 'bg-bank-success/10 text-bank-success', '-1': 'bg-bank-error/10 text-bank-error' }[pnlSign(v)] ||
    'bg-bank-bg text-bank-text');

export const formatEURCompact = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const formatEURSigned = (v) => {
  const n = Number(v || 0);
  const sign = n >= 0 ? '+' : '';
  return sign + n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
};

export const formatPctSigned = (v) => {
  const n = Number(v || 0);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)} %`;
};

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '–';

const toCalendarDayUtc = (value) => {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const daysBetween = (a, b) => {
  const da = toCalendarDayUtc(a);
  const db = toCalendarDayUtc(b);
  if (da == null || db == null) return 0;
  return Math.floor((db - da) / 86400000);
};
