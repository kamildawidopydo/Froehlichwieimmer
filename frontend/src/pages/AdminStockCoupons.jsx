import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
import { RefreshCw, Tag, Ban, Copy, Search, Trash2 } from 'lucide-react';

const STATUS_LABEL = {
  active: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-800', label: 'Aktiv' },
  reserved: { cls: 'border-amber-300/55 bg-amber-50 text-amber-800', label: 'Reserviert' },
  consumed: { cls: 'border-bank-border bg-bank-bg/50 text-bank-text-muted', label: 'Verbraucht' },
  revoked: { cls: 'border-rose-300/55 bg-rose-50 text-rose-800', label: 'Widerrufen' },
};

function buildUsageLine(coupon, orderLookup, profileLookup) {
  const orderId = coupon.reserved_order_id || coupon.consumed_order_id;
  if (!orderId) {
    if (coupon.status === 'consumed') {
      return 'Keine Zuordnung gespeichert (älterer Eintrag)';
    }
    return '–';
  }
  const order = orderLookup[orderId];
  if (!order) {
    return String(orderId);
  }
  const prof =
    profileLookup[order.user_id] ||
    (coupon.consumed_by_user_id ? profileLookup[coupon.consumed_by_user_id] : null);
  const name = prof
    ? [prof.first_name, prof.last_name].filter(Boolean).join(' ').trim() || prof.email || '–'
    : '–';
  const email = prof?.email || '';
  const sym = order.symbol || '–';
  const kind = coupon.reserved_order_id ? 'Ausstehend' : 'Eingelöst';
  const when =
    coupon.status === 'consumed' && coupon.consumed_at
      ? ` · ${new Date(coupon.consumed_at).toLocaleString('de-DE')}`
      : '';
  return `${kind}: ${sym} · ${name}${email ? ` · ${email}` : ''}${when}`;
}

