import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchMarketIndices } from '@/services/marketService';
import { cn } from '@/lib/utils';
import { pnlTone } from '@/lib/dashboardFormatters';

/** Curated market briefing derived from live index data. */
const MarketOverviewWidget = () => {
  const [indices, setIndices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMarketIndices()
      .then((data) => {
        if (active) {
          setIndices(data || []);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const withData = indices.filter((i) => i.price != null && i.changePct != null);
  if (loaded && withData.length === 0) return null;

  const avgChg = withData.length
    ? withData.reduce((s, i) => s + Number(i.changePct), 0) / withData.length
    : 0;
  const upCount = withData.filter((i) => i.changePct >= 0).length;
  const downCount = withData.length - upCount;

  let headline = 'Markt im Gleichgewicht';
  let summary = 'Die wichtigsten Indizes bewegen sich seitwärts.';
  let tone = 'neutral';
  if (avgChg > 0.35) {
    headline = 'Risk-on Stimmung';
    summary = `${upCount} von ${withData.length} Indizes im Plus. Globale Märkte tendieren freundlich.`;
    tone = 'up';
  } else if (avgChg < -0.35) {
    headline = 'Vorsichtige Handelsstimmung';
    summary = `${downCount} Indizes unter Druck. Defensive Positionierung könnte sinnvoll sein.`;
    tone = 'down';
  } else if (upCount > downCount) {
    headline = 'Leicht positiver Tag';
    summary = 'Die Märkte zeigen eine vorsichtig optimistische Tendenz.';
    tone = 'up';
  }

  const Icon = tone === 'up' ? TrendingUp : tone === 'down' ? TrendingDown : Minus;

  return (
    <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            tone === 'up' && 'bg-emerald-50 text-emerald-600',
            tone === 'down' && 'bg-rose-50 text-rose-600',
            tone === 'neutral' && 'bg-slate-100 text-slate-600',
          )}
        >
          <Icon size={18} strokeWidth={1.6} />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-bank-text">Marktüberblick</h3>
          <p className="mt-1 text-[14px] font-medium text-bank-text">{headline}</p>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-bank-text-muted">{summary}</p>
      <ul className="mt-4 space-y-1.5">
        {(loaded ? withData : Array.from({ length: 3 })).slice(0, 4).map((idx, i) =>
          !idx ? (
            <li key={i} className="h-5 animate-pulse rounded bg-bank-border/40" />
          ) : (
            <li key={idx.symbol} className="flex items-center justify-between text-[12px]">
              <span className="text-bank-text-muted">{idx.label}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  pnlTone(idx.changePct),
                )}
              >
                {(idx.changePct ?? 0) >= 0 ? '+' : ''}
                {Number(idx.changePct).toFixed(2).replace('.', ',')}%
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
};

export default MarketOverviewWidget;
