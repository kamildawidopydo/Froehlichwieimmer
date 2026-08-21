import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, X, PenSquare, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageMeta from '@/components/PageMeta';
import { StarsDisplay } from '@/components/reviews/RatingStars';
import { reviewsApi, formatReviewDate } from '@/services/reviewsApi';

const TABS = [
  { key: 'pending', label: 'Ausstehend' },
  { key: 'approved', label: 'Freigegeben' },
  { key: 'rejected', label: 'Abgelehnt' },
  { key: '', label: 'Alle' },
];

const STATUS_META = {
  pending: { label: 'Ausstehend', cls: 'bg-amber-50 text-amber-800 border-amber-100' },
  approved: { label: 'Freigegeben', cls: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  rejected: { label: 'Abgelehnt', cls: 'bg-rose-50 text-rose-800 border-rose-100' },
};

const EditModal = ({ review, onClose, onSaved }) => {
  const [displayName, setDisplayName] = useState(review.display_name || '');
  const [isVerified, setIsVerified] = useState(!!review.is_verified);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await reviewsApi.moderate(review.id, {
        display_name: displayName.trim() || undefined,
        is_verified: isVerified,
      });
      toast.success('Anzeige aktualisiert.');
      onSaved();
    } catch {
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.28em] text-bank-text-muted">Bearbeiten</p>
            <h2 className="mt-1 font-serif text-xl text-bank-text">Anzeigename &amp; Verifizierung</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-bank-text-muted hover:bg-neutral-100" aria-label="Schließen">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-[12.5px] leading-relaxed text-bank-text-muted">
          <span className="font-medium text-bank-text">Hinweis:</span> Der eigentliche Bewertungstext bleibt unverändert.
          Sie ändern hier ausschließlich den öffentlich angezeigten Namen und den Verifizierungsstatus.
        </p>

        <label className="mt-5 block text-[11.5px] font-medium uppercase tracking-[0.16em] text-bank-text-muted">
          Öffentlicher Anzeigename
        </label>
        <input
          type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80}
          className="mt-2 w-full rounded-xl border border-bank-border px-3 py-2 text-[14px] focus:border-bank-primary focus:outline-none"
          data-testid="admin-review-displayname"
        />

        <label className="mt-5 flex items-center gap-3 text-[13px] text-bank-text">
          <input
            type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)}
            className="h-4 w-4"
            data-testid="admin-review-verified"
          />
          Als „Verifizierte Bewertung" kennzeichnen (nur nach tatsächlicher Kundenprüfung setzen)
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">Abbrechen</Button>
          <Button onClick={save} disabled={saving} className="rounded-full" data-testid="admin-review-save">
            {saving ? 'Speichert …' : 'Speichern'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdminReviews = () => {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.adminList(status);
      setItems(data.items);
      setPendingCount(data.pending_count);
    } catch (err) {
      toast.error('Bewertungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const setStatusFor = async (id, newStatus) => {
    try {
      await reviewsApi.moderate(id, { status: newStatus });
      toast.success(newStatus === 'approved' ? 'Bewertung freigegeben.' : 'Bewertung abgelehnt.');
      load();
    } catch {
      toast.error('Aktion fehlgeschlagen.');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Möchten Sie diese Bewertung wirklich dauerhaft löschen?')) return;
    try {
      await reviewsApi.remove(id);
      toast.success('Bewertung gelöscht.');
      load();
    } catch {
      toast.error('Löschen fehlgeschlagen.');
    }
  };

  const counts = useMemo(() => ({ pending: pendingCount }), [pendingCount]);

  return (
    <div className="p-6 sm:p-10" data-testid="admin-reviews-page">
      <PageMeta title="Admin — Kundenbewertungen" noIndex path="/admin/reviews" />

      <header className="mb-8 flex items-start justify-between gap-4 border-b border-bank-border pb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-bank-text-muted">Moderation</p>
          <h1 className="mt-2 font-serif text-3xl text-bank-text">Kundenbewertungen</h1>
          <p className="mt-1 text-sm text-bank-text-muted">
            Neue Bewertungen erfordern manuelle Freigabe, bevor sie öffentlich sichtbar sind.
          </p>
        </div>
        {counts.pending > 0 && (
          <span
            className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-medium text-amber-800"
            data-testid="admin-pending-badge"
          >
            <AlertCircle className="h-4 w-4" strokeWidth={1.6} />
            {counts.pending} neue Bewertung{counts.pending === 1 ? '' : 'en'} — Freigabe erforderlich
          </span>
        )}
      </header>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => {
          const active = status === t.key;
          return (
            <button
              key={t.key || 'all'}
              onClick={() => setStatus(t.key)}
              role="tab"
              aria-selected={active}
              className={`rounded-full border px-4 py-2 text-[12.5px] transition-colors ${
                active ? 'border-bank-primary bg-bank-primary text-white' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40'
              }`}
              data-testid={`admin-tab-${t.key || 'all'}`}
            >
              {t.label}
              {t.key === 'pending' && counts.pending > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{counts.pending}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-bank-text-muted">Wird geladen …</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-bank-border bg-neutral-50 p-6 text-center text-sm text-bank-text-muted">
          In dieser Kategorie liegen aktuell keine Bewertungen vor.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map((r) => {
            const meta = STATUS_META[r.status] || STATUS_META.pending;
            return (
              <div key={r.id} className="rounded-2xl border border-bank-border bg-white p-6 shadow-editorial-sm" data-testid="admin-review-item">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <StarsDisplay value={r.rating} size={16} />
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em] ${meta.cls}`}>
                        {meta.label}
                      </span>
                      {r.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-emerald-800">
                          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} /> Verifiziert
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-serif text-lg text-bank-text">{r.display_name}</p>
                    <p className="mt-1 text-[12.5px] text-bank-text-muted">
                      {r.first_name} {r.last_name} · <span className="font-mono">{r.email}</span> · {formatReviewDate(r.created_at)}
                    </p>
                    <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-bank-text">{r.text}</p>
                    {r.moderated_at && (
                      <p className="mt-3 text-[11.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                        Moderation: {r.moderated_by || '—'} · {formatReviewDate(r.moderated_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch gap-2">
                    {r.status !== 'approved' && (
                      <Button size="sm" className="rounded-full" onClick={() => setStatusFor(r.id, 'approved')} data-testid={`admin-approve-${r.id}`}>
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Freigeben
                      </Button>
                    )}
                    {r.status !== 'rejected' && (
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setStatusFor(r.id, 'rejected')} data-testid={`admin-reject-${r.id}`}>
                        <X className="mr-1.5 h-3.5 w-3.5" /> Ablehnen
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(r)} data-testid={`admin-edit-${r.id}`}>
                      <PenSquare className="mr-1.5 h-3.5 w-3.5" /> Bearbeiten
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => remove(r.id)}
                      data-testid={`admin-delete-${r.id}`}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Löschen
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal review={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
};

export default AdminReviews;
