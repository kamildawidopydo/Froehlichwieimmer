import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Save, RefreshCw } from 'lucide-react';
import { PRODUCT_ICONS } from '@/lib/productIcons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { normalizeIpoCatalogRow } from '@/lib/decodeHtmlEntities';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

/**
 * IPO-Katalog Admin (Session 82.03) — vollständig FastAPI/Mongo-native.
 * Der Legacy-Supabase-Edge-Function-„Sync"-Button wurde entfernt: der externe
 * Feed schreibt direkt in Supabase und würde den Mongo-Katalog nicht befüllen.
 * Katalogpflege erfolgt manuell via CRUD; ein späterer Backend-Sync ist als
 * eigener Schritt geplant.
 */

const STATUS_OPTIONS = ['upcoming', 'open', 'priced', 'filed', 'listed', 'postponed', 'cancelled'];

const EMPTY = {
  company_name: '',
  ticker_proposed: '',
  isin: '',
  exchange: '',
  market: '',
  sector: '',
  status: 'upcoming',
  ipo_date: '',
  expected_ipo_window: '',
  subscription_start: '',
  subscription_end: '',
  price_range_low: '',
  price_range_high: '',
  price_currency: 'EUR',
  valuation_last_private: '',
  min_investment_eur: '',
  lot_size: '1',
  prospectus_url: '',
  description: '',
  is_visible: true,
};

const parseNum = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fetchJson = async (path, options = {}) => {
  const resp = await fetch(path, {
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...options,
  });
  const isJson = (resp.headers.get('content-type') || '').includes('application/json');
  const body = isJson && resp.status !== 204 ? await resp.json() : null;
  if (!resp.ok) {
    const detail = body?.detail || `HTTP ${resp.status}`;
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = resp.status;
    throw err;
  }
  return body;
};