const AdminStockCoupons = () => {
  const [rows, setRows] = useState([]);
  const [orderLookup, setOrderLookup] = useState({});
  const [profileLookup, setProfileLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [percentInput, setPercentInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data: coupons, error: e1 } = await supabase
        .from('stock_trade_coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (e1) throw e1;
      const list = coupons || [];

      const orderIds = [
        ...new Set(
          list.flatMap((c) => [c.reserved_order_id, c.consumed_order_id].filter(Boolean)),
        ),
      ];
      const oMap = {};
      const pMap = {};

      if (orderIds.length > 0) {
        const { data: orders, error: e2 } = await supabase
          .from('user_stock_orders')
          .select('id, user_id, symbol, side, status')
          .in('id', orderIds);
        if (e2) throw e2;
        (orders || []).forEach((o) => {
          oMap[o.id] = o;
        });

        const userIds = [
          ...new Set(
            [
              ...(orders || []).map((o) => o.user_id),
              ...list.map((c) => c.consumed_by_user_id).filter(Boolean),
            ].filter(Boolean),
          ),
        ];

        if (userIds.length > 0) {
          const { data: profs, error: e3 } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds);
          if (e3) throw e3;
          (profs || []).forEach((p) => {
            pMap[p.id] = p;
          });
        }
      }

      setOrderLookup(oMap);
      setProfileLookup(pMap);
      setRows(list);
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || ''));
      setRows([]);
      setOrderLookup({});
      setProfileLookup({});
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
      const line = buildUsageLine(r, orderLookup, profileLookup).toLowerCase();
      const hay = [r.code, r.status, r.admin_note, line].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, searchTerm, orderLookup, profileLookup]);

  const createCoupon = async (e) => {
    e?.preventDefault?.();
    const pct = Number(percentInput.replace(',', '.'));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast.error('Bitte gültigen Prozentsatz (1–100) eingeben');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.rpc('admin_create_stock_trade_coupon', { p_percent: pct });
    setCreating(false);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.code) {
      toast.success(`Gutschein erstellt: ${row.code}`);
      setPercentInput('');
      fetchRows();
    } else {
      toast.error('Kein Code zurückgegeben');
    }
  };

  const revoke = async (id) => {
    if (!window.confirm('Gutschein wirklich widerrufen? (Nur möglich wenn nicht reserviert.)')) return;
    setRevokingId(id);
    const { error } = await supabase.rpc('admin_revoke_stock_trade_coupon', { p_coupon_id: id });
    setRevokingId(null);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success('Gutschein widerrufen');
    fetchRows();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code kopiert'),
      () => toast.error('Kopieren fehlgeschlagen'),
    );
  };

  const deleteCoupon = async (r) => {
    let msg = `Gutschein „${r.code}“ unwiderruflich löschen?`;
    if (r.status === 'reserved' && r.reserved_order_id) {
      msg +=
        '\n\nEs ist ein ausstehender Auftrag reserviert. Nur fortfahren, wenn Sie die Zuordnung bewusst entfernen.';
    }
    if (!window.confirm(msg)) return;
    setDeletingId(r.id);
    const { error } = await supabase.from('stock_trade_coupons').delete().eq('id', r.id);
    setDeletingId(null);
    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }
    toast.success('Gutschein gelöscht');
    fetchRows();
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin · Handel"
        title="Aktien-Gutscheine"
        titleIcon={Tag}
        description="Einmalige Rabattcodes für Kaufaufträge erzeugen und verwalten."
        actions={
          <Button variant="outline-ink" onClick={fetchRows} disabled={loading}>
            <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            Aktualisieren
          </Button>
        }
      />

      <AdminToolbarCard className="mb-4">
        <form onSubmit={createCoupon} className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
          <div className="flex-1 min-w-[140px] max-w-xs">
            <label className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              Rabatt %
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={percentInput}
              onChange={(e) => setPercentInput(e.target.value)}
              placeholder="z.B. 10"
            />
          </div>
          <Button type="submit" variant="primary" disabled={creating || !percentInput.trim()}>
            {creating ? 'Wird erstellt…' : 'Code generieren'}
          </Button>
        </form>
      </AdminToolbarCard>

      <AdminToolbarCard className="mb-4">
        <div className="relative max-w-md">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Code, Status, Kunde, E-Mail…"
            className="pl-9"
          />
        </div>
      </AdminToolbarCard>

      <AdminSurfaceCard>
        {loading ? (
          <div className="py-16 text-center text-bank-text-muted">
            <RefreshCw size={22} className="mx-auto mb-2 animate-spin opacity-60" />
            Wird geladen…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-bank-text-muted text-sm">Keine Gutscheine</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left">Erstellt</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-right">%</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left min-w-[220px]">Kunde / Auftrag</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const sm = STATUS_LABEL[r.status] || STATUS_LABEL.active;
                  const usage = buildUsageLine(r, orderLookup, profileLookup);
                  return (
                    <tr key={r.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}>
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
                          className={`inline-flex border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${sm.cls}`}
                        >
                          {sm.label}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-2.5 text-[12px] leading-snug text-bank-text">
                        <p>{usage}</p>
                        {(r.reserved_order_id || r.consumed_order_id) && (
                          <p className="mt-0.5 font-mono text-[10px] text-bank-text-muted">
                            Auftrag-ID: {r.consumed_order_id || r.reserved_order_id}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          <Button type="button" variant="outline" size="sm" onClick={() => copyCode(r.code)}>
                            <Copy size={12} strokeWidth={1.5} />
                          </Button>
                          {r.status === 'active' && !r.reserved_order_id && (
                            <Button
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-rose-300/55 text-rose-700 hover:bg-rose-50"
                            disabled={deletingId === r.id}
                            title="Gutschein dauerhaft löschen"
                            onClick={() => deleteCoupon(r)}
                          >
                            <Trash2 size={12} strokeWidth={1.5} />
                          </Button>
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
