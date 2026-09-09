import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Check, X, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';
// Session 82.103a · Reviews-Reader auf FastAPI (`/api/admin/reviews`).
const API = getApiBase();
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import StarRatingRow from '@/components/comparison/StarRatingRow';
import { formatStarAverageDe } from '@/lib/starRating';
import {
  adminApproveReview,
  adminRejectReview,
  adminDeleteReview,
  getAdminReviewAuthorInfo,
} from '@/lib/offerReviews';
import { Input } from '@/components/ui/input';
import { logEvent, EVENTS } from '@/lib/activityLogger';

const STATUS_TABS = [
  { key: 'pending', label: 'Ausstehend' },
  { key: 'approved', label: 'Freigegeben' },
  { key: 'rejected', label: 'Abgelehnt' },
  { key: 'all', label: 'Alle aktiv' },
  { key: 'deleted', label: 'Gelöscht' },
];

const AdminOfferReviews = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [tab, setTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/reviews`, {
        withCredentials: true,
        params: { status: tab },
      });
      setTableMissing(Boolean(data?.table_missing));
      setItems(data?.items || []);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.response?.data?.detail || err.message));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => (tab === 'pending' ? items.length : null),
    [tab, items.length]
  );

  const approve = async (row) => {
    const note = window.prompt('Optionaler Admin-Kommentar:', '') || null;
    setProcessingId(row.id);
    const { error } = await adminApproveReview(row.id, note);
    setProcessingId(null);
    if (error) {
      toast.error('Freigabe fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Bewertung freigegeben');
    logEvent(EVENTS.OFFER_REVIEW_APPROVE, { review_id: row.id, savings_offer_id: row.savings_offer_id });
    load();
  };

  const reject = async (row) => {
    const reason = window.prompt('Ablehnungsgrund (optional):', '') || null;
    setProcessingId(row.id);
    const { error } = await adminRejectReview(row.id, reason);
    setProcessingId(null);
    if (error) {
      toast.error('Ablehnung fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Bewertung abgelehnt');
    logEvent(EVENTS.OFFER_REVIEW_REJECT, { review_id: row.id, savings_offer_id: row.savings_offer_id });
    load();
  };

  const removeReview = async (row) => {
    const statusLabel =
      row.status === 'approved'
        ? 'freigegebene'
        : row.status === 'rejected'
          ? 'abgelehnte'
          : 'ausstehende';
    const confirmed = window.confirm(
      `Diese ${statusLabel} Bewertung wirklich löschen? Sie erscheint danach nur noch unter „Gelöscht“.`
    );
    if (!confirmed) return;
    setProcessingId(row.id);
    const { error } = await adminDeleteReview(row.id);
    setProcessingId(null);
    if (error) {
      toast.error('Löschen fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Bewertung gelöscht');
    logEvent(EVENTS.OFFER_REVIEW_DELETE, { review_id: row.id, savings_offer_id: row.savings_offer_id });
    load();
  };

  const bankLabel = (row) => row.savings_offer?.banks?.name || '—';

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((row) => {
      const author = getAdminReviewAuthorInfo(row);
      const hay = [
        row.id,
        row.savings_offer_id,
        row.body,
        row.status,
        row.rejection_reason,
        author.fullName,
        author.email,
        bankLabel(row),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [items, searchTerm]);

  const offerHint = (row) => {
    const o = row.savings_offer;
    if (!o) return '—';
    const rate = Number(o.interest_rate);
    const rateStr = Number.isFinite(rate) ? `${rate.toFixed(2).replace('.', ',')} %` : '—';
    return `${rateStr} · ${o.deposit_term === 0 ? 'Flexgeld' : `${o.deposit_term} Mon.`}`;
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Vergleich"
        title="Kundenbewertungen"
        titleIcon={Star}
        description="Freigabe, Ablehnung oder Löschen — Activity-Einträge sind historisch und können vom aktuellen Status abweichen."
      />

      {!tableMissing && (
        <AdminSurfaceCard className="mb-4 border-amber-200/80 bg-amber-50/60 p-4">
          <p className="text-sm text-bank-text">
            <strong>Hinweis zu Activity:</strong> Ein „Bewertung abgelehnt“-Eintrag bleibt im Aktivitätslog,
            auch wenn die Bewertung später erneut eingereicht wurde (Status wechselt dann zu{' '}
            <span className="font-mono text-xs">pending</span>). Suche die{' '}
            <span className="font-mono text-xs">review_id</span> unter „Alle aktiv“ — fehlt sie ganz, wurde
            die Zeile ggf. gelöscht oder das Angebot entfernt.
          </p>
        </AdminSurfaceCard>
      )}

      {tableMissing ? (
        <AdminSurfaceCard className="p-6">
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
            Schema fehlt
          </p>
          <p className="mt-2 text-sm text-bank-text-muted">
            Migrationen{' '}
            <code className="text-xs">20260519120000_offer_reviews.sql</code> und{' '}
            <code className="text-xs">20260521150000_offer_reviews_anonymous.sql</code> auf Supabase
            ausführen.
          </p>
        </AdminSurfaceCard>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors ${
                  tab === t.key
                    ? 'border-bank-ink bg-bank-ink text-white'
                    : 'border-bank-border bg-white text-bank-text-muted hover:text-bank-text'
                }`}
              >
                {t.label}
                {t.key === 'pending' && pendingCount != null && tab !== 'pending' ? null : null}
              </button>
            ))}
            <Button type="button" variant="outline-ink" size="sm" className="ml-auto" onClick={load}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Aktualisieren
            </Button>
          </div>

          <div className="mb-4">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suche: review_id, Angebot, Autor, Text…"
              className="max-w-xl"
              aria-label="Bewertungen durchsuchen"
            />
          </div>

          <AdminSurfaceCard className="overflow-x-auto p-0">
            {loading ? (
              <p className="p-8 text-center text-sm text-bank-text-muted">Lädt…</p>
            ) : filteredItems.length === 0 ? (
              <p className="p-8 text-center text-sm text-bank-text-muted">
                {items.length === 0 ? 'Keine Einträge in dieser Ansicht.' : 'Keine Treffer für die Suche.'}
              </p>
            ) : (
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr className={adminTheadClass}>
                    <th className="px-4 py-3">Angebot</th>
                    <th className="px-4 py-3">Autor</th>
                    <th className="px-4 py-3">Bewertung</th>
                    <th className="px-4 py-3">Text</th>
                    <th className="px-4 py-3">Status / Datum</th>
                    <th className="px-4 py-3 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((row) => (
                    <tr key={row.id} className={adminRowHover}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-bank-text">{bankLabel(row)}</p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-bank-text-muted">
                          {offerHint(row)} · {row.product_type}
                        </p>
                        <p className="mt-1 font-mono text-[9px] text-bank-text-muted/80" title="review_id">
                          {row.id}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {(() => {
                          const author = getAdminReviewAuthorInfo(row);
                          return (
                            <>
                              <p className="font-medium text-bank-text">{author.fullName}</p>
                              {author.isGuest ? (
                                <p className="text-xs text-bank-text-muted">
                                  {author.publicName !== author.fullName
                                    ? `Öffentlich: ${author.publicName} · `
                                    : ''}
                                  ohne Konto
                                </p>
                              ) : (
                                <p className="text-xs text-bank-text-muted">
                                  {author.email || '—'}
                                  {author.publicName && author.publicName !== author.fullName
                                    ? ` · Öffentlich: ${author.publicName}`
                                    : ''}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StarRatingRow value={Number(row.stars)} size="sm" />
                        <p className="mt-1 text-xs tabular-nums text-bank-text-muted">
                          {formatStarAverageDe(Number(row.stars))}
                        </p>
                      </td>
                      <td className="max-w-xs px-4 py-3 align-top">
                        <p className="line-clamp-4 text-bank-text-muted">{row.body}</p>
                        {row.rejection_reason && (
                          <p className="mt-2 text-xs text-red-600">Grund: {row.rejection_reason}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-bank-text-muted">
                        {(tab === 'all' || tab === 'deleted') && (
                          <span className="mb-1 inline-block rounded border border-bank-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-bank-text">
                            {row.status}
                          </span>
                        )}
                        <div>Eingereicht: {format(new Date(row.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</div>
                        {row.reviewed_at && (
                          <div className="mt-0.5">
                            Moderiert: {format(new Date(row.reviewed_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {tab !== 'deleted' && row.status === 'pending' && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                disabled={processingId === row.id}
                                onClick={() => approve(row)}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Freigeben
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline-ink"
                                disabled={processingId === row.id}
                                onClick={() => reject(row)}
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Ablehnen
                              </Button>
                            </>
                          )}
                          {tab !== 'deleted' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline-ink"
                              className="text-red-700 hover:border-red-300"
                              disabled={processingId === row.id}
                              onClick={() => removeReview(row)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Löschen
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminSurfaceCard>
        </>
      )}
    </AdminSubpageLayout>
  );
};

export default AdminOfferReviews;
