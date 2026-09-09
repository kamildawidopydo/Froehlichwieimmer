import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Briefcase,
  X,
  Sliders,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

/*
 * Session 82.94 — Admin Stock-Positionen · FastAPI/Mongo Cutover.
 *
 * Reads:  GET  /api/admin/portfolio/stock-positions
 * Writes: POST /api/admin/portfolio/stock-position-adjustments
 *         (delta_qty, reason ∈ allow-list, idempotency_key, note)
 *
 * Sicherheitsregeln (aus Session-82.93-Domain-Review, unverändert):
 *  – Kein direkter quantity-Write. Kein Cost-Basis-Edit. Kein Delete.
 *  – Adjustment ist die einzige Mutation: signed delta über allowed reason.
 *  – Doppelklick-Schutz via `submitting`; idempotency_key pro Modal-Open.
 *  – Realtime durch focus/visibility-aware Polling (30 s) ersetzt.
 */

const API = getApiBase();
const REFRESH_MS = 30_000;

const REASON_OPTIONS = [
  { value: 'corporate_action', label: 'Corporate Action (Split, Kapitalerhöhung, Spin-off)' },
  { value: 'migration_correction', label: 'Migration-Korrektur (Phase-0-Import)' },
  { value: 'inheritance_transfer', label: 'Erbschaft / Depotübertragung' },
  { value: 'data_repair', label: 'Daten-Reparatur (nachweisbarer Systemfehler)' },
];

const formatNum = (v, d = 4) =>
  Number(v || 0).toLocaleString('de-DE', { maximumFractionDigits: d });

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const userLabel = (u) => {
  if (!u) return '–';
  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  if (name) return name;
  return u.name || u.email || u.id || '–';
};

