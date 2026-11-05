import React, { useEffect, useMemo, useState } from 'react';
import { Send, Check, RefreshCw, Trash2, X, Package, StickyNote, FileSignature, Ban, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// Session 82.90c — Supabase-Cutover: Legacy-Mutationen entfernt, Delete durch
// FastAPI-Archive-Endpoint aus 82.90b ersetzt.
import { toast } from 'sonner';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { formatEUR } from '@/lib/dashboardFormatters';
import BondRequestActionDialog, { OFFER_STATUS_DE } from '@/components/admin/bonds/BondRequestActionDialog';
import { pctDe } from '@/lib/bondDisplay';

/**
 * Admin Bond-Anfragen (Session 82.04 → Session 82.37) — Merge Mongo + Legacy.
 *
 * Legacy-Supabase-Rows werden weiterhin READ-only angezeigt (best-effort;
 * bei fehlender RLS-Erlaubnis leer, kein Blocker). Neue Mongo-Requests
 * werden via FastAPI-Admin-Endpoints gelesen und approve/reject/execute
 * modifiziert. Kein Dual-Write, keine Migration bestehender Legacy-Daten.
 *
 * Session 82.37 · Execution-Modal + Client-Validation ergänzt.
 */

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
    err.body = body;
    throw err;
  }
  return body;
};

const normalizeLegacy = (row) => ({
  id: row.id,
  backend: 'legacy',
  bond_name: row.bond_name,
  isin: row.isin,
  kupon_rate: row.kupon_rate,
  amount_eur: row.amount_eur,
  status: row.status,
  created_at: row.created_at,
  approved_at: row.approved_at,
  rejected_at: row.rejected_at,
  decision_note: row.decision_note,
  customer_name: row.profiles
    ? [row.profiles.first_name, row.profiles.last_name].filter(Boolean).join(' ') || row.profiles.email
    : null,
  customer_email: row.profiles?.email || null,
});

// Session 82.37 · Deutsche Fehlertexte für Bond-Execution-Backend-Codes.
const humanExecError = (code, detail) => {
  const map = {
    INSUFFICIENT_CASH: 'Nicht genügend Guthaben auf dem Kundenkonto für die Ausführung.',
    OVER_NOMINAL: 'Ausgeführtes Nominal übersteigt das vom Kunden angefragte Volumen.',
    INVALID_DENOMINATION: 'Nominal ist kein Vielfaches der Stückelung.',
    BAD_NOMINAL: 'Nominal muss > 0 sein.',
    BAD_PRICE: 'Ausführungskurs muss > 0 sein.',
    REQUEST_BAD_STATUS: 'Ausführung nicht möglich — die Anfrage ist nicht mehr im Status „approved".',
    BOND_UNAVAILABLE: 'Anleihe ist derzeit nicht mehr verfügbar.',
    BOND_EXPIRED: 'Anleihe ist bereits fällig — keine Ausführung möglich.',
    BOND_NOT_FOUND: 'Anleihe im Katalog nicht gefunden.',
    MISSING_ISIN: 'Anleihe hat keine ISIN — Ausführung abgebrochen.',
    REQUEST_NOT_FOUND: 'Anfrage wurde nicht gefunden.',
    REQUEST_REJECTED_RACE: 'Anfrage wurde parallel abgelehnt.',
  };
  return map[code] || detail || 'Ausführung fehlgeschlagen.';
};

const parseDecStr = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const EMPTY_EXEC_FORM = {
  nominalAmount: '',
  executionPricePct: '',
  decisionNote: '',
};

