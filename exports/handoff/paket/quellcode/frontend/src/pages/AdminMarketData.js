import { getApiBase } from '@/lib/apiBase';

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
import { toast } from 'sonner';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

// Session 82.80 — Mongo-native Cutover. Kein Supabase-Import mehr.
//   Universe + Refresh: POST /api/admin/stock-research/sync?sync_type=prices
//   Quotes/Health:      GET  /api/portfolio/quotes?symbols=T1,T2,...
//   Sync-History:       GET  /api/admin/stock-research/sync/history?limit=10
// Keine Fake-Preise: fehlt price/as_of, wird das Symbol als "missing" gezeigt.

const API_BASE = getApiBase();

async function apiJson(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const txt = await res.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { /* keep raw */ }
  if (!res.ok) {
    const detail = (json && (json.detail || json.error)) || txt || `HTTP ${res.status}`;
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  return json;
}

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

const summarizeSyncResponse = (data) => {
  if (!data) return null;
  const price = data.price || {};
  return {
    started_at: data.started_at ?? null,
    duration_ms: data.duration_ms ?? null,
    sync_type: data.sync_type ?? null,
    universe_size: data.universe_size ?? null,
    updated: price.updated ?? null,
    provider_hits: price.provider_hits ?? null,
    unchanged: price.unchanged ?? null,
    skipped: price.skipped ?? null,
    ...(Array.isArray(data.tickers) && data.tickers.length
      ? { tickers_preview: data.tickers.slice(0, 12) }
      : {}),
  };
};

const AdminMarketData = () => {
  const [universe, setUniverse] = useState([]); // [{symbol}]
  const [quotes, setQuotes] = useState({}); // {SYM: {price, as_of, currency}}
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // Universe kommt aus dem Sync-Endpoint. `sync_type=prices` triggert
      // gleichzeitig einen leichten Refresh — bewusster Admin-Kontext.
      const sync = await apiJson('/api/admin/stock-research/sync?sync_type=prices', {
        method: 'POST',
      });
      const tickers = Array.isArray(sync?.tickers) ? sync.tickers : [];
      setUniverse(tickers.map((s) => ({ symbol: s, name: s })));
      if (tickers.length > 0) {
        const q = await apiJson(
          `/api/portfolio/quotes?symbols=${encodeURIComponent(tickers.join(','))}`,
        );
        setQuotes(q || {});
      } else {
        setQuotes({});
      }
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const totalActive = universe.length;
    const withPrice = universe.filter((s) => quotes[s.symbol]?.price != null);
    const missing = universe.filter((s) => quotes[s.symbol]?.price == null);
    const fetchedAts = withPrice
      .map((s) => quotes[s.symbol]?.as_of)
      .filter(Boolean)
      .map((iso) => new Date(iso).getTime());
    const oldest = fetchedAts.length ? new Date(Math.min(...fetchedAts)).toISOString() : null;
    const newest = fetchedAts.length ? new Date(Math.max(...fetchedAts)).toISOString() : null;
    return {
      totalActive,
      withPrice: withPrice.length,
      missing: missing.length,
      missingList: missing,
      oldest,
      newest,
    };
  }, [universe, quotes]);

  const oldestSymbols = useMemo(() => {
    return universe
      .map((s) => ({
        symbol: s.symbol,
        name: s.name,
        price: quotes[s.symbol]?.price ?? null,
        as_of: quotes[s.symbol]?.as_of ?? null,
      }))
      .filter((row) => row.as_of)
      .sort((a, b) => new Date(a.as_of).getTime() - new Date(b.as_of).getTime())
      .slice(0, 20);
  }, [universe, quotes]);

  const triggerRefresh = async () => {
    setRefreshing(true);
    setLastResponse(null);
    try {
      const data = await apiJson('/api/admin/stock-research/sync?sync_type=prices', {
        method: 'POST',
      });
      setLastResponse(summarizeSyncResponse(data));
      const updated = data?.price?.updated ?? 0;
      const providerHits = data?.price?.provider_hits ?? 0;
      toast.success(
        `Sync abgeschlossen · ${updated} aktualisiert · ${providerHits} Provider-Hits`,
      );
      await load();
    } catch (err) {
      const msg = err?.message || String(err);
      toast.error('Refresh-Fehler: ' + msg);
      setLastResponse({ error: msg });
    } finally {
      setRefreshing(false);
    }
  };

  const triggerHealthCheck = async () => {
    setHealthChecking(true);
    setLastResponse(null);
    try {
      const q = await apiJson('/api/portfolio/quotes?symbols=AAPL');
      const aapl = q?.AAPL || null;
      setLastResponse({
        health_probe: 'AAPL',
        price: aapl?.price ?? null,
        currency: aapl?.currency ?? null,
        as_of: aapl?.as_of ?? null,
        source: aapl?.source ?? null,
        price_status: aapl?.price_status ?? null,
      });
      if (aapl?.price != null) toast.success('Quotes-API antwortet.');
      else toast.warning('Quotes-API antwortete ohne Preis.');
    } catch (err) {
      const msg = err?.message || String(err);
      toast.error('Health-Check-Fehler: ' + msg);
      setLastResponse({ error: msg });
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
        description="Status der Stock-Price-Pipeline. Universe, Preis-Frische und manueller Sync-Trigger."
        titleIcon={Activity}
        actions={
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              data-testid="market-data-health-btn"
              variant="outline"
              onClick={triggerHealthCheck}
              disabled={healthChecking}
              className="gap-2"
            >
              <HeartPulse size={14} className={healthChecking ? 'animate-pulse' : ''} />
              {healthChecking ? 'Prüfe…' : 'Health Check'}
            </Button>
            <Button
              data-testid="market-data-refresh-btn"
              onClick={triggerRefresh}
              disabled={refreshing}
              className="bg-bank-ink text-white hover:bg-bank-ink-elev gap-2"
              title="Triggert einen Preis-Sync über den yfinance-Backend-Pfad"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Sync läuft…' : 'Preis-Sync ausführen'}
            </Button>
          </div>
        }
      />

      <div
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6"
        data-testid="market-data-kpis"
      >
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

      <AdminSurfaceCard className="p-4 mb-6" data-testid="market-data-health-card">
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
              Sync läuft über den FastAPI-Endpoint{' '}
              <code>POST /api/admin/stock-research/sync?sync_type=prices</code> (yfinance-Adapter).
              Quotes werden aus dem Preis-Cache über{' '}
              <code>GET /api/portfolio/quotes</code> gelesen.
            </p>
          </div>
        </div>
      </AdminSurfaceCard>

      {lastResponse && (
        <AdminSurfaceCard className="p-4 mb-6" data-testid="market-data-response-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-bank-text-muted mb-2">
            Letzte Sync-Antwort
          </p>
          <pre className="text-[11px] text-bank-text-muted bg-bank-bg/50 rounded-md p-3 overflow-auto max-h-60 whitespace-pre-wrap">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </AdminSurfaceCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminSurfaceCard className="p-0 overflow-hidden" data-testid="market-data-oldest-card">
          <div className="px-5 py-3 border-b border-bank-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-bank-text">Älteste 20 Cache-Einträge</p>
              <p className="text-[11px] text-bank-text-muted">
                Sortiert nach <code>as_of</code> aufsteigend.
              </p>
            </div>
            <Clock size={16} className="text-bank-text-muted" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-right px-4 py-2">Kurs</th>
                  <th className="text-right px-4 py-2">Stand</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-bank-text-muted">
                      <RefreshCw size={14} className="inline animate-spin mr-2" /> Lädt…
                    </td>
                  </tr>
                ) : oldestSymbols.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-bank-text-muted">
                      Noch keine Cache-Einträge.
                    </td>
                  </tr>
                ) : (
                  oldestSymbols.map((row) => (
                    <tr key={row.symbol} className={adminRowHover}>
                      <td className="px-4 py-2 font-semibold text-bank-text">{row.symbol}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.price != null
                          ? Number(row.price).toLocaleString('de-DE', {
                              maximumFractionDigits: 2,
                            })
                          : '–'}
                      </td>
                      <td className="px-4 py-2 text-right text-bank-text-muted">
                        {fmtAge(row.as_of)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSurfaceCard>

        <AdminSurfaceCard className="p-0 overflow-hidden" data-testid="market-data-missing-card">
          <div className="px-5 py-3 border-b border-bank-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-bank-text">Symbole ohne Preis</p>
              <p className="text-[11px] text-bank-text-muted">
                Universe-Tickers, für die die Quotes-API aktuell keinen Preis liefert.
              </p>
            </div>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left px-4 py-2">Symbol</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="text-center py-8 text-bank-text-muted">
                      <RefreshCw size={14} className="inline animate-spin mr-2" /> Lädt…
                    </td>
                  </tr>
                ) : summary.missingList.length === 0 ? (
                  <tr>
                    <td className="text-center py-8 text-bank-success">
                      Alle aktiven Symbole haben Kurse.
                    </td>
                  </tr>
                ) : (
                  summary.missingList.slice(0, 50).map((s) => (
                    <tr key={s.symbol} className={adminRowHover}>
                      <td className="px-4 py-2 font-semibold text-bank-text">{s.symbol}</td>
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
