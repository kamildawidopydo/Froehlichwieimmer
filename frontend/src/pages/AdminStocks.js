import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  RefreshCw,
  Search,
  CheckCircle,
  PauseCircle,
  LineChart,
  Download,
  ShieldCheck,
  Info,
} from 'lucide-react';

/*
 * Session 82.97 — Admin Stocks · Supabase→FastAPI Cutover (Read-Only).
 *
 * Reads:   GET  /api/stocks/catalog?with_quotes=true  (kuratiertes _META im Backend)
 * Sync:    POST /api/admin/stock-research/sync         (Provider-Refresh, admin-only)
 *
 * DOMAIN NOTE (BLOCKED_SAFE_BACKEND_MISSING):
 * Das Aktien-Universum ist im Backend als kuratiertes `_META`-Dict in
 * `routes/stock_catalog.py` hinterlegt — es existiert KEINE Mongo-Collection
 * `stocks` und KEIN sicherer Admin-CRUD-Endpoint. Deshalb sind Add / Edit /
 * Delete / Toggle-Active auf dieser Seite deaktiviert. Universum-Erweiterungen
 * laufen über einen Backend-PR gegen `_META` bzw. `ALLOWED`.
 */

const API = getApiBase();

const AdminStocks = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API}/api/stocks/catalog?with_quotes=true`,
        { withCredentials: true },
      );
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setStocks(items);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.response?.data?.detail || err.message));
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const { data } = await axios.post(
        `${API}/api/admin/stock-research/sync`,
        {},
        { withCredentials: true },
      );
      const count = data?.processed ?? data?.updated ?? data?.count ?? '?';
      toast.success(`Sync ausgelöst (${count} Symbole)`);
      await fetchAll();
    } catch (err) {
      toast.error('Sync fehlgeschlagen: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setRefreshing(false);
    }
  };

  const blockedMutation = () => {
    toast.info(
      'Aktien-Universum ist server-kuratiert (BLOCKED_SAFE_BACKEND_MISSING · 82.97). Änderungen laufen über einen Backend-PR gegen die ALLOWED-Liste.',
    );
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return stocks.filter((s) => {
      if (filterStatus === 'active' && !s.is_active) return false;
      if (filterStatus === 'inactive' && s.is_active) return false;
      if (term) {
        const hay = [s.symbol, s.name, s.exchange, s.sector].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [stocks, filterStatus, searchTerm]);

  const formatCurrency = (v, currency = 'USD') =>
    v == null ? '–' : Number(v).toLocaleString('de-DE', { style: 'currency', currency: currency || 'USD' });

  const priceStatusLabel = (item) => {
    if (item.price == null) return { label: 'unavailable', cls: 'text-bank-text-muted' };
    return { label: 'fresh', cls: 'text-emerald-600' };
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Märkte"
        title="Aktien-Universum"
        titleIcon={LineChart}
        description="Kuratierte Aktien und Kurs-Cache (Read-Only) — Änderungen via Backend-PR."
        actions={
          <>
            <Button
              variant="outline"
              onClick={refreshPrices}
              disabled={refreshing}
              className="gap-2 rounded-xl"
              data-testid="stocks-sync-btn"
            >
              <Download size={15} className={refreshing ? 'animate-pulse' : ''} />
              {refreshing ? 'Lade Kurse...' : 'Kurse aktualisieren'}
            </Button>
          </>
        }
      />

      <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 mb-6 bg-amber-50 text-amber-800 border border-amber-200 rounded-full shadow-sm" data-testid="stocks-blocked-banner">
        <ShieldCheck size={12} className="text-amber-700" />
        Read-Only · Universum server-kuratiert (BLOCKED_SAFE_BACKEND_MISSING)
      </div>

      <AdminToolbarCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Symbol, Name, Börse, Sektor..."
              className="pl-9"
              data-testid="stocks-search"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
            data-testid="stocks-status-filter"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
          <Button variant="outline" onClick={fetchAll} className="gap-2 rounded-xl" data-testid="stocks-refresh">
            <RefreshCw size={15} /> Neu laden
          </Button>
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw size={22} className="animate-spin text-bank-text-muted/70 mx-auto mb-3" />
            <p className="text-bank-text-muted text-sm">Wird geladen...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-bank-text-muted/70" data-testid="stocks-empty">
            <LineChart size={30} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Keine Aktien gefunden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="stocks-table">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Symbol</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Börse</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Sektor</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">Kurs</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Preis-Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const ps = priceStatusLabel(s);
                  return (
                    <tr key={s.id || s.symbol} className={`border-b border-bank-border/80 ${adminRowHover}`} data-testid={`stocks-row-${s.symbol}`}>
                      <td className="py-3 px-4 text-sm font-semibold text-bank-text">{s.symbol}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="text-bank-text">{s.name}</div>
                        <div className="text-xs text-bank-text-muted">Currency: {s.currency || 'USD'}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">{s.exchange || '–'}</td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">{s.sector || '–'}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-bank-text">
                        {formatCurrency(s.price, s.currency || 'USD')}
                      </td>
                      <td className={`py-3 px-4 text-xs font-mono ${ps.cls}`}>
                        {ps.label}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={blockedMutation}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${s.is_active
                            ? 'bg-bank-success/10 text-bank-success border-bank-success/25'
                            : 'bg-bank-border/20 text-bank-text-muted border-bank-border'
                          }`}
                          data-testid={`stocks-status-${s.symbol}`}
                          title="Änderungen laufen serverseitig via ALLOWED-Liste."
                        >
                          {s.is_active ? <CheckCircle size={12} /> : <PauseCircle size={12} />}
                          {s.is_active ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurfaceCard>

      <p className="mt-4 text-xs text-bank-text-muted flex items-start gap-2" data-testid="stocks-help">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          Session 82.97 · Read-Only-Modus. Universum wird in <code>routes/stock_catalog.py</code>
          (`_META` + `ALLOWED`) kuratiert. Preis-Sync läuft über
          <code> POST /api/admin/stock-research/sync</code>, Preise stammen aus dem
          fundamentals-Cache (`stock_public_fundamentals_cache`, TTL 6 h).
        </span>
      </p>
    </AdminSubpageLayout>
  );
};

export default AdminStocks;
