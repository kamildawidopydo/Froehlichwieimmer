// Session 93 · Phase 5 — Review-Queue.
// Zeigt offene, freigegebene und abgelehnte Änderungsvorschläge inkl. before/after-Diff.
// Aktionen: approve · reject · edit_and_approve. Keine Bulk-Aktion für kritische
// Änderungen (DGS-/Land-/Produkttyp-Wechsel werden markiert).
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  RefreshCw, ShieldAlert, Check, X, Pencil, AlertTriangle, ExternalLink, Clock,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'open', label: 'Offen' },
  { key: 'approved', label: 'Freigegeben' },
  { key: 'rejected', label: 'Abgelehnt' },
];

const CRITICAL_REASONS = new Set([
  'dgs_country_changed',
  'country_changed',
  'product_type_changed',
]);

const REASON_LABEL = {
  dgs_country_changed: 'DGS-Land geändert',
  country_changed: 'Bankland geändert',
  product_type_changed: 'Produkttyp geändert',
  max_deposit_large_delta: 'Max-Einlage stark verändert',
};

function reasonLabel(r) {
  if (REASON_LABEL[r]) return REASON_LABEL[r];
  if (r.startsWith('rate_change_gt_')) {
    const pp = r.replace('rate_change_gt_', '').replace('pp', '');
    return `Zinssprung ≥ ${pp} pp`;
  }
  return r;
}

function DiffRow({ field, before, after }) {
  const changed = String(before ?? '') !== String(after ?? '');
  return (
    <tr className={changed ? 'bg-amber-50/60' : ''}>
      <td className="border-b border-bank-border/40 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-bank-text-muted">
        {field}
      </td>
      <td className="border-b border-bank-border/40 px-3 py-2 text-sm text-bank-text-muted line-through decoration-red-400/60">
        {before === undefined || before === null || before === '' ? '—' : String(before)}
      </td>
      <td className="border-b border-bank-border/40 px-3 py-2 text-sm font-medium text-bank-text">
        {after === undefined || after === null || after === '' ? '—' : String(after)}
      </td>
    </tr>
  );
}

function computeDiffFields(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return Array.from(keys).sort();
}

