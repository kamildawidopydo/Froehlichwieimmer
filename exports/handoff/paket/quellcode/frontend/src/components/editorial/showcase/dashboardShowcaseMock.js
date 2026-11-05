import {
  computeBondMetrics,
  computeContractMetrics,
  aggregatePortfolio,
} from '@/lib/dashboardMetrics';
import { getStockLogoUrl } from '@/lib/stockLogo';

const noop = async () => {};
const noopSync = () => {};

const CASH = 405;
const CONTRACTS_TOTAL = 100_223;
const BONDS_MARKTWERT = 6_500;
const GESAMT = CASH + 31_950 + CONTRACTS_TOTAL;
const DAILY_PNL = 321;

const STOCK_DEFS = [
  { symbol: 'AAPL', name: 'Apple Inc.', qty: 52, avg: 178.5, price: 192.3, change_pct: 0.42 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', qty: 23, avg: 415.2, price: 428.1, change_pct: 0.18 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', qty: 43, avg: 118.4, price: 131.2, change_pct: -0.05 },
];

function buildHeroSnapshots() {
  const points = [];
  const start = GESAMT * 0.945;
  const weeks = 52;
  for (let i = 0; i < weeks; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    const progress = i / (weeks - 1);
    const wave = Math.sin(i / 4) * 650;
    const total = start + (GESAMT - start) * progress + wave;
    points.push({
      snapshot_date: d.toISOString().slice(0, 10),
      total_value: Math.round(total * 100) / 100,
    });
  }
  return points;
}

function buildStockMetrics() {
  return STOCK_DEFS.map((s) => {
    const marktwert = s.qty * s.price;
    const einstand = s.qty * s.avg;
    const gv = marktwert - einstand;
    const pct = einstand > 0 ? (gv / einstand) * 100 : 0;
    return {
      symbol: s.symbol,
      stockName: s.name,
      logoUrl: getStockLogoUrl(s.symbol, null),
      price: s.price,
      qty: s.qty,
      avg: s.avg,
      marktwert,
      einstand,
      gv,
      pct,
    };
  });
}

const mockContracts = [
  {
    id: 'showcase-festgeld',
    is_active: true,
    product_type: 'festgeld',
    amount_eur: 75_000,
    zinssatz: 3.95,
    start_date: '2024-03-01',
    end_date: '2026-03-01',
    banks: { name: 'Klarna Bank', logo_url: null },
  },
  {
    id: 'showcase-tagesgeld',
    is_active: true,
    product_type: 'tagesgeld',
    amount_eur: 15_223,
    zinssatz: 3.25,
    banks: { name: 'TF Bank', logo_url: null },
  },
  {
    id: 'showcase-flexgeld',
    is_active: true,
    product_type: 'flexgeld',
    amount_eur: 10_000,
    zinssatz: 3.6,
    banks: { name: 'BMW Bank', logo_url: null },
  },
];

const mockBonds = [
  {
    id: 'showcase-bond-1',
    is_active: true,
    bond_name: 'Bund 2,5% 2034',
    isin: 'DE0001102484',
    nominal_betrag: 5000,
    aktueller_kurs: 98.5,
    kaufkurs: 97.2,
  },
  {
    id: 'showcase-bond-2',
    is_active: true,
    bond_name: 'Apple 3,25% 2029',
    isin: 'US037833DX78',
    nominal_betrag: 1500,
    aktueller_kurs: 101.2,
    kaufkurs: 99.8,
  },
];

const taxPrefs = {
  allowanceEur: 1000,
  allowanceUsedEur: 0,
  churchTaxEnabled: false,
  churchTaxRate: 9,
};

