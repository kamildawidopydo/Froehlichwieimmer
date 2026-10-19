import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '@/components/PageMeta';
import PublicNewsLayout from '@/components/news/PublicNewsLayout';
import CommodityChartCard from '@/components/news/CommodityChartCard';
import {
  CHART_RANGES,
  fetchChartHistoryBatch,
  ROHSTOFF_CHART_SECTIONS,
} from '@/lib/market/chartOverviewConfig';
import { cn } from '@/lib/utils';

const MarketChartsOverviewPage = () => {
  const [range, setRange] = useState('1y');
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);

  const allSymbols = useMemo(
    () => ROHSTOFF_CHART_SECTIONS.flatMap((s) => s.items.map((i) => i.symbol)),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChartHistoryBatch(allSymbols, range)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setHistory({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allSymbols, range]);

  return (
    <PublicNewsLayout showSidebar={false}>
      <PageMeta
        title="Rohstoffcharts"
        description="Rohstoffcharts: Gold, Silber, Öl und Erdgas im Zeitverlauf."
        path="/news/rohstoffcharts"
        noIndex
      />

      <nav className="mb-4 text-[12px] text-bank-text-muted">
        <Link to="/news" className="hover:text-bank-accent">
          News
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span className="text-bank-text">Rohstoffcharts</span>
      </nav>

      <h1 className="font-display text-2xl font-light text-bank-text">Rohstoffcharts</h1>

      <div
        className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-bank-border/70 pb-px"
        role="tablist"
        aria-label="Zeitraum"
      >
        {CHART_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={range === r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              'px-1 py-2 text-[13px] font-medium transition-colors',
              range === r.id
                ? 'border-b-2 border-bank-gold text-bank-text'
                : 'text-bank-text-muted hover:text-bank-text',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-bank-border/50 bg-bank-border/20"
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {ROHSTOFF_CHART_SECTIONS.map((section) => (
            <section key={section.title}>
              <div className="mb-4 rounded-lg border border-bank-border/80 border-t-[3px] border-t-bank-primary bg-white px-4 py-2.5 dark:border-white/10 dark:bg-bank-ink/20">
                <h2 className="text-[17px] font-semibold text-bank-primary dark:text-bank-text">
                  {section.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {section.items.map((item) => (
                  <CommodityChartCard
                    key={item.symbol}
                    label={item.label}
                    slug={item.slug}
                    points={history[item.symbol] ?? []}
                    range={range}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PublicNewsLayout>
  );
};

export default MarketChartsOverviewPage;
