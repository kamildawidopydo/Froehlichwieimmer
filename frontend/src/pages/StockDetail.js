import { getApiBase } from '@/lib/apiBase';

import React, { useCallback, useEffect, useMemo, useState, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { watchlistApi } from '@/services/watchlistApi';
import { portfolioOrderApi } from '@/services/portfolioOrderApi';
import { fetchPortfolioJson } from '@/services/portfolioApi';
import { useDashboardData } from '@/context/DashboardDataContext';
import { useNewsList } from '@/hooks/useNewsList';
import { fetchDividends } from '@/services/dividendService';
import { fetchStockEvents } from '@/services/stockEventsService';
import { fetchStockFundamentals } from '@/services/stockFundamentalsService';
import { PageContainer } from '@/components/dashboard/PageHeader';
import {
  DashboardStagger,
  DashboardStaggerItem,
  DashboardPanel,
} from '@/components/dashboard/motion';
import PriceAlertPanel from '@/components/dashboard/PriceAlertPanel';
import InsufficientBuyingPowerAlert from '@/components/dashboard/InsufficientBuyingPowerAlert';
import InsufficientSharesAlert from '@/components/dashboard/InsufficientSharesAlert';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  RefreshCw,
  LineChart as LineIcon,
  Building2,
  CandlestickChart as CandleIcon,
  Activity,
  Newspaper,
  CalendarClock,
  Coins,
} from 'lucide-react';

const TradingChart = lazy(() => import('@/components/dashboard/charts/TradingChart'));

const RANGES = [
  { key: '1d', label: '1T' },
  { key: '5d', label: '5T' },
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y', label: '1J' },
  { key: '5y', label: '5J' },
];

const formatCurrency = (v, currency = 'USD') =>
  v == null ? '–' : Number(v).toLocaleString('de-DE', { style: 'currency', currency: currency || 'USD' });

const formatPct = (v) =>
  v == null ? '–' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

// Strip legal-entity suffixes so the news search matches the brand name.
const newsQueryFromName = (name, symbol) => {
  if (!name) return symbol || '';
  return (
    name
      .replace(/,?\s+(Inc\.?|Incorporated|Corp\.?|Corporation|Company|Co\.?|AG|SE|PLC|Plc|Ltd\.?|N\.?V\.?|S\.?A\.?|Group|Holdings?|Class\s+[A-C])\b.*$/i, '')
      .trim() || name
  );
};

