import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { checkPriceAlerts } from '@/services/priceAlertService';
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
  const channelRef = useRef(null);

  const update = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Session 82.17 · Depot Phase 1 — alle Portfolio-Reads Mongo-native via
  // /api/portfolio/*. Same-Origin, httpOnly-Cookie-Auth, user_id serverseitig.
  const fetchPortfolioJson = async (path) => {
    const resp = await fetch(path, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) {
      const err = new Error(`HTTP ${resp.status}`);
      err.status = resp.status;
      throw err;
    }
    return resp.json();
  };

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
      // Depot-Verträge in Phase 1 noch nicht Migrations-Scope: sauberer Empty-State.
      update({ depotContracts: [] });
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
    // Used for the dashboard showcase ("Aktien Vitrine") even when the user has no positions yet.
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('symbol, name, logo_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(12);
      if (error) throw error;
      update({ stockCatalog: data || [] });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('stock catalog fetch failed', err);
      return false;
    }
  }, [update]);

  const refreshStockPrices = useCallback(async () => {
    if (!user?.id) return null;
    update({ stocksRefreshing: true });
    try {
      const { data, error } = await supabase.functions.invoke('stock-prices', { body: {} });
      if (error) {
        toast.error('Marktdaten konnten nicht aktualisiert werden.');
        Sentry.captureException(error);
        return null;
      }
      await fetchStockData();
      if (data?.skipped) {
        toast.info('Marktdaten sind bereits aktuell.');
      } else {
        toast.success(
          `Marktdaten aktualisiert (${data?.cached ?? data?.quotes?.length ?? 0} Symbole).`,
        );
      }
      return data;
    } catch (err) {
      Sentry.captureException(err);
      toast.error('Aktualisierung fehlgeschlagen.');
      return null;
    } finally {
      update({ stocksRefreshing: false });
    }
  }, [user?.id, fetchStockData, update]);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return true;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('favorites')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      const ids = profile?.favorites || [];
      if (ids.length === 0) {
        update({ favorites: [] });
        return true;
      }
      const { data: offers, error: offersError } = await supabase
        .from('savings_offers')
        .select(
          '*, banks(id, name, country, logo_url, website_url, deposit_protection, deposit_protection_amount)',
        )
        .in('id', ids);
      if (offersError) throw offersError;
      update({
        favorites: (offers || []).map((o) => ({
          ...o,
          bank_name: o.banks?.name || '',
          country: o.banks?.country || '',
          bank_logo: o.banks?.logo_url || null,
          website_url: o.banks?.website_url || null,
          deposit_protection: o.banks?.deposit_protection || '',
          deposit_protection_amount: o.banks?.deposit_protection_amount || '',
        })),
      });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('favorites fetch failed', err);
      return false;
    }
  }, [user?.id, update]);

  const fetchComparisonHistory = useCallback(async () => {
    if (!user?.id) return true;
    try {
      const { data, error } = await supabase
        .from('comparison_history')
        .select('*')
        .eq('user_id', user.id)
        .order('compared_at', { ascending: false });
      if (error) throw error;
      update({ comparisonHistory: data || [] });
      const offerIds = [...new Set((data || []).flatMap((h) => h.offer_ids))];
      if (offerIds.length > 0) {
        const { data: offers, error: offersError } = await supabase
          .from('savings_offers')
          .select(
            '*, banks(id, name, country, logo_url, website_url, deposit_protection, deposit_protection_amount)',
          )
          .in('id', offerIds);
        if (offersError) throw offersError;
        const map = {};
        (offers || []).forEach((o) => {
          map[o.id] = {
            ...o,
            bank_name: o.banks?.name || '',
            country: o.banks?.country || '',
            bank_logo: o.banks?.logo_url || null,
            website_url: o.banks?.website_url || null,
            deposit_protection: o.banks?.deposit_protection || '',
            deposit_protection_amount: o.banks?.deposit_protection_amount || '',
          };
        });
        update({ historyOffers: map });
      }
      return true;
    } catch (err) {
      Sentry.captureException(err);
      console.error('comparison history fetch failed', err);
      return false;
    }
  }, [user?.id, update]);

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
      const { data, error } = await supabase
        .from('ipo_subscription_requests')
        .select(
          'id, ipo_id, company_name, ticker, amount_eur, shares_requested, status, notes, created_at, decision_note, approved_at, rejected_at, subscription_price_per_share, listing_price_per_share, profit_margin_pct, position_symbol, use_admin_valuation, valuation_set_at, ipo_catalog:ipo_id(price_currency)',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      update({ ipoSubscriptionRequests: data || [] });
      return true;
    } catch (err) {
      Sentry.captureException(err);
      update({ ipoSubscriptionRequests: [] });
      return false;
    } finally {
      update({ ipoRequestsLoading: false });
    }
  }, [user?.id, update]);

  const fetchSupportUnread = useCallback(async () => {
    if (!user?.id) return true;
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('unread_for_user')
        .eq('user_id', user.id);
      if (error) throw error;
      const total = (data || []).reduce(
        (sum, row) => sum + Number(row.unread_for_user || 0),
        0,
      );
      update({ supportUnread: total });
      return true;
    } catch (err) {
      // Bei fehlender Tabelle/Migration still überspringen
      update({ supportUnread: 0 });
      return true;
    }
  }, [user?.id, update]);

  const fetchInflationRate = useCallback(async () => {
    if (!user?.id) return true;
    try {
      // 1) Try the cached row from public.macro_rates first — fast, no auth round-trip.
      const { data, error } = await supabase
        .from('macro_rates')
        .select('value, fetched_at, source')
        .eq('key', 'eu_cpi_yoy')
        .maybeSingle();
      if (!error && data && Number.isFinite(Number(data.value))) {
        update({
          inflationRatePct: Number(data.value),
          inflationFetchedAt: data.fetched_at || null,
          inflationSource: data.source || null,
        });
      }

      // 2) Fire-and-forget refresh (will be a no-op if cache is fresh).
      supabase.functions
        .invoke('macro-rates', { body: { key: 'eu_cpi_yoy' } })
        .then(({ data: refreshed, error: refreshError }) => {
          if (refreshError || !refreshed) return;
          if (Number.isFinite(Number(refreshed.value))) {
            update({
              inflationRatePct: Number(refreshed.value),
              inflationFetchedAt: refreshed.fetched_at || null,
              inflationSource: refreshed.source || null,
            });
          }
        })
        .catch(() => {
          // Edge function not deployed yet — silently keep the cached value.
        });
      return true;
    } catch (err) {
      // macro_rates table missing => migration not applied yet; keep null.
      console.warn('inflation rate fetch failed', err?.message || err);
      return true;
    }
  }, [user?.id, update]);

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
    const results = await Promise.all([
      fetchCashBalance(),
      fetchDepotContracts(),
      fetchBondPositions(),
      fetchBondPurchaseRequests(),
      fetchIpoSubscriptionRequests(),
      fetchStockData(),
      fetchStockCatalog(),
      fetchFavorites(),
      fetchComparisonHistory(),
      fetchHeroSnapshots(),
      fetchSupportUnread(),
      fetchInflationRate(),
    ]);
    const failed = results.some((r) => r === false);
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

    const ch = supabase
      .channel(`dashboard_data_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stock_orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const o = payload.new;
            if (o.status === 'executed') {
              toast.success(
                `Auftrag ausgeführt: ${o.symbol} × ${Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}`,
              );
            } else if (o.status === 'rejected') {
              toast.error(
                `Auftrag abgelehnt: ${o.symbol}${o.rejection_reason ? ' — ' + o.rejection_reason : ''}`,
              );
            }
          }
          fetchStockData();
          fetchCashBalance();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSupportUnread();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bond_purchase_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const st = payload.new.status;
            const name = payload.new.bond_name || payload.new.isin || 'Anleihe';
            if (st === 'approved') {
              toast.success(`Kaufanfrage bestätigt: ${name}`);
            } else if (st === 'rejected') {
              toast.error(`Kaufanfrage abgelehnt: ${name}`);
            }
          }
          fetchBondPurchaseRequests();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ipo_subscription_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const st = payload.new.status;
            const name = payload.new.company_name || payload.new.ticker || 'IPO';
            if (st === 'approved') {
              toast.success(`IPO-Anfrage bestätigt: ${name}`);
            } else if (st === 'rejected') {
              toast.error(`IPO-Anfrage abgelehnt: ${name}`);
            }
          }
          fetchIpoSubscriptionRequests();
        },
      )
      .subscribe();
    channelRef.current = ch;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
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

  // Re-read stock_prices_cache on the same cadence as the backend cron so
  // /dashboard/aktien stays current without a manual "Aktualisieren" click.
  useEffect(() => {
    if (!user?.id) return undefined;

    const STOCK_CACHE_POLL_MS = 5 * 60 * 1000;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchStockData();
    };
    const id = window.setInterval(tick, STOCK_CACHE_POLL_MS);

    const onVisibility = () => {
      if (!document.hidden) fetchStockData();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
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
    async (offerId) => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('favorites')
          .eq('id', user.id)
          .single();
        const next = (profile?.favorites || []).filter((id) => id !== offerId);
        const { error } = await supabase
          .from('profiles')
          .update({ favorites: next })
          .eq('id', user.id);
        if (error) throw error;
        update({ favorites: state.favorites.filter((o) => o.id !== offerId) });
        toast.success('Aus Favoriten entfernt');
      } catch (err) {
        Sentry.captureException(err);
        toast.error('Fehler beim Entfernen aus Favoriten');
      }
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