const AdminUserPositions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  const [adjModal, setAdjModal] = useState(null); // position row selected
  const [form, setForm] = useState({
    direction: 'increase',
    amount: '',
    reason: 'data_repair',
    note: '',
  });
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const abortRef = useRef(null);

  const fetchAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data } = await axios.get(`${API}/api/admin/portfolio/stock-positions`, {
        withCredentials: true,
        signal: ctrl.signal,
        params: { limit: 500 },
      });
      setPositions(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      if (axios.isCancel(err) || err?.name === 'CanceledError') return;
      toast.error(
        'Fehler beim Laden: ' + (err?.response?.data?.detail || err.message || 'Unbekannt'),
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    return () => abortRef.current?.abort();
  }, [fetchAll]);

  // Focus/visibility-aware Polling (Session 82.94: kein Realtime-Socket mehr).
  useEffect(() => {
    let timer = null;
    const tick = () => {
      if (document.visibilityState === 'visible' && !adjModal) {
        fetchAll({ silent: true });
      }
    };
    timer = window.setInterval(tick, REFRESH_MS);
    const onFocus = () => tick();
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchAll, adjModal]);

  const usersList = useMemo(() => {
    const map = new Map();
    positions.forEach((p) => {
      if (p.user && p.user.id) map.set(p.user.id, p.user);
    });
    return Array.from(map.values()).sort((a, b) =>
      userLabel(a).localeCompare(userLabel(b), 'de'),
    );
  }, [positions]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return positions.filter((p) => {
      if (userFilter !== 'all' && p.user_id !== userFilter) return false;
      if (term) {
        const hay = [
          p.symbol,
          p.user?.email,
          p.user?.first_name,
          p.user?.last_name,
          p.user?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [positions, userFilter, searchTerm]);

  const openAdjust = (row) => {
    setAdjModal(row);
    setForm({ direction: 'increase', amount: '', reason: 'data_repair', note: '' });
    // Fresh idempotency_key pro Modal-Open — Double-Click-Retries teilen den Key
    // und werden serverseitig als bereits angewandt gemeldet.
    setIdempotencyKey(
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `adj-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  };

  const closeAdjust = () => {
    if (submitting) return;
    setAdjModal(null);
    setIdempotencyKey(null);
    setForm({ direction: 'increase', amount: '', reason: 'data_repair', note: '' });
  };

  const submitAdjustment = async (e) => {
    e?.preventDefault?.();
    if (!adjModal || submitting) return;
    const amountAbs = Number(form.amount);
    if (!Number.isFinite(amountAbs) || amountAbs <= 0) {
      toast.error('Bitte einen positiven Betrag eingeben.');
      return;
    }
    if (!REASON_OPTIONS.some((r) => r.value === form.reason)) {
      toast.error('Ungültiger Anpassungsgrund.');
      return;
    }
    if (!idempotencyKey) {
      toast.error('Fehlender Idempotency-Key — Modal bitte erneut öffnen.');
      return;
    }
    const signed = form.direction === 'decrease' ? -Math.abs(amountAbs) : Math.abs(amountAbs);
    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${API}/api/admin/portfolio/stock-position-adjustments`,
        {
          target_user_id: adjModal.user_id,
          symbol: adjModal.symbol,
          delta_qty: String(signed),
          reason: form.reason,
          idempotency_key: idempotencyKey,
          note: form.note.trim() || null,
        },
        { withCredentials: true },
      );
      if (data?.idempotent) {
        toast.info('Anpassung war bereits gebucht (idempotent).');
      } else {
        toast.success(
          `Position aktualisiert: ${data?.before} → ${data?.after} (Δ ${data?.delta})`,
        );
      }
      setAdjModal(null);
      setIdempotencyKey(null);
      await fetchAll();
    } catch (err) {
      toast.error(
        'Fehler: ' + (err?.response?.data?.detail || err.message || 'Unbekannt'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const total = positions.length;
  const activeUsers = usersList.length;

  return (
    <>
      <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Wertpapiere"
          title="Kunden-Positionen"
          titleIcon={Briefcase}
          description="Aktien-Positionen anzeigen und ausschließlich über auditierte Adjustments korrigieren."
          actions={
            <Button
              onClick={() => fetchAll()}
              variant="outline"
              className="gap-2 rounded-xl"
              data-testid="stock-positions-refresh"
            >
              <RefreshCw size={14} /> Aktualisieren
            </Button>
          }
        />

        <AdminToolbarCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70"
              />
              <Input
                data-testid="stock-positions-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Symbol, Kunde, E-Mail..."
                className="pl-9"
              />
            </div>
            <select
              data-testid="stock-positions-user-filter"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
            >
              <option value="all">Alle Kunden ({activeUsers})</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-bank-text-muted mt-3 flex items-center gap-2">
            <ShieldCheck size={12} className="text-emerald-600" />
            Sicherer Adjustment-Modus · direkte Quantity-/Cost-Basis-Änderungen sind
            deaktiviert · {filtered.length} von {total} Positionen sichtbar
          </p>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw
                size={22}
                className="animate-spin text-bank-text-muted/70 mx-auto mb-3"
              />
              <p className="text-bank-text-muted text-sm">Wird geladen...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-bank-text-muted/70" data-testid="stock-positions-empty">
              <Briefcase size={30} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Positionen vorhanden.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="stock-positions-table">
                <thead className={adminTheadClass}>
                  <tr>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-bank-text-muted">
                      Kunde
                    </th>
                    <th className="text-left py-2.5 px-4 text-xs font-semibold text-bank-text-muted">
                      Symbol
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">
                      Stück
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">
                      Ø Einstand
                    </th>
                    <th className="text-right py-2.5 px-4 text-xs font-semibold text-bank-text-muted">
                      Kosten-Basis
                    </th>
                    <th className="py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const qty = Number(p.quantity || 0);
                    const avg = Number(p.avg_cost || 0);
                    const currency = p.currency || 'EUR';
                    const costBasis = qty * avg;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-bank-border/60 ${adminRowHover}`}
                        data-testid={`stock-position-row-${p.symbol}-${p.user_id}`}
                      >
                        <td className="py-2.5 px-4 text-xs">
                          <p className="font-medium text-bank-text">
                            {userLabel(p.user)}
                          </p>
                          <p className="text-bank-text-muted">{p.user?.email || '–'}</p>
                        </td>
                        <td className="py-2.5 px-4 text-sm font-semibold text-bank-text">
                          {p.symbol}
                        </td>
                        <td className="py-2.5 px-4 text-sm text-right text-bank-text">
                          {formatNum(qty)}
                        </td>
                        <td className="py-2.5 px-4 text-sm text-right text-bank-text-muted">
                          {Number(avg).toLocaleString('de-DE', {
                            style: 'currency',
                            currency,
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-sm text-right text-bank-text">
                          {costBasis.toLocaleString('de-DE', {
                            style: 'currency',
                            currency,
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAdjust(p)}
                            className="h-7 px-2.5 text-xs gap-1"
                            data-testid={`stock-position-adjust-${p.symbol}-${p.user_id}`}
                          >
                            <Sliders size={12} /> Anpassen
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfaceCard>
      </AdminSubpageLayout>

      {adjModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeAdjust}
          data-testid="stock-adjust-modal"
        >
          <form
            onSubmit={submitAdjustment}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-bank-text">
                Position anpassen
              </h3>
              <button
                type="button"
                onClick={closeAdjust}
                className="p-1 hover:bg-bank-border/25 rounded"
                disabled={submitting}
                aria-label="Schließen"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-bank-bg border border-bank-border rounded-lg p-3 text-sm mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-bank-text-muted">Kunde</span>
                <span className="font-medium text-bank-text">
                  {userLabel(adjModal.user)}
                </span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-bank-text-muted">Symbol</span>
                <span className="font-semibold text-bank-text">{adjModal.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bank-text-muted">Aktueller Bestand</span>
                <span className="font-semibold text-bank-text">
                  {formatNum(adjModal.quantity)} Stk
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-bank-text-muted mb-2">
                  Richtung *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, direction: 'increase' })}
                    className={`h-10 rounded-md border text-sm flex items-center justify-center gap-1.5 transition-colors ${
                      form.direction === 'increase'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-medium'
                        : 'bg-white border-bank-border text-bank-text-muted hover:bg-bank-bg'
                    }`}
                    data-testid="stock-adjust-direction-increase"
                  >
                    <ArrowUp size={14} /> Erhöhen
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, direction: 'decrease' })}
                    className={`h-10 rounded-md border text-sm flex items-center justify-center gap-1.5 transition-colors ${
                      form.direction === 'decrease'
                        ? 'bg-rose-50 border-rose-400 text-rose-700 font-medium'
                        : 'bg-white border-bank-border text-bank-text-muted hover:bg-bank-bg'
                    }`}
                    data-testid="stock-adjust-direction-decrease"
                  >
                    <ArrowDown size={14} /> Verringern
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-bank-text-muted mb-1">
                  Betrag (Stückzahl) *
                </label>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="z.B. 5"
                  required
                  data-testid="stock-adjust-amount"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-bank-text-muted mb-1">
                  Grund *
                </label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
                  required
                  data-testid="stock-adjust-reason"
                >
                  {REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-bank-text-muted mb-1">
                  Notiz (optional)
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  maxLength={1000}
                  placeholder="Interner Kommentar, Ticket-Referenz..."
                  className="w-full px-3 py-2 border border-bank-border rounded-md bg-white text-sm resize-none"
                  data-testid="stock-adjust-note"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <ShieldCheck size={12} className="inline mb-0.5 mr-1" />
                Diese Anpassung wird als unveränderlicher Audit-Eintrag mit Ihrer
                Admin-ID und einem Idempotency-Key gespeichert. Ø-Einstand bleibt
                unverändert.
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={closeAdjust}
                disabled={submitting}
                data-testid="stock-adjust-cancel"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-bank-ink hover:bg-bank-ink-elev text-white"
                disabled={submitting}
                data-testid="stock-adjust-submit"
              >
                {submitting ? 'Buchen...' : 'Adjustment buchen'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AdminUserPositions;
