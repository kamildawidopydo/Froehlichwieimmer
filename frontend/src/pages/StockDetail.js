import React, { useCallback, useEffect, useMemo, useState, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { watchlistApi } from '@/services/watchlistApi';
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
import { logInsufficientBuyingPowerEvent } from '@/lib/logInsufficientBuyingPower';
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

  // Order form state
  const [orderType, setOrderType] = useState('market'); // market | limit
  const [limitPrice, setLimitPrice] = useState('');
  const [side, setSide] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponVerifiedPct, setCouponVerifiedPct] = useState(null);
  const [couponCheckLoading, setCouponCheckLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [buyingPowerError, setBuyingPowerError] = useState(null);
  const [sellSharesError, setSellSharesError] = useState(null);
  const [pendingSellQty, setPendingSellQty] = useState(0);
  const formRef = useRef(null);

  useEffect(() => {
    setBuyingPowerError(null);
    setSellSharesError(null);
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

  useEffect(() => {
    if (!symbol) return;
    loadHistory();
  }, [symbol, range]);

  const loadMeta = async () => {
    setLoadingMeta(true);
    const tasks = [
      supabase.from('stocks').select('*').eq('symbol', symbol).maybeSingle(),
      supabase.from('stock_prices_cache').select('*').eq('symbol', symbol).maybeSingle(),
    ];
    if (user) {
      tasks.push(supabase.from('user_stock_watchlist').select('id').eq('user_id', user.id).eq('symbol', symbol).maybeSingle());
      tasks.push(supabase.from('user_stock_positions').select('*').eq('user_id', user.id).eq('symbol', symbol).maybeSingle());
      tasks.push(supabase.from('profiles').select('cash_balance, cash_available').eq('id', user.id).maybeSingle());
      tasks.push(
        supabase
          .from('user_stock_orders')
          .select('realized_pnl')
          .eq('user_id', user.id)
          .eq('symbol', symbol)
          .eq('side', 'sell')
          .eq('status', 'executed'),
      );
      tasks.push(
        supabase
          .from('user_stock_orders')
          .select('*')
          .eq('user_id', user.id)
          .eq('symbol', symbol)
          .order('created_at', { ascending: false })
          .limit(20),
      );
      tasks.push(
        supabase
          .from('user_stock_orders')
          .select('quantity')
          .eq('user_id', user.id)
          .eq('symbol', symbol)
          .eq('side', 'sell')
          .eq('status', 'pending'),
      );
    }
    const results = await Promise.all(tasks);
    setStock(results[0].data);
    setPrice(results[1].data);
    if (user) {
      setWatched(!!results[2].data);
      setPosition(results[3].data);
      setCashBalance(Number(results[4].data?.cash_balance || 0));
      setCashAvailable(Number(results[4].data?.cash_available ?? results[4].data?.cash_balance ?? 0));
      const { data: bp } = await supabase.rpc('get_user_buying_power', { p_user_id: user.id });
      setBuyingPower(Number(bp || results[4].data?.cash_available || 0));
      const sells = results[5]?.data || [];
      const rlzd = sells.reduce((s, o) => s + Number(o.realized_pnl || 0), 0);
      setRealizedPnl(sells.length > 0 ? rlzd : null);
      setSymbolOrders(results[6]?.data || []);
      const pendingSells = results[7]?.data || [];
      setPendingSellQty(pendingSells.reduce((s, o) => s + Number(o.quantity || 0), 0));
    }
    setLoadingMeta(false);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-history', { body: { symbol, range } });
      if (error) throw error;
      setOhlc(data?.ohlc || []);
    } catch (err) {
      console.error('History failed:', err);
      setOhlc([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // One 1-year pull per symbol → 52-week range, annualized volatility, 1Y return.
  useEffect(() => {
    if (!symbol) return;
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('stock-history', {
          body: { symbol, range: '1y' },
        });
        if (error) throw error;
        const closes = (data?.points || []).map((p) => p.c).filter((c) => typeof c === 'number');
        if (!active || closes.length < 2) {
          if (active) setStats(null);
          return;
        }
        const week52High = data?.fifty_two_week_high ?? Math.max(...closes);
        const week52Low = data?.fifty_two_week_low ?? Math.min(...closes);
        const returns = [];
        for (let i = 1; i < closes.length; i++) {
          if (closes[i - 1] > 0) returns.push(Math.log(closes[i] / closes[i - 1]));
        }
        const mean = returns.reduce((s, r) => s + r, 0) / (returns.length || 1);
        const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length || 1);
        const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // annualized %
        const return1y = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
        const bars = data?.ohlc || [];
        const vols = bars.map((b) => Number(b.v || 0)).filter((v) => v > 0);
        const avgVolume = vols.length ? Math.round(vols.reduce((s, v) => s + v, 0) / vols.length) : null;
        const open = bars.length ? bars[bars.length - 1].o : null;
        setStats({ week52High, week52Low, volatility, return1y, avgVolume, open });
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [symbol]);

  const refreshPrice = async () => {
    try {
      await supabase.functions.invoke('stock-prices', { body: { symbols: [symbol] } });
      const { data } = await supabase.from('stock_prices_cache').select('*').eq('symbol', symbol).maybeSingle();
      setPrice(data);
      toast.success('Kurs aktualisiert');
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
    setCouponCheckLoading(true);
    const { data, error } = await supabase.rpc('peek_stock_trade_coupon', { p_code: raw });
    setCouponCheckLoading(false);
    if (error) {
      toast.error('Gutschein konnte nicht geprüft werden.');
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row == null || row.percent == null) {
      toast.error('Code ungültig oder nicht mehr aktiv');
      setCouponVerifiedPct(null);
      return;
    }
    setCouponVerifiedPct(Number(row.percent));
    toast.success(`Gutschein gültig: ${Number(row.percent).toLocaleString('de-DE', { maximumFractionDigits: 2 })}% Rabatt`);
  };

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
    void logInsufficientBuyingPowerEvent(supabase, {
      userId: user.id,
      symbol,
      stockName: stock?.name,
      requiredAmount: net,
      availableAmount: buyingPower,
      quantity: qty,
      orderType,
      currency: price?.currency || stock?.currency || 'USD',
    });
  };

  const submitOrder = async (e) => {
    e?.preventDefault?.();
    if (!user) { toast.error('Bitte einloggen'); return; }
    const qty = Number(quantity);
    if (!qty || qty <= 0) { toast.error('Bitte Stückzahl angeben'); return; }
    const px = orderType === 'limit' ? Number(limitPrice) : Number(price.price);
    if (!px || px <= 0) {
      toast.error(orderType === 'limit' ? 'Bitte Limitkurs angeben' : 'Kein aktueller Kurs verfügbar');
      return;
    }

    const gross = Math.round(qty * px * 10000) / 10000;
    let discountPct = null;
    const codeTrim = side === 'buy' ? couponCode.trim() : '';

    if (codeTrim) {
      const { data: peekRows, error: peekErr } = await supabase.rpc('peek_stock_trade_coupon', { p_code: codeTrim });
      if (peekErr) {
        toast.error('Gutschein konnte nicht geprüft werden.');
        return;
      }
      const prow = Array.isArray(peekRows) ? peekRows[0] : peekRows;
      if (prow == null || prow.percent == null) {
        toast.error('Ungültiger oder inaktiver Gutscheincode');
        return;
      }
      discountPct = Number(prow.percent);
    }

    const discountAmt =
      side === 'buy' && discountPct != null && discountPct > 0
        ? Math.round((gross * (discountPct / 100)) * 100) / 100
        : 0;
    const net = Math.round((gross - discountAmt) * 100) / 100;

    if (side === 'buy' && net > buyingPower) {
      setBuyingPowerError({ required: net, available: buyingPower });
      setSellSharesError(null);
      reportInsufficientBuyingPower(net, qty);
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
    const noteValue = note.trim() || null;
    const { data: orderId, error } = await supabase.rpc('submit_user_stock_order', {
      p_symbol: symbol,
      p_side: side,
      p_quantity: qty,
      p_requested_price: px,
      p_note: noteValue,
      p_coupon_code: codeTrim || null,
      p_order_type: orderType,
      p_limit_price: orderType === 'limit' ? px : null,
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message || '';
      if (side === 'buy' && /Nicht genug Guthaben|Kaufkraft/i.test(msg)) {
        setBuyingPowerError({ required: net, available: buyingPower });
        setSellSharesError(null);
        reportInsufficientBuyingPower(net, qty);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      if (side === 'sell' && /Nicht genügend Stücke/i.test(msg)) {
        const sellableQty = position
          ? Math.max(0, Math.round((Number(position.quantity) - pendingSellQty) * 10000) / 10000)
          : 0;
        setSellSharesError({ requested: qty, available: sellableQty });
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      toast.error('Auftrag konnte nicht eingereicht werden.');
      return;
    }
    if (!orderId) {
      toast.error('Auftrag konnte nicht angelegt werden');
      return;
    }

    const { data: inserted } = await supabase
      .from('user_stock_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    toast.success('Auftrag eingereicht — wartet auf Bestätigung');
    setQuantity('');
    setNote('');
    setCouponCode('');
    setCouponVerifiedPct(null);
    setBuyingPowerError(null);
    setSellSharesError(null);
    void loadMeta();

    try {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      console.log('[send-stock-email] invoking submitted for', user.email);
      supabase.functions.invoke('send-stock-email', {
        body: {
          type: 'submitted',
          to: user.email,
          user_name: fullName || null,
          order: {
            symbol,
            side,
            quantity: qty,
            requested_price: px,
            total: net,
            gross_amount: gross,
            discount_percent: discountPct,
            discount_amount: discountAmt > 0 ? discountAmt : null,
            net_amount: net,
            currency: price?.currency || stock?.currency || 'USD',
            note: noteValue,
            created_at: inserted?.created_at || new Date().toISOString(),
          },
        },
      }).then(({ data, error: emErr }) => {
        if (emErr) console.warn('[send-stock-email] error:', emErr);
        else console.log('[send-stock-email] ok:', data);
      }).catch((err) => console.warn('[send-stock-email] threw:', err));
    } catch (err) {
      console.warn('[send-stock-email] outer catch:', err);
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
                  <p className="text-xs text-bank-text-muted mb-1">Aktueller Kurs</p>
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
                      currency={currency}
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
                <p className="font-semibold text-bank-text">{stats?.open != null ? formatCurrency(stats.open, currency) : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Tages-Hoch</p>
                <p className="font-semibold text-bank-text">{price?.day_high != null ? formatCurrency(price.day_high, currency) : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Tages-Tief</p>
                <p className="font-semibold text-bank-text">{price?.day_low != null ? formatCurrency(price.day_low, currency) : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Vortag</p>
                <p className="font-semibold text-bank-text">{price?.prev_close != null ? formatCurrency(price.prev_close, currency) : '–'}</p>
              </div>
              <div className="bg-white border border-bank-border rounded-lg p-4">
                <p className="text-xs text-bank-text-muted mb-1">Volumen</p>
                <p className="font-semibold text-bank-text">{price?.volume != null ? Number(price.volume).toLocaleString('de-DE') : '–'}</p>
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
                    <p className="font-semibold text-bank-text">{formatCurrency(stats.week52High, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-bank-text-muted mb-1">52-Wochen Tief</p>
                    <p className="font-semibold text-bank-text">{formatCurrency(stats.week52Low, currency)}</p>
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
                      <span>{formatCurrency(stats.week52Low, currency)}</span>
                      <span>{formatCurrency(stats.week52High, currency)}</span>
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
                  onClick={() => setOrderType('market')}
                  className={`flex-1 h-9 rounded-md text-[12px] font-medium border ${orderType === 'market' ? 'bg-bank-primary text-white border-bank-primary' : 'border-bank-border text-bank-text-muted'}`}
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
                        }}
                        placeholder="z.B. A1B2C3D4E5F6"
                        className="flex-1 font-mono text-sm uppercase"
                        autoCapitalize="characters"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={couponCheckLoading || !couponCode.trim()}
                        onClick={verifyCoupon}
                      >
                        {couponCheckLoading ? '…' : 'Prüfen'}
                      </Button>
                    </div>
                    {couponVerifiedPct != null && (
                      <p className="mt-1 text-[11px] text-emerald-700">
                        Rabatt: {Number(couponVerifiedPct).toLocaleString('de-DE', { maximumFractionDigits: 2 })}% (geschätzt auf Referenzkurs)
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
                Hinweis: Aufträge werden von unserem Team manuell geprüft und ausgeführt.
                {orderType === 'limit' && ' Limit-Orders werden zum angegebenen Kurs zur Freigabe vorgelegt.'}
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
