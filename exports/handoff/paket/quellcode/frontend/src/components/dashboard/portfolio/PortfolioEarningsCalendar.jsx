import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { fetchStockEvents } from '@/services/stockEventsService';
import { formatEUR } from '@/lib/dashboardFormatters';

const PortfolioEarningsCalendar = () => {
  const { stockMetrics } = useDashboardData();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const symbols = (stockMetrics || []).map((m) => m.symbol).filter(Boolean);

  useEffect(() => {
    let active = true;
    if (symbols.length === 0) {
      setEvents([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    fetchStockEvents(symbols)
      .then((list) => {
        if (active) setEvents(list || []);
      })
      .catch(() => {
        if (active) setEvents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [symbols.join(',')]);

  if (!loading && events.length === 0) return null;

  return (
    <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
      <h3 className="mb-4 inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
        <CalendarClock size={16} className="text-bank-primary" />
        Termine (Dividenden & Ergebnisse)
      </h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-bank-border/40" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-bank-border/70">
          {events.slice(0, 8).map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="font-mono text-[13px] font-semibold text-bank-text">{ev.symbol}</p>
                <p className="text-[12px] text-bank-text-muted">{ev.label}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[12px] font-medium tabular-nums text-bank-text">
                  {ev.date
                    ? new Date(ev.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '–'}
                </p>
                {ev.amount != null && (
                  <p className="text-[11px] tabular-nums text-emerald-600">{formatEUR(ev.amount)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PortfolioEarningsCalendar;
