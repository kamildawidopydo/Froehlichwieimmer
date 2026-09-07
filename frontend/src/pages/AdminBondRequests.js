import React, { useEffect, useState } from 'react';
import { Send, Check, RefreshCw, Trash2, X } from 'lucide-react';
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

/**
 * Admin Bond-Anfragen (Session 82.04) — Merge Mongo + Legacy.
 *
 * Legacy-Supabase-Rows werden weiterhin READ-only angezeigt (best-effort;
 * bei fehlender RLS-Erlaubnis leer, kein Blocker). Neue Mongo-Requests
 * werden via FastAPI-Admin-Endpoints gelesen und (approve/reject) modifiziert.
 * Kein Dual-Write, keine Migration bestehender Legacy-Daten.
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
    throw err;
  }
  return body;
};

const normalizeLegacy = (row) => ({
  id: row.id,
  backend: 'supabase',
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

const AdminBondRequests = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const load = async () => {
    setLoading(true);
    // Mongo-native ist Pflicht; Legacy best-effort.
    const results = await Promise.allSettled([
      fetchJson('/api/admin/bonds/requests'),
      supabase
        .from('bond_purchase_requests')
        .select(
          'id, user_id, isin, bond_name, kupon_rate, amount_eur, status, created_at, approved_at, rejected_at, decision_note, handled_at, profiles:user_id(email, first_name, last_name)',
        )
        .order('created_at', { ascending: false }),
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
    const merged = [
      ...mongo.map((m) => ({ ...m, backend: 'mongo' })),
      ...legacy,
    ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    setItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approveMongo = async (row) => {
    const note = window.prompt('Optionaler Admin-Kommentar für die Freigabe:', '') || null;
    setProcessingId(row.id);
    try {
      await fetchJson(`/api/admin/bonds/requests/${row.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision_note: note }),
      });
      toast.success('Anfrage genehmigt (fachlich; keine Position erzeugt)');
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

  // Legacy-Supabase-Aktionen — bleiben für historische Rows verfügbar.
  const approveLegacy = async (row) => {
    const kuponInput = window.prompt('Kupon (% p.a.) eingeben (Pflichtfeld):', '');
    if (kuponInput == null) return;
    const kuponRate = Number(String(kuponInput).replace(',', '.'));
    if (!Number.isFinite(kuponRate) || kuponRate < 0) {
      toast.error('Bitte einen gültigen Kupon-Wert eingeben.');
      return;
    }
    const maturityInput = window.prompt('Fälligkeit eingeben (optional, YYYY-MM-DD):', '') || null;
    const note = window.prompt('Optionaler Admin-Kommentar für die Freigabe:', '') || null;
    setProcessingId(row.id);
    const { error } = await supabase.rpc('approve_bond_purchase_request', {
      p_request_id: row.id,
      p_decision_note: note,
      p_kupon_rate: kuponRate,
      p_faelligkeitsdatum: maturityInput,
    });
    setProcessingId(null);
    if (error) {
      toast.error('Freigabe fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Legacy-Anfrage genehmigt und Position erstellt');
    load();
  };

  const rejectLegacy = async (row) => {
    const reason = window.prompt('Ablehnungsgrund (optional):', '') || null;
    setProcessingId(row.id);
    const { error } = await supabase.rpc('reject_bond_purchase_request', {
      p_request_id: row.id,
      p_decision_note: reason,
    });
    setProcessingId(null);
    if (error) {
      toast.error('Ablehnung fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Legacy-Anfrage abgelehnt');
    load();
  };

  const removeLegacy = async (row) => {
    if (!window.confirm('Diese Legacy-Anfrage wirklich dauerhaft löschen?')) return;
    setProcessingId(row.id);
    const { error } = await supabase.from('bond_purchase_requests').delete().eq('id', row.id);
    setProcessingId(null);
    if (error) {
      toast.error('Löschen fehlgeschlagen: ' + error.message);
      return;
    }
    toast.success('Legacy-Anfrage gelöscht');
    setItems((prev) => prev.filter((item) => item.id !== row.id));
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="Anleihen-Anfragen"
        titleIcon={Send}
        description="Kaufanfragen, die Kunden über die Anleihen-Suche an unser Team senden."
      />

      <AdminSurfaceCard>
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
                  const isApproved = row.status === 'approved' || row.status === 'handled';
                  const isRejected = row.status === 'rejected' || row.status === 'cancelled';
                  const statusCls = isApproved
                    ? 'border-emerald-300/55 bg-emerald-50 text-emerald-700'
                    : isRejected
                      ? 'border-rose-300/55 bg-rose-50 text-rose-700'
                      : 'border-amber-300/55 bg-amber-50 text-amber-700';
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
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rate-figure text-[13px] tabular-nums text-bank-gold">
                          {row.kupon_rate != null ? `${row.kupon_rate}%` : '–'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                        {row.amount_eur != null
                          ? Number(row.amount_eur).toLocaleString('de-DE', {
                              style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                            })
                          : '–'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${statusCls}`}>
                          {isApproved ? 'Genehmigt' : isRejected ? 'Abgelehnt' : 'Offen'}
                        </span>
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
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                              {isApproved && row.approved_at
                                ? `Freigegeben · ${new Date(row.approved_at).toLocaleDateString('de-DE')}`
                                : isRejected && row.rejected_at
                                  ? `Abgelehnt · ${new Date(row.rejected_at).toLocaleDateString('de-DE')}`
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </AdminSurfaceCard>

      <p className="mt-3 text-[11px] text-bank-text-muted">
        Hinweis: Bei Mongo-native Anfragen erzeugt „Genehmigen" derzeit KEINE Depotposition und
        belastet KEIN Cash (Portfolio-Migration blockiert).
      </p>
    </AdminSubpageLayout>
  );
};

export default AdminBondRequests;