function EditModal({ open, onClose, initial, onSave, saving }) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (open) {
      setText(JSON.stringify(initial || {}, null, 2));
      setNote('');
    }
  }, [open, initial]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-2xl border border-bank-border bg-white shadow-editorial-lg">
        <div className="flex items-center justify-between border-b border-bank-border px-5 py-3">
          <h3 className="font-display text-lg text-bank-text">Werte bearbeiten & freigeben</h3>
          <button onClick={onClose} aria-label="Schliessen" className="text-bank-text-muted hover:text-bank-text">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-[12px] text-bank-text-muted">
            JSON der geänderten Felder. Nur explizit gesetzte Keys werden übernommen.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full border border-bank-border p-3 font-mono text-[12px] text-bank-text focus:border-bank-gold focus:outline-none"
            data-testid="review-edit-json"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optionale Notiz (wird ins Audit-Log geschrieben)"
            data-testid="review-edit-note"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-bank-border bg-bank-bg/40 px-5 py-3">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button
            variant="primary"
            disabled={saving}
            data-testid="review-edit-approve"
            onClick={() => {
              let parsed;
              try {
                parsed = JSON.parse(text);
              } catch {
                toast.error('Ungültiges JSON.');
                return;
              }
              onSave(parsed, note);
            }}
          >
            <Check size={14} /> Bearbeiten & freigeben
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSavingsReviews() {
  const [status, setStatus] = useState('open');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterReason, setFilterReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const { data } = await _axios.get(
        `${_api}/api/admin/savings/review-items?status=${status}&limit=200`,
        { withCredentials: true },
      );
      setItems(data?.items || []);
    } catch (err) {
      console.error('reviews', err);
      toast.error('Review-Queue konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!filterReason) return items;
    return items.filter((it) => (it.reasons || []).some((r) => r === filterReason));
  }, [items, filterReason]);

  const act = useCallback(
    async (id, action, edits, note) => {
      setBusyId(id);
      setSaving(true);
      try {
        const _axios = (await import('axios')).default;
        const _api = (await import('@/lib/apiBase')).getApiBase();
        await _axios.post(
          `${_api}/api/admin/savings/review-items/${id}`,
          { action, edits, note },
          { withCredentials: true },
        );
        toast.success(
          action === 'approve'
            ? 'Freigegeben.'
            : action === 'reject'
            ? 'Abgelehnt.'
            : 'Bearbeitet & freigegeben.',
        );
        setEditItem(null);
        await load();
      } catch (err) {
        console.error('review action', err);
        toast.error('Aktion fehlgeschlagen.');
      } finally {
        setBusyId(null);
        setSaving(false);
      }
    },
    [load],
  );

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Sparvergleich"
        title="Review-Queue"
        titleIcon={ShieldAlert}
        description="Alle nicht-vertrauenswürdigen Änderungsvorschläge landen hier zur manuellen Prüfung. Kein Auto-Publish."
      />

      <AdminToolbarCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                data-testid={`reviews-tab-${t.key}`}
                className={`border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  status === t.key
                    ? 'border-bank-gold bg-bank-ink text-white'
                    : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 hover:text-bank-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              placeholder="Filter Grund (z. B. dgs_country_changed)"
              className="w-64"
              data-testid="reviews-filter-reason"
            />
            <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Aktualisieren
            </Button>
          </div>
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={20} className="mx-auto mb-3 animate-spin text-bank-text-muted/70" />
            <p className="text-sm text-bank-text-muted">Lade Review-Items…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-bank-text-muted" data-testid="reviews-empty">
            Keine Einträge im Status „{status}".
          </div>
        ) : (
          <ul className="divide-y divide-bank-border/70">
            {filtered.map((it) => {
              const isCritical = (it.reasons || []).some((r) => CRITICAL_REASONS.has(r));
              const fields = computeDiffFields(it.before, it.after);
              return (
                <li key={it.id} data-testid={`review-item-${it.id}`} className="px-5 py-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">
                          {it.entity_type}
                        </span>
                        <span className="font-mono text-[10.5px] text-bank-text-muted">·</span>
                        <span className="font-mono text-[11px] text-bank-text">{it.entity_id}</span>
                        {isCritical ? (
                          <span
                            data-testid="review-critical-flag"
                            className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-red-700"
                          >
                            <AlertTriangle size={11} /> kritisch
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-bank-text-muted">
                        {it.source_slug ? (
                          <span className="inline-flex items-center gap-1">
                            <ExternalLink size={11} /> Quelle: <span className="font-medium text-bank-text">{it.source_slug}</span>
                          </span>
                        ) : (
                          <span>Quelle: unbekannt</span>
                        )}
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {it.created_at ? new Date(it.created_at).toLocaleString('de-DE') : '—'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(it.reasons || []).map((r) => (
                          <span
                            key={r}
                            className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                              CRITICAL_REASONS.has(r)
                                ? 'border-red-300 bg-red-50 text-red-700'
                                : 'border-amber-300 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {reasonLabel(r)}
                          </span>
                        ))}
                      </div>
                    </div>
                    {status === 'open' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => act(it.id, 'reject')}
                          disabled={busyId === it.id}
                          data-testid={`review-reject-${it.id}`}
                          className="gap-1"
                        >
                          <X size={14} /> Ablehnen
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditItem(it)}
                          disabled={busyId === it.id}
                          data-testid={`review-edit-${it.id}`}
                          className="gap-1"
                        >
                          <Pencil size={14} /> Bearbeiten
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => act(it.id, 'approve')}
                          disabled={busyId === it.id}
                          data-testid={`review-approve-${it.id}`}
                          className="gap-1"
                        >
                          <Check size={14} /> Freigeben
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="overflow-x-auto border border-bank-border/60">
                    <table className="w-full text-sm">
                      <thead className="bg-bank-bg/40">
                        <tr>
                          <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Feld</th>
                          <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Vorher</th>
                          <th className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted">Nachher</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((f) => (
                          <DiffRow key={f} field={f} before={(it.before || {})[f]} after={(it.after || {})[f]} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSurfaceCard>

      <EditModal
        open={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        initial={editItem?.after}
        saving={saving}
        onSave={(edits, note) => act(editItem.id, 'edit_and_approve', edits, note)}
      />
    </AdminSubpageLayout>
  );
}
