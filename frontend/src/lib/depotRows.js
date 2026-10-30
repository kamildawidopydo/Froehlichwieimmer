// Display-only depot rows built from existing dashboard metrics (no data mutation).
export const buildDepotRows = ({ stockMetrics = [], stockPriceMap = {}, bondPositions = [], computeBondMetrics }) => {
  const stocks = stockMetrics.map((m) => {
    const listed = m.marketPrice != null;
    const ipoUnlisted = (m.isIpoStake || m.isIpoValuation) && !listed;
    const px = stockPriceMap[m.symbol] || {};
    // Daily change only from real market quotes; never for unlisted IPO estimates.
    const dayAbs = !ipoUnlisted && px.change_abs != null ? m.qty * Number(px.change_abs) : null;
    return {
      key: `s-${m.id || m.symbol}`,
      kind: m.isIpoStake || m.isIpoValuation ? 'ipo' : 'stock',
      ipoUnlisted,
      symbol: m.symbol,
      name: m.stockName || m.symbol,
      qty: m.qty,
      avg: m.avg,
      price: m.hasValuation ? m.price : null,
      value: m.marktwert,
      cost: m.einstand,
      gv: m.hasValuation ? m.gv : null,
      pct: m.hasValuation ? m.pct : null,
      dayAbs,
      dayPct: !ipoUnlisted && px.change_pct != null ? Number(px.change_pct) : null,
      logoUrl: m.logoUrl,
    };
  });
  const bonds = bondPositions.map((b) => {
    const bm = computeBondMetrics(b);
    return {
      key: `b-${b.id || b.isin}`,
      kind: 'bond',
      ipoUnlisted: false,
      symbol: b.isin || '–',
      name: b.bond_name || b.isin || 'Anleihe',
      qty: bm.nominal,
      avg: Number(b.kaufkurs || 0),
      price: b.aktueller_kurs != null ? Number(b.aktueller_kurs) : null,
      value: bm.marktwert,
      cost: bm.einstand,
      gv: bm.kursgv,
      pct: bm.rendite,
      dayAbs: null,
      dayPct: null,
    };
  });
  const rows = [...stocks, ...bonds];
  const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
  return rows.map((r) => ({ ...r, weight: total > 0 ? (r.value / total) * 100 : 0 }));
};

export const DEPOT_FILTERS = [
  ['all', 'Alle'],
  ['stock', 'Aktien'],
  ['ipo', 'IPO'],
  ['bond', 'Anleihen'],
  ['win', 'Gewinner'],
  ['loss', 'Verlierer'],
];

const filterFns = {
  all: () => true,
  stock: (r) => r.kind === 'stock',
  ipo: (r) => r.kind === 'ipo',
  bond: (r) => r.kind === 'bond',
  win: (r) => r.gv != null && Math.round(r.gv * 100) > 0,
  loss: (r) => r.gv != null && Math.round(r.gv * 100) < 0,
};

export const filterSortRows = (rows, { filter, query, sortKey, sortDir }) => {
  const q = query.trim().toLowerCase();
  const out = rows.filter(filterFns[filter] || filterFns.all).filter(
    (r) => !q || r.name.toLowerCase().includes(q) || String(r.symbol).toLowerCase().includes(q),
  );
  const dir = sortDir === 'asc' ? 1 : -1;
  return out.sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name, 'de') * dir;
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * dir;
  });
};
