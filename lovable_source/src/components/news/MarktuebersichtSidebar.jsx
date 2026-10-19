import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import MiniMarketChart from '@/components/news/MiniMarketChart';
import MarketComparisonChart from '@/components/news/MarketComparisonChart';
import { fetchMarketSparklinesBatch } from '@/services/marketSparklineService';
import {
  SIDEBAR_FOOTER_LINKS,
  fetchFeaturedStocks,
  fetchFrankfurtWinners,
  fetchMarketCommodities,
  fetchMarketForex,
  fetchMarketIndices,
  formatChangePct,
  formatLastUpdated,
  formatMarketPrice,
  MARKET_INDICES,
} from '@/services/marketService';
import { listPublicFeed } from '@/services/newsService';
import { cn } from '@/lib/utils';

const REFRESH_MS = 120_000;

const MAIN_TABS = [
  { id: 'indizes', label: 'Indizes' },
  { id: 'rohstoffe', label: 'Rohstoffe' },
  { id: 'devisen', label: 'Devisen' },
  { id: 'hotstuff', label: 'HotStuff' },
];

const INDEX_MODES = [
  { id: 'offiziell', label: 'Offiziell' },
  { id: 'indikation', label: 'Indikation' },
  { id: 'vergleich', label: 'Vergleichschart' },
];

const HOT_TABS = [
  { id: 'aktien', label: 'Aktien' },
  { id: 'gewinner', label: 'Gewinner' },
  { id: 'news', label: 'News' },
];

const MarketGridSkeleton = () => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="h-[116px] animate-pulse rounded-lg border border-bank-border/50 bg-bank-border/25"
      />
    ))}
  </div>
);