const stockMetrics = buildStockMetrics();
const depotWert = stockMetrics.reduce((s, r) => s + r.marktwert, 0);
const depotEinstand = stockMetrics.reduce((s, r) => s + r.einstand, 0);
const depotGV = stockMetrics.reduce((s, r) => s + r.gv, 0);
const bondsMarktwert = BONDS_MARKTWERT;
const bondsEinstand = 6_423.5;
const bondsGV = bondsMarktwert - bondsEinstand;
const activeContracts = mockContracts;
const activeBonds = mockBonds;
const portfolioAggregate = aggregatePortfolio(activeContracts, {
  taxPrefs,
  inflationRatePct: null,
  now: new Date(),
});
portfolioAggregate.weightedAvgRate = 3.88;
portfolioAggregate.dailyInterestNetTotal = 10.65;

const stockPriceMap = Object.fromEntries(
  STOCK_DEFS.map((s) => [
    s.symbol,
    { price: s.price, change_pct: s.change_pct, currency: 'USD' },
  ]),
);

const stockPositions = STOCK_DEFS.map((s, i) => ({
  id: `showcase-stock-${i}`,
  symbol: s.symbol,
  quantity: s.qty,
  avg_cost: s.avg,
  stocks: { name: s.name, logo_url: getStockLogoUrl(s.symbol, null) },
}));

/** Static dashboard data for the login-page tablet preview. */
export function buildDashboardShowcaseValue() {
  const computeContractMetricsBound = (contract, extraOpts = {}) =>
    computeContractMetrics(contract, {
      taxPrefs,
      inflationRatePct: null,
      now: new Date(),
      ...extraOpts,
    });

  return {
    loading: false,
    dashboardFetchHadFailure: false,
    cashBalance: CASH,
    cashAvailable: CASH,
    cashUnsettled: 0,
    buyingPower: CASH,
    cashSettlements: [],
    cashHistory: [],
    cashHistoryLoading: false,
    depotContracts: mockContracts,
    depotLoading: false,
    bondPositions: mockBonds,
    bondsLoading: false,
    stockPositions,
    stockCatalog: [],
    stockOrders: [],
    watchlistItems: [],
    stockPriceMap,
    stocksLoading: false,
    stocksRefreshing: false,
    stockPricesUpdatedAt: new Date().toISOString(),
    favorites: [],
    comparisonHistory: [],
    historyOffers: {},
    heroSnapshots: buildHeroSnapshots(),
    supportUnread: 0,
    bondPurchaseRequests: [],
    bondRequestsLoading: false,
    taxPrefs,
    inflationRatePct: null,
    inflationFetchedAt: null,
    inflationSource: null,
    activeContracts,
    activeBonds,
    contractsTotal: CONTRACTS_TOTAL,
    bondsMarktwert,
    bondsEinstand,
    bondsGV,
    festgeldAnleihenTotal: CONTRACTS_TOTAL + bondsMarktwert,
    stockMetrics,
    depotWert,
    depotEinstand,
    depotGV,
    dailyPortfolioPnl: DAILY_PNL,
    gesamtvermoegen: GESAMT,
    pendingOrders: [{ id: 'o1' }, { id: 'o2' }],
    realizedPnlTotal: 0,
    contractsByType: {},
    tagesgeldTotal: 15_223,
    flexgeldTotal: 10_000,
    festgeldTotal: 75_000,
    portfolioAggregate,
    festgeldAggregate: portfolioAggregate,
    tagesgeldAggregate: portfolioAggregate,
    flexgeldAggregate: portfolioAggregate,
    bankInsuranceExposure: [],
    computeContractMetrics: computeContractMetricsBound,
    computeBondMetrics,
    cancelOrder: noop,
    removeFromWatchlist: noop,
    removeFavorite: noop,
    refreshAll: noop,
    refreshStocks: noop,
    refreshStockPrices: noop,
    refreshCashBalance: noop,
    refreshCashHistory: noop,
    refreshDepot: noop,
    refreshBonds: noop,
    refreshFavorites: noop,
    refreshHistory: noop,
    refreshSupportUnread: noop,
    refreshBondRequests: noop,
    refreshInflationRate: noop,
  };
}
