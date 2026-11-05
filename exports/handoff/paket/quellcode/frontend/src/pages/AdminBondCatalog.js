import React, { useEffect, useMemo, useState } from 'react';
import { FileBarChart2, Plus, Edit, Trash2, RefreshCw, DownloadCloud, History, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import BondFormModal from '@/components/admin/bonds/BondFormModal';
import BondHistoryDialog from '@/components/admin/bonds/BondHistoryDialog';
import { matchesBondSearch, pctDe } from '@/lib/bondDisplay';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

/**
 * Bond-Katalog Admin (Session 82.03) — vollständig FastAPI/Mongo-native.
 * Kein Supabase-Direktzugriff mehr; Auth via httpOnly-Cookie, role=admin
 * wird serverseitig geprüft.
 */

const PAGE_SIZE = 100;

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

const AdminBondCatalog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [historyBond, setHistoryBond] = useState(null);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadError, setLoadError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [history, setHistory] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const loadHistory = async () => {
    try {
      const h = await fetchJson('/api/admin/bonds/catalog/sync/history?limit=30');
      setHistory(h?.runs || []);
    } catch {
      // best-effort
    }
  };

  const runSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setLastSync(null);
    try {
      const report = await fetchJson('/api/admin/bonds/catalog/sync', { method: 'POST' });
      setLastSync(report);
      if (report.status === 'already_running') {
        toast.info('Ein Sync läuft bereits — Bitte kurz warten.');
      } else if (report.status === 'success') {
        const checked = report.eligible_before_cap ?? 0;
        const ins = report.inserted ?? 0;
        const upd = report.updated ?? 0;
        const un = report.unchanged ?? 0;
        const skippedCap = report.skipped_due_to_cap ?? 0;
        let msg = `${checked} Anleihen geprüft · ${ins} neu · ${upd} aktualisiert · ${un} unverändert`;
        if (skippedCap > 0) {
          msg += ` — Weitere ${skippedCap} geeignete Werte wurden aufgrund der Katalogbegrenzung nicht importiert.`;
        }
        toast.success(msg);
        await load();
        await loadHistory();
      } else {
        toast.error('Sync fehlgeschlagen: ' + (report.errors?.[0] || 'unbekannter Fehler'));
        await loadHistory();
      }
    } catch (err) {
      toast.error('Sync-Fehler: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchJson('/api/admin/bonds/catalog');
      setItems(Array.isArray(data) ? data : []);
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
    loadHistory();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const submit = async (payload) => {
    try {
      if (editing) {
        await fetchJson(`/api/admin/bonds/catalog/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Anleihe aktualisiert');
      } else {
        await fetchJson('/api/admin/bonds/catalog', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Anleihe hinzugefügt');
      }
      await load();
      closeModal();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    }
  };

  const toggle = async (row, field) => {
    try {
      await fetchJson(`/api/admin/bonds/catalog/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: !row[field] }),
      });
      await load();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    }
  };

  const visible = useMemo(() => {
    let list = items.filter((b) => matchesBondSearch(b, query));
    if (scope === 'manual') list = list.filter((b) => b.source !== 'deutsche_boerse_xfra_bf');
    if (scope === 'inactive') list = list.filter((b) => !b.is_available || !b.requests_enabled);
    return list;
  }, [items, query, scope]);

  const remove = async (row) => {
    if (!window.confirm('Anleihe wirklich entfernen?')) return;
    try {
      await fetchJson(`/api/admin/bonds/catalog/${row.id}`, { method: 'DELETE' });
      toast.success('Entfernt');
      await load();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    }
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="Anleihen-Katalog"
        titleIcon={FileBarChart2}
        description="Pflegen Sie das Universum kaufbarer Anleihen, das Kunden im Bereich „Neue Anleihe kaufen“ sehen."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={runSync}
              disabled={syncing}
              data-testid="bond-admin-sync-btn"
            >
              {syncing ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" /> Synchronisiere…
                </>
              ) : (
                <>
                  <DownloadCloud size={16} className="mr-2" /> Jetzt synchronisieren
                </>
              )}
            </Button>
            <Button
              className="bg-bank-ink text-white hover:bg-bank-ink-elev"
              onClick={openAdd}
              data-testid="bond-admin-add-btn"
            >
              <Plus size={16} className="mr-2" />
              Anleihe hinzufügen
            </Button>
          </div>
        }
      />
      {lastSync && lastSync.status === 'success' && (
        <div
          className="mt-2 rounded-lg border border-bank-border/60 bg-bank-bg/40 px-4 py-3 text-sm text-bank-text-muted"
          data-testid="bond-admin-sync-summary"
        >
          <span className="font-medium text-bank-text">Letzter Sync:</span>{' '}
          {lastSync.eligible_before_cap} geprüft · {lastSync.inserted} neu ·{' '}
          {lastSync.updated} aktualisiert · {lastSync.unchanged} unverändert
          {lastSync.skipped_manual_override > 0 && (
            <> · {lastSync.skipped_manual_override} geschützt (manuell gepflegt)</>
          )}
          {lastSync.skipped_due_to_cap > 0 && (
            <> · {lastSync.skipped_due_to_cap} durch Katalogbegrenzung ausgeschlossen</>
          )}
          <span className="ml-2 text-[11px] opacity-70">
            (Quelle: Deutsche Börse XFRA-BF · {Math.round((lastSync.duration_ms || 0) / 10) / 100}s)
          </span>
        </div>
      )}

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
          <div className="flex flex-wrap items-center gap-3 border-b border-bank-border/70 p-4">
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}
              placeholder="Suche: Name, ISIN, WKN, Emittent, Kupon…"
              className="h-9 max-w-sm text-sm"
              data-testid="bond-admin-search"
            />
            <select
              value={scope}
              onChange={(e) => { setScope(e.target.value); setLimit(PAGE_SIZE); }}
              className="h-9 border border-bank-border bg-white px-2 text-sm"
              data-testid="bond-admin-scope"
            >
              <option value="all">Alle Anleihen</option>
              <option value="manual">Manuell gepflegt</option>
              <option value="inactive">Ausgeblendet / gesperrt</option>
            </select>
            <span className="text-xs text-bank-text-muted" data-testid="bond-admin-count">{visible.length} Treffer</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="bond-admin-table">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Bond</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Emittent</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Kupon</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Akt. Kurs</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Kurs-Stand</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Fälligkeit</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-bank-text-muted">
                      <RefreshCw size={16} className="inline animate-spin mr-2" /> Lädt…
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-bank-text-muted/70" data-testid="bond-admin-empty">
                      Keine Anleihen gefunden.
                    </td>
                  </tr>
                ) : (
                  visible.slice(0, limit).map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-bank-border/70 ${adminRowHover}`}
                      data-testid={`bond-admin-row-${row.id}`}
                    >
                      <td className="py-3 px-4 font-medium text-bank-text">
                        {row.bond_name || '–'}
                        {row.isin && (
                          <p className="text-[11px] text-bank-text-muted">ISIN {row.isin}{row.wkn ? ` · WKN ${row.wkn}` : ''}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-bank-text-muted">{row.issuer || '–'}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {pctDe(row.kupon_rate)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {pctDe(row.aktueller_kurs, 2, 4)}
                        {row.kurs_typ === 'reference' && (
                          <p className="text-[10px] text-amber-700">Referenzkurs</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-bank-text-muted" data-testid={`bond-admin-price-updated-${row.id}`}>
                        {row.price_updated_at ? new Date(row.price_updated_at).toLocaleString('de-DE') : '–'}
                      </td>
                      <td className="py-3 px-4 text-bank-text-muted">
                        {row.is_perpetual
                          ? 'Unbefristet'
                          : row.faelligkeitsdatum
                            ? new Date(row.faelligkeitsdatum).toLocaleDateString('de-DE')
                            : '–'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.is_available ? 'bg-bank-success/10 text-bank-success border border-bank-success/25' : 'bg-bank-border/15 text-bank-text-muted border border-bank-border/40'}`}
                        >
                          {row.is_available ? 'Sichtbar' : 'Ausgeblendet'}
                        </span>
                        <span
                          className={`ml-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${row.requests_enabled ? 'border-sky-300/50 bg-sky-50 text-sky-700' : 'border-rose-300/50 bg-rose-50 text-rose-700'}`}
                        >
                          {row.requests_enabled ? 'Anfragen offen' : 'Anfragen gesperrt'}
                        </span>
                        {(row.legal_issuer_status === 'pending' || row.terms_status === 'pending') && (
                          <span
                            className="ml-1 mt-1 inline-flex rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                            title={row.verification_note || ''}
                            data-testid={`bond-admin-verification-${row.id}`}
                          >
                            Verifizierung ausstehend
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => toggle(row, 'is_available')}
                            className="p-1.5 text-bank-text-muted hover:bg-bank-border/15 rounded"
                            title={row.is_available ? 'Im Kundenbereich ausblenden' : 'Im Kundenbereich einblenden'}
                            data-testid={`bond-admin-toggle-visible-${row.id}`}
                          >
                            {row.is_available ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => toggle(row, 'requests_enabled')}
                            className="p-1.5 text-bank-text-muted hover:bg-bank-border/15 rounded"
                            title={row.requests_enabled ? 'Kaufanfragen sperren' : 'Kaufanfragen freigeben'}
                            data-testid={`bond-admin-toggle-requests-${row.id}`}
                          >
                            {row.requests_enabled ? <Lock size={16} /> : <Unlock size={16} />}
                          </button>
                          <button
                            onClick={() => setHistoryBond(row)}
                            className="p-1.5 text-bank-text-muted hover:bg-bank-border/15 rounded"
                            title="Kurshistorie & Protokoll"
                            data-testid={`bond-admin-history-${row.id}`}
                          >
                            <History size={16} />
                          </button>
                          <button
                            onClick={() => openEdit(row)}
                            className="p-1.5 text-bank-accent hover:bg-bank-accent/10 rounded transition-colors"
                            title="Bearbeiten"
                            data-testid={`bond-admin-edit-${row.id}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => remove(row)}
                            className="p-1.5 text-bank-error hover:bg-bank-error/10 rounded transition-colors"
                            title="Löschen"
                            data-testid={`bond-admin-delete-${row.id}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {visible.length > limit && (
            <div className="p-4 text-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)} data-testid="bond-admin-more">
                Weitere {Math.min(PAGE_SIZE, visible.length - limit)} anzeigen
              </Button>
            </div>
          )}
        </AdminSurfaceCard>
      )}

      {/* Session 82.17 — Synchronisierungsverlauf */}
      <AdminSurfaceCard className="mt-6 p-4" data-testid="bond-sync-history">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-bank-text">Synchronisierungsverlauf</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const resp = await fetch('/api/admin/bonds/catalog/sync/history.csv', {
                    credentials: 'include',
                    headers: { Accept: 'text/csv' },
                  });
                  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  const d = new Date().toISOString().slice(0, 10);
                  a.download = `bond-sync-history-${d}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch {
                  toast.error('Synchronisierungsverlauf konnte nicht exportiert werden.');
                }
              }}
              className="text-[11px] text-bank-text-muted hover:text-bank-text hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="bond-history-csv-btn"
              disabled={history.length === 0}
            >
              CSV exportieren
            </button>
            {history.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-[11px] text-bank-accent hover:underline"
                data-testid="bond-history-toggle"
              >
                {showAllHistory ? 'Weniger anzeigen' : `Alle anzeigen (${history.length})`}
              </button>
            )}
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-bank-text-muted" data-testid="bond-history-empty">
            Noch keine Sync-Läufe erfasst.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(showAllHistory ? history : history.slice(0, 5)).map((run) => {
              const statusLabel = {
                success: { text: 'Erfolgreich', cls: 'text-emerald-700' },
                partial_success: { text: 'Teilweise erfolgreich', cls: 'text-amber-700' },
                failed: { text: 'Fehlgeschlagen', cls: 'text-rose-700' },
                already_running: { text: 'Bereits aktiv', cls: 'text-bank-text-muted' },
              }[run.status] || { text: run.status || '—', cls: 'text-bank-text-muted' };
              return (
                <li
                  key={run.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-bank-border/40 py-1.5 text-[12px]"
                  data-testid={`bond-history-row-${run.id}`}
                >
                  <span className="tabular-nums text-bank-text-muted">
                    {run.created_at ? new Date(run.created_at).toLocaleString('de-DE') : '—'}
                  </span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                    {run.trigger === 'cron' ? 'Cron' : run.trigger === 'admin' ? 'Manuell' : (run.trigger || '—')}
                  </span>
                  <span className={`font-medium ${statusLabel.cls}`}>{statusLabel.text}</span>
                  {run.status !== 'already_running' && (
                    <span className="tabular-nums text-bank-text">
                      {run.raw_rows ?? 0} geprüft · {run.eligible_before_cap ?? 0} geeignet ·{' '}
                      {run.imported_after_cap ?? 0} importiert · {run.inserted ?? 0} neu ·{' '}
                      {run.updated ?? 0} aktualisiert · {run.unchanged ?? 0} unverändert
                      {run.skipped_manual_override > 0 && (
                        <> · {run.skipped_manual_override} geschützt</>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminSurfaceCard>

      <BondFormModal open={showModal} editing={editing} onClose={closeModal} onSubmit={submit} />
      <BondHistoryDialog bond={historyBond} onClose={() => setHistoryBond(null)} fetchJson={fetchJson} />
    </AdminSubpageLayout>
  );
};

export default AdminBondCatalog;