const AdminIpoCatalog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const loadSyncStatus = async () => {
    try {
      const s = await fetchJson('/api/admin/ipo/catalog/sync/status');
      setSyncStatus(s);
    } catch {
      // best-effort, ignorieren
    }
  };

  const loadHistory = async () => {
    try {
      const h = await fetchJson('/api/admin/ipo/catalog/sync/history?limit=30');
      setHistory(h?.runs || []);
    } catch {
      // best-effort
    }
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const rep = await fetchJson('/api/admin/ipo/catalog/sync', { method: 'POST' });
      const usLabel = rep.us_source_used === 'stockanalysis'
        ? ' · US-Quelle: StockAnalysis (Fallback)'
        : rep.us_source_used === 'nasdaq'
          ? ' · US-Quelle: Nasdaq'
          : '';
      const summary = `${rep.fetched} geprüft · ${rep.inserted} neu · ${rep.updated} aktualisiert · ${rep.unchanged} unverändert · ${rep.skipped_manual_override} manuell geschützt${usLabel}`;
      if (rep.errors?.length) {
        toast.warning(`Sync mit Hinweisen — ${summary}`);
      } else {
        toast.success(`Sync abgeschlossen: ${summary}`);
      }
      await Promise.all([load(), loadSyncStatus(), loadHistory()]);
    } catch (err) {
      toast.error('Sync fehlgeschlagen: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchJson('/api/admin/ipo/catalog');
      setItems((Array.isArray(data) ? data : []).map(normalizeIpoCatalogRow));
    } catch (err) {
      setLoadError(err.message || 'Laden fehlgeschlagen');
      setItems([]);
      if (err.status !== 401 && err.status !== 403) {
        toast.error('Fehler beim Laden: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadSyncStatus();
    loadHistory();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      company_name: row.company_name || '',
      ticker_proposed: row.ticker_proposed || '',
      isin: row.isin || '',
      exchange: row.exchange || '',
      market: row.market || '',
      sector: row.sector || '',
      status: row.status || 'upcoming',
      ipo_date: row.ipo_date || '',
      expected_ipo_window: row.expected_ipo_window || '',
      subscription_start: row.subscription_start || '',
      subscription_end: row.subscription_end || '',
      price_range_low: row.price_range_low != null ? String(row.price_range_low) : '',
      price_range_high: row.price_range_high != null ? String(row.price_range_high) : '',
      price_currency: row.price_currency || 'EUR',
      valuation_last_private:
        row.valuation_last_private != null ? String(row.valuation_last_private) : '',
      min_investment_eur: row.min_investment_eur != null ? String(row.min_investment_eur) : '',
      lot_size: String(row.lot_size ?? 1),
      prospectus_url: row.prospectus_url || '',
      description: row.description || '',
      is_visible: row.is_visible ?? true,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      toast.error('Firmenname ist erforderlich.');
      return;
    }
    const pLow = parseNum(form.price_range_low);
    const pHigh = parseNum(form.price_range_high);
    if (pLow != null && pHigh != null && pLow > pHigh) {
      toast.error('Preisspanne ungültig: „von" darf nicht größer als „bis" sein.');
      return;
    }
    if (form.subscription_start && form.subscription_end && form.subscription_start > form.subscription_end) {
      toast.error('Zeichnungsfenster ungültig: „von" darf nicht nach „bis" liegen.');
      return;
    }
    setSaving(true);
    const payload = {
      company_name: form.company_name.trim(),
      ticker_proposed: form.ticker_proposed || null,
      isin: form.isin || null,
      exchange: form.exchange || null,
      market: form.market || null,
      sector: form.sector || null,
      status: form.status,
      ipo_date: form.ipo_date || null,
      expected_ipo_window: form.expected_ipo_window || null,
      subscription_start: form.subscription_start || null,
      subscription_end: form.subscription_end || null,
      price_range_low: pLow,
      price_range_high: pHigh,
      price_currency: form.price_currency || 'EUR',
      valuation_last_private: parseNum(form.valuation_last_private),
      min_investment_eur: parseNum(form.min_investment_eur),
      lot_size: Math.max(1, parseInt(form.lot_size, 10) || 1),
      prospectus_url: form.prospectus_url || null,
      description: form.description || null,
      is_visible: !!form.is_visible,
      is_manual_override: true,
    };
    try {
      if (editing) {
        await fetchJson(`/api/admin/ipo/catalog/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('IPO aktualisiert');
      } else {
        await fetchJson('/api/admin/ipo/catalog', {
          method: 'POST',
          body: JSON.stringify({ ...payload, source: 'manual' }),
        });
        toast.success('IPO hinzugefügt');
      }
      await load();
      closeModal();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm('IPO wirklich entfernen?')) return;
    try {
      await fetchJson(`/api/admin/ipo/catalog/${row.id}`, { method: 'DELETE' });
      toast.success('Entfernt');
      await load();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    }
  };

  const toggleVisible = async (row) => {
    try {
      await fetchJson(`/api/admin/ipo/catalog/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_visible: !row.is_visible, is_manual_override: true }),
      });
      await load();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    }
  };

  const statusBadge = (status) => {
    const map = {
      upcoming: 'bg-sky-50 text-sky-700 border-sky-200',
      open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      priced: 'bg-violet-50 text-violet-700 border-violet-200',
      filed: 'bg-amber-50 text-amber-800 border-amber-200',
      listed: 'bg-slate-100 text-slate-600 border-slate-200',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return map[status] || map.upcoming;
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="IPO-Katalog"
        titleIcon={PRODUCT_ICONS.ipo}
        description={
          syncStatus?.last_run_at
            ? `Letzte Synchronisierung: ${new Date(syncStatus.last_run_at).toLocaleString('de-DE')} · ${syncStatus.report?.trigger || 'manual'} · ${syncStatus.report?.fetched ?? 0} geprüft`
            : 'Börsengänge vor dem Handelsstart — Mongo-native, mit täglichem Auto-Sync aus Euronext + Nasdaq.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={runSync}
              disabled={syncing}
              data-testid="ipo-admin-sync-btn"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sync läuft…' : 'Sync jetzt'}
            </Button>
            <Button
              className="bg-bank-ink text-white hover:bg-bank-ink-elev"
              onClick={openAdd}
              data-testid="ipo-admin-add-btn"
            >
              <Plus size={16} />
              IPO hinzufügen
            </Button>
          </div>
        }
      />

      {loadError && !loading ? (
        <AdminSurfaceCard className="p-6 text-sm">
          <p className="font-semibold text-bank-error">Katalog konnte nicht geladen werden.</p>
          <p className="mt-1 text-bank-text-muted">{loadError}</p>
          <Button variant="outline" size="sm" onClick={load} className="mt-3">
            <RefreshCw size={14} className="mr-2" /> Erneut versuchen
          </Button>
        </AdminSurfaceCard>
      ) : (
        <AdminSurfaceCard>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="ipo-admin-table">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Unternehmen</th>
                  <th className="px-4 py-3 text-left">Ticker</th>
                  <th className="px-4 py-3 text-left">Quelle</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Sichtbar</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-bank-text-muted">
                      Lädt…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-bank-text-muted" data-testid="ipo-admin-empty">
                      Noch keine IPOs — manuell hinzufügen
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-bank-border ${adminRowHover}`}
                      data-testid={`ipo-admin-row-${row.id}`}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums">
                        {row.ipo_date
                          ? new Date(row.ipo_date).toLocaleDateString('de-DE')
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium">{row.company_name}</td>
                      <td className="px-4 py-3 font-mono text-[12px]">{row.ticker_proposed || '–'}</td>
                      <td className="px-4 py-3 text-[12px] text-bank-text-muted">{row.source || 'manual'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${statusBadge(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleVisible(row)}
                          className={`text-[12px] ${row.is_visible ? 'text-emerald-600' : 'text-bank-text-muted'}`}
                          data-testid={`ipo-admin-toggle-${row.id}`}
                        >
                          {row.is_visible ? 'Ja' : 'Nein'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(row)}
                            data-testid={`ipo-admin-edit-${row.id}`}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(row)}
                            data-testid={`ipo-admin-delete-${row.id}`}
                          >
                            <Trash2 size={14} className="text-rose-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSurfaceCard>
      )}

      {/* Session 82.14 — Synchronisierungsverlauf */}
      <AdminSurfaceCard className="mt-6 p-4" data-testid="ipo-sync-history">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-bank-text">Synchronisierungsverlauf</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const resp = await fetch('/api/admin/ipo/catalog/sync/history.csv', {
                    credentials: 'include',
                    headers: { Accept: 'text/csv' },
                  });
                  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  const d = new Date().toISOString().slice(0, 10);
                  a.download = `ipo-sync-history-${d}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch {
                  toast.error('Synchronisierungsverlauf konnte nicht exportiert werden.');
                }
              }}
              className="text-[11px] text-bank-text-muted hover:text-bank-text hover:underline"
              data-testid="ipo-history-csv-btn"
              disabled={history.length === 0}
            >
              CSV exportieren
            </button>
            {history.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-[11px] text-bank-accent hover:underline"
                data-testid="ipo-history-toggle"
              >
                {showAllHistory ? 'Weniger anzeigen' : `Alle anzeigen (${history.length})`}
              </button>
            )}
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-bank-text-muted" data-testid="ipo-history-empty">
            Noch keine Sync-Läufe erfasst.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(showAllHistory ? history : history.slice(0, 5)).map((run) => {
              const statusLabel = {
                success: { text: 'Erfolgreich', cls: 'text-emerald-700' },
                partial_success: { text: 'Teilweise erfolgreich', cls: 'text-amber-700' },
                failed: { text: 'Fehlgeschlagen', cls: 'text-rose-700' },
                already_running: { text: 'Parallel abgewiesen', cls: 'text-bank-text-muted' },
              }[run.status] || { text: run.status || '—', cls: 'text-bank-text-muted' };
              const usSrc = run.us_source_used === 'stockanalysis'
                ? 'StockAnalysis (Fallback)'
                : run.us_source_used === 'nasdaq'
                  ? 'Nasdaq'
                  : '—';
              return (
                <li
                  key={run.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-bank-border/40 py-1.5 text-[12px]"
                  data-testid={`ipo-history-row-${run.id}`}
                >
                  <span className="tabular-nums text-bank-text-muted">
                    {run.created_at ? new Date(run.created_at).toLocaleString('de-DE') : '—'}
                  </span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                    {run.trigger === 'cron' ? 'Cron' : run.trigger === 'admin' ? 'Manuell' : (run.trigger || '—')}
                  </span>
                  <span className={`font-medium ${statusLabel.cls}`}>{statusLabel.text}</span>
                  {run.status !== 'already_running' && (
                    <>
                      <span className="text-bank-text-muted">US-Quelle: {usSrc}</span>
                      <span className="tabular-nums text-bank-text">
                        {run.fetched ?? 0} geprüft · {run.inserted ?? 0} neu · {run.updated ?? 0} aktualisiert · {run.unchanged ?? 0} unverändert
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminSurfaceCard>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="ipo-admin-modal">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-bank-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'IPO bearbeiten' : 'Neues IPO'}</h3>
              <button type="button" onClick={closeModal} aria-label="Schließen">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <Input
                placeholder="Unternehmen *"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                required
                data-testid="ipo-admin-name-input"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Ticker"
                  value={form.ticker_proposed}
                  onChange={(e) => setForm((f) => ({ ...f, ticker_proposed: e.target.value }))}
                />
                <Input
                  placeholder="ISIN"
                  value={form.isin}
                  onChange={(e) => setForm((f) => ({ ...f, isin: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Börse / Standort"
                  value={form.exchange}
                  onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value }))}
                />
                <Input
                  placeholder="Marktsegment"
                  value={form.market}
                  onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-bank-text-muted">
                  Status
                  <select
                    className="mt-1 w-full rounded-md border border-bank-border px-2 py-2 text-[13px]"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    data-testid="ipo-admin-status-select"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  type="date"
                  placeholder="IPO-Datum"
                  value={form.ipo_date}
                  onChange={(e) => setForm((f) => ({ ...f, ipo_date: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Erwartetes IPO-Fenster (z. B. Q4 2026)"
                value={form.expected_ipo_window}
                onChange={(e) => setForm((f) => ({ ...f, expected_ipo_window: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Zeichnung von"
                  value={form.subscription_start}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_start: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="Zeichnung bis"
                  value={form.subscription_end}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_end: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Preisspanne von"
                  value={form.price_range_low}
                  onChange={(e) => setForm((f) => ({ ...f, price_range_low: e.target.value }))}
                />
                <Input
                  placeholder="Preisspanne bis"
                  value={form.price_range_high}
                  onChange={(e) => setForm((f) => ({ ...f, price_range_high: e.target.value }))}
                />
                <select
                  className="rounded-md border border-bank-border px-2 py-2 text-[13px]"
                  value={form.price_currency}
                  onChange={(e) => setForm((f) => ({ ...f, price_currency: e.target.value }))}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <Input
                placeholder="Letzte Privatbewertung (USD/EUR, voller Betrag)"
                value={form.valuation_last_private}
                onChange={(e) => setForm((f) => ({ ...f, valuation_last_private: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Min. Investition EUR"
                  value={form.min_investment_eur}
                  onChange={(e) => setForm((f) => ({ ...f, min_investment_eur: e.target.value }))}
                />
                <Input
                  placeholder="Losgröße"
                  value={form.lot_size}
                  onChange={(e) => setForm((f) => ({ ...f, lot_size: e.target.value }))}
                />
              </div>
              <Input
                placeholder="Prospekt-URL"
                value={form.prospectus_url}
                onChange={(e) => setForm((f) => ({ ...f, prospectus_url: e.target.value }))}
              />
              <textarea
                className="w-full rounded-md border border-bank-border px-3 py-2 text-[13px]"
                rows={3}
                placeholder="Beschreibung"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={(e) => setForm((f) => ({ ...f, is_visible: e.target.checked }))}
                  data-testid="ipo-admin-visible-toggle"
                />
                Für Kunden sichtbar
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={saving} data-testid="ipo-admin-save-btn">
                  <Save size={16} />
                  {saving ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminIpoCatalog;
