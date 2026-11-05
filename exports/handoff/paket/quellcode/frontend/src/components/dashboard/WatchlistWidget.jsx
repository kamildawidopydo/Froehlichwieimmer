import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, X } from 'lucide-react';
import { useDashboardData } from '@/context/DashboardDataContext';
import Sparkline from '@/components/dashboard/charts/Sparkline';
import { cn } from '@/lib/utils';
import { pnlTone } from '@/lib/dashboardFormatters';

const WatchlistWidget = ({ sparklines = {} }) => {
  const navigate = useNavigate();
  const { watchlistItems, stockPriceMap, removeFromWatchlist } = useDashboardData();
  const items = (watchlistItems || []).slice(0, 5);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
        <h3 className="mb-2 inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
          <Star size={16} className="text-amber-500" /> Watchlist
        </h3>
        <p className="text-[13px] text-bank-text-muted">Noch keine Symbole beobachtet.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/handeln')}
          className="mt-3 text-[13px] font-medium text-bank-primary hover:underline"
        >
          Zum Markt →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
          <Star size={16} className="text-amber-500" /> Watchlist
        </h3>
        <button
          type="button"
          onClick={() => navigate('/dashboard/aktien')}
          className="text-[12px] font-medium text-bank-primary hover:underline"
        >
          Alle
        </button>
      </div>
      <ul className="divide-y divide-bank-border/70">
        {items.map((w) => {
          const p = stockPriceMap[w.symbol];
          const chg = p?.change_pct != null ? Number(p.change_pct) : null;
          const up = (chg ?? 0) >= 0;
          const currency = p?.currency || 'EUR';
          return (
            <li key={w.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/aktien/${encodeURIComponent(w.symbol)}`)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="font-mono text-[13px] font-semibold text-bank-text">{w.symbol}</p>
                <p className="truncate text-[11px] text-bank-text-muted">{w.stocks?.name || ''}</p>
              </button>
              <Sparkline values={sparklines[w.symbol]} up={up} width={56} height={22} />
              <div className="w-16 text-right">
                <p className="text-[12px] font-semibold tabular-nums text-bank-text">
                  {p?.price != null
                    ? Number(p.price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
                    : '–'}
                </p>
                {chg != null && (
                <p className={cn('text-[10px] font-medium tabular-nums', pnlTone(chg))}>
                    {up ? '+' : ''}
                    {chg.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFromWatchlist(w.symbol)}
                className="text-bank-text-muted hover:text-rose-600"
                aria-label="Entfernen"
              >
                <X size={13} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default WatchlistWidget;
