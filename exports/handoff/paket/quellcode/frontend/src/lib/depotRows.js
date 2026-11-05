// Display-only depot rows built from existing dashboard metrics (no data mutation).
export const buildDepotRows = ({ stockMetrics = [], stockPriceMap = {}, bondPositions = [], computeBondMetrics }) => {
  const stocks = stockMetrics.map((m) => {
    const listed = m.marketPrice != null;
    const ipoUnlisted = (m.isIpoStake || m.isIpoValuation) && !listed;
    const px = stockPriceMap[m.symbol] || {};
    // Price comes from a real exchange quote (not from an IPO estimate).
    const priceIsMarket = listed && m.ipoListingPerLot == null;
    const dayAbs = priceIsMarket && px.change_abs != null ? m.qty * Number(px.change_abs) : null;
    return {
      key: `s-${m.id || m.symbol}`,
      kind: m.isIpoStake || m.isIpoValuation ? 'ipo' : 'stock',
      ipoUnlisted,
      fallback: !m.hasValuation,
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
      dayPct: priceIsMarket && px.change_pct != null ? Number(px.change_pct) : null,
      priceIsMarket,
      logoUrl: m.logoUrl,
    };
  });
  const bonds = bondPositions.map((b) => {
    const bm = computeBondMetrics(b);
    const fallback = !!b.kurs_is_fallback;
    return {
      key: `b-${b.id || b.isin}`,
      kind: 'bond',
      ipoUnlisted: false,
      fallback,
      symbol: b.isin || '–',
      name: b.bond_name || b.isin || 'Anleihe',
      qty: bm.nominal,
      avg: Number(b.kaufkurs || 0),
      price: !fallback && b.aktueller_kurs != null ? Number(b.aktueller_kurs) : null,
      value: bm.marktwert,
      cost: bm.einstand,
      gv: fallback ? null : bm.kursgv,
      pct: fallback ? null : bm.rendite,
      dayAbs: null,
      dayPct: null,
      priceIsMarket: false,
    };
  });
  const rows = [...stocks, ...bonds];
  const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
  return rows.map((r) => ({ ...r, weight: total > 0 ? (r.value / total) * 100 : 0 }));
};

export const pctTxt = (v) =>
  v == null ? '–' : `${Math.round(v * 100) > 0 ? '+' : ''}${(Math.round(v * 100) === 0 ? 0 : Number(v)).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const sumBy = (list, k) => list.reduce((s, r) => s + (Number(r[k]) || 0), 0);
const pctOf = (gv, cost) => (cost > 0 ? (gv / cost) * 100 : null);

// Single source for all depot KPIs (same rows, same price snapshot).
export const computeDepotTotals = (rows) => {
  const valued = rows.filter((r) => r.gv != null);
  const listed = valued.filter((r) => r.kind !== 'ipo');
  const ipo = valued.filter((r) => r.kind === 'ipo');
  const dayRows = rows.filter((r) => r.dayAbs != null);
  const day = sumBy(dayRows, 'dayAbs');
  const dayBase = sumBy(dayRows, 'value') - day;
  const gv = sumBy(valued, 'gv');
  const listedGv = sumBy(listed, 'gv');
  const ipoGv = sumBy(ipo, 'gv');
  return {
    value: sumBy(rows, 'value'),
    cost: sumBy(rows, 'cost'),
    gv,
    gvPct: pctOf(gv, sumBy(valued, 'cost')),
    listedGv,
    listedGvPct: pctOf(listedGv, sumBy(listed, 'cost')),
    ipoGv,
    ipoGvPct: pctOf(ipoGv, sumBy(ipo, 'cost')),
    hasValued: valued.length > 0,
    hasListed: listed.length > 0,
    hasIpo: ipo.length > 0,
    unvaluedCount: rows.length - valued.length,
    day: dayRows.length ? day : null,
    dayPct: dayRows.length && dayBase > 0 ? (day / dayBase) * 100 : null,
    dayCount: dayRows.length,
    count: rows.length,
  };
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
