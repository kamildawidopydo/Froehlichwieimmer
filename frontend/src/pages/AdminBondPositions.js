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
  X,
  FileBarChart2,
  Sliders,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

/*
 * Session 82.94 — Admin Bond-Positionen · FastAPI/Mongo Cutover.
 *
 * Reads:  GET  /api/admin/portfolio/bond-positions
 * Writes: POST /api/admin/portfolio/bond-position-adjustments
 *         (delta_nominal muss Vielfaches von `denomination` sein,
 *          reason ∈ allow-list, idempotency_key, note)
 *
 * Wie 82.94-Stock: kein direkter Nominal-Write, kein Cost-Basis-Edit, kein
 * Delete. Adjustment ist die einzige Mutation. Kupon/Fälligkeit/ISIN sind
 * schreibgeschützt — Änderungen an Anleihen-Stammdaten laufen über den
 * Bond-Catalog (nicht dieses Screen).
 */

const API = getApiBase();
const REFRESH_MS = 30_000;

const REASON_OPTIONS = [
  { value: 'corporate_action', label: 'Corporate Action (Umtausch, Rückkauf)' },
  { value: 'migration_correction', label: 'Migration-Korrektur (Phase-0-Import)' },
  { value: 'inheritance_transfer', label: 'Erbschaft / Depotübertragung' },
  { value: 'data_repair', label: 'Daten-Reparatur (nachweisbarer Systemfehler)' },
];

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const formatPct = (v, digits = 2) =>
  v == null || v === ''
    ? '–'
    : `${Number(v).toLocaleString('de-DE', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })} %`;

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '–';

const userLabel = (u) => {
  if (!u) return '–';
  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  if (name) return name;
  return u.name || u.email || u.id || '–';
};

