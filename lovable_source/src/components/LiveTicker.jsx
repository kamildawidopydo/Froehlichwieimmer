import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { fetchFeaturedStocks } from '@/services/marketService';

/**
 * Session 82.40 · LiveTicker Cutover.
 * Datenquelle: FastAPI `/api/news-markte/market/stocks` (batch, Mongo-native).
 * Non-CRITICAL Widget — Fehler triggern kein globales Dashboard-Banner.
 */

const REFRESH_MS = 60_000;
const STORAGE_KEY = 'liveTickerHidden';
const HEIGHT = '52px';

const formatPrice = (v, currency = 'EUR') =>
  v == null ? '–' : Number(v).toLocaleString('de-DE', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const LiveTicker = () => {
  const [items, setItems] = useState([]);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [prevPrices, setPrevPrices] = useState({});
  const flashRef = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--live-ticker-h', hidden ? '0px' : HEIGHT);
    return () => { root.style.setProperty('--live-ticker-h', '0px'); };
  }, [hidden]);

  const fetchPrices = async () => {
    try {
      // Session 82.40 · Mongo-native via marketService (Alpha-Vantage backed).
      // Non-CRITICAL: bei Fehler bleibt der Ticker leer/versteckt — kein Banner.
      const rows = await fetchFeaturedStocks(40, 'EUR');
      const filtered = (rows || []).filter((r) => r.price != null);

      setPrevPrices((prev) => {
        const flash = {};
        filtered.forEach((r) => {
          const old = prev[r.symbol];
          if (old != null && Number(old) !== Number(r.price)) {
            flash[r.symbol] = Number(r.price) > Number(old) ? 'up' : 'down';
          }
        });
        flashRef.current = flash;
        setTimeout(() => { flashRef.current = {}; }, 1500);
        const next = {};
        filtered.forEach((r) => { next[r.symbol] = r.price; });
        return next;
      });

      setItems(filtered);
    } catch (err) {
      console.error('LiveTicker fetch failed', err);
    }
  };

  const toggleHidden = () => {
    setHidden((h) => {
      const next = !h;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  if (items.length === 0) return null;

  if (hidden) {
    return (
      <button
        onClick={toggleHidden}
        className="fixed bottom-3 right-4 z-40 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bank-text text-white text-xs font-medium shadow-lg hover:bg-bank-text/90 transition-colors"
        title="Live-Kurse einblenden"
        data-testid="live-ticker-show"
      >
        <Activity size={13} className="text-emerald-400" />
        Live-Kurse
        <ChevronUp size={13} />
      </button>
    );
  }

  const renderRow = (keyPrefix) => (
    <div className="flex items-center gap-6 px-6 shrink-0">
      {items.map((r) => {
        const up = Number(r.changePct ?? 0) >= 0;
        const Icon = up ? ArrowUpRight : ArrowDownRight;
        const flash = flashRef.current[r.symbol];
        return (
          <button
            key={`${keyPrefix}-${r.symbol}`}
            onClick={() => navigate(`/aktien/${encodeURIComponent(r.symbol)}`)}
            className={`group inline-flex items-center gap-1.5 text-sm whitespace-nowrap transition-all ${
              flash === 'up' ? 'animate-flash-up' : flash === 'down' ? 'animate-flash-down' : ''
            }`}
            title={r.isDelayed ? 'Zeitverzögert' : undefined}
          >
            <span className="font-bold text-white group-hover:text-bank-accent transition-colors">{r.symbol}</span>
            <span className="text-white/90 tabular-nums">{formatPrice(r.price, r.currency)}</span>
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
              <Icon size={12} />
              {Number(r.changePct ?? 0) >= 0 ? '+' : ''}{Number(r.changePct ?? 0).toFixed(2)}%
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .live-ticker-track {
          display: flex;
          width: max-content;
          animation: ticker-scroll 90s linear infinite;
          will-change: transform;
        }
        .live-ticker-wrap:hover .live-ticker-track {
          animation-play-state: paused;
        }
        @keyframes flash-up {
          0% { background-color: rgba(16, 185, 129, 0); }
          30% { background-color: rgba(16, 185, 129, 0.35); }
          100% { background-color: rgba(16, 185, 129, 0); }
        }
        @keyframes flash-down {
          0% { background-color: rgba(244, 63, 94, 0); }
          30% { background-color: rgba(244, 63, 94, 0.35); }
          100% { background-color: rgba(244, 63, 94, 0); }
        }
        .animate-flash-up {
          animation: flash-up 1.4s ease-out;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .animate-flash-down {
          animation: flash-down 1.4s ease-out;
          padding: 2px 6px;
          border-radius: 6px;
        }
      `}</style>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1117]/95 backdrop-blur text-white border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.25)]"
        style={{ height: HEIGHT }}
        data-testid="live-ticker"
      >
        <div className="relative h-full flex items-center">
          <div className="hidden sm:flex items-center gap-1.5 pl-4 pr-3 h-full text-[10px] font-semibold uppercase tracking-wider border-r border-white/10 text-emerald-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
          <div className="live-ticker-wrap flex-1 overflow-hidden h-full flex items-center">
            <div className="live-ticker-track">
              {renderRow('a')}
              {renderRow('b')}
            </div>
          </div>
          <div className="absolute left-[56px] hidden sm:block top-0 bottom-0 w-10 bg-gradient-to-r from-[#0d1117] to-transparent pointer-events-none" />
          <div className="absolute right-[40px] top-0 bottom-0 w-16 bg-gradient-to-l from-[#0d1117] to-transparent pointer-events-none" />
          <button
            onClick={toggleHidden}
            className="relative z-10 p-2 mr-1 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            title="Ausblenden"
            aria-label="Live-Ticker ausblenden"
            data-testid="live-ticker-hide"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </>
  );
};

export default LiveTicker;
