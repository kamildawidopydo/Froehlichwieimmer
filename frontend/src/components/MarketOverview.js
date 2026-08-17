import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

const formatCurrency = (v, currency = 'USD') =>
  v == null ? '–' : Number(v).toLocaleString('de-DE', { style: 'currency', currency: currency || 'USD' });

const formatPct = (v) =>
  v == null ? '–' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

const formatBig = (v) => {
  if (v == null) return '–';
  const n = Number(v);
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
};

const formatTime = (t) => {
  if (!t) return '–';
  const d = new Date(t);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return d.toLocaleString('de-DE');
};

const MarketOverview = () => {
  const [stocks, setStocks] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('change_desc');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: sdata }, { data: pdata }] = await Promise.all([
      supabase.from('stocks').select('*').eq('is_active', true).order('display_order', { ascending: true }),
      supabase.from('stock_prices_cache').select('*'),
    ]);
    setStocks(sdata || []);
    const map = {};
    (pdata || []).forEach((p) => { map[p.symbol] = p; });
    setPriceMap(map);
    setLoading(false);
  };

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-prices', { body: {} });
      if (error) throw error;
      const { data: pdata } = await supabase.from('stock_prices_cache').select('*');
      const map = {};
      (pdata || []).forEach((p) => { map[p.symbol] = p; });
      setPriceMap(map);
    } catch (err) {
      console.error('Refresh prices failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const merged = stocks.map((s) => {
      const p = priceMap[s.symbol] || {};
      return {
        ...s,
        price: p.price != null ? Number(p.price) : null,
        prev_close: p.prev_close != null ? Number(p.prev_close) : null,
        change_abs: p.change_abs != null ? Number(p.change_abs) : null,
        change_pct: p.change_pct != null ? Number(p.change_pct) : null,
        market_cap: p.market_cap != null ? Number(p.market_cap) : null,
        volume: p.volume != null ? Number(p.volume) : null,
        fetched_at: p.fetched_at ?? null,
        priceCurrency: p.currency || s.currency || 'USD',
      };
    });
    const filtered = term
      ? merged.filter((r) => [r.symbol, r.name, r.sector, r.exchange].filter(Boolean).join(' ').toLowerCase().includes(term))
      : merged;
    const sorted = [...filtered];
    switch (sortBy) {
      case 'change_desc':
        sorted.sort((a, b) => (b.change_pct ?? -Infinity) - (a.change_pct ?? -Infinity));
        break;
      case 'change_asc':
        sorted.sort((a, b) => (a.change_pct ?? Infinity) - (b.change_pct ?? Infinity));
        break;
      case 'symbol':
        sorted.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
        break;
      case 'market_cap_desc':
        sorted.sort((a, b) => (b.market_cap ?? -Infinity) - (a.market_cap ?? -Infinity));
        break;
      default:
        break;
    }
    return sorted;
  }, [stocks, priceMap, searchTerm, sortBy]);

  const withChange = rows.filter((r) => r.change_pct != null);
  const topGainers = [...withChange].sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0)).slice(0, 5);
  const topLosers = [...withChange].sort((a, b) => (a.change_pct ?? 0) - (b.change_pct ?? 0)).slice(0, 5);
  const lastUpdate = rows.reduce((latest, r) => {
    if (!r.fetched_at) return latest;
    const t = new Date(r.fetched_at).getTime();
    return t > latest ? t : latest;
  }, 0);

  if (loading) {
    return (
      <div className="bg-white border border-bank-border rounded-xl p-12 text-center">
        <RefreshCw size={22} className="animate-spin text-bank-text-muted/70 mx-auto mb-3" />
        <p className="text-bank-text-muted text-sm">Marktdaten werden geladen...</p>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="bg-white border border-bank-border rounded-xl p-12 text-center">
        <LineChart size={40} className="text-bank-text-muted/45 mx-auto mb-4" />
        <p className="text-bank-text-muted mb-2">Noch keine handelbaren Aktien</p>
        <p className="text-xs text-bank-text-muted/80">
          Unser Team arbeitet daran, das Aktien-Universum zu pflegen. Bitte schauen Sie später wieder vorbei.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
              topGainers.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-bank-bg transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-bank-text">{r.symbol}</p>
                    <p className="text-xs text-bank-text-muted truncate">{r.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-bank-text">{formatCurrency(r.price, r.priceCurrency)}</p>
                    <p className="text-xs font-medium text-emerald-600 inline-flex items-center gap-0.5">
                      <ArrowUpRight size={11} /> {formatPct(r.change_pct)}
                    </p>
                  </div>
                </div>
              ))
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
              topLosers.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-bank-bg transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-bank-text">{r.symbol}</p>
                    <p className="text-xs text-bank-text-muted truncate">{r.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-bank-text">{formatCurrency(r.price, r.priceCurrency)}</p>
                    <p className="text-xs font-medium text-rose-600 inline-flex items-center gap-0.5">
                      <ArrowDownRight size={11} /> {formatPct(r.change_pct)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Marktübersicht table */}
      <div className="bg-white border border-bank-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 border-b border-bank-border">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-bank-text">Marktübersicht</h3>
            <p className="text-xs text-bank-text-muted">
              {lastUpdate > 0 ? `Zuletzt aktualisiert: ${formatTime(new Date(lastUpdate).toISOString())}` : 'Noch keine Daten im Cache'}
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..."
              className="pl-8 h-9 text-sm"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 px-3 border border-bank-border rounded-md bg-white text-sm"
          >
            <option value="change_desc">Änderung ↓</option>
            <option value="change_asc">Änderung ↑</option>
            <option value="market_cap_desc">Marktkap. ↓</option>
            <option value="symbol">Symbol A–Z</option>
          </select>
          <Button
            variant="outline"
            onClick={refreshPrices}
            disabled={refreshing}
            className="gap-2 h-9"
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
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Volumen</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Marktkap.</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-bank-text-muted">Börse</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-bank-text-muted">
                    Keine Treffer.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const up = (r.change_pct ?? 0) >= 0;
                  return (
                    <tr key={r.id} className="border-b border-bank-border/60 hover:bg-bank-bg transition-colors">
                      <td className="py-2.5 px-4 text-sm font-semibold text-bank-text">{r.symbol}</td>
                      <td className="py-2.5 px-4 text-sm text-bank-text-muted truncate max-w-[220px]">{r.name}</td>
                      <td className="py-2.5 px-4 text-sm text-right font-medium text-bank-text">
                        {r.price != null ? formatCurrency(r.price, r.priceCurrency) : '–'}
                      </td>
                      <td className={`py-2.5 px-4 text-sm text-right ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                        {r.change_abs != null
                          ? `${up ? '+' : ''}${r.change_abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '–'}
                      </td>
                      <td className={`py-2.5 px-4 text-sm text-right font-medium ${up ? 'text-emerald-600' : 'text-bank-error'}`}>
                        {r.change_pct != null ? (
                          <span className="inline-flex items-center gap-0.5 justify-end">
                            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {formatPct(r.change_pct)}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="py-2.5 px-4 text-sm text-right text-bank-text-muted">{formatBig(r.volume)}</td>
                      <td className="py-2.5 px-4 text-sm text-right text-bank-text-muted">{formatBig(r.market_cap)}</td>
                      <td className="py-2.5 px-4 text-xs text-bank-text-muted">{r.exchange || '–'}</td>
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