const MoversTable = ({ rows }) => (
  <div className="sidebar-scroll max-h-64 overflow-y-auto pr-1">
    <table className="w-full text-left text-[12px]">
      <thead>
        <tr className="border-b border-bank-border/60 text-bank-text-muted dark:border-white/10">
          <th className="py-2 pr-2 font-medium">Name</th>
          <th className="py-2 pr-2 text-right font-medium">Kurs</th>
          <th className="py-2 text-right font-medium">%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const up = (row.changePct ?? 0) >= 0;
          return (
            <tr
              key={row.symbol ?? row.name}
              className="border-b border-bank-border/40 dark:border-white/5"
            >
              <td className="max-w-[7.5rem] py-2 pr-2">
                <Link
                  to={`/aktien/${encodeURIComponent(row.symbol)}`}
                  className="line-clamp-2 text-bank-accent hover:underline"
                  title={row.name}
                >
                  {row.name}
                </Link>
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-bank-text">
                {formatMarketPrice(row.price, { currency: row.currency })}
              </td>
              <td
                className={cn(
                  'py-2 text-right font-semibold tabular-nums',
                  up ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                <span className="inline-flex items-center justify-end gap-0.5">
                  {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {formatChangePct(row.changePct)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const PopularNewsList = ({ items, loading }) => {
  if (loading) {
    return (
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-10 animate-pulse rounded bg-bank-border/40" />
        ))}
      </ul>
    );
  }
  if (!items.length) {
    return <p className="text-[12px] text-bank-text-muted">Keine Meldungen.</p>;
  }
  return (
    <ul className="sidebar-scroll max-h-64 divide-y divide-bank-border/50 overflow-y-auto pr-1 dark:divide-white/10">
      {items.map((article) => (
        <li key={article.id} className="py-2.5 first:pt-0">
          <Link
            to={`/news/${article.slug}`}
            className="line-clamp-3 text-[12px] leading-snug text-bank-accent hover:underline"
          >
            {article.title}
          </Link>
        </li>
      ))}
    </ul>
  );
};

const TabButton = ({ active, onClick, label, compact }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={cn(
      'shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
      compact
        ? cn(
            'rounded-full border px-3 py-1 text-[11px] font-medium',
            active
              ? 'border-bank-text text-bank-text'
              : 'border-bank-border text-bank-text-muted hover:border-bank-text/40',
          )
        : cn(
            'px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em]',
            active
              ? 'border-b-2 border-bank-gold text-bank-text'
              : 'text-bank-text-muted hover:text-bank-text',
          ),
    )}
  >
    {label}
  </button>
);

const SidebarPanel = ({ children }) => (
  <aside
    className="min-w-0 overflow-hidden rounded-xl border border-bank-border bg-white shadow-sm dark:border-white/10 dark:bg-bank-ink/30 lg:sticky lg:top-24"
    aria-label="Marktübersicht"
  >
    {children}
  </aside>
);

const MarktuebersichtSidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mainTab, setMainTab] = useState('indizes');
  const [indexMode, setIndexMode] = useState('offiziell');
  const [hotTab, setHotTab] = useState('gewinner');
  const [indices, setIndices] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [forex, setForex] = useState([]);
  const [movers, setMovers] = useState([]);
  const [popularNews, setPopularNews] = useState([]);
  const [sparklines, setSparklines] = useState({});
  const [sparklinesIndikation, setSparklinesIndikation] = useState({});
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [marketError, setMarketError] = useState(false);
  const [loadingHot, setLoadingHot] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);

  const loadMarketData = useCallback(async () => {
    setLoadingMarket(true);
    setMarketError(false);
    try {
      const [idx, com, fx] = await Promise.all([
        fetchMarketIndices(),
        fetchMarketCommodities(),
        fetchMarketForex(),
      ]);
      setIndices(idx);
      setCommodities(com);
      setForex(fx);

      const symbols = [...idx, ...com, ...fx].map((i) => i.symbol);
      const [batch5m, batch15m] = await Promise.all([
        fetchMarketSparklinesBatch(symbols, { interval: '5m' }),
        fetchMarketSparklinesBatch(idx.map((i) => i.symbol), { interval: '15m' }),
      ]);
      setSparklines(batch5m);
      setSparklinesIndikation(batch15m);
    } catch {
      setMarketError(true);
    } finally {
      setLoadingMarket(false);
    }
  }, []);

  const loadHotStuff = useCallback(async () => {
    if (mainTab !== 'hotstuff') return;

    if (hotTab === 'news') {
      setLoadingNews(true);
      try {
        const { data } = await listPublicFeed({ tab: 'popular', limit: 12 });
        setPopularNews(data ?? []);
      } catch {
        setPopularNews([]);
      } finally {
        setLoadingNews(false);
      }
      return;
    }

    setLoadingHot(true);
    try {
      const rows =
        hotTab === 'gewinner'
          ? await fetchFrankfurtWinners(12)
          : await fetchFeaturedStocks(12);
      setMovers(rows);
    } catch {
      setMovers([]);
    } finally {
      setLoadingHot(false);
    }
  }, [mainTab, hotTab]);

  useEffect(() => {
    loadMarketData();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadMarketData();
    }, REFRESH_MS);

    const onVisibility = () => {
      if (!document.hidden) loadMarketData();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadMarketData]);

  useEffect(() => {
    if (mainTab !== 'hotstuff') return undefined;

    loadHotStuff();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadHotStuff();
    }, REFRESH_MS);

    const onVisibility = () => {
      if (!document.hidden) loadHotStuff();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mainTab, hotTab, loadHotStuff]);

  const marketItems = useMemo(() => {
    if (mainTab === 'indizes') return indices;
    if (mainTab === 'rohstoffe') return commodities;
    if (mainTab === 'devisen') return forex;
    return [];
  }, [mainTab, indices, commodities, forex]);

  const activeSparklines =
    mainTab === 'indizes' && indexMode === 'indikation'
      ? sparklinesIndikation
      : sparklines;

  const comparisonSeries = useMemo(() => {
    const out = {};
    for (const cfg of MARKET_INDICES) {
      out[cfg.symbol] = sparklines[cfg.symbol] ?? { points: [], prevClose: null };
    }
    return out;
  }, [sparklines]);

  const footerLink = SIDEBAR_FOOTER_LINKS[mainTab];

  const hotTitle =
    hotTab === 'news'
      ? 'Meistgelesene Nachrichten'
      : hotTab === 'gewinner'
        ? 'Größte Gewinner heute (Frankfurt)'
        : 'Meistgesuchte Aktien';

  const panelBody = (
  <div className="p-4">
      <h2 className="font-display text-lg font-medium text-bank-text">Marktübersicht</h2>

      <div
        className="mt-4 flex flex-wrap gap-x-0.5 border-b border-bank-border/70 pb-px dark:border-white/10"
        role="tablist"
        aria-label="Markt-Kategorien"
      >
        {MAIN_TABS.map((tab) => (
          <TabButton
            key={tab.id}
            active={mainTab === tab.id}
            onClick={() => setMainTab(tab.id)}
            label={tab.label}
          />
        ))}
      </div>

      {mainTab === 'indizes' && (
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Indizes-Modus"
        >
          {INDEX_MODES.map((mode) => (
            <TabButton
              key={mode.id}
              compact
              active={indexMode === mode.id}
              onClick={() => setIndexMode(mode.id)}
              label={mode.label}
            />
          ))}
        </div>
      )}

      {marketError && (
        <p className="mt-3 rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100" data-testid="market-error-hint">
          Marktdaten sind derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.
        </p>
      )}

      {!marketError && !loadingMarket && (marketItems[0]?.lastUpdated || marketItems[0]?.isDelayed) && (
        <p
          className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted"
          data-testid="market-last-updated"
        >
          {marketItems[0]?.lastUpdated && (
            <span>Letzte Aktualisierung: {formatLastUpdated(marketItems[0].lastUpdated)} Uhr</span>
          )}
          {marketItems[0]?.isDelayed && (
            <span aria-hidden className="text-bank-gold">·</span>
          )}
          {marketItems[0]?.isDelayed && (
            <span>Marktdaten zeitverzögert</span>
          )}
        </p>
      )}

      {mainTab === 'hotstuff' ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="HotStuff">
            {HOT_TABS.map((tab) => (
              <TabButton
                key={tab.id}
                compact
                active={hotTab === tab.id}
                onClick={() => setHotTab(tab.id)}
                label={tab.label}
              />
            ))}
          </div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-bank-text-muted">
            {hotTitle}
          </p>
          {hotTab === 'news' ? (
            <PopularNewsList items={popularNews} loading={loadingNews} />
          ) : loadingHot ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-bank-border/40" />
              ))}
            </div>
          ) : movers.length === 0 ? (
            <p className="text-[12px] text-bank-text-muted">Keine Daten verfügbar.</p>
          ) : (
            <MoversTable rows={movers} />
          )}
        </div>
      ) : mainTab === 'indizes' && indexMode === 'vergleich' ? (
        <div className="mt-4">
          {loadingMarket ? (
            <div className="h-40 animate-pulse rounded-lg bg-bank-border/30" />
          ) : (
            <MarketComparisonChart seriesMap={comparisonSeries} />
          )}
        </div>
      ) : (
        <div className="mt-4">
          {loadingMarket ? (
            <MarketGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {marketItems.map((item) => {
                const sp = activeSparklines[item.symbol];
                return (
                  <MiniMarketChart
                    key={item.symbol}
                    label={item.label}
                    price={item.price}
                    changePct={item.changePct}
                    points={sp?.points ?? []}
                    prevClose={sp?.prevClose}
                    decimals={item.decimals}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {footerLink && mainTab !== 'hotstuff' && !(mainTab === 'indizes' && indexMode === 'vergleich') && (
        <p className="mt-4 border-t border-bank-border/50 pt-3 dark:border-white/10">
          <Link
            to={footerLink.to}
            className="text-[12px] font-medium text-bank-accent hover:underline"
          >
            {footerLink.label}
          </Link>
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-bank-border bg-white px-4 py-3 text-left shadow-sm dark:border-white/10 dark:bg-bank-ink/30"
          aria-expanded={mobileOpen}
        >
          <span className="font-display text-base font-medium text-bank-text">
            Marktübersicht
          </span>
          <ChevronDown
            size={18}
            className={cn('text-bank-text-muted transition-transform', mobileOpen && 'rotate-180')}
          />
        </button>
        {mobileOpen && (
          <div className="mt-3">
            <SidebarPanel>{panelBody}</SidebarPanel>
          </div>
        )}
      </div>

      <div className="hidden lg:block">
        <SidebarPanel>{panelBody}</SidebarPanel>
      </div>

      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.35);
          border-radius: 999px;
        }
      `}</style>
    </>
  );
};

export default MarktuebersichtSidebar;
