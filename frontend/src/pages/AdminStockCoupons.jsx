import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Tag, Ban, Copy, Search } from 'lucide-react';

// Session 82.79 — Mongo-native Cutover.
// Kein Supabase-Import mehr. Alle Reads/Writes über FastAPI-Admin-Endpoints:
//   GET  /api/admin/portfolio/coupons
//   POST /api/admin/portfolio/coupons
//   POST /api/admin/portfolio/coupons/{id}/revoke
// Backend liefert die Kernfelder — Kunden-/Order-Enrichment ist gemäß Session-Mandat
// „Kein neuer Backend-Endpoint" bewusst nicht mehr Frontend-seitig aggregiert.
// Der Legacy „Löschen"-Knopf ist entfernt, weil kein authoritatives Delete-Endpoint
// existiert (Revoke ist der einzige unterstützte Zustandsübergang aus „active").

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const STATUS_LABEL = {
  active: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-800', label: 'Aktiv' },
  reserved: { cls: 'border-amber-300/55 bg-amber-50 text-amber-800', label: 'Reserviert' },
  consumed: { cls: 'border-bank-border bg-bank-bg/50 text-bank-text-muted', label: 'Verbraucht' },
  revoked: { cls: 'border-rose-300/55 bg-rose-50 text-rose-800', label: 'Widerrufen' },
};