/** Per-symbol news with optional fallback to general market feed on the tab view. */
const StockNewsPanel = ({ query, variant = 'compact' }) => {
  const isTab = variant === 'tab';
  const [useGeneralFeed, setUseGeneralFeed] = useState(!query);

  useEffect(() => {
    setUseGeneralFeed(!query);
  }, [query]);

  const activeSearch = isTab && useGeneralFeed ? '' : (query || '');
  const { items, loading, error, hasMore, loadMore, loadingMore } = useNewsList({
    source: 'articles',
    search: activeSearch,
    tab: 'recent',
    enabled: isTab || !!query,
  });

  useEffect(() => {
    if (isTab && query && !loading && !error && items.length === 0 && !useGeneralFeed) {
      setUseGeneralFeed(true);
    }
  }, [isTab, query, loading, error, items.length, useGeneralFeed]);

  const articles = isTab ? (items || []) : (items || []).slice(0, 4);
  const isFallback = isTab && useGeneralFeed && !!query;

  if (!query && !isTab) return null;
  if (!isTab && !loading && articles.length === 0) return null;

  return (
    <div className="bg-white border border-bank-border rounded-xl p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-base font-semibold text-bank-text">
          <Newspaper size={16} strokeWidth={1.6} className="text-bank-primary" /> Aktuelle News
        </h3>
        {isTab && (
          <Link to="/dashboard/news" className="shrink-0 text-xs font-medium text-bank-primary hover:underline">
            Alle News
          </Link>
        )}
      </div>
      {isFallback && (
        <p className="mb-3 text-xs text-bank-text-muted">
          Keine Meldungen zu „{query}“ – aktuelle Marktnachrichten:
        </p>
      )}
      {loading && articles.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: isTab ? 6 : 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-bank-bg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-bank-error">News konnten nicht geladen werden.</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-bank-text-muted">Derzeit keine Nachrichten verfügbar.</p>
      ) : (
        <>
          <div className="divide-y divide-bank-border/70">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/dashboard/news/${a.slug}`}
                className="group block py-2.5 first:pt-0 last:pb-0"
              >
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-bank-text transition-colors group-hover:text-bank-primary">
                  {a.title}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-bank-text-muted">
                  {a.published_at
                    ? new Date(a.published_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
                    : ''}
                </p>
              </Link>
            ))}
          </div>
          {isTab && hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 w-full rounded-md border border-bank-border py-2 text-sm font-medium text-bank-text-muted transition-colors hover:bg-bank-bg disabled:opacity-50"
            >
              {loadingMore ? 'Laden…' : 'Mehr laden'}
            </button>
          )}
        </>
      )}
    </div>
  );
};

const StockEventsPanel = ({ symbol }) => {
  const [events, setEvents] = useState(undefined);
  useEffect(() => {
    let active = true;
    if (!symbol) return undefined;
    fetchStockEvents([symbol])
      .then((list) => { if (active) setEvents(list || []); })
      .catch(() => { if (active) setEvents([]); });
    return () => { active = false; };
  }, [symbol]);
  if (events === undefined) return null;
  if (!events.length) return null;
  return (
    <div className="bg-white border border-bank-border rounded-xl p-5 shadow-sm">
      <h3 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-bank-text">
        <CalendarClock size={16} className="text-bank-primary" /> Termine
      </h3>
      <ul className="divide-y divide-bank-border/70">
        {events.map((ev) => (
          <li key={ev.id} className="flex justify-between py-2 text-[13px]">
            <span className="text-bank-text-muted">{ev.label}</span>
            <span className="font-medium tabular-nums">
              {ev.date ? new Date(ev.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const TransactionHistoryPanel = ({ orders, currency }) => {
  const executed = (orders || []).filter((o) => o.status === 'executed').slice(0, 8);
  if (!executed.length) return null;
  return (
    <div className="bg-white border border-bank-border rounded-xl p-5 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-bank-text">Transaktionsverlauf</h3>
      <ul className="divide-y divide-bank-border/70">
        {executed.map((o) => (
          <li key={o.id} className="flex items-center justify-between py-2 text-[12px]">
            <span>
              <span className={o.side === 'buy' ? 'text-emerald-600' : 'text-rose-600'}>
                {o.side === 'buy' ? 'Kauf' : 'Verkauf'}
              </span>
              {' · '}
              {Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk
            </span>
            <span className="tabular-nums text-bank-text-muted">
              {o.executed_price != null
                ? Number(o.executed_price).toLocaleString('de-DE', { style: 'currency', currency: currency || 'USD' })
                : new Date(o.created_at).toLocaleDateString('de-DE')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Last dividend + estimated annual income for the symbol (held shares optional). */
const StockDividendCard = ({ symbol, currency, shares }) => {
  const [info, setInfo] = useState(undefined); // undefined=loading, null=none

  useEffect(() => {
    let active = true;
    if (!symbol) return undefined;
    fetchDividends([symbol])
      .then((map) => {
        if (active) setInfo(map[symbol] || null);
      })
      .catch(() => {
        if (active) setInfo(null);
      });
    return () => {
      active = false;
    };
  }, [symbol]);

  if (info === undefined || info === null || info.ttmDividend <= 0) return null;
  const cur = info.currency || currency || 'USD';
  const annual = shares > 0 ? info.ttmDividend * shares : null;
  return (
    <div className="bg-white border border-bank-border rounded-xl p-5 shadow-sm">
      <h3 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-bank-text">
        <Coins size={16} strokeWidth={1.6} className="text-bank-primary" /> Dividende
      </h3>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-bank-text-muted">Dividende (12M)</p>
          <p className="mt-0.5 font-semibold tabular-nums text-bank-text">{formatCurrency(info.ttmDividend, cur)}</p>
        </div>
        <div>
          <p className="text-bank-text-muted">Letzte Ausschüttung</p>
          <p className="mt-0.5 font-medium tabular-nums text-bank-text">
            {info.lastAmount != null ? formatCurrency(info.lastAmount, cur) : '–'}
          </p>
        </div>
        {info.lastDate && (
          <div>
            <p className="text-bank-text-muted">Letzter Ex-Tag</p>
            <p className="mt-0.5 font-medium tabular-nums text-bank-text">
              {new Date(info.lastDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        )}
        {annual != null && (
          <div>
            <p className="text-bank-text-muted">Geschätzt p.a.</p>
            <p className="mt-0.5 font-semibold tabular-nums text-emerald-600">{formatCurrency(annual, cur)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StockDetail = ({ embedded = false, portfolioTotal = null, positionMetric = null }) => {
  const { symbol: rawSymbol } = useParams();
  const symbol = decodeURIComponent(rawSymbol || '');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stock, setStock] = useState(null);
  const [price, setPrice] = useState(null);
  const [ohlc, setOhlc] = useState([]);
  const [historyCurrency, setHistoryCurrency] = useState(null);
  const [dayStats, setDayStats] = useState(null);
  const [range, setRange] = useState('1mo');
  const [chartType, setChartType] = useState('area'); // 'area' | 'candle'
  const [detailTab, setDetailTab] = useState('chart'); // chart | fundamentals | news
  const [fundamentals, setFundamentals] = useState(null);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false);
  const [fundamentalsError, setFundamentalsError] = useState(null);
  const [showSma, setShowSma] = useState(true);
  const [stats, setStats] = useState(null); // { week52High, week52Low, volatility, return1y, avgVolume, open }
  const [realizedPnl, setRealizedPnl] = useState(null);
  const [symbolOrders, setSymbolOrders] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [watched, setWatched] = useState(false);
  const [position, setPosition] = useState(null);
  const [cashBalance, setCashBalance] = useState(0);
  const [cashAvailable, setCashAvailable] = useState(0);
  const [buyingPower, setBuyingPower] = useState(0);

  // Order form state — Session 82.62: Mongo-native Cutover.
  // `market` ist backendseitig noch nicht verfügbar → Default = `limit`.
  const [orderType, setOrderType] = useState('limit'); // limit (market disabled)
  const [limitPrice, setLimitPrice] = useState('');
  const [side, setSide] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponVerifiedPct, setCouponVerifiedPct] = useState(null);
  const [couponPeekPreview, setCouponPeekPreview] = useState(null); // {gross,discount,net} vom Backend
  const [couponCheckLoading, setCouponCheckLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [buyingPowerError, setBuyingPowerError] = useState(null);
  const [sellSharesError, setSellSharesError] = useState(null);
  const [pendingSellQty, setPendingSellQty] = useState(0);
  const [idemKey, setIdemKey] = useState(() =>
    (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );
  const formRef = useRef(null);

  useEffect(() => {
    setBuyingPowerError(null);
    setSellSharesError(null);
    // Coupon-Preview zurücksetzen wenn Coupon/qty/limit sich ändern.
    setCouponPeekPreview(null);
  }, [quantity, couponCode, side, orderType, limitPrice]);

  const loadFundamentals = useCallback(() => {
    if (!symbol) return;
    setFundamentalsLoading(true);
    setFundamentalsError(null);
    fetchStockFundamentals(symbol)
      .then((data) => {
        setFundamentals(data);
        setFundamentalsError(null);
      })
      .catch((err) => {
        setFundamentals(null);
        const msg = err?.code === 'NOT_CACHED'
          ? 'Kennzahlen werden täglich synchronisiert und sind für dieses Symbol noch nicht verfügbar.'
          : err?.code === 'SYNC_FAILED'
            ? 'Synchronisierung fehlgeschlagen. Bitte später erneut versuchen.'
            : 'Fundamentaldaten konnten nicht geladen werden.';
        setFundamentalsError(msg);
      })
      .finally(() => setFundamentalsLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!symbol || detailTab !== 'fundamentals') return;
    loadFundamentals();
  }, [symbol, detailTab, loadFundamentals]);

  useEffect(() => {
    if (!symbol) return;
    loadMeta();
  }, [symbol]);

  // Session 82.83c — Poll-Backoff (5s aktiv, 30s idle nach 2min) + Source-Tracking.
  // Schützt Twelve-Data-Free-Quota (800 Calls/Tag).
  useEffect(() => {
    if (!symbol) return undefined;
    const ACTIVE_MS = 5 * 1000;
    const IDLE_MS = 30 * 1000;
    const IDLE_AFTER_MS = 2 * 60 * 1000;
    const sym = String(symbol).toUpperCase();
    let cancelled = false;
    let lastActive = Date.now();
    let timerId = null;
    const markActive = () => { lastActive = Date.now(); };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(
      (evt) => window.addEventListener(evt, markActive, { passive: true }),
    );
    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const quotes = await fetchPortfolioJson(`/api/portfolio/quotes?symbols=${encodeURIComponent(sym)}`);
        if (cancelled) return;
        const q = (quotes || {})[sym];
        if (q && q.price != null) {
          setPrice({
            price: Number(q.price),
            change_abs: q.change_abs != null ? Number(q.change_abs) : null,
            change_pct: q.change_pct != null ? Number(q.change_pct) : null,
            currency: q.currency || 'USD',
            bid: q.bid != null ? Number(q.bid) : null,
            ask: q.ask != null ? Number(q.ask) : null,
            bid_size: q.bid_size != null ? Number(q.bid_size) : null,
            ask_size: q.ask_size != null ? Number(q.ask_size) : null,
            source: q.source || null,
            as_of: q.as_of || null,
            price_status: q.price_status || null,
          });
        }
      } catch { /* silent */ }
    };
    const schedule = () => {
      const idle = Date.now() - lastActive > IDLE_AFTER_MS;
      const delay = idle ? IDLE_MS : ACTIVE_MS;
      timerId = window.setTimeout(async () => {
        await tick();
        if (!cancelled) schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(
        (evt) => window.removeEventListener(evt, markActive),
      );
    };
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    loadHistory();
  }, [symbol, range]);

  const loadMeta = async () => {
    setLoadingMeta(true);
    const sym = String(symbol || '').toUpperCase();
    // Session 82.63 — vollständig Mongo-native.
    //   Quotes:    GET /api/portfolio/quotes?symbols=SYM  (auth-only)
    //   Position:  GET /api/portfolio/stock-positions      → clientseitig filtern
    //   Cash:      GET /api/portfolio/cash                 (buying_power == cash_available)
    //   Orders:    GET /api/portfolio/orders?limit=200     → clientseitig filtern
    //   Watchlist: watchlistApi.list()                     → clientseitig prüfen
    //
    // STOCK_METADATA_SOURCE=MINIMAL: `stocks`-Metadata (name/sector/exchange) hat
    // aktuell keinen Mongo-Endpoint — dekoratives Fallback via {symbol, currency}
    // aus dem Quote-Response, keine Erfindung von Sector/Exchange (Phase G).
    // REALIZED_PNL_SOURCE=BACKEND (Session 82.73): `_serialize_order.realized_pnl`
    // stammt authoritativ aus `order_executions.realized_profit_loss` und wird
    // clientseitig NUR summiert — nicht neu berechnet.

    // Non-auth: Quote reicht.
    if (!user) {
      try {
        const quotes = await fetchPortfolioJson(`/api/portfolio/quotes?symbols=${encodeURIComponent(sym)}`);
        const q = (quotes || {})[sym];
        if (q && q.price != null) {
          setPrice({
            price: Number(q.price),
            change_abs: q.change_abs != null ? Number(q.change_abs) : null,
            change_pct: q.change_pct != null ? Number(q.change_pct) : null,
            currency: q.currency || 'USD',
            bid: q.bid != null ? Number(q.bid) : null,
            ask: q.ask != null ? Number(q.ask) : null,
            bid_size: q.bid_size != null ? Number(q.bid_size) : null,
            ask_size: q.ask_size != null ? Number(q.ask_size) : null,
          });
          setStock({ symbol: sym, name: sym, currency: q.currency || 'USD' });
        } else {
          setPrice(null);
          setStock({ symbol: sym, name: sym, currency: 'USD' });
        }
      } catch {
        setPrice(null);
        setStock({ symbol: sym, name: sym, currency: 'USD' });
      }
      setLoadingMeta(false);
      return;
    }

    try {
      const [quotesData, positions, cash, orders, watchlistResp] = await Promise.all([
        fetchPortfolioJson(`/api/portfolio/quotes?symbols=${encodeURIComponent(sym)}`).catch(() => ({})),
        fetchPortfolioJson('/api/portfolio/stock-positions').catch(() => []),
        fetchPortfolioJson('/api/portfolio/cash').catch(() => null),
        fetchPortfolioJson('/api/portfolio/orders?limit=200').catch(() => []),
        watchlistApi.list().catch(() => ({ items: [] })),
      ]);

      // Quote / Metadata
      const q = (quotesData || {})[sym] || null;
      if (q && q.price != null) {
        setPrice({
          price: Number(q.price),
          change_abs: q.change_abs != null ? Number(q.change_abs) : null,
          change_pct: q.change_pct != null ? Number(q.change_pct) : null,
          currency: q.currency || 'USD',
          bid: q.bid != null ? Number(q.bid) : null,
          ask: q.ask != null ? Number(q.ask) : null,
          bid_size: q.bid_size != null ? Number(q.bid_size) : null,
          ask_size: q.ask_size != null ? Number(q.ask_size) : null,
        });
      } else {
        setPrice(null);
      }
      const currency = (q && q.currency) || 'USD';
      setStock({ symbol: sym, name: sym, currency });

      // Position (aktuelles Symbol)
      const pos = (positions || []).find((p) => String(p.symbol || '').toUpperCase() === sym) || null;
      setPosition(pos ? {
        id: pos.id,
        symbol: pos.symbol,
        quantity: Number(pos.quantity || 0),
        avg_cost: Number(pos.avg_cost || 0),
        cost_basis: Number(pos.cost_basis || 0),
      } : null);

      // Cash / Buying Power
      if (cash) {
        setCashBalance(Number(cash.cash_balance || 0));
        setCashAvailable(Number(cash.cash_available || 0));
        setBuyingPower(Number(cash.buying_power ?? cash.cash_available ?? 0));
      } else {
        setCashBalance(0);
        setCashAvailable(0);
        setBuyingPower(0);
      }

      // Orders (symbol client-side gefiltert)
      const symOrders = (orders || []).filter(
        (o) => String(o.symbol || '').toUpperCase() === sym,
      );
      setSymbolOrders(symOrders);
      const pendingSells = symOrders.filter(
        (o) => (o.side || '').toLowerCase() === 'sell' && (o.status || '').toLowerCase() === 'pending',
      );
      setPendingSellQty(pendingSells.reduce((s, o) => s + Number(o.quantity || 0), 0));

      // Session 82.73 — Realized P&L: authoritativ vom Backend
      // (`_serialize_order.realized_pnl` aus `order_executions.realized_profit_loss`).
      // Wir summieren ausschließlich Server-Werte für dieses Symbol — keine
      // frontendseitige Neu-Berechnung.
      let realizedSum = null;
      for (const o of symOrders) {
        if (o.realized_pnl == null) continue;
        const n = Number(o.realized_pnl);
        if (!Number.isFinite(n)) continue;
        realizedSum = (realizedSum ?? 0) + n;
      }
      setRealizedPnl(realizedSum);

      // Watchlist
      const wlItems = (watchlistResp && watchlistResp.items) || [];
      setWatched(wlItems.some((w) => String(w.symbol || '').toUpperCase() === sym));
    } catch (err) {
      console.warn('loadMeta failed:', err);
    }
    setLoadingMeta(false);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      // Session 82.58b — Mongo-native History via 82.58a-Endpoint. Backward-
      // compat: `points[].close` bleibt; additiv `open/high/low/volume` +
      // `stats`. Backend liefert `data_status` — bei "unavailable" leerer State.
      const url = `${getApiBase()}/api/stocks/${encodeURIComponent(symbol)}/history?range=${encodeURIComponent(range)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`history status ${res.status}`);
      const data = await res.json();
      // UI erwartete früher `ohlc[]` mit {t,o,h,l,c,v}. Aus `points[]` ableiten.
      setHistoryCurrency(data?.currency || null);
      const ohlcMapped = (data?.points || []).map((p) => ({
        t: Math.floor(Date.parse(p.timestamp) / 1000),
        o: p.open, h: p.high, l: p.low, c: p.close, v: p.volume,
      }));
      setOhlc(ohlcMapped);
    } catch (err) {
      console.error('History failed:', err);
      setOhlc([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // One 1-year pull per symbol → 52-week range, annualized volatility, 1Y return.
  // Session 82.58b — Backend liefert alle Stats fertig berechnet (82.58a).
  // Kein Frontend-Recalc mehr.
  useEffect(() => {
    if (!symbol) return;
    let active = true;
    (async () => {
      try {
        const url = `${getApiBase()}/api/stocks/${encodeURIComponent(symbol)}/history?range=1y`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`stats status ${res.status}`);
        const data = await res.json();
        if (!active) return;
        const s = data?.stats || null;
        if (!s || (s.fifty_two_week_high == null && s.fifty_two_week_low == null && s.one_year_return_pct == null)) {
          setStats(null);
          return;
        }
        setStats({
          week52High: s.fifty_two_week_high,
          week52Low: s.fifty_two_week_low,
          volatility: s.annualized_volatility_pct,
          return1y: s.one_year_return_pct,
          avgVolume: s.average_volume,
          open: s.open_of_day,
          currency: data?.currency || null,
        });
        const dres = await fetch(`${getApiBase()}/api/stocks/${encodeURIComponent(symbol)}/history?range=1d`);
        const dj = dres.ok ? await dres.json() : null;
        const dd = dj?.stats;
        if (active && dd) {
          setDayStats({ high: dd.day_high, low: dd.day_low, volume: dd.day_volume, open: dd.open_of_day, date: dd.day_date, currency: dj.currency || null });
        }
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [symbol]);

  const refreshPrice = async () => {
    // Session 82.63 — Mongo-native Quote-Refresh via Read-Through Cache.
    // Backend liefert `price_status ∈ fresh|stale|unavailable` (kein Fake-Fallback).
    try {
      const sym = String(symbol || '').toUpperCase();
      const quotes = await fetchPortfolioJson(`/api/portfolio/quotes?symbols=${encodeURIComponent(sym)}`);
      const q = (quotes || {})[sym];
      if (q && q.price != null) {
        setPrice({
          price: Number(q.price),
          change_abs: q.change_abs != null ? Number(q.change_abs) : null,
          change_pct: q.change_pct != null ? Number(q.change_pct) : null,
          currency: q.currency || 'USD',
          bid: q.bid != null ? Number(q.bid) : null,
          ask: q.ask != null ? Number(q.ask) : null,
          bid_size: q.bid_size != null ? Number(q.bid_size) : null,
          ask_size: q.ask_size != null ? Number(q.ask_size) : null,
        });
        toast.success('Kurs aktualisiert');
      } else {
        toast.error('Kein aktueller Kurs verfügbar.');
      }
    } catch (err) {
      toast.error('Kurs konnte nicht aktualisiert werden.');
    }
  };

  const verifyCoupon = async () => {
    const raw = couponCode.trim();
    if (!raw) {
      toast.error('Bitte Gutscheincode eingeben');
      return;
    }
    if (side !== 'buy') {
      toast.error('Gutscheine sind nur für Kaufaufträge gültig');
      return;
    }
    const q = Number(quantity);
    const px = orderType === 'limit' ? Number(limitPrice) : Number(price?.price);
    if (!q || q <= 0) {
      toast.error('Bitte zuerst Stückzahl angeben');
      return;
    }
    if (!px || px <= 0) {
      toast.error(orderType === 'limit' ? 'Bitte zuerst Limitkurs angeben' : 'Kein aktueller Kurs verfügbar');
      return;
    }
    setCouponCheckLoading(true);
    try {
      const preview = await portfolioOrderApi.peekCoupon({
        coupon_code: raw,
        side: 'buy',
        quantity: q,
        limit_price: px,
      });
      setCouponVerifiedPct(Number(preview.percent));
      setCouponPeekPreview(preview);
      toast.success(
        `Gutschein gültig: ${Number(preview.percent).toLocaleString('de-DE', { maximumFractionDigits: 2 })}% Rabatt (−${Number(preview.discount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })})`,
      );
    } catch (err) {
      setCouponVerifiedPct(null);
      setCouponPeekPreview(null);
      toast.error(err?.detail || 'Gutschein konnte nicht geprüft werden.');
    } finally {
      setCouponCheckLoading(false);
    }
  };

  const { refreshAll: refreshDashboard } = useDashboardData();

  const toggleWatchlist = async () => {
    // Session 82.20 · Depot Phase 3B — Mongo-native via FastAPI (`/api/watchlist`).
    if (!user) { toast.error('Bitte einloggen'); return; }
    const sym = String(symbol || '').toUpperCase();
    try {
      if (watched) {
        await watchlistApi.remove(sym);
        setWatched(false);
        toast.success('Aus Watchlist entfernt');
      } else {
        await watchlistApi.add({ symbol: sym });
        setWatched(true);
        toast.success('Zur Watchlist hinzugefügt');
      }
    } catch (err) {
      toast.error('Watchlist konnte nicht aktualisiert werden.');
    }
  };

  const reportInsufficientBuyingPower = (net, qty) => {
    // Session 82.63 — Supabase entfernt. Legacy-Telemetrie (best-effort log via
    // Supabase-Table `insufficient_buying_power_events`) hat kein Mongo-Äquivalent;
    // wird als Console-Warnung erhalten (kein Financial-Effect, kein User-Impact).
    try {
      console.info('[insufficient_buying_power]', {
        userId: user?.id,
        symbol,
        stockName: stock?.name,
        requiredAmount: net,
        availableAmount: buyingPower,
        quantity: qty,
        orderType,
        currency: price?.currency || stock?.currency || 'USD',
      });
    } catch { /* noop */ }
  };

  const submitOrder = async (e) => {
    e?.preventDefault?.();
    if (!user) { toast.error('Bitte einloggen'); return; }
    const qty = Number(quantity);
    if (!qty || qty <= 0) { toast.error('Bitte Stückzahl angeben'); return; }
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error('Stückzahl muss eine positive Ganzzahl sein');
      return;
    }
    if (orderType !== 'limit') {
      toast.error('Nur Limit-Orders sind derzeit möglich.');
      return;
    }
    const px = Number(limitPrice);
    if (!px || px <= 0) {
      toast.error('Bitte Limitkurs angeben');
      return;
    }

    const codeTrim = side === 'buy' ? couponCode.trim() : '';

    // UI-seitige Pre-Checks aus lokal geladenen Werten (Backend bleibt authoritativ).
    const gross = Math.round(qty * px * 100) / 100;
    const localDiscountPct = codeTrim && couponVerifiedPct != null ? Number(couponVerifiedPct) : null;
    const localNet = localDiscountPct != null
      ? Math.round((gross - gross * (localDiscountPct / 100)) * 100) / 100
      : gross;

    if (side === 'buy' && localNet > buyingPower) {
      setBuyingPowerError({ required: localNet, available: buyingPower });
      setSellSharesError(null);
      reportInsufficientBuyingPower(localNet, qty);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    setBuyingPowerError(null);

    const sellableQty = position
      ? Math.max(0, Math.round((Number(position.quantity) - pendingSellQty) * 10000) / 10000)
      : 0;
    if (side === 'sell' && qty > sellableQty) {
      setSellSharesError({ requested: qty, available: sellableQty });
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    setSellSharesError(null);

    setSubmitting(true);
    try {
      const payload = {
        symbol: String(symbol).toUpperCase(),
        side,
        order_type: 'limit',
        quantity: String(Math.trunc(qty)),
        limit_price: String(px.toFixed(2)),
        idempotency_key: idemKey,
      };
      if (codeTrim) payload.coupon_code = codeTrim;

      const order = await portfolioOrderApi.createOrder(payload);

      // Neuer Idempotenz-Key für die nächste Order.
      setIdemKey(
        (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      );

      toast.success('Auftrag eingereicht — wartet auf Bestätigung');
      setQuantity('');
      setNote('');
      setCouponCode('');
      setCouponVerifiedPct(null);
      setCouponPeekPreview(null);
      setBuyingPowerError(null);
      setSellSharesError(null);
      void loadMeta();
      try { refreshDashboard?.(); } catch (_) { /* noop */ }
    } catch (err) {
      const msg = err?.detail || err?.message || '';
      if (side === 'buy' && /Liquidität|Kaufkraft|Guthaben/i.test(msg)) {
        setBuyingPowerError({ required: localNet, available: buyingPower });
        setSellSharesError(null);
        reportInsufficientBuyingPower(localNet, qty);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      if (side === 'sell' && /Stücke|verfügbare Stücke|Bestand/i.test(msg)) {
        setSellSharesError({ requested: qty, available: sellableQty });
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      toast.error(msg || 'Auftrag konnte nicht eingereicht werden.');
    } finally {
      setSubmitting(false);
    }
  };

  const chartUp = useMemo(() => {
    if (ohlc.length < 2) return (price?.change_pct ?? 0) >= 0;
    const first = ohlc[0].c;
    const last = ohlc[ohlc.length - 1].c;
    return last >= first;
  }, [ohlc, price?.change_pct]);

  if (loadingMeta) {
    return (
      <div className="dashboard-theme min-h-screen bg-bank-bg flex items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-bank-text-muted" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="dashboard-theme min-h-screen bg-bank-bg flex flex-col items-center justify-center p-6 text-center">
        <LineIcon size={40} className="text-bank-text-muted/50 mb-3" />
        <p className="text-bank-text-muted mb-4">Aktie „{symbol}" nicht gefunden oder deaktiviert.</p>
        <Button onClick={() => navigate('/dashboard/handeln')} className="bg-bank-ink text-white hover:bg-bank-ink-hover">Zurück zum Markt</Button>
      </div>
    );
  }

  const currency = price?.currency || stock.currency || 'USD';
  const chg = price?.change_pct != null ? Number(price.change_pct) : null;
  const up = (chg ?? 0) >= 0;
  const refPx =
    orderType === 'limit' && limitPrice
      ? Number(limitPrice)
      : price?.price != null
        ? Number(price.price)
        : 0;
  const qtyNum = Number(quantity) || 0;
  const estGross = refPx > 0 && qtyNum > 0 ? Math.round(qtyNum * refPx * 10000) / 10000 : 0;
  const estDiscount =
    side === 'buy' && couponVerifiedPct != null && couponVerifiedPct > 0 && estGross > 0
      ? Math.round(estGross * (couponVerifiedPct / 100) * 100) / 100
      : 0;
  const estNet = Math.max(0, Math.round((estGross - estDiscount) * 100) / 100);
  const sellableQty = position
    ? Math.max(0, Math.round((Number(position.quantity) - pendingSellQty) * 10000) / 10000)
    : 0;

  const marketValue = position && (positionMetric?.price != null || price?.price != null)
    ? Number(position.quantity) * Number(positionMetric?.price ?? price?.price)
    : null;
  const portfolioWeight =
    portfolioTotal && marketValue && portfolioTotal > 0
      ? (marketValue / portfolioTotal) * 100
      : null;

  const inner = (
    <div className={embedded ? '' : 'dashboard-theme min-h-screen bg-bank-bg'}>
      <div className={embedded ? '' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8'}>
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
          <button onClick={() => navigate(embedded ? '/dashboard/aktien' : -1)} className="p-2 hover:bg-bank-border/25 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-bank-text-muted" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-bank-text">{stock.symbol}</h1>
              <span className="text-sm sm:text-base text-bank-text-muted truncate">{stock.name}</span>
              {stock.sector && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-bank-accent/15 text-bank-accent rounded-full">
                  {stock.sector}
                </span>
              )}
              {stock.exchange && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-bank-border/30 text-bank-text-muted rounded-full">
                  <Building2 size={10} /> {stock.exchange}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={toggleWatchlist} className={`gap-2 flex-1 sm:flex-none ${watched ? 'text-bank-accent-strong dark:text-bank-accent' : ''}`}>
              <Star size={15} fill={watched ? 'currentColor' : 'none'} />
              <span className="sm:hidden">{watched ? 'Beobachtet' : 'Beobachten'}</span>
              <span className="hidden sm:inline">{watched ? 'Beobachtet' : 'Beobachten'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={refreshPrice} className="gap-2 flex-1 sm:flex-none">
              <RefreshCw size={14} /> Kurs
            </Button>
          </div>
        </div>

        <div className="mb-4 flex border-b border-bank-border">
          {[
            { id: 'chart', label: 'Kurs', icon: LineIcon },
            { id: 'fundamentals', label: 'Kennzahlen', icon: Building2 },
            { id: 'news', label: 'News', icon: Newspaper },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDetailTab(id)}
              className={`relative flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors sm:flex-none sm:flex-row sm:gap-2 sm:px-4 ${
                detailTab === id ? 'text-bank-primary' : 'text-bank-text-muted hover:text-bank-text'
              }`}
            >
              <Icon size={16} strokeWidth={detailTab === id ? 2 : 1.5} />
              <span>{label}</span>
              {detailTab === id && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-bank-primary sm:inset-x-2" />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Left: price + chart */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5">
            {detailTab === 'chart' && (
            <>
            <div className="bg-white border border-bank-border rounded-xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-end justify-between flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div>
                  <p className="text-xs text-bank-text-muted mb-1 flex items-center gap-2">
                    <span>Aktueller Kurs</span>
                    {price?.source && (
                      <span
                        data-testid="price-source-badge"
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider border ${
                          price.source === 'twelvedata'
                            ? 'border-emerald-300/70 bg-emerald-50 text-emerald-700'
                            : price.source === 'yfinance' || price.source === 'fallback'
                            ? 'border-amber-300/70 bg-amber-50 text-amber-700'
                            : 'border-bank-border bg-bank-bg text-bank-text-muted'
                        }`}
                        title={
                          price.source === 'twelvedata'
                            ? 'Quelle: Twelve Data · Kurse können verzögert sein (EU-Aktien i. d. R. 15 Min.)'
                            : 'Quelle: Yahoo Finance · Kurse können verzögert sein (EU-Aktien i. d. R. 15 Min.)'
                        }
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                          price.source === 'twelvedata' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                        }`} />
                        {price.source}
                      </span>
                    )}
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-bank-text">
                    {price?.price != null ? formatCurrency(price.price, currency) : '–'}
                  </p>
                  {chg != null && (
                    <p className={`text-sm font-medium mt-1 inline-flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {price?.change_abs != null ? `${up ? '+' : ''}${Number(price.change_abs).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ` : ''}
                      ({formatPct(chg)})
                    </p>
                  )}
                  {(price?.bid != null || price?.ask != null) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-[12px]">
                      {price?.bid != null && (
                        <span className="text-bank-text-muted">
                          Geld{' '}
                          <strong className="tabular-nums text-bank-text">
                            {formatCurrency(price.bid, currency)}
                          </strong>
                          {price?.bid_size != null && (
                            <span className="ml-1 text-bank-text-muted">× {Number(price.bid_size).toLocaleString('de-DE')}</span>
                          )}
                        </span>
                      )}
                      {price?.ask != null && (
                        <span className="text-bank-text-muted">
                          Brief{' '}
                          <strong className="tabular-nums text-bank-text">
                            {formatCurrency(price.ask, currency)}
                          </strong>
                          {price?.ask_size != null && (
                            <span className="ml-1 text-bank-text-muted">× {Number(price.ask_size).toLocaleString('de-DE')}</span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Chart type toggle */}
                  <div className="inline-flex rounded-md border border-bank-border bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setChartType('area')}
                      title="Linie"
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${chartType === 'area' ? 'bg-bank-ink text-white' : 'text-bank-text-muted hover:text-bank-text'}`}
                    >
                      <Activity size={13} /> Linie
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType('candle')}
                      title="Kerzen"
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${chartType === 'candle' ? 'bg-bank-ink text-white' : 'text-bank-text-muted hover:text-bank-text'}`}
                    >
                      <CandleIcon size={13} /> Kerzen
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSma((v) => !v)}
                      title="SMA 20"
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${showSma ? 'bg-bank-primary/15 text-bank-primary' : 'text-bank-text-muted hover:text-bank-text'}`}
                    >
                      SMA 20
                    </button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {RANGES.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => setRange(r.key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${range === r.key
                          ? 'bg-bank-ink text-white border-bank-ink'
                          : 'bg-white text-bank-text-muted border-bank-border hover:bg-bank-bg'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="h-56 sm:h-72">
                {loadingHistory ? (
                  <div className="h-full flex items-center justify-center">
                    <RefreshCw size={20} className="animate-spin text-bank-text-muted/70" />
                  </div>
                ) : ohlc.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-bank-text-muted">
                    Keine Chartdaten verfügbar.
                  </div>
                ) : (
                  <Suspense
                    fallback={(
                      <div className="h-full flex items-center justify-center">
                        <RefreshCw size={20} className="animate-spin text-bank-text-muted/70" />
                      </div>
                    )}
                  >
                    <TradingChart
                      mode={chartType}
                      data={ohlc}
                      currency={historyCurrency || currency}
                      height={288}
                      showSma={showSma}
                      up={chartUp}
                    />
                  </Suspense>
                )}
              </div>
            </div>

            {/* Key figures */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Eröffnung</p>
                <p className="font-semibold text-bank-text">{dayStats?.open != null ? formatCurrency(dayStats.open, dayStats.currency || currency) : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Tages-Hoch</p>
                <p className="font-semibold text-bank-text">{dayStats?.high != null ? formatCurrency(dayStats.high, dayStats.currency || currency) : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Tages-Tief</p>
                <p className="font-semibold text-bank-text">{dayStats?.low != null ? formatCurrency(dayStats.low, dayStats.currency || currency) : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Vortag</p>
                <p className="font-semibold text-bank-text">{price?.prev_close != null ? formatCurrency(price.prev_close, currency) : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Volumen</p>
                <p className="font-semibold text-bank-text">{dayStats?.volume != null ? Number(dayStats.volume).toLocaleString('de-DE') : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Ø Volumen</p>
                <p className="font-semibold text-bank-text">{stats?.avgVolume != null ? Number(stats.avgVolume).toLocaleString('de-DE') : '–'}</p>
              </div>
            </div>

            {/* 52-week range + volatility + 1Y return */}
            {stats && (
              <div className="bg-white border border-bank-border rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-bank-text-muted mb-1">52-Wochen Hoch</p>
                    <p className="font-semibold text-bank-text">{formatCurrency(stats.week52High, stats.currency || currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-bank-text-muted mb-1">52-Wochen Tief</p>
                    <p className="font-semibold text-bank-text">{formatCurrency(stats.week52Low, stats.currency || currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-bank-text-muted mb-1">Volatilität (1J)</p>
                    <p className="font-semibold text-bank-text">{stats.volatility.toFixed(1).replace('.', ',')}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-bank-text-muted mb-1">Rendite (1J)</p>
                    <p className={`font-semibold ${stats.return1y >= 0 ? 'text-emerald-600' : 'text-bank-error'}`}>
                      {formatPct(stats.return1y)}
                    </p>
                  </div>
                </div>
                {/* 52-week position bar */}
                {price?.price != null && stats.week52High > stats.week52Low && (
                  <div className="mt-4">
                    <div className="relative h-1.5 rounded-full bg-bank-border/60">
                      <div
                        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-bank-ink shadow"
                        style={{
                          left: `${Math.min(100, Math.max(0, ((Number(price.price) - stats.week52Low) / (stats.week52High - stats.week52Low)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10.5px] text-bank-text-muted">
                      <span>{formatCurrency(stats.week52Low, stats.currency || currency)}</span>
                      <span>{formatCurrency(stats.week52High, stats.currency || currency)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
            )}

            {detailTab === 'fundamentals' && (
              <div className="bg-white border border-bank-border rounded-xl p-5 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-bank-text">Fundamentaldaten</h3>
                {fundamentalsLoading ? (
                  <div className="flex h-32 items-center justify-center text-sm text-bank-text-muted">
                    <RefreshCw size={18} className="animate-spin" />
                  </div>
                ) : fundamentalsError ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm text-bank-text-muted">{fundamentalsError}</p>
                    <button
                      type="button"
                      onClick={loadFundamentals}
                      className="rounded-md border border-bank-border px-3 py-1.5 text-sm font-medium text-bank-text transition-colors hover:bg-bank-bg"
                    >
                      Erneut laden
                    </button>
                  </div>
                ) : !fundamentals ? (
                  <p className="text-sm text-bank-text-muted">
                    Kennzahlen werden täglich synchronisiert und sind für dieses Symbol noch nicht verfügbar.
                  </p>
                ) : (
                  <>
                  {(() => {
                    const currency = fundamentals?.currency;
                    const rows = [
                      ['Marktkapitalisierung', fundamentals?.marketCap != null ? Number(fundamentals.marketCap).toLocaleString('de-DE') : null],
                      ['KGV', fundamentals?.peRatio != null ? Number(fundamentals.peRatio).toFixed(2) : null],
                      ['Forward-KGV', fundamentals?.forwardPE != null ? Number(fundamentals.forwardPE).toFixed(2) : null],
                      ['Dividendenrendite', fundamentals?.dividendYield != null ? `${fundamentals.dividendYield.toFixed(2)}%` : null],
                      ['Beta', fundamentals?.beta != null ? Number(fundamentals.beta).toFixed(2) : null],
                      ['EPS', fundamentals?.eps != null ? formatCurrency(fundamentals.eps, currency) : null],
                      ['Buchwert', fundamentals?.bookValue != null ? formatCurrency(fundamentals.bookValue, currency) : null],
                      ['52W Hoch', fundamentals?.fiftyTwoWeekHigh != null ? formatCurrency(fundamentals.fiftyTwoWeekHigh, currency) : null],
                      ['52W Tief', fundamentals?.fiftyTwoWeekLow != null ? formatCurrency(fundamentals.fiftyTwoWeekLow, currency) : null],
                    ].filter(([, val]) => val != null);
                    if (rows.length === 0) {
                      return (
                        <p className="text-sm text-bank-text-muted">
                          Für dieses Symbol sind derzeit keine Kennzahlen verfügbar.
                        </p>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        {rows.map(([label, val]) => (
                          <div key={label}>
                            <p className="text-xs text-bank-text-muted">{label}</p>
                            <p className="mt-1 font-semibold tabular-nums text-bank-text">{val}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  </>
                )}
              </div>
            )}

            {detailTab === 'news' && (
              <StockNewsPanel
                variant="tab"
                query={newsQueryFromName(stock.name, stock.symbol)}
              />
            )}
          </div>

          {/* Right: trade actions + position + order */}
          <DashboardStagger className="space-y-4">
            {user && (
              <DashboardStaggerItem>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSide('buy');
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="h-11 rounded-md bg-emerald-600 text-[14px] font-semibold text-white transition-colors hover:bg-emerald-700"
                  data-testid="stock-detail-buy-btn"
                >
                  Kaufen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSide('sell');
                    setCouponCode('');
                    setCouponVerifiedPct(null);
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="h-11 rounded-md bg-rose-600 text-[14px] font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  Verkaufen
                </button>
              </div>
              </DashboardStaggerItem>
            )}

            {/* Position card */}
            {position && (() => {
              const qty = Number(position.quantity);
              const costBasis = qty * Number(position.avg_cost || 0);
              const displayPrice = positionMetric?.price ?? price?.price;
              const marketVal = displayPrice != null ? qty * Number(displayPrice) : null;
              const unrealized = marketVal != null ? marketVal - costBasis : null;
              const totalReturnPct = costBasis > 0 && unrealized != null ? (unrealized / costBasis) * 100 : null;
              const posUp = (unrealized ?? 0) >= 0;
              const dailyPnl = price?.change_abs != null ? qty * Number(price.change_abs) : null;
              return (
                <DashboardStaggerItem>
                <DashboardPanel className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-bank-text-muted mb-3">Ihre Position</p>
                  {positionMetric?.isIpoValuation && (
                    <p className="mb-2 text-[11px] text-bank-text-muted">
                      Bewertung durch Emissionsbank (IPO-Bewertung)
                    </p>
                  )}
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-bank-text">
                      <span className="text-lg font-semibold">{qty.toLocaleString('de-DE', { maximumFractionDigits: 6 })}</span> Stücke
                    </p>
                    {marketVal != null && (
                      <p className="text-lg font-semibold tabular-nums text-bank-text">{formatCurrency(marketVal, currency)}</p>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-bank-border pt-3 text-xs">
                    <div>
                      <p className="text-bank-text-muted">Ø Einstand</p>
                      <p className="mt-0.5 font-medium tabular-nums text-bank-text">{formatCurrency(position.avg_cost, currency)}</p>
                    </div>
                    <div>
                      <p className="text-bank-text-muted">Einstandswert</p>
                      <p className="mt-0.5 font-medium tabular-nums text-bank-text">{formatCurrency(costBasis, currency)}</p>
                    </div>
                    {dailyPnl != null && (
                      <div>
                        <p className="text-bank-text-muted">Tages-G/V</p>
                        <p className={`mt-0.5 font-semibold tabular-nums ${dailyPnl >= 0 ? 'text-emerald-600' : 'text-bank-error'}`}>
                          {dailyPnl >= 0 ? '+' : ''}{formatCurrency(dailyPnl, currency)}
                        </p>
                      </div>
                    )}
                    {unrealized != null && (
                      <div>
                        <p className="text-bank-text-muted">Unrealisierte G/V</p>
                        <p className={`mt-0.5 font-semibold tabular-nums ${posUp ? 'text-emerald-600' : 'text-bank-error'}`}>
                          {posUp ? '+' : ''}{formatCurrency(unrealized, currency)}
                        </p>
                      </div>
                    )}
                    {totalReturnPct != null && (
                      <div>
                        <p className="text-bank-text-muted">Gesamtrendite</p>
                        <p className={`mt-0.5 font-semibold tabular-nums ${posUp ? 'text-emerald-600' : 'text-bank-error'}`}>
                          {formatPct(totalReturnPct)}
                        </p>
                      </div>
                    )}
                    {realizedPnl != null && (
                      <div>
                        <p className="text-bank-text-muted">Realisierte G/V</p>
                        <p className={`mt-0.5 font-semibold tabular-nums ${realizedPnl >= 0 ? 'text-emerald-600' : 'text-bank-error'}`}>
                          {realizedPnl >= 0 ? '+' : ''}{formatCurrency(realizedPnl, currency)}
                        </p>
                      </div>
                    )}
                    {portfolioWeight != null && (
                      <div>
                        <p className="text-bank-text-muted">Portfolio-Gewicht</p>
                        <p className="mt-0.5 font-semibold tabular-nums text-bank-text">
                          {portfolioWeight.toFixed(2).replace('.', ',')}%
                        </p>
                      </div>
                    )}
                  </div>
                </DashboardPanel>
                </DashboardStaggerItem>
              );
            })()}

            {/* Order form */}
            <DashboardStaggerItem>
            <DashboardPanel className="p-5" index={1}>
            <form ref={formRef} onSubmit={submitOrder}>
              <h3 className="text-base font-semibold text-bank-text mb-4">Auftrag erteilen</h3>

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => toast.info('Market-Orders sind derzeit noch nicht verfügbar. Bitte Limit-Order verwenden.')}
                  disabled
                  className={`flex-1 h-9 rounded-md text-[12px] font-medium border cursor-not-allowed opacity-60 ${orderType === 'market' ? 'bg-bank-primary text-white border-bank-primary' : 'border-bank-border text-bank-text-muted'}`}
                  data-testid="order-type-market"
                >
                  Markt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType('limit');
                    if (!limitPrice && price?.price != null) setLimitPrice(String(price.price));
                  }}
                  className={`flex-1 h-9 rounded-md text-[12px] font-medium border ${orderType === 'limit' ? 'bg-bank-primary text-white border-bank-primary' : 'border-bank-border text-bank-text-muted'}`}
                  data-testid="order-type-limit"
                >
                  Limit
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSide('buy')}
                  className={`flex-1 h-9 rounded-md text-[12px] font-medium border transition-colors ${side === 'buy'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-bank-border text-bank-text-muted hover:bg-emerald-50'}`}
                >
                  Kaufen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSide('sell');
                    setCouponCode('');
                    setCouponVerifiedPct(null);
                  }}
                  className={`flex-1 h-9 rounded-md text-[12px] font-medium border transition-colors ${side === 'sell'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'border-bank-border text-bank-text-muted hover:bg-rose-50'}`}
                >
                  Verkaufen
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-bank-text-muted mb-1">Stückzahl</label>
                  <Input
                    type="number" step="0.0001" min="0"
                    value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    placeholder="z.B. 10"
                  />
                </div>
                {orderType === 'limit' && (
                  <div>
                    <label className="block text-xs font-medium text-bank-text-muted mb-1">Limitkurs</label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder="Zielkurs"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-bank-text-muted mb-1">Notiz (optional)</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Limit, Kommentar..." />
                </div>
                {side === 'buy' && (
                  <div>
                    <label className="block text-xs font-medium text-bank-text-muted mb-1">Gutscheincode (optional)</label>
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponVerifiedPct(null);
                          setCouponPeekPreview(null);
                        }}
                        placeholder="z.B. A1B2C3D4E5F6"
                        className="flex-1 font-mono text-sm uppercase"
                        autoCapitalize="characters"
                        data-testid="coupon-code-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={couponCheckLoading || !couponCode.trim() || !quantity || !limitPrice}
                        onClick={verifyCoupon}
                        data-testid="coupon-verify-btn"
                      >
                        {couponCheckLoading ? '…' : 'Prüfen'}
                      </Button>
                    </div>
                    {couponPeekPreview && (
                      <p className="mt-1 text-[11px] text-emerald-700" data-testid="coupon-preview">
                        Rabatt {Number(couponPeekPreview.percent).toLocaleString('de-DE', { maximumFractionDigits: 2 })}% —
                        {' '}Brutto {Number(couponPeekPreview.gross).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })},
                        {' '}−{Number(couponPeekPreview.discount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })},
                        {' '}Netto {Number(couponPeekPreview.net).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 bg-bank-bg border border-bank-border rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-bank-text-muted">
                    {orderType === 'limit' ? 'Limitkurs' : 'Referenzkurs'}
                  </span>
                  <span className="font-medium text-bank-text">
                    {refPx > 0 ? formatCurrency(refPx, currency) : '–'}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-bank-text-muted">Brutto (geschätzt)</span>
                  <span className="font-medium text-bank-text">{estGross > 0 ? formatCurrency(estGross, currency) : '–'}</span>
                </div>
                {side === 'buy' && estDiscount > 0 && (
                  <div className="flex justify-between mb-1 text-emerald-700">
                    <span>Rabatt</span>
                    <span className="font-medium">− {formatCurrency(estDiscount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between mb-1">
                  <span className="text-bank-text-muted">
                    {side === 'buy' ? 'Netto (geschätzt)' : 'Geschätzter Erlös'}
                  </span>
                  <span className="font-semibold text-bank-text">
                    {estGross > 0 ? formatCurrency(side === 'buy' ? estNet : estGross, currency) : '–'}
                  </span>
                </div>
                {side === 'buy' ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-bank-text-muted">Kaufkraft</span>
                      <span className="font-medium text-bank-text">{formatCurrency(buyingPower, currency)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-0.5">
                      <span className="text-bank-text-muted">Verfügbar</span>
                      <span className="text-bank-text-muted">{formatCurrency(cashAvailable, currency)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs mt-0.5">
                    <span className="text-bank-text-muted">
                      Verfügbare Stücke
                      {pendingSellQty > 0 ? ' (abzgl. offene Aufträge)' : ''}
                    </span>
                    <span className="font-medium text-bank-text tabular-nums">
                      {sellableQty.toLocaleString('de-DE', { maximumFractionDigits: 6 })}
                    </span>
                  </div>
                )}
              </div>

              {buyingPowerError && side === 'buy' && (
                <div className="mt-4">
                  <InsufficientBuyingPowerAlert
                    requiredAmount={buyingPowerError.required}
                    availableAmount={buyingPowerError.available}
                    currency={currency}
                  />
                </div>
              )}

              {sellSharesError && side === 'sell' && (
                <div className="mt-4">
                  <InsufficientSharesAlert
                    requestedQty={sellSharesError.requested}
                    availableQty={sellSharesError.available}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !quantity}
                className={`w-full mt-4 h-11 text-white font-medium ${side === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {submitting ? 'Wird eingereicht...' : (side === 'buy' ? 'Kaufauftrag einreichen' : 'Verkaufsauftrag einreichen')}
              </Button>

              <p className="text-[11px] text-bank-text-muted mt-3 leading-relaxed">
                Hinweis: Es besteht keine Anbindung an eine Börse oder einen Broker. Ihr Auftrag wird als Anfrage gespeichert
                und von unserem Team manuell geprüft; eine automatische Ausführung findet nicht statt.
                {orderType === 'limit' && ' Limit-Orders werden zum angegebenen Kurs zur Prüfung vorgelegt.'}
                {' '}Verkaufserlöse werden T+2 (2 Werktage) valutiert.
              </p>
            </form>
            </DashboardPanel>
            </DashboardStaggerItem>

            <DashboardStaggerItem>
            <div className="space-y-4">
            <StockDividendCard
              symbol={symbol}
              currency={currency}
              shares={position ? Number(position.quantity) : 0}
            />

            <StockEventsPanel symbol={symbol} />
            <PriceAlertPanel symbol={symbol} currentPrice={price?.price} currency={currency} />
            <TransactionHistoryPanel orders={symbolOrders} currency={currency} />
            </div>
            </DashboardStaggerItem>
          </DashboardStagger>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <PageContainer>{inner}</PageContainer>;
  }
  return inner;
};

export default StockDetail;
