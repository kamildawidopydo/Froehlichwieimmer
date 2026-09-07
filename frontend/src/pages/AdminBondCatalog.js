import React, { useEffect, useState } from 'react';
import { FileBarChart2, Plus, Edit, Trash2, X, Save, RefreshCw, DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
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

const EMPTY = {
  isin: '',
  bond_name: '',
  issuer: '',
  kupon_rate: '',
  kaufkurs: '',
  aktueller_kurs: '',
  faelligkeitsdatum: '',
  min_order_eur: '',
  denomination: '',
  is_available: true,
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

const AdminBondCatalog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

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
      } else {
        toast.error('Sync fehlgeschlagen: ' + (report.errors?.[0] || 'unbekannter Fehler'));
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
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      isin: row.isin || '',
      bond_name: row.bond_name || '',
      issuer: row.issuer || '',
      kupon_rate: row.kupon_rate != null ? String(row.kupon_rate) : '',
      kaufkurs: row.kaufkurs != null ? String(row.kaufkurs) : '',
      aktueller_kurs: row.aktueller_kurs != null ? String(row.aktueller_kurs) : '',
      faelligkeitsdatum: row.faelligkeitsdatum || '',
      min_order_eur: row.min_order_eur != null ? String(row.min_order_eur) : '',
      denomination: row.denomination != null ? String(row.denomination) : '',
      is_available: row.is_available ?? true,
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
    setSaving(true);
    const payload = {
      isin: form.isin ? form.isin.trim() : null,
      bond_name: form.bond_name ? form.bond_name.trim() : null,
      issuer: form.issuer ? form.issuer.trim() : null,
      kupon_rate: parseNum(form.kupon_rate),
      kaufkurs: parseNum(form.kaufkurs),
      aktueller_kurs: parseNum(form.aktueller_kurs),
      faelligkeitsdatum: form.faelligkeitsdatum || null,
      min_order_eur: parseNum(form.min_order_eur),
      denomination: parseNum(form.denomination),
      is_available: !!form.is_available,
    };
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
    } finally {
      setSaving(false);
    }
  };

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="bond-admin-table">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Bond</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Emittent</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Kupon</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Akt. Kurs</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Fälligkeit</th>
                  <th className="text-left py-3 px-4 font-semibold text-bank-text-muted">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-bank-text-muted">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-bank-text-muted">
                      <RefreshCw size={16} className="inline animate-spin mr-2" /> Lädt…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-bank-text-muted/70" data-testid="bond-admin-empty">
                      Noch keine Anleihen im Katalog.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-bank-border/70 ${adminRowHover}`}
                      data-testid={`bond-admin-row-${row.id}`}
                    >
                      <td className="py-3 px-4 font-medium text-bank-text">
                        {row.bond_name || '–'}
                        {row.isin && (
                          <p className="text-[11px] text-bank-text-muted">ISIN {row.isin}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-bank-text-muted">{row.issuer || '–'}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {row.kupon_rate != null ? `${row.kupon_rate}%` : '–'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {row.aktueller_kurs != null ? `${row.aktueller_kurs}%` : '–'}
                      </td>
                      <td className="py-3 px-4 text-bank-text-muted">
                        {row.faelligkeitsdatum
                          ? new Date(row.faelligkeitsdatum).toLocaleDateString('de-DE')
                          : '–'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.is_available ? 'bg-bank-success/10 text-bank-success border border-bank-success/25' : 'bg-bank-border/15 text-bank-text-muted border border-bank-border/40'}`}
                        >
                          {row.is_available ? 'Verfügbar' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
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
        </AdminSurfaceCard>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          data-testid="bond-admin-modal"
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-bank-border shrink-0">
              <h2 className="text-lg font-semibold text-bank-text">
                {editing ? 'Anleihe bearbeiten' : 'Neue Anleihe'}
              </h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-bank-border/15 rounded-lg">
                <X size={20} className="text-bank-text-muted" />
              </button>
            </div>

            <form
              id="bond-form"
              onSubmit={submit}
              className="overflow-y-auto px-6 py-5 space-y-4 flex-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Bond-Name
                  </label>
                  <Input
                    value={form.bond_name}
                    onChange={(e) => setForm((p) => ({ ...p, bond_name: e.target.value }))}
                    placeholder="z. B. Bundesanleihe 0.50% 2030"
                    data-testid="bond-admin-name-input"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">ISIN</label>
                  <Input
                    value={form.isin}
                    onChange={(e) => setForm((p) => ({ ...p, isin: e.target.value }))}
                    placeholder="DE0001102457"
                    data-testid="bond-admin-isin-input"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                  Emittent
                </label>
                <Input
                  value={form.issuer}
                  onChange={(e) => setForm((p) => ({ ...p, issuer: e.target.value }))}
                  data-testid="bond-admin-issuer-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Kupon (% p.a.)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.kupon_rate}
                    onChange={(e) => setForm((p) => ({ ...p, kupon_rate: e.target.value }))}
                    data-testid="bond-admin-kupon-input"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Kaufkurs (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.kaufkurs}
                    onChange={(e) => setForm((p) => ({ ...p, kaufkurs: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Akt. Kurs (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.aktueller_kurs}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, aktueller_kurs: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Fälligkeit
                  </label>
                  <Input
                    type="date"
                    value={form.faelligkeitsdatum}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, faelligkeitsdatum: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Min. Order (€)
                  </label>
                  <Input
                    type="number"
                    value={form.min_order_eur}
                    onChange={(e) => setForm((p) => ({ ...p, min_order_eur: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-bank-text-muted mb-1 block">
                    Stückelung (€)
                  </label>
                  <Input
                    type="number"
                    value={form.denomination}
                    onChange={(e) => setForm((p) => ({ ...p, denomination: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-bank-bg rounded-lg border border-bank-border">
                <div>
                  <p className="text-sm font-medium text-bank-text-muted">Verfügbar</p>
                  <p className="text-xs text-bank-text-muted mt-0.5">
                    Anleihe ist im Kunden-Katalog sichtbar.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, is_available: e.target.checked }))
                    }
                    className="sr-only peer"
                    data-testid="bond-admin-visible-toggle"
                  />
                  <div className="w-11 h-6 bg-bank-border/25 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bank-ink" />
                </label>
              </div>
            </form>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-bank-border shrink-0">
              <Button type="button" variant="outline" onClick={closeModal}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                form="bond-form"
                disabled={saving}
                className="bg-bank-ink hover:bg-bank-ink-elev text-white"
                data-testid="bond-admin-save-btn"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="mr-2 animate-spin" /> Speichert…
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />{' '}
                    {editing ? 'Änderungen speichern' : 'Anleihe anlegen'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminBondCatalog;