async function apiJson(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const body = await res.text();
  let json = null;
  try { json = body ? JSON.parse(body) : null; } catch { /* keep text */ }
  if (!res.ok) {
    const detail = (json && (json.detail || json.error)) || body || `HTTP ${res.status}`;
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  return json;
}

function buildUsageLine(coupon) {
  const orderId = coupon.consumed_order_id || coupon.reserved_order_id;
  if (!orderId) {
    if (coupon.status === 'consumed') return 'Verbraucht (Auftrag-Zuordnung nicht gespeichert)';
    return '–';
  }
  const kind = coupon.consumed_order_id ? 'Eingelöst' : 'Ausstehend';
  const when =
    coupon.status === 'consumed' && coupon.consumed_at
      ? ` · ${new Date(coupon.consumed_at).toLocaleString('de-DE')}`
      : coupon.status === 'reserved' && coupon.reserved_at
      ? ` · ${new Date(coupon.reserved_at).toLocaleString('de-DE')}`
      : '';
  return `${kind}${when}`;
}

const AdminStockCoupons = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [percentInput, setPercentInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const data = await apiJson('/api/admin/portfolio/coupons');
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || ''));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const line = buildUsageLine(r).toLowerCase();
      const orderRef = (r.consumed_order_id || r.reserved_order_id || '').toLowerCase();
      const hay = [r.code, r.status, r.qa_session, orderRef, line].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, searchTerm]);

  const createCoupon = async (e) => {
    e?.preventDefault?.();
    const pct = Number(percentInput.replace(',', '.'));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast.error('Bitte gültigen Prozentsatz (1–100) eingeben');
      return;
    }
    setCreating(true);
    try {
      const row = await apiJson('/api/admin/portfolio/coupons', {
        method: 'POST',
        // Nur backend-erlaubte Felder senden. Kein status/reserved_order_id/user_id/created_at.
        body: JSON.stringify({ percent: String(pct), preview_only: false }),
      });
      if (row?.code) {
        toast.success(`Gutschein erstellt: ${row.code}`);
        setPercentInput('');
        fetchRows();
      } else {
        toast.error('Kein Code zurückgegeben');
      }
    } catch (err) {
      toast.error('Fehler: ' + (err?.message || ''));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Gutschein wirklich widerrufen? (Nur möglich wenn nicht reserviert.)')) return;
    setRevokingId(id);
    try {
      const updated = await apiJson(`/api/admin/portfolio/coupons/${id}/revoke`, { method: 'POST' });
      toast.success('Gutschein widerrufen');
      // Lokal authoritativ aktualisieren, plus soft-Refresh
      if (updated?.id) {
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        fetchRows();
      }
    } catch (err) {
      toast.error('Fehler: ' + (err?.message || ''));
    } finally {
      setRevokingId(null);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code kopiert'),
      () => toast.error('Kopieren fehlgeschlagen'),
    );
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Handel"
        title="Aktien-Gutscheine"
        titleIcon={Tag}
        description="Einmalige Rabattcodes für Kaufaufträge erzeugen und verwalten."
        actions={
          <Button
            data-testid="stock-coupons-refresh-btn"
            variant="outline-ink"
            onClick={fetchRows}
            disabled={loading}
          >
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            Aktualisieren
          </Button>
        }
      />

      <AdminToolbarCard className="mb-4">
        <form
          onSubmit={createCoupon}
          className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap"
          data-testid="stock-coupons-create-form"
        >
          <div className="flex-1 min-w-[140px] max-w-xs">
            <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              Rabatt %
            </label>
            <Input
              data-testid="stock-coupons-percent-input"
              type="text"
              inputMode="decimal"
              value={percentInput}
              onChange={(e) => setPercentInput(e.target.value)}
              placeholder="z.B. 10"
            />
          </div>
          <Button
            data-testid="stock-coupons-create-btn"
            type="submit"
            variant="primary"
            disabled={creating || !percentInput.trim()}
          >
            {creating ? 'Wird erstellt…' : 'Code generieren'}
          </Button>
        </form>
      </AdminToolbarCard>

      <AdminToolbarCard className="mb-4">
        <div className="relative max-w-md">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
          <Input
            data-testid="stock-coupons-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Code, Status, Auftrag-ID…"
            className="pl-9"
          />
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <div className="py-16 text-center text-bank-text-muted" data-testid="stock-coupons-loading">
            <RefreshCw size={22} className="mx-auto mb-2 animate-spin opacity-60" />
            Wird geladen…
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="py-16 text-center text-bank-text-muted text-sm"
            data-testid="stock-coupons-empty"
          >
            Keine Gutscheine
          </div>
        ) : (
          <div className="overflow-x-auto" data-testid="stock-coupons-table-wrap">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Erstellt</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-right">%</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left min-w-[220px]">Verwendung</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const sm = STATUS_LABEL[r.status] || STATUS_LABEL.active;
                  const usage = buildUsageLine(r);
                  const orderRef = r.consumed_order_id || r.reserved_order_id;
                  return (
                    <tr
                      key={r.id}
                      data-testid={`stock-coupons-row-${r.id}`}
                      className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-bank-text-muted">
                        {new Date(r.created_at).toLocaleString('de-DE')}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[13px] font-medium tracking-wide text-bank-text">
                        {r.code}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums text-bank-text">
                        {Number(r.percent).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          data-testid={`stock-coupons-status-${r.id}`}
                          className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sm.cls}`}
                        >
                          {sm.label}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-2.5 text-[12px] leading-snug text-bank-text">
                        <p>{usage}</p>
                        {orderRef && (
                          <p className="mt-0.5 font-mono text-[10px] text-bank-text-muted">
                            Auftrag-ID: {orderRef}
                          </p>
                        )}
                        {r.qa_session && (
                          <p className="mt-0.5 font-mono text-[10px] text-bank-text-muted">
                            QA: {r.qa_session}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          <Button
                            data-testid={`stock-coupons-copy-btn-${r.id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyCode(r.code)}
                          >
                            <Copy size={12} strokeWidth={1.5} />
                          </Button>
                          {r.status === 'active' && !r.reserved_order_id && (
                            <Button
                              data-testid={`stock-coupons-revoke-btn-${r.id}`}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-rose-300/55 text-rose-700"
                              disabled={revokingId === r.id}
                              onClick={() => revoke(r.id)}
                            >
                              <Ban size={12} strokeWidth={1.5} /> Widerrufen
                            </Button>
                          )}
                        </div>
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
  );
};

export default AdminStockCoupons;
