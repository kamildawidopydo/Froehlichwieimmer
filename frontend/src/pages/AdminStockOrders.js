import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  RefreshCw, Check, X, Clock, CheckCircle, XCircle, Search, Filter, Bell, BellOff, ListOrdered,
} from 'lucide-react';

const formatEUR = (v) => Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const API = getApiBase();
// Session 82.90d — Reads/Writes via FastAPI-Admin-Endpoints; Realtime durch
// 30s-Poll (nur wenn Seite sichtbar) + visibility/focus/refresh-after-mutation.
const api = axios.create({ baseURL: `${API}/api`, withCredentials: true });

const AdminStockOrders = () => {
  const [orders, setOrders] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [priceMap, setPriceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Execute modal
  const [execOrder, setExecOrder] = useState(null);
  const [execPrice, setExecPrice] = useState('');
  const [execSubmitting, setExecSubmitting] = useState(false);

  // Reject modal
  const [rejectOrder, setRejectOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Realtime / notifications
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('adminOrdersSound') !== 'off'; } catch { return true; }
  });
  const audioCtxRef = useRef(null);
  const profilesMapRef = useRef({});

  useEffect(() => { profilesMapRef.current = profilesMap; }, [profilesMap]);

  useEffect(() => {
    fetchAll();
    // Session 82.90d — Realtime-Ersatz: 30s-Poll bei sichtbarer Seite +
    // visibility/focus refresh. Kein Supabase-Channel, kein WebSocket.
    let iv;
    const kick = () => { if (!document.hidden) fetchAll(); };
    iv = setInterval(kick, 30000);
    document.addEventListener('visibilitychange', kick);
    window.addEventListener('focus', kick);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', kick);
      window.removeEventListener('focus', kick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } catch { /* ignore */ }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem('adminOrdersSound', next ? 'on' : 'off'); } catch { /* ignore */ }
      toast.success(next ? 'Ton aktiviert' : 'Ton deaktiviert');
      return next;
    });
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Session 82.90d — Admin-List über bestehende FastAPI-Endpoints.
      const [ordersRes, usersRes] = await Promise.all([
        api.get('/admin/portfolio/orders?limit=500').catch(() => ({ data: [] })),
        api.get('/admin/users?include_balances=true').catch(() => ({ data: [] })),
      ]);
      const orderData = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.items || []);
      setOrders(orderData);
      const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.items || []);
      const pm = {};
      users.forEach((u) => { pm[u.id] = u; });
      setProfilesMap(pm);
      // Live-Preise: /api/portfolio/quotes für vorkommende Symbole
      const symbols = Array.from(new Set(orderData.map((o) => o.symbol).filter(Boolean)));
      if (symbols.length > 0) {
        try {
          const { data: q } = await api.get(`/portfolio/quotes?symbols=${encodeURIComponent(symbols.join(','))}`);
          const map = {};
          Object.entries(q || {}).forEach(([sym, v]) => { if (v && typeof v === 'object') map[sym] = v; });
          setPriceMap(map);
        } catch {
          setPriceMap({});
        }
      }
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.response?.data?.detail || err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const openExecute = (order) => {
    setExecOrder(order);
    const refPrice = priceMap[order.symbol]?.price ?? order.requested_price ?? '';
    setExecPrice(refPrice != null ? String(refPrice) : '');
  };

  const handleExecute = async (e) => {
    e?.preventDefault?.();
    const priceNum = Number(execPrice);
    if (!priceNum || priceNum <= 0) { toast.error('Ungültiger Ausführungskurs'); return; }
    setExecSubmitting(true);
    try {
      // Session 82.90d — Execute via Saga-Endpoint. Kein direktes Status-Update.
      await api.post(`/admin/portfolio/orders/${encodeURIComponent(execOrder.id)}/execute`, {});
      toast.success('Auftrag ausgeführt');
      // Email-Side-Effect idempotent via order_notifications-Queue.
      try {
        await api.post(`/admin/portfolio/orders/${encodeURIComponent(execOrder.id)}/notify`, {
          event_type: 'executed',
          channel: 'email',
          subject: `Auftrag ausgeführt · ${execOrder.symbol}`,
        });
      } catch { /* Email-Fehler ändert Financial-State nie */ }
    } catch (err) {
      toast.error('Fehler: ' + (err?.response?.data?.detail || err?.message || ''));
      setExecSubmitting(false);
      return;
    }
    setExecSubmitting(false);
    setExecOrder(null);
    setExecPrice('');
    fetchAll();
  };

  const handleReject = async (e) => {
    e?.preventDefault?.();
    if (!rejectReason.trim()) { toast.error('Bitte Grund angeben'); return; }
    setRejectSubmitting(true);
    try {
      // Session 82.90d — Reject via neuen 82.90b-Endpoint (CAS + Coupon-Release).
      await api.post(`/admin/portfolio/orders/${encodeURIComponent(rejectOrder.id)}/reject`, {
        decision_note: rejectReason.trim(),
      });
      toast.success('Auftrag abgelehnt');
      try {
        await api.post(`/admin/portfolio/orders/${encodeURIComponent(rejectOrder.id)}/notify`, {
          event_type: 'rejected',
          channel: 'email',
          subject: `Auftrag abgelehnt · ${rejectOrder.symbol}`,
          body_preview: rejectReason.trim().slice(0, 500),
        });
      } catch { /* Email-Fehler ändert Financial-State nie */ }
    } catch (err) {
      toast.error('Fehler: ' + (err?.response?.data?.detail || err?.message || ''));
      setRejectSubmitting(false);
      return;
    }
    setRejectSubmitting(false);
    setRejectOrder(null);
    setRejectReason('');
    fetchAll();
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (term) {
        const prof = profilesMap[o.user_id];
        const hay = [o.symbol, prof?.email, prof?.first_name, prof?.last_name, o.note, o.discount_percent_snapshot != null ? String(o.discount_percent_snapshot) : '']
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm, profilesMap]);

  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    executed: orders.filter((o) => o.status === 'executed').length,
    rejected: orders.filter((o) => o.status === 'rejected').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }), [orders]);

  return (
    <>
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Handel"
          title="Aktien-Aufträge"
          titleIcon={ListOrdered}
          description="Kundenaufträge prüfen, ausführen oder ablehnen — mit Live-Updates."
          actions={
            <>
              <Button onClick={toggleSound} variant="outline-ink" title={soundEnabled ? 'Ton deaktivieren' : 'Ton aktivieren'}>
                {soundEnabled ? <Bell size={13} strokeWidth={1.5} /> : <BellOff size={13} strokeWidth={1.5} />}
                {soundEnabled ? 'Ton an' : 'Ton aus'}
              </Button>
              <Button onClick={fetchAll} variant="outline-ink">
                <RefreshCw size={13} strokeWidth={1.5} /> Aktualisieren
              </Button>
            </>
          }
        />

        <p className="mb-4 inline-flex items-center gap-2 border border-emerald-300/55 bg-emerald-50 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-emerald-700">
          <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-emerald-500 animate-pulse" />
          Live-Updates aktiv
        </p>

        <AdminToolbarCard className="space-y-4">
        {/* Status tabs */}
        <div role="tablist" className="flex flex-wrap gap-2">
          {[
            { key: 'pending', label: 'Ausstehend' },
            { key: 'executed', label: 'Ausgeführt' },
            { key: 'rejected', label: 'Abgelehnt' },
            { key: 'cancelled', label: 'Storniert' },
            { key: 'all', label: 'Alle' },
          ].map((s) => {
            const active = statusFilter === s.key;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(s.key)}
                className={`inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 ${
                  active
                    ? 'border-bank-ink bg-bank-ink text-white'
                    : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 hover:text-bank-text'
                }`}
              >
                {s.label}
                <span
                  className={`inline-flex h-4 min-w-[18px] items-center justify-center border px-1 font-mono text-[9.5px] tabular-nums ${
                    active
                      ? 'border-white/35 text-white'
                      : 'border-bank-border text-bank-text-muted'
                  }`}
                >
                  {counts[s.key]}
                </span>
              </button>
            );
          })}
        </div>

          <div className="relative">
            <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suche nach Symbol, Kunde, E-Mail…"
              className="pl-9"
              aria-label="Aufträge suchen"
            />
          </div>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={20} strokeWidth={1.5} className="mx-auto mb-3 animate-spin text-bank-gold/65" />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                Wird geladen…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Filter size={28} strokeWidth={1.4} className="mx-auto mb-3 text-bank-gold/55" />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                Keine Aufträge in diesem Filter
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={adminTheadClass}>
                  <tr>
                    <th className="px-4 py-3 text-left">Datum</th>
                    <th className="px-4 py-3 text-left">Kunde</th>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Seite</th>
                    <th className="px-4 py-3 text-right">Stück</th>
                    <th className="px-4 py-3 text-right">Rabatt</th>
                    <th className="px-4 py-3 text-right">Ref.-Kurs</th>
                    <th className="px-4 py-3 text-right">Live-Kurs</th>
                    <th className="px-4 py-3 text-right">Guthaben</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const prof = profilesMap[o.user_id];
                    const live = priceMap[o.symbol]?.price;
                    const statusMeta = {
                      pending: { cls: 'border-amber-300/55 bg-amber-50 text-amber-700', icon: Clock, label: 'Ausstehend' },
                      executed: { cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-700', icon: CheckCircle, label: 'Ausgeführt' },
                      rejected: { cls: 'border-rose-300/55 bg-rose-50 text-rose-700', icon: XCircle, label: 'Abgelehnt' },
                      cancelled: { cls: 'border-bank-border bg-bank-bg/45 text-bank-text-muted', icon: X, label: 'Storniert' },
                    }[o.status] || { cls: 'border-bank-border bg-bank-bg/45 text-bank-text-muted', icon: Clock, label: o.status };
                    const Icon = statusMeta.icon;
                    return (
                      <tr key={o.id} className={`border-b border-bank-border last:border-b-0 ${adminRowHover}`}>
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] tabular-nums text-bank-text-muted">
                          {new Date(o.created_at).toLocaleDateString('de-DE')}
                          <br />
                          <span className="text-[10px]">
                            {new Date(o.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[12.5px]">
                          <p className="font-medium text-bank-text">
                            {prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.email : '–'}
                          </p>
                          <p className="font-mono text-[10.5px] tracking-[0.08em] text-bank-text-muted">
                            {prof?.email || ''}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[12.5px] font-medium text-bank-text">
                          {o.symbol}
                          {o.order_type === 'limit' && (
                            <span className="ml-1.5 rounded bg-blue-50 px-1 py-0.5 text-[9px] font-semibold uppercase text-blue-700">
                              Limit
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                              o.side === 'buy'
                                ? 'border-emerald-300/55 bg-emerald-50 text-emerald-700'
                                : 'border-rose-300/55 bg-rose-50 text-rose-700'
                            }`}
                          >
                            {o.side === 'buy' ? 'Kauf' : 'Verkauf'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-bank-text">
                          {Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[12px] tabular-nums text-bank-text-muted">
                          {o.side === 'buy' &&
                          o.discount_percent_snapshot != null &&
                          Number(o.discount_percent_snapshot) > 0
                            ? `${Number(o.discount_percent_snapshot).toLocaleString('de-DE', {
                                maximumFractionDigits: 2,
                              })}%`
                            : '–'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-bank-text-muted">
                          {o.requested_price != null
                            ? Number(o.requested_price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '–'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="rate-figure text-[13px] tabular-nums text-bank-text">
                            {live != null
                              ? Number(live).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '–'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[11px] tabular-nums text-bank-text-muted">
                          {prof?.cash_balance != null ? formatEUR(prof.cash_balance) : '–'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${statusMeta.cls}`}>
                            <Icon size={11} strokeWidth={1.5} /> {statusMeta.label}
                          </span>
                          {o.rejection_reason && (
                            <p
                              className="mt-1 text-[10px] text-rose-600"
                              title={o.rejection_reason}
                            >
                              {o.rejection_reason.length > 30 ? o.rejection_reason.slice(0, 30) + '…' : o.rejection_reason}
                            </p>
                          )}
                          {o.executed_price != null && o.status === 'executed' && (
                            <p className="mt-1 font-mono text-[10px] tabular-nums text-emerald-700">
                              @ {Number(o.executed_price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          {o.status === 'pending' && (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openExecute(o)}
                              >
                                <Check size={12} strokeWidth={1.5} /> Ausführen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectOrder(o)}
                                className="border-rose-300/55 text-rose-600 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <X size={12} strokeWidth={1.5} /> Ablehnen
                              </Button>
                            </div>
                          )}
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

      {/* Execute modal */}
      {execOrder && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgb(11 21 32 / 0.62)' }}
          onClick={() => !execSubmitting && setExecOrder(null)}
        >
          <form
            onSubmit={handleExecute}
            className="relative w-full max-w-md border border-bank-border bg-white p-6 shadow-editorial-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
            <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
              Bestätigung
            </p>
            <h3
              className="mt-1.5 font-display text-[1.25rem] font-light leading-tight text-bank-text"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
            >
              Auftrag ausführen
            </h3>
            <span aria-hidden className="mt-2 block h-px w-12 bg-bank-gold/55" />
            <p className="mt-3 text-[13px] text-bank-text-muted">
              {execOrder.side === 'buy' ? 'Kauf' : 'Verkauf'} von{' '}
              <strong className="font-mono tabular-nums text-bank-text">
                {Number(execOrder.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
              </strong>{' '}
              Stück <strong className="font-mono text-bank-text">{execOrder.symbol}</strong>
            </p>

            <div className="mt-4 space-y-1.5 border border-bank-border bg-bank-bg/45 p-3 text-[12.5px]">
              <div className="flex justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">Kunde</span>
                <span className="font-mono text-bank-text">{profilesMap[execOrder.user_id]?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">Ref.-Kurs</span>
                <span className="font-mono tabular-nums text-bank-text">
                  {execOrder.requested_price != null ? Number(execOrder.requested_price).toLocaleString('de-DE', { minimumFractionDigits: 2 }) : '–'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">Live-Kurs</span>
                <span className="font-mono tabular-nums text-bank-text">
                  {priceMap[execOrder.symbol]?.price != null ? Number(priceMap[execOrder.symbol].price).toLocaleString('de-DE', { minimumFractionDigits: 2 }) : '–'}
                </span>
              </div>
              {execOrder.side === 'buy' &&
                execOrder.discount_percent_snapshot != null &&
                Number(execOrder.discount_percent_snapshot) > 0 && (
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">Gutschein</span>
                    <span className="font-mono tabular-nums text-emerald-800">
                      {Number(execOrder.discount_percent_snapshot).toLocaleString('de-DE', {
                        maximumFractionDigits: 2,
                      })}
                      % Rabatt
                    </span>
                  </div>
                )}
              <div className="flex justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">Kundenguthaben</span>
                <span className="font-mono tabular-nums text-bank-text">
                  {formatEUR(profilesMap[execOrder.user_id]?.cash_balance)}
                </span>
              </div>
            </div>

            <label className="mb-1.5 mt-4 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              Ausführungskurs
            </label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={execPrice}
              onChange={(e) => setExecPrice(e.target.value)}
              autoFocus
            />
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
              {(() => {
                const q = Number(execOrder.quantity);
                const px = Number(execPrice);
                if (!execPrice || !(px > 0)) return <>Gesamtbetrag · <strong className="font-mono tabular-nums text-bank-text">–</strong></>;
                const gross = Math.round(q * px * 10000) / 10000;
                const pct =
                  execOrder.side === 'buy' && execOrder.discount_percent_snapshot != null
                    ? Number(execOrder.discount_percent_snapshot)
                    : 0;
                const disc = execOrder.side === 'buy' && pct > 0 ? Math.round(gross * (pct / 100) * 100) / 100 : 0;
                const net = Math.round((gross - disc) * 100) / 100;
                if (disc > 0) {
                  return (
                    <>
                      Brutto ·{' '}
                      <strong className="font-mono tabular-nums text-bank-text">
                        {gross.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                      {' · Rabatt · '}
                      <strong className="font-mono tabular-nums text-emerald-700">
                        − {disc.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                      {' · Netto · '}
                      <strong className="font-mono tabular-nums text-bank-text">
                        {net.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </>
                  );
                }
                return (
                  <>
                    Gesamtbetrag ·{' '}
                    <strong className="font-mono tabular-nums text-bank-text">
                      {gross.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </>
                );
              })()}
            </p>

            <div className="mt-5 flex gap-2">
              <Button type="button" variant="outline-ink" className="flex-1" onClick={() => setExecOrder(null)} disabled={execSubmitting}>
                Abbrechen
              </Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={execSubmitting}>
                {execSubmitting ? 'Wird ausgeführt…' : 'Ausführen'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reject modal */}
      {rejectOrder && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgb(11 21 32 / 0.62)' }}
          onClick={() => !rejectSubmitting && setRejectOrder(null)}
        >
          <form
            onSubmit={handleReject}
            className="relative w-full max-w-md border border-bank-border bg-white p-6 shadow-editorial-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
            <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
              Bestätigung
            </p>
            <h3
              className="mt-1.5 font-display text-[1.25rem] font-light leading-tight text-bank-text"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}
            >
              Auftrag ablehnen
            </h3>
            <span aria-hidden className="mt-2 block h-px w-12 bg-bank-gold/55" />
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] tabular-nums text-bank-text-muted">
              {rejectOrder.side === 'buy' ? 'Kauf' : 'Verkauf'} · {rejectOrder.symbol} ×{' '}
              {Number(rejectOrder.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
            </p>
            <label className="mb-1.5 mt-4 block font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
              Grund
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              autoFocus
              className="w-full border border-bank-border bg-white px-3 py-2 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
              placeholder="z.B. Markt geschlossen, Kundengrenze überschritten…"
            />
            <div className="mt-5 flex gap-2">
              <Button type="button" variant="outline-ink" className="flex-1" onClick={() => setRejectOrder(null)} disabled={rejectSubmitting}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                className="flex-1 border border-rose-700 bg-rose-600 text-white shadow-sm hover:bg-rose-700"
                disabled={rejectSubmitting}
              >
                {rejectSubmitting ? 'Wird abgelehnt…' : 'Ablehnen'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AdminStockOrders;