const AdminBondPositions = () => {
  const [bonds, setBonds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUserId, setFilterUserId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [adjModal, setAdjModal] = useState(null);
  const [form, setForm] = useState({
    direction: 'increase',
    amount: '',
    reason: 'data_repair',
    note: '',
  });
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const abortRef = useRef(null);

  const fetchBonds = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data } = await axios.get(`${API}/api/admin/portfolio/bond-positions`, {
        withCredentials: true,
        signal: ctrl.signal,
        params: { limit: 500 },
      });
      setBonds(Array.isArray(data?.items) ? data.items : []);
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
    fetchBonds();
    return () => abortRef.current?.abort();
  }, [fetchBonds]);

  useEffect(() => {
    let timer = null;
    const tick = () => {
      if (document.visibilityState === 'visible' && !adjModal) {
        fetchBonds({ silent: true });
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
  }, [fetchBonds, adjModal]);

  const usersList = useMemo(() => {
    const map = new Map();
    bonds.forEach((b) => {
      if (b.user && b.user.id) map.set(b.user.id, b.user);
    });
    return Array.from(map.values()).sort((a, b) =>
      userLabel(a).localeCompare(userLabel(b), 'de'),
    );
  }, [bonds]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bonds.filter((b) => {
      if (filterUserId !== 'all' && b.user_id !== filterUserId) return false;
      if (filterStatus === 'active' && !b.is_active) return false;
      if (filterStatus === 'inactive' && b.is_active) return false;
      if (term) {
        const hay = [
          b.bond_name,
          b.isin,
          b.issuer,
          b.user?.email,
          b.user?.first_name,
          b.user?.last_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [bonds, filterUserId, filterStatus, searchTerm]);

  const openAdjust = (row) => {
    setAdjModal(row);
    setForm({ direction: 'increase', amount: '', reason: 'data_repair', note: '' });
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
    const denom = Number(adjModal.denomination || 1000);
    if (!Number.isFinite(denom) || denom <= 0) {
      toast.error('Ungültige Stückelung — bitte Bond-Stammdaten prüfen.');
      return;
    }
    if (amountAbs % denom !== 0) {
      toast.error(`Betrag muss ein Vielfaches der Stückelung (${denom}) sein.`);
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
        `${API}/api/admin/portfolio/bond-position-adjustments`,
        {
          target_user_id: adjModal.user_id,
          isin: adjModal.isin,
          delta_nominal: String(signed),
          denomination: String(denom),
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
          `Nominale aktualisiert: ${data?.before} → ${data?.after} EUR (Δ ${data?.delta})`,
        );
      }
      setAdjModal(null);
      setIdempotencyKey(null);
      await fetchBonds();
    } catch (err) {
      toast.error(
        'Fehler: ' + (err?.response?.data?.detail || err.message || 'Unbekannt'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Renten"
          title="Anleihen"
          titleIcon={FileBarChart2}
          description="Bond-Positionen anzeigen und ausschließlich über auditierte Adjustments korrigieren."
          actions={
            <Button
              variant="outline"
              onClick={() => fetchBonds()}
              className="gap-2 rounded-xl"
              data-testid="bond-positions-refresh"
            >
              <RefreshCw size={15} /> Neu laden
            </Button>
          }
        />

        <AdminToolbarCard>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70"
              />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, ISIN, Emittent, Benutzer..."
                className="pl-9"
                data-testid="bond-positions-search"
              />
            </div>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
              data-testid="bond-positions-user-filter"
            >
              <option value="all">Alle Benutzer ({usersList.length})</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 border border-bank-border rounded-md bg-white text-sm"
              data-testid="bond-positions-status-filter"
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
            <div className="text-xs text-bank-text-muted flex items-center gap-2">
              <ShieldCheck size={12} className="text-emerald-600" />
              Sicherer Adjustment-Modus
            </div>
          </div>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={22} className="animate-spin text-bank-text-muted/70 mx-auto mb-3" />
              <p className="text-bank-text-muted text-sm">Wird geladen...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-bank-text-muted/70" data-testid="bond-positions-empty">
              <FileBarChart2 size={30} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Keine Anleihen gefunden.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="bond-positions-table">
                <thead className={adminTheadClass}>
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">
                      Benutzer
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">
                      Anleihe
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">
                      Nominal
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">
                      Kupon
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">
                      Kaufkurs
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-bank-text-muted">
                      Stückelung
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">
                      Fälligkeit
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-bank-text-muted">
                      Status
                    </th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      className={`border-b border-bank-border/80 ${adminRowHover}`}
                      data-testid={`bond-position-row-${b.isin}-${b.user_id}`}
                    >
                      <td className="py-3 px-4 text-sm">
                        <div className="font-medium text-bank-text">{userLabel(b.user)}</div>
                        <div className="text-xs text-bank-text-muted">
                          {b.user?.email || '–'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="font-medium text-bank-text">
                          {b.bond_name || '–'}
                        </div>
                        {(b.isin || b.issuer) && (
                          <div className="text-xs text-bank-text-muted">
                            {b.isin || ''}
                            {b.isin && b.issuer ? ' · ' : ''}
                            {b.issuer || ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-bank-text">
                        {formatEUR(b.nominal_amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-bank-text-muted">
                        {formatPct(b.kupon_rate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-bank-text-muted">
                        {formatPct(b.average_purchase_price_pct)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-bank-text-muted">
                        {formatEUR(b.denomination || 1000)}
                      </td>
                      <td className="py-3 px-4 text-sm text-bank-text-muted">
                        {formatDate(b.maturity_date)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                            b.is_active
                              ? 'bg-bank-success/10 text-bank-success border-bank-success/25'
                              : 'bg-bank-border/20 text-bank-text-muted border-bank-border'
                          }`}
                        >
                          {b.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjust(b)}
                          className="h-7 px-2.5 text-xs gap-1"
                          data-testid={`bond-position-adjust-${b.isin}-${b.user_id}`}
                        >
                          <Sliders size={12} /> Anpassen
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSurfaceCard>
      </AdminSubpageLayout>

      {adjModal && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeAdjust}
          data-testid="bond-adjust-modal"
        >
          <form
            onSubmit={submitAdjustment}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-bank-text">
                Anleihe-Nominale anpassen
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
                <span className="text-bank-text-muted">Anleihe</span>
                <span className="font-medium text-bank-text">
                  {adjModal.bond_name || adjModal.isin}
                </span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-bank-text-muted">ISIN</span>
                <span className="font-mono text-xs text-bank-text">{adjModal.isin}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-bank-text-muted">Aktuelle Nominale</span>
                <span className="font-semibold text-bank-text">
                  {formatEUR(adjModal.nominal_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-bank-text-muted">Stückelung</span>
                <span className="font-medium text-bank-text">
                  {formatEUR(adjModal.denomination || 1000)}
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
                    data-testid="bond-adjust-direction-increase"
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
                    data-testid="bond-adjust-direction-decrease"
                  >
                    <ArrowDown size={14} /> Verringern
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-bank-text-muted mb-1">
                  Nominale (Vielfaches von {formatEUR(adjModal.denomination || 1000)}) *
                </label>
                <Input
                  type="number"
                  step={adjModal.denomination || 1000}
                  min={adjModal.denomination || 1000}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder={String(adjModal.denomination || 1000)}
                  required
                  data-testid="bond-adjust-amount"
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
                  data-testid="bond-adjust-reason"
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
                  data-testid="bond-adjust-note"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <ShieldCheck size={12} className="inline mb-0.5 mr-1" />
                Diese Anpassung wird als unveränderlicher Audit-Eintrag mit Ihrer
                Admin-ID und einem Idempotency-Key gespeichert. Kaufkurs, Kupon
                und Fälligkeit bleiben unverändert.
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={closeAdjust}
                disabled={submitting}
                data-testid="bond-adjust-cancel"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-bank-ink hover:bg-bank-ink-elev text-white"
                disabled={submitting}
                data-testid="bond-adjust-submit"
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

export default AdminBondPositions;
