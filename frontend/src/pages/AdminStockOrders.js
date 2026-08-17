import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
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

    const channel = supabase
      .channel('admin_stock_orders_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_stock_orders' }, async (payload) => {
        const o = payload.new;
        let userLabel = 'Kunde';
        const cached = profilesMapRef.current?.[o.user_id];
        if (cached) {
          userLabel = `${cached.first_name || ''} ${cached.last_name || ''}`.trim() || cached.email;
        } else {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, cash_balance')
            .eq('id', o.user_id)
            .maybeSingle();
          if (prof) {
            userLabel = `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || prof.email;
            setProfilesMap((m) => ({ ...m, [prof.id]: prof }));
          }
        }
        toast.info(
          `Neuer ${o.side === 'buy' ? 'Kauf' : 'Verkauf'}-Auftrag: ${userLabel} · ${o.symbol} × ${Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}`,
          { duration: 6000 }
        );
        playBeep();
        setOrders((prev) => [o, ...prev.filter((x) => x.id !== o.id)]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_stock_orders' }, (payload) => {
        const o = payload.new;
        setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, ...o } : x)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
      const [ordersRes, cacheRes] = await Promise.all([
        supabase.from('user_stock_orders').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('stock_prices_cache').select('*'),
      ]);
      const orderData = ordersRes.data || [];
      setOrders(orderData);
      const map = {};
      (cacheRes.data || []).forEach((p) => { map[p.symbol] = p; });
      setPriceMap(map);
      const userIds = Array.from(new Set(orderData.map((o) => o.user_id)));
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, email, first_name, last_name, cash_balance').in('id', userIds);
        const pm = {};
        (profs || []).forEach((p) => { pm[p.id] = p; });
        setProfilesMap(pm);
      }
    } catch (err) {
      toast.error('Fehler beim Laden: ' + (err?.message || ''));
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
    const { error } = await supabase.rpc('execute_stock_order', {
      p_order_id: execOrder.id,
      p_executed_price: priceNum,
    });
    setExecSubmitting(false);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success('Auftrag ausgeführt');

    try {
      let prof = profilesMap[execOrder.user_id];
      if (!prof?.email) {
        console.log('[send-stock-email] fetching profile for', execOrder.user_id);
        const { data: freshProf, error: profErr } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .eq('id', execOrder.user_id)
          .maybeSingle();
        if (profErr) console.warn('[send-stock-email] profile fetch error:', profErr);
        prof = freshProf;
      }
      if (prof?.email) {
        const fullName = [prof.first_name, prof.last_name].filter(Boolean).join(' ');
        const qty = Number(execOrder.quantity);
        const grossExec = priceNum * qty;
        const discPct =
          execOrder.side === 'buy' && execOrder.discount_percent_snapshot != null
            ? Number(execOrder.discount_percent_snapshot)
            : 0;
        const discAmt =
          execOrder.side === 'buy' && discPct > 0
            ? Math.round(grossExec * (discPct / 100) * 100) / 100
            : 0;
        const netExec = Math.round((grossExec - discAmt) * 100) / 100;
        console.log('[send-stock-email] invoking executed for', prof.email);
        const { data: em, error: emErr } = await supabase.functions.invoke('send-stock-email', {
          body: {
            type: 'executed',
            to: prof.email,
            user_name: fullName || null,
            order: {
              symbol: execOrder.symbol,
              side: execOrder.side,
              quantity: qty,
              requested_price: execOrder.requested_price != null ? Number(execOrder.requested_price) : null,
              executed_price: priceNum,
              total: execOrder.side === 'buy' ? netExec : grossExec,
              gross_amount: grossExec,
              discount_percent: discPct > 0 ? discPct : null,
              discount_amount: discAmt > 0 ? discAmt : null,
              net_amount: execOrder.side === 'buy' ? netExec : grossExec,
              currency: priceMap[execOrder.symbol]?.currency || 'USD',
              note: execOrder.note,
              created_at: execOrder.created_at,
            },
          },
        });
        if (emErr) console.warn('[send-stock-email] executed error:', emErr);
        else console.log('[send-stock-email] executed ok:', em);
      } else {
        console.warn('[send-stock-email] executed: no email for user', execOrder.user_id);
      }
    } catch (e3) {
      console.warn('[send-stock-email] outer catch:', e3);
    }

    setExecOrder(null);
    setExecPrice('');
    fetchAll();
  };

  const handleReject = async (e) => {
    e?.preventDefault?.();
    if (!rejectReason.trim()) { toast.error('Bitte Grund angeben'); return; }
    setRejectSubmitting(true);
    const { error } = await supabase.rpc('reject_stock_order', {
      p_order_id: rejectOrder.id,
      p_reason: rejectReason.trim(),
    });
    setRejectSubmitting(false);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success('Auftrag abgelehnt');

    try {
      let prof = profilesMap[rejectOrder.user_id];
      if (!prof?.email) {
        console.log('[send-stock-email] fetching profile for', rejectOrder.user_id);
        const { data: freshProf } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .eq('id', rejectOrder.user_id)
          .maybeSingle();
        prof = freshProf;
      }
      if (prof?.email) {
        const fullName = [prof.first_name, prof.last_name].filter(Boolean).join(' ');
        console.log('[send-stock-email] invoking rejected for', prof.email);
        const { data: em, error: emErr } = await supabase.functions.invoke('send-stock-email', {
          body: {
            type: 'rejected',
            to: prof.email,
            user_name: fullName || null,
            order: {
              symbol: rejectOrder.symbol,
              side: rejectOrder.side,
              quantity: Number(rejectOrder.quantity),
              requested_price: rejectOrder.requested_price != null ? Number(rejectOrder.requested_price) : null,
              currency: priceMap[rejectOrder.symbol]?.currency || 'USD',
              note: rejectOrder.note,
              rejection_reason: rejectReason.trim(),
              created_at: rejectOrder.created_at,
            },
          },
        });
        if (emErr) console.warn('[send-stock-email] rejected error:', emErr);
        else console.log('[send-stock-email] rejected ok:', em);
      } else {
        console.warn('[send-stock-email] rejected: no email for user', rejectOrder.user_id);
      }
    } catch (e3) {
      console.warn('[send-stock-email] outer catch:', e3);
    }

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
