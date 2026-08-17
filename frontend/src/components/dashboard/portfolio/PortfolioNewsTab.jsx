import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { useNewsList } from '@/hooks/useNewsList';
import NewsCard from '@/components/dashboard/news/NewsCard';

const PortfolioNewsTab = () => {
  const { stockMetrics, stockCatalog } = useDashboardData();
  const query = useMemo(() => {
    const names = (stockMetrics || [])
      .slice(0, 5)
      .map((m) => {
        const cat = stockCatalog?.find((s) => s.symbol === m.symbol);
        return (cat?.name || m.stockName || m.symbol).split(/[\s,]+/)[0];
      })
      .filter(Boolean);
    return names.length ? names.join(' OR ') : 'Aktien Markt';
  }, [stockMetrics, stockCatalog]);

  const { items, loading } = useNewsList({ source: 'articles', search: query, tab: 'recent' });
  const articles = (items || []).slice(0, 9);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
          <Newspaper size={16} /> News zu Ihren Positionen
        </h3>
        <Link to="/dashboard/news" className="text-[13px] font-medium text-bank-primary hover:underline">
          Alle News
        </Link>
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-bank-border/40" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-[13px] text-bank-text-muted">Keine passenden Artikel gefunden.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <NewsCard key={a.id || a.slug} article={a} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioNewsTab;