const AdminBondRequests = () => {
  const [items, setItems] = useState([]);
  const [bondCatalog, setBondCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const [executeRow, setExecuteRow] = useState(null);
  const [executeForm, setExecuteForm] = useState(EMPTY_EXEC_FORM);
  const [executeError, setExecuteError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState({ action: 'details', row: null });

  const onDialogDone = async (action) => {
    const msg = { note: 'Notiz gespeichert', offer: 'Angebot gespeichert', cancel: 'Anfrage storniert' };
    toast.success(msg[action] || 'Gespeichert');
    setDialog({ action: 'details', row: null });
    await load();
  };

  const bondById = useMemo(() => {
    const m = {};
    (bondCatalog || []).forEach((b) => {
      m[b.id] = b;
    });
    return m;
  }, [bondCatalog]);

  const load = async () => {
    setLoading(true);
    // Mongo-native ist Pflicht; Legacy + Katalog best-effort.
    // Session 82.103c · Legacy-Supabase-Fallback entfernt. Nur noch Mongo + Katalog.
    const results = await Promise.allSettled([
      fetchJson('/api/admin/bonds/requests'),
      Promise.resolve({ data: [], error: null }),  // legacy slot (kept for index-compat)
      fetchJson('/api/bonds/catalog'),
    ]);
    const mongo = results[0].status === 'fulfilled' ? results[0].value || [] : [];
    if (results[0].status === 'rejected') {
      toast.error('Mongo-Anfragen: ' + results[0].reason?.message);
    }
    let legacy = [];
    if (results[1].status === 'fulfilled') {
      const r = results[1].value;
      if (!r.error) legacy = (r.data || []).map(normalizeLegacy);
    }
    const catalog = results[2].status === 'fulfilled' ? results[2].value || [] : [];
    const merged = [
      ...mongo.map((m) => ({ ...m, backend: 'mongo' })),
      ...legacy,
    ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    setItems(merged);
    setBondCatalog(catalog);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approveMongo = async (row) => {
    const note = window.prompt('Optionaler Admin-Kommentar für die Freigabe:', '') || null;
    setProcessingId(row.id);
    try {
      await fetchJson(`/api/admin/bonds/requests/${row.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision_note: note }),
      });
      toast.success('Anfrage genehmigt — bereit zur Ausführung');
      await load();
    } catch (err) {
      toast.error('Freigabe fehlgeschlagen: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectMongo = async (row) => {
    const reason = window.prompt('Ablehnungsgrund (optional):', '') || null;
    setProcessingId(row.id);
    try {
      await fetchJson(`/api/admin/bonds/requests/${row.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ decision_note: reason }),
      });
      toast.success('Anfrage abgelehnt');
      await load();
    } catch (err) {
      toast.error('Ablehnung fehlgeschlagen: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Session 82.37 · Execution-Modal
  const openExecute = (row) => {
    setExecuteError(null);
    const catalog = bondById[row.bond_id] || {};
    // Prefill: Nominal ← requested_nominal falls vorhanden, sonst amount_eur (Nominal ≈ 100% Buchwert).
    const nomDefault = row.requested_nominal ?? row.amount_eur ?? '';
    setExecuteForm({
      ...EMPTY_EXEC_FORM,
      nominalAmount: nomDefault !== '' ? String(nomDefault) : '',
      executionPricePct: '100',
    });
    setExecuteRow({ ...row, _catalog: catalog });
  };

  const submitExecute = async () => {
    if (!executeRow) return;
    setExecuteError(null);
    const nominal = parseDecStr(executeForm.nominalAmount);
    const price = parseDecStr(executeForm.executionPricePct);
    if (nominal == null) {
      setExecuteError('Auszuführendes Nominal muss > 0 sein.');
      return;
    }
    if (price == null) {
      setExecuteError('Ausführungskurs (%) muss > 0 sein.');
      return;
    }
    const requested = Number(executeRow.requested_nominal ?? executeRow.amount_eur ?? 0);
    if (requested > 0 && nominal > requested) {
      setExecuteError(
        `Nominal (${nominal}) übersteigt das angefragte Volumen (${requested}).`,
      );
      return;
    }
    const denom = Number(executeRow._catalog?.denomination || 0);
    if (denom > 0 && Math.abs((nominal / denom) - Math.round(nominal / denom)) > 1e-9) {
      setExecuteError(
        `Nominal muss Vielfaches der Stückelung (${denom.toLocaleString('de-DE')}) sein.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nominal_amount: String(nominal),
        execution_price_pct: String(price),
      };
      const note = executeForm.decisionNote.trim();
      if (note) payload.decision_note = note;
      await fetchJson(
        `/api/admin/bonds/requests/${encodeURIComponent(executeRow.id)}/execute`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      toast.success('Anleiheausführung wurde erfolgreich erfasst.');
      setExecuteRow(null);
      await load();
    } catch (err) {
      // Backend liefert `detail: "CODE: message"` bei BondExecError.
      const raw = err.message || '';
      const match = raw.match(/^([A-Z_]+):\s*(.*)$/);
      const code = match ? match[1] : null;
      const message = match ? match[2] : raw;
      setExecuteError(humanExecError(code, message));
    } finally {
      setSubmitting(false);
    }
  };

  // Session 82.90c — Legacy-Supabase-Aktionen entfernt. Historische Rows
  // sind READ-ONLY; neue Anfragen laufen ausschließlich über FastAPI/Saga.
  const approveLegacy = async (_row) => {
    toast.info('Legacy-Anfragen sind schreibgeschützt. Bitte neue Mongo-Anfrage anlegen.');
  };

  const rejectLegacy = async (_row) => {
    toast.info('Legacy-Anfragen sind schreibgeschützt. Bitte neue Mongo-Anfrage anlegen.');
  };

  const removeLegacy = async (row) => {
    // Session 82.90c — Nur Mongo-native Requests können via FastAPI archiviert
    // werden (Soft-Delete). Legacy-Supabase-Rows bleiben unangetastet.
    if (row.backend !== 'mongo') {
      toast.info('Legacy-Rows nicht löschbar. Nur Mongo-native Requests archivierbar.');
      return;
    }
    if (!window.confirm('Diese Anfrage archivieren (Soft-Delete, nur bei rejected/cancelled)?')) return;
    setProcessingId(row.id);
    try {
      await fetchJson(`/api/admin/bonds/requests/${encodeURIComponent(row.id)}/archive`, {
        method: 'POST',
        body: JSON.stringify({ archive_note: 'via admin ui' }),
      });
      toast.success('Anfrage archiviert (Soft-Delete)');
      setItems((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      toast.error('Archive fehlgeschlagen: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const execNominal = parseDecStr(executeForm.nominalAmount);
  const execPrice = parseDecStr(executeForm.executionPricePct);
  const execGross =
    execNominal != null && execPrice != null ? (execNominal * execPrice) / 100 : null;

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="Anleihen-Anfragen"
        titleIcon={Send}
        description="Kaufanfragen genehmigen, ausführen (Cash-Buchung + Positionsanlage) oder ablehnen."
      />

      <AdminSurfaceCard>
        {items.some((r) => r.offer && r.offer.admin_seen === false) && (
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-800" data-testid="bond-offer-responses-banner">
            {items.filter((r) => r.offer && r.offer.admin_seen === false).length} neue Kundenentscheidung(en) zu Angeboten — über „Details“ als gelesen markieren. Eine Annahme löst keine Buchung aus; Ausführung nur nach Prüfung und Freigabe.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="bond-requests-table">
            <thead className={adminTheadClass}>
              <tr>
                <th className="px-4 py-3 text-left">Datum</th>
                <th className="px-4 py-3 text-left">Kunde</th>
                <th className="px-4 py-3 text-left">Bond</th>
                <th className="px-4 py-3 text-right">Kupon</th>
                <th className="px-4 py-3 text-right">Volumen</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Quelle</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                      <RefreshCw size={13} strokeWidth={1.5} className="animate-spin text-bank-gold" />
                      Lädt…
                    </p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted" data-testid="bond-requests-empty">
                    Keine offenen Anfragen
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isPending = row.status === 'pending';
                  const isApproved = row.status === 'approved';
                  const isExecuted = row.status === 'executed';
                  const isRejected = row.status === 'rejected';
                  const isCancelled = row.status === 'cancelled';
                  const statusCls = isExecuted
                    ? 'border-sky-300/55 bg-sky-50 text-sky-700'
                    : isApproved
                      ? 'border-emerald-300/55 bg-emerald-50 text-emerald-700'
                      : isRejected || isCancelled
                        ? 'border-rose-300/55 bg-rose-50 text-rose-700'
                        : 'border-amber-300/55 bg-amber-50 text-amber-700';
                  const statusLabel = isExecuted
                    ? 'Ausgeführt'
                    : isApproved
                      ? 'Genehmigt'
                      : isCancelled
                        ? 'Storniert'
                        : isRejected
                          ? 'Abgelehnt'
                          : 'Offen';
                  const isMongo = row.backend === 'mongo';
                  return (
                    <tr
                      key={`${row.backend}-${row.id}`}
                      className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}
                      data-testid={`bond-request-row-${row.backend}-${row.id}`}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-bank-text-muted">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString('de-DE', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : '–'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-bank-text">
                        {row.customer_name || row.customer_email || '–'}
                        {row.customer_display_id && (
                          <p className="font-mono text-[10.5px] text-bank-text-muted">{row.customer_display_id}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-bank-text">
                          {row.bond_name || row.isin || '–'}
                        </p>
                        {row.isin && row.bond_name && (
                          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                            ISIN · {row.isin}
                          </p>
                        )}
                        {row.reference_price_pct != null && (
                          <p className="mt-0.5 text-[10.5px] text-bank-text-muted">
                            Kurs bei Anfrage {pctDe(row.reference_price_pct, 2, 4)}{row.reference_price_type === 'reference' ? ' (Referenz)' : ''}
                          </p>
                        )}
                        {row.offer && (
                          <p
                            className={`mt-0.5 text-[10.5px] ${row.offer.status === 'accepted' ? 'font-semibold text-emerald-700' : row.offer.status === 'declined' ? 'font-semibold text-rose-700' : 'text-sky-700'}`}
                            data-testid={`bond-request-offer-badge-${row.id}`}
                          >
                            {OFFER_STATUS_DE[row.offer.status] || 'Angebot'} · {pctDe(row.offer.price_pct, 2, 4)} · {formatEUR(row.offer.total_cost ?? row.offer.amount_eur)}
                            {row.offer.admin_seen === false && ' · NEU'}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rate-figure text-[13px] tabular-nums text-bank-gold">
                          {pctDe(row.kupon_rate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                        {row.amount_eur != null
                          ? Number(row.amount_eur).toLocaleString('de-DE', {
                              style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                            })
                          : '–'}
                        {isExecuted && row.gross_amount != null && (
                          <p className="mt-0.5 text-[10.5px] normal-case text-sky-700">
                            Gross · {Number(row.gross_amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${statusCls}`}>
                          {statusLabel}
                        </span>
                        {isExecuted && row.execution_price_pct != null && (
                          <p className="mt-1 font-mono text-[10.5px] text-bank-text-muted">
                            @ {Number(row.execution_price_pct).toLocaleString('de-DE', { maximumFractionDigits: 4 })}% ·
                            Nom {Number(row.executed_nominal).toLocaleString('de-DE')}
                          </p>
                        )}
                        {row.decision_note && (
                          <p className="mt-1 max-w-[180px] text-[11px] text-bank-text-muted">
                            {row.decision_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${isMongo ? 'border-bank-gold/55 bg-bank-gold/10 text-bank-gold' : 'border-bank-border bg-bank-bg text-bank-text-muted'}`}
                        >
                          {isMongo ? 'Mongo' : 'Legacy'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isMongo && (
                          <div className="mb-1.5 inline-flex gap-1">
                            <button onClick={() => setDialog({ action: 'details', row })} className="rounded p-1.5 text-bank-text-muted hover:bg-bank-border/15" title="Details & Protokoll" data-testid={`bond-request-details-${row.id}`}>
                              <Eye size={15} />
                            </button>
                            <button onClick={() => setDialog({ action: 'note', row })} className="rounded p-1.5 text-bank-text-muted hover:bg-bank-border/15" title="Interne Notiz" data-testid={`bond-request-note-${row.id}`}>
                              <StickyNote size={15} />
                            </button>
                            {(isPending || isApproved) && (
                              <>
                                <button onClick={() => setDialog({ action: 'offer', row })} className="rounded p-1.5 text-sky-700 hover:bg-sky-50" title="Individuelles Angebot" data-testid={`bond-request-offer-${row.id}`}>
                                  <FileSignature size={15} />
                                </button>
                                <button onClick={() => setDialog({ action: 'cancel', row })} className="rounded p-1.5 text-rose-600 hover:bg-rose-50" title="Stornieren" data-testid={`bond-request-cancel-${row.id}`}>
                                  <Ban size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        <div>
                        {isPending ? (
                          <div className="inline-flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => (isMongo ? approveMongo(row) : approveLegacy(row))}
                              disabled={processingId === row.id}
                              className="border-emerald-300/55 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                              data-testid={`bond-request-approve-${row.id}`}
                            >
                              <Check size={12} strokeWidth={1.5} /> Genehmigen
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => (isMongo ? rejectMongo(row) : rejectLegacy(row))}
                              disabled={processingId === row.id}
                              className="border-rose-300/55 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                              data-testid={`bond-request-reject-${row.id}`}
                            >
                              <X size={12} strokeWidth={1.5} /> Ablehnen
                            </Button>
                            {!isMongo && (
                              <Button
                                size="sm"
                                variant="outline-ink"
                                onClick={() => removeLegacy(row)}
                                disabled={processingId === row.id}
                              >
                                <Trash2 size={12} strokeWidth={1.5} /> Löschen
                              </Button>
                            )}
                          </div>
                        ) : isApproved && isMongo ? (
                          <div className="inline-flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openExecute(row)}
                              disabled={processingId === row.id}
                              className="gap-1 border-sky-300/55 text-sky-700 hover:bg-sky-50 hover:text-sky-700"
                              data-testid={`bond-request-execute-${row.id}`}
                            >
                              <Package size={12} strokeWidth={1.5} />
                              <span className="text-[11px]">Ausführung erfassen</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                              {isExecuted && row.executed_at
                                ? `Ausgeführt · ${new Date(row.executed_at).toLocaleDateString('de-DE')}`
                                : isApproved && row.approved_at
                                  ? `Freigegeben · ${new Date(row.approved_at).toLocaleDateString('de-DE')}`
                                  : isRejected && row.rejected_at
                                    ? `Abgelehnt · ${new Date(row.rejected_at).toLocaleDateString('de-DE')}`
                                    : isCancelled && row.cancelled_at
                                      ? `Storniert · ${new Date(row.cancelled_at).toLocaleDateString('de-DE')}`
                                      : 'Abgeschlossen'}
                            </span>
                            {!isMongo && (
                              <Button
                                size="sm"
                                variant="outline-ink"
                                onClick={() => removeLegacy(row)}
                                disabled={processingId === row.id}
                              >
                                <Trash2 size={12} strokeWidth={1.5} /> Löschen
                              </Button>
                            )}
                          </div>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminSurfaceCard>

      {/* Execute Modal — Session 82.37 (Mongo-native only) */}
      <Dialog open={!!executeRow} onOpenChange={(open) => !open && setExecuteRow(null)}>
        <DialogContent
          className="max-h-[90vh] max-w-lg overflow-y-auto bg-white"
          data-testid="bond-execute-modal"
        >
          <DialogHeader>
            <DialogTitle>Anleiheausführung erfassen</DialogTitle>
          </DialogHeader>
          {executeRow && (
            <div className="space-y-4">
              <div className="rounded-lg border border-bank-border bg-bank-bg/40 p-3 text-[12.5px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <p className="text-bank-text-muted">Anleihe</p>
                    <p className="font-medium">{executeRow.bond_name || '–'}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">ISIN</p>
                    <p className="font-mono text-[12px]">{executeRow.isin || '–'}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Emittent</p>
                    <p className="text-[12px]">{executeRow._catalog?.issuer || '–'}</p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Beantragtes Nominal</p>
                    <p className="tabular-nums">
                      {Number(executeRow.requested_nominal ?? executeRow.amount_eur ?? 0).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Stückelung</p>
                    <p className="tabular-nums">
                      {executeRow._catalog?.denomination
                        ? Number(executeRow._catalog.denomination).toLocaleString('de-DE')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Kupon</p>
                    <p className="tabular-nums">
                      {executeRow.kupon_rate != null ? `${executeRow.kupon_rate}%` : '–'}
                    </p>
                  </div>
                  <div>
                    <p className="text-bank-text-muted">Fälligkeit</p>
                    <p className="tabular-nums">
                      {executeRow._catalog?.faelligkeitsdatum
                        ? new Date(executeRow._catalog.faelligkeitsdatum).toLocaleDateString('de-DE')
                        : '—'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-bank-text-muted">Kunde</p>
                    <p className="text-[13px]">
                      {executeRow.customer_name || '–'}
                      {executeRow.customer_email ? (
                        <span className="ml-1 text-bank-text-muted">
                          ({executeRow.customer_email})
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bond-exec-nominal">Auszuführendes Nominal *</Label>
                  <Input
                    id="bond-exec-nominal"
                    data-testid="bond-execute-nominal"
                    inputMode="decimal"
                    value={executeForm.nominalAmount}
                    onChange={(e) =>
                      setExecuteForm((f) => ({ ...f, nominalAmount: e.target.value }))
                    }
                    placeholder={`≤ ${Number(executeRow.requested_nominal ?? executeRow.amount_eur ?? 0).toLocaleString('de-DE')}`}
                  />
                </div>
                <div>
                  <Label htmlFor="bond-exec-price">Ausführungskurs in % *</Label>
                  <Input
                    id="bond-exec-price"
                    data-testid="bond-execute-price"
                    inputMode="decimal"
                    value={executeForm.executionPricePct}
                    onChange={(e) =>
                      setExecuteForm((f) => ({ ...f, executionPricePct: e.target.value }))
                    }
                    placeholder="z. B. 98.75"
                  />
                </div>
              </div>

              <div className="rounded-md border border-bank-border bg-bank-bg/30 p-3 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-bank-text-muted">Gesamtbetrag (Vorschau)</span>
                  <span
                    className="font-semibold tabular-nums"
                    data-testid="bond-execute-gross-preview"
                  >
                    {execGross != null ? formatEUR(execGross) : '–'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-bank-text-muted">
                  = Nominal × Kurs ÷ 100 · Cash-Buchung erfolgt über die Backend-Saga (Source of Truth).
                </p>
              </div>

              <div>
                <Label htmlFor="bond-exec-note">Admin-Notiz (optional)</Label>
                <Textarea
                  id="bond-exec-note"
                  data-testid="bond-execute-note"
                  value={executeForm.decisionNote}
                  onChange={(e) =>
                    setExecuteForm((f) => ({ ...f, decisionNote: e.target.value }))
                  }
                  rows={2}
                  maxLength={500}
                />
              </div>

              {executeError && (
                <div
                  role="alert"
                  data-testid="bond-execute-error"
                  className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800"
                >
                  {executeError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setExecuteRow(null)}
                  disabled={submitting}
                  data-testid="bond-execute-cancel"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={submitExecute}
                  disabled={submitting}
                  data-testid="bond-execute-submit"
                >
                  {submitting ? 'Wird erfasst…' : 'Ausführung erfassen'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BondRequestActionDialog
        action={dialog.action}
        row={dialog.row}
        onClose={() => setDialog({ action: 'details', row: null })}
        onDone={onDialogDone}
        fetchJson={fetchJson}
      />

      <p className="mt-3 text-[11px] text-bank-text-muted">
        Hinweis: „Genehmigen" ist die fachliche Freigabe — erst „Ausführung erfassen" belastet Cash und legt die Position an.
      </p>
    </AdminSubpageLayout>
  );
};

export default AdminBondRequests;
