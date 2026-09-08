import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  LineChart,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  fetchFeaturedStocks,
  formatChangePct,
  formatDisplayPrice,
} from '@/services/marketService';

/**
 * Session 82.40 · MarketOverview Widget Cutover.
 *
 * Datenquelle: FastAPI `/api/news-markte/market/stocks` (Alpha-Vantage-backed,
 * Mongo-native via marketService.js) — kein direkter Supabase-Read mehr.
 * Non-CRITICAL Widget → Fetch-Fehler triggern kein globales Dashboard-Banner.
 */

const formatTime = (iso) => {
  if (!iso) return '–';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return d.toLocaleString('de-DE');
};

const MarketOverview = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('change_desc');

  const load = async () => {
    setError(null);
    try {
      const stocks = await fetchFeaturedStocks(40, 'EUR');
      setRows(Array.isArray(stocks) ? stocks : []);
    } catch (err) {
      // Non-critical: local error only, kein globaler Banner.
      console.error('MarketOverview fetch failed', err);
      setError('Marktdaten derzeit nicht verfügbar');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const src = term
      ? rows.filter((r) => [r.symbol, r.name].filter(Boolean).join(' ').toLowerCase().includes(term))
      : rows;
    const sorted = [...src];
    switch (sortBy) {
      case 'change_desc':
        sorted.sort((a, b) => (Number(b.changePct) || -Infinity) - (Number(a.changePct) || -Infinity));
        break;
      case 'change_asc':
        sorted.sort((a, b) => (Number(a.changePct) || Infinity) - (Number(b.changePct) || Infinity));
        break;
      case 'symbol':
        sorted.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
        break;
      default:
        break;
    }
    return sorted;
  }, [rows, searchTerm, sortBy]);

  const withChange = filtered.filter((r) => r.changePct != null);
  const topGainers = [...withChange].sort((a, b) => Number(b.changePct) - Number(a.changePct)).slice(0, 5);
  const topLosers = [...withChange].sort((a, b) => Number(a.changePct) - Number(b.changePct)).slice(0, 5);
  const lastUpdate = rows.reduce((latest, r) => {
    if (!r.lastUpdated) return latest;
    const t = new Date(r.lastUpdated).getTime();
    return t > latest ? t : latest;
  }, 0);

  if (loading) {
    return (
      <div className="bg-white border border-bank-border rounded-xl p-12 text-center" data-testid="market-overview-loading">
        <RefreshCw size={22} className="animate-spin text-bank-text-muted/70 mx-auto mb-3" />
        <p className="text-bank-text-muted text-sm">Marktdaten werden geladen...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="bg-white border border-bank-border rounded-xl p-12 text-center"
        data-testid="market-overview-empty"
      >
        <LineChart size={40} className="text-bank-text-muted/45 mx-auto mb-4" />
        <p className="text-bank-text-muted mb-2">
          {error || 'Derzeit keine Marktdaten verfügbar'}
        </p>
        <p className="text-xs text-bank-text-muted/80">
          Wir versuchen es in wenigen Minuten erneut. Kein Handlungsbedarf.
        </p>
        <Button
          variant="outline"
          onClick={() => { setRefreshing(true); load(); }}
          disabled={refreshing}
          className="mt-4 gap-2 h-9"
          data-testid="market-overview-retry"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="market-overview-widget">
      {/* Top Gewinner / Verlierer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-bank-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-bank-border bg-emerald-50/50">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" />
              <h3 className="text-sm font-semibold text-bank-text">Top Gewinner</h3>
            </div>
            <span className="text-xs text-bank-text-muted">Heute</span>
          </div>
          <div className="divide-y divide-bank-border/60">
            {topGainers.length === 0 ? (
              <div className="py-6 text-center text-xs text-bank-text-muted">Keine Daten</div>
            ) : (
              topGainers.map((r) => {
                const disp = formatDisplayPrice(r);
                return (
                  <div key={`g-${r.symbol}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-bank-bg transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-bank-text">{r.symbol}</p>
                      <p className="text-xs text-bank-text-muted truncate">{r.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-bank-text">{disp.primary}</p>
                      <p className="text-xs font-medium text-emerald-600 inline-flex items-center gap-0.5">
                        <ArrowUpRight size={11} /> +{formatChangePct(r.changePct)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white border border-bank-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-bank-border bg-rose-50/50">
            <div className="flex items-center gap-2">
              <TrendingDown size={16} className="text-rose-600" />
              <h3 className="text-sm font-semibold text-bank-text">Top Verlierer</h3>
            </div>
            <span className="text-xs text-bank-text-muted">Heute</span>
          </div>
          <div className="divide-y divide-bank-border/60">
            {topLosers.length === 0 ? (
              <div className="py-6 text-center text-xs text-bank-text-muted">Keine Daten</div>
            ) : (
              topLosers.map((r) => {
                const disp = formatDisplayPrice(r);
                return (
                  <div key={`l-${r.symbol}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-bank-bg transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-bank-text">{r.symbol}</p>
                      <p className="text-xs text-bank-text-muted truncate">{r.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-bank-text">{disp.primary}</p>
                      <p className="text-xs font-medium text-rose-600 inline-flex items-center gap-0.5">
                        <ArrowDownRight size={11} /> -{formatChangePct(r.changePct)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Marktübersicht-Tabelle */}
      <div className="bg-white border border-bank-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 border-b border-bank-border">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-bank-text">Marktübersicht</h3>
            <p className="text-xs text-bank-text-muted">
              {lastUpdate > 0 ? `Zuletzt aktualisiert: ${formatTime(new Date(lastUpdate).toISOString())}` : 'Keine Zeitangabe verfügbar'}
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..."
              className="pl-8 h-9 text-sm"
              data-testid="market-overview-search"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 border border-bank-border rounded-md bg-white text-sm"
            data-testid="market-overview-sort"
          >
            <option value="change_desc">Änderung ↓</option>
            <option value="change_asc">Änderung ↑</option>
            <option value="symbol">Symbol A–Z</option>
          </select>
          <Button
            variant="outline"
            onClick={() => { setRefreshing(true); load(); }}
            disabled={refreshing}
            className="gap-2 h-9"
            data-testid="market-overview-refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Aktualisieren
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bank-bg border-b border-bank-border">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Symbol</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Name</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Kurs</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Änderung</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">%</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Quelle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-bank-text-muted">
                    Keine Treffer.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const up = (r.changePct ?? 0) >= 0;
                  const disp = formatDisplayPrice(r);
                  return (
                    <tr
                      key={r.symbol}
                      className="border-b border-bank-border/60 hover:bg-bank-bg transition-colors"
                    >
                      <td className="py-2.5 px-4 text-sm font-semibold text-bank-text">{r.symbol}</td>
                      <td className="py-2.5 px-4 text-sm text-bank-text-muted truncate max-w-[220px]">{r.name}</td>
                      <td className="py-2.5 px-4 text-sm text-right font-medium text-bank-text">
                        {disp.primary}
                      </td>
                      <td className={`py-2.5 px-4 text-sm text-right ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                        {r.change != null
                          ? `${up ? '+' : ''}${Number(r.change).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '–'}
                      </td>
                      <td className={`py-2.5 px-4 text-sm text-right font-medium ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                        {r.changePct != null ? (
                          <span className="inline-flex items-center gap-0.5 justify-end">
                            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {up ? '+' : '-'}{formatChangePct(r.changePct)}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-bank-text-muted">
                        {r.dataSource || '–'}{r.isDelayed ? ' · zeitverzögert' : ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
