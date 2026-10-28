const abs = (n) => Math.abs(n);
const eurFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const pctFmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatEur = (n) => eurFmt.format(n);

export const computeValueChange = (entry, estimate) => {
  if (entry == null || estimate == null || !(entry > 0)) return null;
  const diff = Math.round((estimate - entry) * 100) / 100;
  return { diff, pct: Math.round((diff / entry) * 10000) / 100 };
};

const sign = (n) => (n > 0 ? '+' : n < 0 ? '\u2212' : '');

export const changeLabel = ({ diff, pct }) => ({
  eur: `${sign(diff)}${eurFmt.format(abs(diff))} pro Aktie`,
  pct: `${sign(pct)}${pctFmt.format(abs(pct))} %`,
  tone: diff > 0 ? 'text-emerald-700 keep-raw' : diff < 0 ? 'text-red-600' : 'text-bank-text-muted',
});
