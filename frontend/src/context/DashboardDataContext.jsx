import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { checkPriceAlerts } from '@/services/priceAlertService';
import { fetchPortfolioJson } from '@/services/portfolioApi';
import {
  computeBondMetrics,
  computeContractMetrics,
  aggregatePortfolio,
  computeBankInsuranceExposure,
  buildTaxPrefs,
} from '@/lib/dashboardMetrics';
import { buildIpoValuationMap } from '@/lib/ipoValuation';

export const DashboardDataContext = createContext(null);

const initialState = {
  loading: true,
  dashboardFetchHadFailure: false,
  cashBalance: 0,
  cashAvailable: 0,
  cashUnsettled: 0,
  buyingPower: 0,
  cashSettlements: [],
  cashHistory: [],
  cashHistoryLoading: false,
  depotContracts: [],
  depotLoading: true,
  bondPositions: [],
  bondsLoading: true,
  stockPositions: [],
  stockCatalog: [],
  stockOrders: [],
  watchlistItems: [],
  stockPriceMap: {},
  stocksLoading: true,
  stocksRefreshing: false,
  stockPricesUpdatedAt: null,
  favorites: [],
  comparisonHistory: [],
  historyOffers: {},
  heroSnapshots: [],
  supportUnread: 0,
  bondPurchaseRequests: [],
  bondRequestsLoading: true,
  ipoSubscriptionRequests: [],
  ipoRequestsLoading: true,
  taxPrefs: {
    allowanceEur: 0,
    allowanceUsedEur: 0,
    churchTaxEnabled: false,
    churchTaxRate: 9,
  },
  inflationRatePct: null,
  inflationFetchedAt: null,
  inflationSource: null,
};

const todayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const DashboardDataProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState(initialState);
  const [metricDateKey, setMetricDateKey] = useState(todayKey);

  const update = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Session 82.17 · Depot Phase 1 — alle Portfolio-Reads Mongo-native via
  // /api/portfolio/*. Session 82.25 — Helper in `services/portfolioApi.js` extrahiert.
  // (fetchPortfolioJson wird direkt aus dem Service-Import verwendet.)

  const fetchCashBalance = useCallback(async () => {
    if (!user?.id) return true;
    try {
      const cash = await fetchPortfolioJson('/api/portfolio/cash');
      update({
        cashBalance: Number(cash?.cash_balance || 0),
        cashAvailable: Number(cash?.cash_available ?? cash?.cash_balance ?? 0),
        cashUnsettled: Number(cash?.cash_unsettled || 0),
        buyingPower: Number(cash?.buying_power || 0),
        cashSettlements: cash?.settlements || [],
        taxPrefs: buildTaxPrefs(user || {}),
      });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('cash balance fetch failed', err);
      return false;
    }
  }, [user?.id, update]);

  const fetchCashHistory = useCallback(async () => {
    if (!user?.id) return;
    update({ cashHistoryLoading: true });
    try {
      const cash = await fetchPortfolioJson('/api/portfolio/cash?history_limit=100');
      update({ cashHistory: cash?.history || [] });
    } catch (err) {
      Sentry.captureException(err);
      console.error('cash history fetch failed', err);
    } finally {
      update({ cashHistoryLoading: false });
    }
  }, [user?.id, update]);

  const fetchDepotContracts = useCallback(async () => {
    if (!user?.id) return true;
    update({ depotLoading: true });
    try {
      const data = await fetchPortfolioJson('/api/portfolio/depot-contracts');
      update({ depotContracts: Array.isArray(data) ? data : [] });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('depot contracts fetch failed', err);
      return false;
    } finally {
      update({ depotLoading: false });
    }
  }, [user?.id, update]);

  const fetchBondPositions = useCallback(async () => {
    if (!user?.id) return true;
    update({ bondsLoading: true });
    try {
      const data = await fetchPortfolioJson('/api/portfolio/bond-positions');
      update({ bondPositions: Array.isArray(data) ? data : [] });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('bond positions fetch failed', err);
      return false;
    } finally {
      update({ bondsLoading: false });
    }
  }, [user?.id, update]);

  const fetchStockData = useCallback(async () => {
    if (!user?.id) return true;
    update({ stocksLoading: true });
    try {
      const [positions, watchlist, orders] = await Promise.all([
        fetchPortfolioJson('/api/portfolio/stock-positions'),
        fetchPortfolioJson('/api/portfolio/watchlist'),
        fetchPortfolioJson('/api/portfolio/orders?limit=50'),
      ]);
      // Preisdaten liefert Phase 2 (Mongo-native Preis-Feed). In Phase 1 leerer Map.
      update({
        stockPositions: Array.isArray(positions) ? positions : [],
        watchlistItems: Array.isArray(watchlist) ? watchlist : [],
        stockOrders: Array.isArray(orders) ? orders : [],
        stockPriceMap: {},
        stockPricesUpdatedAt: null,
      });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('stock data fetch failed', err);
      return false;
    } finally {
      update({ stocksLoading: false });
    }
  }, [user?.id, update]);

  const fetchStockCatalog = useCallback(async () => {
    // Session 82.64 — Aktien-Vitrine dekorativ. Legacy Supabase `stocks`-Tabelle
    // hat kein Mongo-Equivalent (kein curated universe im Mongo). Widget bleibt
    // leer, bis ein Mongo-Endpoint existiert. Non-critical, kein Banner.
    update({ stockCatalog: [] });
    return true;
  }, [update]);

  const refreshStockPrices = useCallback(async () => {
    if (!user?.id) return null;
    update({ stocksRefreshing: true });
    try {
      // Session 82.64 — `/api/portfolio/stock-positions` enrichted mit
      // Read-Through-Cache (Session 82.22). Ein Read triggert Refresh der
      // stale Quotes automatisch. Kein separater `stock-prices`-Invoke nötig.
      const ok = await fetchStockData();
      if (ok) {
        toast.success('Marktdaten aktualisiert.');
      } else {
        toast.error('Marktdaten konnten nicht aktualisiert werden.');
      }
      return { ok };
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Aktualisierung fehlgeschlagen.');
      return null;
    } finally {
      update({ stocksRefreshing: false });
    }
  }, [user?.id, fetchStockData, update]);

  const fetchFavorites = useCallback(async () => {
    // Session 82.64 — Sparangebots-Favoriten (Legacy `profiles.favorites` + Join
    // `savings_offers/banks`) haben aktuell kein Mongo-Equivalent. Non-critical
    // dekoratives Widget; bleibt leer bis Mongo-Endpoint existiert.
    update({ favorites: [] });
    return true;
  }, [update]);

  const fetchComparisonHistory = useCallback(async () => {
    // Session 82.64 — Sparangebots-Vergleichshistorie (Legacy `comparison_history`)
    // hat kein Mongo-Equivalent. Non-critical.
    update({ comparisonHistory: [], historyOffers: {} });
    return true;
  }, [update]);

  const fetchBondPurchaseRequests = useCallback(async () => {
    if (!user?.id) return true;
    update({ bondRequestsLoading: true });
    try {
      // Session 82.04 — FastAPI/Mongo-native. Der Supabase-Read wurde ersetzt,
      // damit neue Mongo-Requests direkt sichtbar sind. Nur diese eine
      // Fetch-Funktion wurde geändert — Portfolio/Cash/Depot bleiben Supabase.
      const resp = await fetch('/api/bonds/requests/me', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      update({ bondPurchaseRequests: Array.isArray(data) ? data : [] });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      update({ bondPurchaseRequests: [] });
      return false;
    } finally {
      update({ bondRequestsLoading: false });
    }
  }, [user?.id, update]);

  const fetchIpoSubscriptionRequests = useCallback(async () => {
    if (!user?.id) return true;
    update({ ipoRequestsLoading: true });
    try {
      // Session 82.35 · IPO Requests Cutover — Mongo-native via FastAPI.
      // Der bisherige Supabase-Read scheiterte an RLS/UUID-Cast und triggerte
      // fälschlich den globalen Dashboard-Error-Banner. Jetzt lesen wir aus
      // /api/ipo/requests/me und normalisieren auf das von den Widgets
      // erwartete Legacy-Shape (approved_at/valuation_set_at/ipo_catalog).
      const resp = await fetch('/api/ipo/requests/me', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const normalized = (Array.isArray(data) ? data : []).map((r) => ({
        ...r,
        // Legacy-Kompat-Felder (Mongo kennt kein separates approved_at —
        // Bewertung wird bei Allocation gesetzt, daher fallen approved_at /
        // valuation_set_at auf allocation_date zurück).
        approved_at: r.allocation_date || null,
        valuation_set_at: r.allocation_date || null,
        position_symbol: null,
        use_admin_valuation: true,
        profit_margin_pct: null,
        decision_note: null,
        rejected_at: null,
        ipo_catalog: { price_currency: 'EUR' },
      }));
      update({ ipoSubscriptionRequests: normalized });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('ipo subscription requests fetch failed', err);
      update({ ipoSubscriptionRequests: [] });
      return false;
    } finally {
      update({ ipoRequestsLoading: false });
    }
  }, [user?.id, update]);

  const fetchSupportUnread = useCallback(async () => {
    // Session 82.64 — Legacy `support_tickets`-Tabelle hat kein Mongo-Equivalent.
    // Non-critical Badge. Bleibt 0 bis Mongo-Support-System existiert.
    update({ supportUnread: 0 });
    return true;
  }, [update]);

  const fetchInflationRate = useCallback(async () => {
    // Session 82.64 — Legacy `macro_rates`-Tabelle + `macro-rates`-Function
    // haben kein Mongo-Equivalent. Non-critical dekorativer KPI. Bleibt `null`
    // bis Mongo-Endpoint existiert.
    update({ inflationRatePct: null, inflationFetchedAt: null, inflationSource: null });
    return true;
  }, [update]);

  const fetchHeroSnapshots = useCallback(async () => {
    if (!user?.id) return true;
    try {
      const data = await fetchPortfolioJson('/api/portfolio/snapshots?days=400');
      update({ heroSnapshots: Array.isArray(data) ? data : [] });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('hero snapshots fetch failed', err);
      return false;
    }
  }, [user?.id, update]);

  // Session 82.23 · Depot Phase 4B — serverseitige Portfolio-Summary als Source of Truth.
  const fetchPortfolioSummary = useCallback(async () => {
    if (!user?.id) return true;
    try {
      const data = await fetchPortfolioJson('/api/portfolio/summary');
      update({ portfolioSummary: data });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('portfolio summary fetch failed', err);
      return false;
    }
  }, [user?.id, update]);

  const refreshAll = useCallback(async () => {
    if (!user?.id) return;
    update({ loading: true, dashboardFetchHadFailure: false });
    // Session 82.35 · Banner-Semantik gesplittet.
    // CRITICAL = Finanzkern des Depots (Cash, Positions, Orders, Bond-Requests,
    // Snapshots). Nur deren Fehler dürfen den globalen roten Dashboard-Banner
    // auslösen. NON_CRITICAL sind Marketing-/Legacy-Supabase-Reads
    // (Stock-Catalog, Favoriten, Vergleichsverlauf, Support-Unread, Inflation)
    // sowie IPO-Requests (fachlich nicht finanziell kritisch für den Depot-
    // Core). Diese laufen parallel, ihre Fehler werden geloggt, aber kein
    // Banner.
    const [criticalResults] = await Promise.all([
      Promise.all([
        fetchCashBalance(),
        fetchDepotContracts(),
        fetchBondPositions(),
        fetchBondPurchaseRequests(),
        fetchStockData(),
        fetchHeroSnapshots(),
      ]),
      Promise.all([
        fetchIpoSubscriptionRequests(),
        fetchStockCatalog(),
        fetchFavorites(),
        fetchComparisonHistory(),
        fetchSupportUnread(),
        fetchInflationRate(),
      ]).catch((err) => {
        // Ein einzelner non-critical Fetch darf niemals den Depot-Health-State
        // beeinflussen — Fehler werden in den Sub-Funktionen bereits geloggt.
        console.warn('non-critical dashboard fetch failed', err);
        return [];
      }),
    ]);
    const failed = criticalResults.some((r) => r === false);
    update({ loading: false, dashboardFetchHadFailure: failed });
    checkPriceAlerts()
      .then((res) => {
        if (res?.triggered?.length) {
          toast.info(`${res.triggered.length} Kursalarm(e) ausgelöst`, {
            action: { label: 'Anzeigen', onClick: () => { window.location.href = '/dashboard/alarme'; } },
          });
        }
      })
      .catch(() => {});
  }, [
    user?.id,
    fetchCashBalance,
    fetchDepotContracts,
    fetchBondPositions,
    fetchBondPurchaseRequests,
    fetchIpoSubscriptionRequests,
    fetchStockData,
    fetchStockCatalog,
    fetchFavorites,
    fetchComparisonHistory,
    fetchHeroSnapshots,
    fetchSupportUnread,
    fetchInflationRate,
    update,
  ]);

  useEffect(() => {
    if (!user?.id) {
      setState(initialState);
      return undefined;
    }
    refreshAll();

    // Session 82.64 — Supabase Realtime-Channel entfernt. Ersatz-Pattern:
    //   • Order-Executed / Bond-Executed / IPO-Allocated Toasts: gehandhabt vom
    //     Notification-Bell (Session 82.52 · `stock_alert_notifications`).
    //   • Support-Unread: On-Demand-Refresh via `refreshAll()` + Focus-Refresh.
    //   • Bond-Request / IPO-Subscription-Status: `refreshAll()` +
    //     Focus-Refresh (unten definiert) picken State-Änderungen auf.
    // Keine neue WebSocket-Infrastruktur; kein aggressives Polling; kein
    // Financial-State abhängig von Realtime.

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMetricDateKey((prev) => {
        const next = todayKey();
        return prev === next ? prev : next;
      });
    }, 60_000);

    return () => window.clearInterval(id);
  }, []);

  // Session 82.83c — 5s aktiv, 30s idle-Backoff nach 2 Min ohne Interaktion.
  // Schützt Twelve-Data-Free-Quota (800 Calls/Tag).
  useEffect(() => {
    if (!user?.id) return undefined;

    const ACTIVE_MS = 5 * 1000;
    const IDLE_MS = 30 * 1000;
    const IDLE_AFTER_MS = 2 * 60 * 1000;
    let lastActive = Date.now();
    let currentDelay = ACTIVE_MS;
    let timerId = null;

    const markActive = () => { lastActive = Date.now(); };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(
      (evt) => window.addEventListener(evt, markActive, { passive: true }),
    );

    const schedule = () => {
      const idle = Date.now() - lastActive > IDLE_AFTER_MS;
      currentDelay = idle ? IDLE_MS : ACTIVE_MS;
      timerId = window.setTimeout(async () => {
        if (typeof document === 'undefined' || !document.hidden) {
          try { await fetchStockData(); } catch { /* noop */ }
        }
        schedule();
      }, currentDelay);
    };
    schedule();

    const onVisibility = () => {
      if (!document.hidden) fetchStockData();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timerId) window.clearTimeout(timerId);
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(
        (evt) => window.removeEventListener(evt, markActive),
      );
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id, fetchStockData]);

  const cancelOrder = useCallback(
    async (orderId) => {
      if (!window.confirm('Auftrag wirklich stornieren?')) return;
      try {
        // Session 82.21 · Depot Phase 3C — Mongo-native via FastAPI.
        const resp = await fetch(`/api/portfolio/orders/${encodeURIComponent(orderId)}/cancel`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        toast.success('Auftrag storniert');
        fetchStockData();
        fetchCashBalance();
      } catch (err) {
        toast.error('Auftrag konnte nicht storniert werden.');
      }
    },
    [fetchStockData, fetchCashBalance],
  );

  const removeFromWatchlist = useCallback(
    async (symbol) => {
      if (!user?.id) return;
      try {
        // Session 82.20 · Depot Phase 3B — Mongo-native via FastAPI.
        const sym = String(symbol || '').toUpperCase();
        const resp = await fetch(`/api/watchlist/${encodeURIComponent(sym)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        toast.success('Aus Watchlist entfernt');
        fetchStockData();
      } catch (err) {
        toast.error('Symbol konnte nicht aus der Watchlist entfernt werden.');
      }
    },
    [user?.id, fetchStockData],
  );

  const removeFavorite = useCallback(
    async (_offerId) => {
      // Session 82.64 — Sparangebots-Favoriten haben aktuell kein Mongo-Backend.
      // Consumer sollten den Aufruf vermeiden; falls dennoch getriggert: still
      // Erfolgs-Toast + State-Filter für UX-Konsistenz.
      if (!user?.id) return;
      update({ favorites: state.favorites.filter((o) => o.id !== _offerId) });
      toast.success('Aus Favoriten entfernt');
    },
    [user?.id, update, state.favorites],
  );

  const metrics = useMemo(() => {
    const metricNow = new Date(`${metricDateKey}T12:00:00`);
    const activeContracts = state.depotContracts.filter((c) => c.is_active);
    const activeBonds = state.bondPositions.filter((b) => b.is_active);
    const bondsMarktwert = activeBonds.reduce(
      (s, b) => s + (Number(b.nominal_betrag || 0) * Number(b.aktueller_kurs || 0)) / 100,
      0,
    );
    const bondsEinstand = activeBonds.reduce(
      (s, b) => s + (Number(b.nominal_betrag || 0) * Number(b.kaufkurs || 0)) / 100,
      0,
    );
    const bondsGV = bondsMarktwert - bondsEinstand;

    const ipoValuationMap = buildIpoValuationMap(state.ipoSubscriptionRequests);

    const stockMetrics = state.stockPositions.map((p) => {
      const marketPrice = state.stockPriceMap[p.symbol]?.price;
      const ipoVal = ipoValuationMap[p.symbol];
      const price =
        ipoVal?.listingPrice != null
          ? Number(ipoVal.listingPrice)
          : marketPrice != null
            ? Number(marketPrice)
            : null;
      const qty = Number(p.quantity || 0);
      const avg = Number(p.avg_cost || 0);
      const marktwert = price != null ? qty * Number(price) : qty * avg;
      const einstand = qty * avg;
      const gv = marktwert - einstand;
      const pct = einstand > 0 ? (gv / einstand) * 100 : 0;
      const meta = p.stocks || {};
      return {
        ...p,
        stockName: meta.name || p.symbol,
        logoUrl: meta.logo_url || null,
        exchange: meta.exchange || null,
        market: meta.market || null,
        isTradable: meta.is_active !== false,
        isIpoValuation: !!ipoVal,
        ipoEinstandPerLot: ipoVal?.subscriptionPrice != null ? Number(ipoVal.subscriptionPrice) : avg,
        ipoListingPerLot: ipoVal?.listingPrice != null ? Number(ipoVal.listingPrice) : null,
        price,
        marketPrice: marketPrice != null ? Number(marketPrice) : null,
        qty,
        avg,
        marktwert,
        einstand,
        gv,
        pct,
      };
    });
    const depotWert = stockMetrics.reduce((s, m) => s + m.marktwert, 0);
    const depotEinstand = stockMetrics.reduce((s, m) => s + m.einstand, 0);
    const depotGV = depotWert - depotEinstand;

    const dailyPortfolioPnl = stockMetrics.reduce((sum, m) => {
      const px = state.stockPriceMap[m.symbol];
      const qty = Number(m.qty || 0);
      if (qty <= 0) return sum;
      if (px?.change_abs != null && Number.isFinite(Number(px.change_abs))) {
        return sum + qty * Number(px.change_abs);
      }
      if (px?.change_pct != null && px?.price != null) {
        const pct = Number(px.change_pct);
        const price = Number(px.price);
        if (Number.isFinite(pct) && Number.isFinite(price)) {
          return sum + qty * price * (pct / 100);
        }
      }
      return sum;
    }, 0);

    const pendingOrders = state.stockOrders.filter((o) => o.status === 'pending');
    const realizedPnlTotal = state.stockOrders
      .filter((o) => o.status === 'executed' && o.realized_pnl != null)
      .reduce((sum, o) => sum + Number(o.realized_pnl || 0), 0);

    const contractsByType = {
      festgeld: state.depotContracts.filter((c) => c.product_type === 'festgeld'),
      tagesgeld: state.depotContracts.filter((c) => c.product_type === 'tagesgeld'),
      flexgeld: state.depotContracts.filter((c) => c.product_type === 'flexgeld'),
    };

    const aggregateOpts = {
      taxPrefs: state.taxPrefs,
      inflationRatePct: state.inflationRatePct,
      now: metricNow,
    };

    const portfolioAggregate = aggregatePortfolio(
      activeContracts,
      aggregateOpts,
    );
    const festgeldAggregate = aggregatePortfolio(
      contractsByType.festgeld,
      aggregateOpts,
    );
    const tagesgeldAggregate = aggregatePortfolio(
      contractsByType.tagesgeld,
      aggregateOpts,
    );
    const flexgeldAggregate = aggregatePortfolio(
      contractsByType.flexgeld,
      aggregateOpts,
    );

    const contractsTotal = portfolioAggregate.currentValueGrossTotal;
    const festgeldAnleihenTotal = contractsTotal + bondsMarktwert;

    const tagesgeldTotal = tagesgeldAggregate.currentValueGrossTotal;
    const flexgeldTotal = flexgeldAggregate.currentValueGrossTotal;
    const festgeldTotal = festgeldAggregate.totalAmountEur;

    const cash = Number(state.cashBalance || 0);
    const gesamtvermoegen = cash + depotWert + festgeldAnleihenTotal;

    const bankInsuranceExposure = computeBankInsuranceExposure(
      state.depotContracts,
    );

    return {
      activeContracts,
      activeBonds,
      contractsTotal,
      bondsMarktwert,
      bondsEinstand,
      bondsGV,
      festgeldAnleihenTotal,
      stockMetrics,
      ipoValuationMap,
      depotWert,
      depotEinstand,
      depotGV,
      dailyPortfolioPnl,
      gesamtvermoegen,
      pendingOrders,
      realizedPnlTotal,
      contractsByType,
      tagesgeldTotal,
      flexgeldTotal,
      festgeldTotal,
      portfolioAggregate,
      festgeldAggregate,
      tagesgeldAggregate,
      flexgeldAggregate,
      bankInsuranceExposure,
    };
  }, [
    state.depotContracts,
    state.bondPositions,
    state.stockPositions,
    state.stockPriceMap,
    state.ipoSubscriptionRequests,
    state.cashBalance,
    state.stockOrders,
    state.taxPrefs,
    state.inflationRatePct,
    metricDateKey,
  ]);

  // Wrap so callers automatically pick up the user's tax prefs + inflation rate.
  const computeContractMetricsBound = useCallback(
    (contract, extraOpts = {}) =>
      computeContractMetrics(contract, {
        taxPrefs: state.taxPrefs,
        inflationRatePct: state.inflationRatePct,
        now: new Date(`${metricDateKey}T12:00:00`),
        ...extraOpts,
      }),
    [state.taxPrefs, state.inflationRatePct, metricDateKey],
  );

  const value = useMemo(
    () => ({
      ...state,
      ...metrics,
      computeContractMetrics: computeContractMetricsBound,
      computeBondMetrics,
      cancelOrder,
      removeFromWatchlist,
      removeFavorite,
      refreshAll,
      refreshStocks: fetchStockData,
      refreshStockPrices,
      refreshCashBalance: fetchCashBalance,
      refreshCashHistory: fetchCashHistory,
      refreshDepot: fetchDepotContracts,
      refreshBonds: fetchBondPositions,
      refreshFavorites: fetchFavorites,
      refreshHistory: fetchComparisonHistory,
      refreshSupportUnread: fetchSupportUnread,
      refreshBondRequests: fetchBondPurchaseRequests,
      refreshIpoRequests: fetchIpoSubscriptionRequests,
      refreshInflationRate: fetchInflationRate,
      refreshPortfolioSummary: fetchPortfolioSummary,
    }),
    [
      state,
      metrics,
      computeContractMetricsBound,
      cancelOrder,
      removeFromWatchlist,
      removeFavorite,
      refreshAll,
      fetchStockData,
      refreshStockPrices,
      fetchCashBalance,
      fetchCashHistory,
      fetchDepotContracts,
      fetchBondPositions,
      fetchBondPurchaseRequests,
      fetchIpoSubscriptionRequests,
      fetchFavorites,
      fetchComparisonHistory,
      fetchSupportUnread,
      fetchInflationRate,
      fetchPortfolioSummary,
    ],
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
};

export const useDashboardData = () => {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData must be used inside DashboardDataProvider');
  }
  return ctx;
};
