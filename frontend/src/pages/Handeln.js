import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { watchlistApi } from '@/services/watchlistApi';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/lib/apiBase';

const API_BASE = getApiBase();
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RefreshCw,
  Star,
  LineChart,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/dashboard/PageHeader';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';

const formatCurrency = (v, currency = 'USD') =>
  v == null ? '–' : Number(v).toLocaleString('de-DE', { style: 'currency', currency: currency || 'USD' });

const formatPct = (v) =>
  v == null ? '–' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;

const Handeln = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const goToStock = (symbol) =>
    navigate(`/dashboard/aktien/${encodeURIComponent(symbol)}`);
  const [stocks, setStocks] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [watchlist, setWatchlist] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('change_desc');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [exchangeFilter, setExchangeFilter] = useState('all');

  useEffect(() => {
    fetchAll();
  }, [user]);

  // Session 82.89 — Supabase-Cutover: Kuratierte Liste über /api/stocks/catalog,
  // Live-Kurse über /api/portfolio/quotes (authed). Watchlist via watchlistApi.
  const _loadQuotes = async (symbols) => {
    if (!symbols || symbols.length === 0 || !user) return {};
    try {
      const { data } = await axios.get(
        `${API_BASE}/api/portfolio/quotes?symbols=${encodeURIComponent(symbols.join(','))}`,
        { withCredentials: true },
      );
      return data || {};
    } catch {
      return {};
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catalogRes, wlRes] = await Promise.all([
        axios.get(`${API_BASE}/api/stocks/catalog?with_quotes=true`),
        user ? watchlistApi.list().catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ]);
      const catalog = catalogRes?.data?.items || [];
      setStocks(catalog);
      // Initial map from catalog (previous_close etc.).
      const map = {};
      for (const it of catalog) {
        map[it.symbol] = {
          symbol: it.symbol,
          price: it.price,
          change_abs: it.change_abs,
          change_pct: it.change_pct,
          day_high: it.day_high,
          day_low: it.day_low,
          volume: it.volume,
          currency: it.currency,
        };
      }
      // Live-Quotes overlay (nur wenn eingeloggt).
      if (user) {
        const q = await _loadQuotes(catalog.map((s) => s.symbol));
        for (const [sym, quote] of Object.entries(q)) {
          if (quote && typeof quote === 'object') {
            map[sym] = { ...(map[sym] || {}), ...quote, symbol: sym };
          }
        }
      }
      setPriceMap(map);
      const wlItems = (wlRes?.items || []).map((w) => String(w.symbol || '').toUpperCase());
      setWatchlist(new Set(wlItems));
    } catch (err) {
      console.warn('Handeln fetchAll failed', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      if (!user) {
        // Ohne Login sind keine Live-Quotes verfügbar → Catalog neu laden.
        const { data } = await axios.get(`${API_BASE}/api/stocks/catalog?with_quotes=true`);
        const map = {};
        for (const it of (data?.items || [])) {
          map[it.symbol] = { ...it, symbol: it.symbol };
        }
        setPriceMap(map);
        toast.success('Kurse aktualisiert');
        return;
      }
      const symbols = stocks.map((s) => s.symbol);
      const q = await _loadQuotes(symbols);
      const next = { ...priceMap };
      for (const [sym, quote] of Object.entries(q)) {
        if (quote && typeof quote === 'object') next[sym] = { ...(next[sym] || {}), ...quote, symbol: sym };
      }
      setPriceMap(next);
      toast.success('Kurse aktualisiert');
    } catch (err) {
      toast.error('Kurse konnten nicht aktualisiert werden.');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleWatchlist = async (symbol) => {
    // Session 82.20 · Depot Phase 3B — Mongo-native via FastAPI (`/api/watchlist`).
    if (!user) {
      toast.error('Bitte einloggen');
      return;
    }
    const sym = String(symbol || '').toUpperCase();
    try {
      if (watchlist.has(sym)) {
        await watchlistApi.remove(sym);
        const next = new Set(watchlist);
        next.delete(sym);
        setWatchlist(next);
        toast.success('Aus Watchlist entfernt');
      } else {
        await watchlistApi.add({ symbol: sym });
        const next = new Set(watchlist);
        next.add(sym);
        setWatchlist(next);
        toast.success('Zur Watchlist hinzugefügt');
      }
    } catch (err) {
      toast.error('Watchlist konnte nicht aktualisiert werden.');
    }
  };

  const sectors = useMemo(() => {
    const s = new Set(stocks.map((s) => s.sector).filter(Boolean));
    return ['all', ...Array.from(s).sort()];
  }, [stocks]);

  const exchanges = useMemo(() => {
    const s = new Set(stocks.map((s) => s.exchange).filter(Boolean));
    return ['all', ...Array.from(s).sort()];
  }, [stocks]);

  const rows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let arr = stocks.map((s) => {
      const p = priceMap[s.symbol] || {};
      return {
        ...s,
        price: p.price != null ? Number(p.price) : null,
        change_abs: p.change_abs != null ? Number(p.change_abs) : null,
        change_pct: p.change_pct != null ? Number(p.change_pct) : null,
        volume: p.volume != null ? Number(p.volume) : null,
        day_high: p.day_high != null ? Number(p.day_high) : null,
        day_low: p.day_low != null ? Number(p.day_low) : null,
        priceCurrency: p.currency || s.currency || 'USD',
      };
    });

    if (sectorFilter !== 'all') arr = arr.filter((r) => r.sector === sectorFilter);
    if (exchangeFilter !== 'all') arr = arr.filter((r) => r.exchange === exchangeFilter);
    if (term) arr = arr.filter((r) => [r.symbol, r.name, r.sector, r.exchange].filter(Boolean).join(' ').toLowerCase().includes(term));

    switch (sortBy) {
      case 'change_desc': arr.sort((a, b) => (b.change_pct ?? -Infinity) - (a.change_pct ?? -Infinity)); break;
      case 'change_asc': arr.sort((a, b) => (a.change_pct ?? Infinity) - (b.change_pct ?? Infinity)); break;
      case 'symbol': arr.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || '')); break;
      case 'price_desc': arr.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity)); break;
      default: break;
    }
    return arr;
  }, [stocks, priceMap, searchTerm, sortBy, sectorFilter, exchangeFilter]);

  const stockTableRef = useAutoAnimateRef(!loading && rows.length > 0);

  const body = (
    <>
      {!embedded && (
      <section className="relative overflow-hidden bg-bank-ink text-white py-10 sm:py-14">
        <div aria-hidden className="absolute inset-0 mesh-navy opacity-90" />
        <div aria-hidden className="absolute inset-0 topo-pattern opacity-[0.05]" />
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bank-gold/65 to-transparent" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-bank-gold/35 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4">
          <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-gold">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
            Markt · Handeln
          </p>
          <h1
            className="mt-3 font-display text-[1.85rem] font-light leading-[1.05] text-white sm:text-[2.4rem]"
            style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
          >
            <em className="not-italic font-light italic" style={{ fontStyle: 'italic' }}>Handeln</em>
          </h1>
          <span aria-hidden className="mt-3 block h-px w-16 bg-bank-gold/65" />
          <p className="mt-4 max-w-xl text-[13.5px] leading-[1.7] text-white/75">
            Aktien entdecken, analysieren und Aufträge erteilen — kuratiert nach Sektor und Börse.
          </p>
        </div>
      </section>
      )}

      {embedded && (
        <PageHeader
          eyebrow="Handeln"
          title="Markt"
          icon={LineChart}
          description="Aktien entdecken, analysieren und Aufträge erteilen."
          actions={
            <Button variant="outline" size="default" asChild>
              <Link to="/dashboard/aktien">Mein Depot</Link>
            </Button>
          }
        />
      )}

      <div className={embedded ? '' : 'mx-auto max-w-7xl px-4 py-7 sm:py-9'}>
        {/* Schnellzugriff chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            to="/dashboard/aktien"
            className="inline-flex items-center gap-1.5 border border-bank-border bg-white px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text transition-colors hover:border-bank-gold/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
          >
            Mein Depot
          </Link>
          <button
            onClick={() => { setSortBy('change_desc'); setSearchTerm(''); setSectorFilter('all'); setExchangeFilter('all'); }}
            className="inline-flex items-center gap-1.5 border border-emerald-300/55 bg-emerald-50 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
          >
            <ArrowUpRight size={11} strokeWidth={1.5} /> Top Gewinner
          </button>
          <button
            onClick={() => { setSortBy('change_asc'); setSearchTerm(''); setSectorFilter('all'); setExchangeFilter('all'); }}
            className="inline-flex items-center gap-1.5 border border-rose-300/55 bg-rose-50 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35"
          >
            <ArrowDownRight size={11} strokeWidth={1.5} /> Top Verlierer
          </button>
          {sectors.slice(1).slice(0, 6).map((sec) => {
            const active = sectorFilter === sec;
            return (
              <button
                key={sec}
                onClick={() => setSectorFilter(active ? 'all' : sec)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                  active
                    ? 'border-bank-ink bg-bank-ink text-white'
                    : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 hover:text-bank-text',
                )}
              >
                {sec}
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="relative mb-5 border border-bank-border bg-white p-4">
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/45 via-bank-gold/25 to-transparent" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search
                size={14}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted"
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Symbol, Name, Sektor…"
                className="pl-9"
                aria-label="Aktien suchen"
              />
            </div>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="h-10 border border-bank-border bg-white px-3 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
              aria-label="Sektor filtern"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'Alle Sektoren' : s}
                </option>
              ))}
            </select>
            <select
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
              className="h-10 border border-bank-border bg-white px-3 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
              aria-label="Börse filtern"
            >
              {exchanges.map((x) => (
                <option key={x} value={x}>
                  {x === 'all' ? 'Alle Börsen' : x}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 border border-bank-border bg-white px-3 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
              aria-label="Sortierung"
            >
              <option value="change_desc">Änderung ↓</option>
              <option value="change_asc">Änderung ↑</option>
              <option value="price_desc">Kurs ↓</option>
              <option value="symbol">Symbol A–Z</option>
            </select>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-bank-border pt-3">
            <p className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
              <Filter size={11} strokeWidth={1.5} className="text-bank-gold" />
              <span className="tabular-nums text-bank-text">{rows.length}</span> von{' '}
              <span className="tabular-nums">{stocks.length}</span> Aktien
            </p>
            <Button
              variant="outline-ink"
              size="default"
              onClick={refreshPrices}
              disabled={refreshing}
            >
              <RefreshCw size={13} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''} />
              Kurse aktualisieren
            </Button>
          </div>
        </div>

        {/* Loading / empty */}
        {loading ? (
          <div className="relative border border-bank-border bg-white py-20 text-center">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/45 via-bank-gold/25 to-transparent" />
            <RefreshCw size={20} strokeWidth={1.5} className="mx-auto mb-3 animate-spin text-bank-gold/65" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
              Wird geladen…
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="relative border border-bank-border bg-white py-20 text-center">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/45 via-bank-gold/25 to-transparent" />
            <LineChart size={28} strokeWidth={1.4} className="mx-auto mb-3 text-bank-gold/55" />
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
              Keine Aktien gefunden
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 md:hidden">
              {rows.map((r) => {
                const up = (r.change_pct ?? 0) >= 0;
                const watched = watchlist.has(r.symbol);
                return (
                  <div
                    key={r.id}
                    onClick={() => goToStock(r.symbol)}
                    className="relative cursor-pointer border border-bank-border bg-white p-4 transition-colors hover:border-bank-gold/55 active:scale-[0.99]"
                  >
                    <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/45 via-bank-gold/25 to-transparent" />
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <p className="font-mono text-[14px] font-medium text-bank-text">
                            {r.symbol}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(r.symbol);
                            }}
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                              watched ? 'text-bank-gold' : 'text-bank-text-muted/55 hover:text-bank-gold',
                            )}
                            aria-pressed={watched}
                            aria-label={watched ? 'Aus Watchlist entfernen' : 'Zur Watchlist hinzufügen'}
                          >
                            <Star size={13} strokeWidth={1.5} fill={watched ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        <p className="line-clamp-1 text-[12px] text-bank-text-muted">{r.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="rate-figure text-[15px] tabular-nums text-bank-text">
                          {r.price != null ? formatCurrency(r.price, r.priceCurrency) : '–'}
                        </p>
                        {r.change_pct != null && (
                          <p
                            className={cn(
                              'mt-0.5 inline-flex items-center justify-end gap-0.5 font-mono text-[10.5px] tabular-nums tracking-[0.06em]',
                              up ? 'text-emerald-700' : 'text-bank-error',
                            )}
                          >
                            {up ? (
                              <ArrowUpRight size={11} strokeWidth={1.5} />
                            ) : (
                              <ArrowDownRight size={11} strokeWidth={1.5} />
                            )}
                            {formatPct(r.change_pct)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-bank-border pt-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em]">
                      <span className="mr-2 truncate text-bank-text-muted">
                        {r.sector || '–'} · {r.exchange || '–'}
                      </span>
                      <span className="whitespace-nowrap text-bank-gold">Handeln →</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="relative hidden border border-bank-border bg-white md:block">
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/35 to-transparent" />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-bank-border bg-bank-bg/45">
                    <tr>
                      {[
                        { label: '', align: 'left', className: 'w-10' },
                        { label: 'Symbol', align: 'left' },
                        { label: 'Name', align: 'left' },
                        { label: 'Sektor', align: 'left' },
                        { label: 'Kurs', align: 'right' },
                        { label: '%', align: 'right' },
                        { label: 'Tages-Hoch', align: 'right' },
                        { label: 'Tages-Tief', align: 'right' },
                        { label: 'Börse', align: 'left' },
                        { label: '', align: 'right' },
                      ].map((h, idx) => (
                        <th
                          key={idx}
                          className={cn(
                            'px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted',
                            h.align === 'right' ? 'text-right' : 'text-left',
                            h.className,
                          )}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody ref={stockTableRef}>
                    {rows.map((r) => {
                      const up = (r.change_pct ?? 0) >= 0;
                      const watched = watchlist.has(r.symbol);
                      return (
                        <tr
                          key={r.id}
                          className="cursor-pointer border-b border-bank-border transition-colors last:border-b-0 hover:bg-bank-bg/45"
                          onClick={() => goToStock(r.symbol)}
                        >
                          <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleWatchlist(r.symbol)}
                              className={cn(
                                'inline-flex h-7 w-7 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                                watched ? 'text-bank-gold' : 'text-bank-text-muted/60 hover:text-bank-gold',
                              )}
                              title={watched ? 'Aus Watchlist entfernen' : 'Zur Watchlist'}
                              aria-pressed={watched}
                              aria-label={watched ? 'Aus Watchlist entfernen' : 'Zur Watchlist hinzufügen'}
                            >
                              <Star size={13} strokeWidth={1.5} fill={watched ? 'currentColor' : 'none'} />
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-[13.5px] font-medium text-bank-text">
                            {r.symbol}
                          </td>
                          <td className="max-w-[240px] truncate px-4 py-3 text-[13px] text-bank-text-muted">
                            {r.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                            {r.sector || '–'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="rate-figure text-[13.5px] tabular-nums text-bank-text">
                              {r.price != null ? formatCurrency(r.price, r.priceCurrency) : '–'}
                            </span>
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 text-right font-mono text-[13px] tabular-nums',
                              up ? 'text-emerald-700' : 'text-bank-error',
                            )}
                          >
                            {r.change_pct != null ? (
                              <span className="inline-flex items-center justify-end gap-0.5">
                                {up ? (
                                  <ArrowUpRight size={12} strokeWidth={1.5} />
                                ) : (
                                  <ArrowDownRight size={12} strokeWidth={1.5} />
                                )}
                                {formatPct(r.change_pct)}
                              </span>
                            ) : (
                              '–'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                            {r.day_high != null ? formatCurrency(r.day_high, r.priceCurrency) : '–'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                            {r.day_low != null ? formatCurrency(r.day_low, r.priceCurrency) : '–'}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                            {r.exchange || '–'}
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => goToStock(r.symbol)}
                            >
                              Handeln
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <PageContainer>
        <PortfolioPageLayout>{body}</PortfolioPageLayout>
      </PageContainer>
    );
  }

  return <div className="min-h-screen bg-bank-bg">{body}</div>;
};

export default Handeln;
