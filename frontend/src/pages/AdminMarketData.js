import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  RefreshCw,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

const fmtAge = (iso) => {
  if (!iso) return '–';
  const ageMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return '–';
  const min = Math.round(ageMs / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min`;
  const h = Math.round(min / 60);
  if (h < 48) return `vor ${h} Std`;
  return `vor ${Math.round(h / 24)} Tagen`;
};

const fmtIsoLocal = (iso) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE');
};

// Kompaktes Summary für die "Letzte Edge-Function-Antwort"-Karte.
// Wir wollen nicht alle 380+ Quotes als JSON dumpen — die Detail-Tabellen
// darunter zeigen Cache-Inhalte ohnehin. Hier nur die wichtigsten Felder
// sowie eine kleine Vorschau der Symbole ohne Preis.
const summarizeFunctionResponse = (data) => {
  if (!data) return null;
  if (data.error) return { error: data.error };
  const quotes = Array.isArray(data.quotes) ? data.quotes : [];
  const withPrice = quotes.filter((q) => q?.price != null).length;
  const withoutPrice = quotes.length - withPrice;
  const missingPreview = quotes
    .filter((q) => q?.price == null)
    .slice(0, 10)
    .map((q) => q.symbol);
  return {
    cached: data.cached ?? null,
    fetched_at: data.fetched_at ?? null,
    forced: data.forced === true,
    skipped: data.skipped === true,
    reason: data.reason ?? null,
    quotes_total: quotes.length,
    quotes_with_price: withPrice,
    quotes_without_price: withoutPrice,
    ...(missingPreview.length ? { missing_preview: missingPreview } : {}),
  };
};

const AdminMarketData = () => {
  const [stocks, setStocks] = useState([]);
  const [cache, setCache] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: stocksData, error: stocksErr }, { data: cacheData, error: cacheErr }] =
        await Promise.all([
          supabase.from('stocks').select('symbol, name, sector, is_active').eq('is_active', true),
          supabase.from('stock_prices_cache').select('symbol, price, fetched_at, currency'),
        ]);
      if (stocksErr) throw stocksErr;
      if (cacheErr) throw cacheErr;
      setStocks(stocksData || []);
      setCache(cacheData || []);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cacheBySymbol = useMemo(() => {
    const m = {};
    cache.forEach((c) => {
      m[c.symbol] = c;
    });
    return m;
  }, [cache]);

  const summary = useMemo(() => {
    const totalActive = stocks.length;
    const symbolsWithPrice = stocks.filter(
      (s) => cacheBySymbol[s.symbol] && cacheBySymbol[s.symbol].price != null,
    );
    const symbolsMissing = stocks.filter(
      (s) => !cacheBySymbol[s.symbol] || cacheBySymbol[s.symbol].price == null,
    );
    const fetchedAts = symbolsWithPrice
      .map((s) => cacheBySymbol[s.symbol].fetched_at)
      .filter(Boolean)
      .map((iso) => new Date(iso).getTime());
    const oldest = fetchedAts.length ? new Date(Math.min(...fetchedAts)).toISOString() : null;
    const newest = fetchedAts.length ? new Date(Math.max(...fetchedAts)).toISOString() : null;
    return {
      totalActive,
      withPrice: symbolsWithPrice.length,
      missing: symbolsMissing.length,
      missingList: symbolsMissing,
      oldest,
      newest,
    };
  }, [stocks, cacheBySymbol]);

  const oldestSymbols = useMemo(() => {
    return stocks
      .map((s) => ({
        symbol: s.symbol,
        name: s.name,
        price: cacheBySymbol[s.symbol]?.price ?? null,
        fetched_at: cacheBySymbol[s.symbol]?.fetched_at ?? null,
      }))
      .filter((row) => row.fetched_at)
      .sort((a, b) => new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime())
      .slice(0, 20);
  }, [stocks, cacheBySymbol]);

  const triggerRefresh = async ({ force = true } = {}) => {
    setRefreshing(true);
    setLastResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke('stock-prices', {
        body: { force },
      });
      if (error) {
        toast.error('Refresh fehlgeschlagen: ' + error.message);
        setLastResponse({ error: error.message });
        return;
      }
      setLastResponse(summarizeFunctionResponse(data));
      if (data?.skipped) {
        toast.info(
          `Cache war noch frisch (Stand: ${
            data.fetched_at ? new Date(data.fetched_at).toLocaleTimeString('de-DE') : 'jetzt'
          }) — Throttle aktiv.`,
        );
      } else if (data?.forced) {
        toast.success(`Force-Refresh erfolgreich (${data?.cached ?? 0} Symbole neu geladen).`);
      } else {
        toast.success(`Cache aktualisiert (${data?.cached ?? 0} Symbole).`);
      }
      await load();
    } catch (err) {
      toast.error('Refresh-Fehler: ' + (err?.message || err));
    } finally {
      setRefreshing(false);
    }
  };

  const triggerHealthCheck = async () => {
    setHealthChecking(true);
    setLastResponse(null);
    try {
      const { data, error } = await supabase.functions.invoke('stock-prices', {
        body: { symbols: ['AAPL'] },
      });
      if (error) {
        toast.error('Health-Check fehlgeschlagen: ' + error.message);
        setLastResponse({ error: error.message });
        return;
      }
      setLastResponse(summarizeFunctionResponse(data));
      toast.success('Edge Function antwortet.');
    } catch (err) {
      toast.error('Health-Check-Fehler: ' + (err?.message || err));
    } finally {
      setHealthChecking(false);
    }
  };

  const stalenessOk =
    summary.newest && Date.now() - new Date(summary.newest).getTime() < 60 * 60 * 1000;

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="Markt-Daten"
        description="Status der Stock-Price-Pipeline. Cache-Frische, fehlende Symbole und manuelle Aktualisierung der Yahoo-Anbindung."
        titleIcon={Activity}
        actions={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              variant="outline"
              onClick={triggerHealthCheck}
              disabled={healthChecking}
              className="gap-2"
            >
              <HeartPulse size={14} className={healthChecking ? 'animate-pulse' : ''} />
              {healthChecking ? 'Prüfe…' : 'Health Check'}
            </Button>
            <Button
              onClick={() => triggerRefresh({ force: true })}
              disabled={refreshing}
              className="bg-bank-ink text-white hover:bg-bank-ink-elev gap-2"
              title="Erzwingt einen direkten Yahoo-Fetch (Throttle umgehen)"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Aktualisiere…' : 'Force-Refresh (Yahoo neu laden)'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <AdminSurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-bank-text-muted">Aktive Symbole</p>
          <p className="text-2xl font-bold text-bank-text mt-1">{summary.totalActive}</p>
        </AdminSurfaceCard>
        <AdminSurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-bank-text-muted">Mit Kursdaten</p>
          <p className="text-2xl font-bold text-bank-success mt-1">{summary.withPrice}</p>
        </AdminSurfaceCard>
        <AdminSurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-bank-text-muted">Fehlend</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              summary.missing === 0 ? 'text-bank-text-muted' : 'text-bank-error'
            }`}
          >
            {summary.missing}
          </p>
        </AdminSurfaceCard>
        <AdminSurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-bank-text-muted">Neuester Stand</p>
          <p className="text-sm font-semibold text-bank-text mt-1">{fmtAge(summary.newest)}</p>
          <p className="text-[11px] text-bank-text-muted mt-0.5">{fmtIsoLocal(summary.newest)}</p>
        </AdminSurfaceCard>
        <AdminSurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-bank-text-muted">Ältester Eintrag</p>
          <p className="text-sm font-semibold text-bank-text mt-1">{fmtAge(summary.oldest)}</p>
          <p className="text-[11px] text-bank-text-muted mt-0.5">{fmtIsoLocal(summary.oldest)}</p>
        </AdminSurfaceCard>
      </div>

      <AdminSurfaceCard className="p-4 mb-6">
        <div className="flex items-start gap-3">
          {stalenessOk ? (
            <CheckCircle2 size={18} className="text-bank-success mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          )}
          <div className="text-sm">
            <p className="font-semibold text-bank-text mb-0.5">
              {stalenessOk
                ? 'Pipeline gesund — letzter Refresh in den letzten 60 Min.'
                : 'Pipeline veraltet — letzter Refresh ist älter als 60 Min.'}
            </p>
            <p className="text-bank-text-muted">
              Cron-Job läuft alle 15 Minuten via <code>pg_net</code> + Edge Function{' '}
              <code>stock-prices</code> (Yahoo Finance Chart-Endpoint, throttled auf 5 Min für
              Endkunden). Admin-Klick hier sendet <code>force: true</code> und umgeht den Throttle.
            </p>
          </div>
        </div>
      </AdminSurfaceCard>

      {lastResponse && (
        <AdminSurfaceCard className="p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-bank-text-muted mb-2">
            Letzte Edge-Function-Antwort
          </p>
          <pre className="text-[11px] text-bank-text-muted bg-bank-bg/50 rounded-md p-3 overflow-auto max-h-60 whitespace-pre-wrap">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </AdminSurfaceCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSurfaceCard className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-bank-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-bank-text">Älteste 20 Cache-Einträge</p>
              <p className="text-[11px] text-bank-text-muted">
                Sortiert nach <code>fetched_at</code> aufsteigend.
              </p>
            </div>
            <Clock size={16} className="text-bank-text-muted" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-right px-4 py-2">Kurs</th>
                  <th className="text-right px-4 py-2">Stand</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-bank-text-muted">
                      <RefreshCw size={14} className="inline animate-spin mr-2" /> Lädt…
                    </td>
                  </tr>
                ) : oldestSymbols.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-bank-text-muted">
                      Noch keine Cache-Einträge.
                    </td>
                  </tr>
                ) : (
                  oldestSymbols.map((row) => (
                    <tr key={row.symbol} className={adminRowHover}>
                      <td className="px-4 py-2 font-semibold text-bank-text">{row.symbol}</td>
                      <td className="px-4 py-2 text-bank-text-muted truncate max-w-[180px]">
                        {row.name || '–'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.price != null
                          ? Number(row.price).toLocaleString('de-DE', {
                              maximumFractionDigits: 2,
                            })
                          : '–'}
                      </td>
                      <td className="px-4 py-2 text-right text-bank-text-muted">
                        {fmtAge(row.fetched_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSurfaceCard>

        <AdminSurfaceCard className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-bank-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-bank-text">Symbole ohne Preis</p>
              <p className="text-[11px] text-bank-text-muted">
                Aktive Stocks, für die keine oder eine leere Cache-Zeile existiert.
              </p>
            </div>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Sektor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-bank-text-muted">
                      <RefreshCw size={14} className="inline animate-spin mr-2" /> Lädt…
                    </td>
                  </tr>
                ) : summary.missingList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-bank-success">
                      Alle aktiven Symbole haben Kurse.
                    </td>
                  </tr>
                ) : (
                  summary.missingList.slice(0, 50).map((s) => (
                    <tr key={s.symbol} className={adminRowHover}>
                      <td className="px-4 py-2 font-semibold text-bank-text">{s.symbol}</td>
                      <td className="px-4 py-2 text-bank-text-muted truncate max-w-[180px]">
                        {s.name || '–'}
                      </td>
                      <td className="px-4 py-2 text-bank-text-muted">{s.sector || '–'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSurfaceCard>
      </div>
    </AdminSubpageLayout>
  );
};

export default AdminMarketData;
