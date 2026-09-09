import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';
// Session 82.101 · Supabase-Realtime entfernt · Polling erfolgt über
// AdminGlobalNotifications (Admin) bzw. bestehende Notification-Endpoints.
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bell,
  CheckCircle,
  XCircle,
  Ban,
  Wallet,
  Landmark,
  Briefcase,
  Check,
  RefreshCw,
  Headphones,
  BellRing,
  FileChartLine,
} from 'lucide-react';

const STORAGE_KEY = 'notif_last_seen_at';
const REFRESH_MS = 45_000;

const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'gerade eben';
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
};

const NotificationCenter = ({ chrome = 'light' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSeen, setLastSeen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || '1970-01-01T00:00:00Z'; } catch { return '1970-01-01T00:00:00Z'; }
  });
  const listRef = useAutoAnimateRef(open && items.length > 0);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Session 82.106 · Notification-Aggregator jetzt gegen FastAPI (Cookie-Auth via withCredentials).
      // Feeds: Orders (executed/rejected/cancelled), Cash (created_by-Admin), Alerts (triggered),
      // Support-Tickets (unread_for_user > 0). Contracts/Bond-Requests/IPO-Requests haben derzeit
      // keinen Kunden-List-Endpoint → gracefully übersprungen.
      const _axios = (await import('axios')).default;
      const _api = (await import('@/lib/apiBase')).getApiBase();
      const _cfg = { withCredentials: true };

      const [ordersRes, cashRes, alertsRes, supportRes] = await Promise.allSettled([
        _axios.get(`${_api}/api/portfolio/orders`, { ..._cfg, params: { limit: 30 } }),
        _axios.get(`${_api}/api/portfolio/cash`, { ..._cfg, params: { history_limit: 20 } }),
        _axios.get(`${_api}/api/stock-notifications`, { ..._cfg, params: { limit: 20 } }),
        _axios.get(`${_api}/api/support/tickets`, _cfg),
      ]);

      const orders = ordersRes.status === 'fulfilled' ? (ordersRes.value.data || []) : [];
      const cashData = cashRes.status === 'fulfilled' ? (cashRes.value.data || {}) : {};
      const cashHistory = Array.isArray(cashData.history) ? cashData.history : [];
      const alertsData = alertsRes.status === 'fulfilled' ? (alertsRes.value.data || {}) : {};
      const alerts = Array.isArray(alertsData) ? alertsData : (alertsData.items || []);
      const tickets = supportRes.status === 'fulfilled' ? (supportRes.value.data || []) : [];

      const aggregated = [];
      orders.forEach((o) => {
        const time = o.executed_at || o.created_at;
        if (o.status === 'executed') {
          aggregated.push({
            id: `order-exec-${o.id}`,
            type: 'order_executed',
            time,
            title: `Auftrag ausgeführt: ${o.symbol}`,
            description: `${o.side === 'buy' ? 'Kauf' : 'Verkauf'} × ${Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}${o.executed_price ? ` @ ${Number(o.executed_price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}`,
            path: '/dashboard/auftraege',
          });
        } else if (o.status === 'rejected') {
          aggregated.push({
            id: `order-rej-${o.id}`,
            type: 'order_rejected',
            time,
            title: `Auftrag abgelehnt: ${o.symbol}`,
            description: o.rejection_reason || 'Kein Grund angegeben',
            path: '/dashboard/auftraege',
          });
        } else if (o.status === 'cancelled') {
          aggregated.push({
            id: `order-can-${o.id}`,
            type: 'order_cancelled',
            time,
            title: `Auftrag storniert: ${o.symbol}`,
            description: `${o.side === 'buy' ? 'Kauf' : 'Verkauf'} × ${Number(o.quantity).toLocaleString('de-DE', { maximumFractionDigits: 4 })}`,
            path: '/dashboard/auftraege',
          });
        }
      });

      cashHistory.forEach((t) => {
        if (!t.created_by) return;   // Nur Admin-getriggerte Cash-Bewegungen als Nachricht
        const isCredit = Number(t.amount) >= 0;
        aggregated.push({
          id: `cash-${t.id}`,
          type: isCredit ? 'cash_in' : 'cash_out',
          time: t.created_at,
          title: isCredit ? `Gutschrift: ${formatEUR(t.amount)}` : `Belastung: ${formatEUR(Math.abs(t.amount))}`,
          description: t.description || t.type,
          path: '/dashboard/uebersicht',
        });
      });

      alerts.forEach((a) => {
        // /api/stock-notifications = ausgelöste Alerts
        const time = a.triggered_at || a.created_at;
        if (!time) return;
        aggregated.push({
          id: `alert-${a.id || `${a.symbol}-${time}`}`,
          type: 'price_alert',
          time,
          title: `Preisalarm: ${a.symbol}`,
          description: a.direction === 'above'
            ? `Kurs über ${formatEUR(a.target_price)} erreicht`
            : `Kurs unter ${formatEUR(a.target_price)} erreicht`,
          path: '/dashboard/watchlist',
        });
      });

      tickets.forEach((t) => {
        if (Number(t.unread_for_user) <= 0) return;
        aggregated.push({
          id: `support-${t.id}-${t.last_message_at}`,
          type: 'support_message',
          time: t.last_message_at,
          title: `Support: ${t.subject}`,
          description: 'Neue Nachricht vom Support-Team',
          path: '/dashboard/support',
        });
      });

      (alertsRes.data || []).forEach((a) => {
        aggregated.push({
          id: `alert-${a.id}`,
          type: 'price_alert',
          time: a.triggered_at,
          title: `Kursalarm: ${a.symbol}`,
          description: `${a.direction === 'above' ? 'über' : 'unter'} ${Number(a.target_price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          path: '/dashboard/alarme',
        });
      });

      aggregated.sort((a, b) => new Date(b.time) - new Date(a.time));
      setItems(aggregated.slice(0, 30));
    } catch (err) {
      console.error('notifications fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchItems();
    const id = setInterval(fetchItems, REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unreadCount = useMemo(() => {
    const seen = new Date(lastSeen).getTime();
    return items.filter((i) => new Date(i.time).getTime() > seen).length;
  }, [items, lastSeen]);

  const markAllRead = () => {
    const now = new Date().toISOString();
    setLastSeen(now);
    try { localStorage.setItem(STORAGE_KEY, now); } catch {}
  };

  const handleClick = (item) => {
    setOpen(false);
    markAllRead();
    if (item.path) navigate(item.path);
  };

  const iconFor = (type) => {
    switch (type) {
      case 'order_executed': return <CheckCircle size={16} className="text-emerald-600" />;
      case 'order_rejected': return <XCircle size={16} className="text-rose-600" />;
      case 'order_cancelled': return <Ban size={16} className="text-slate-500" />;
      case 'cash_in': return <Wallet size={16} className="text-emerald-600" />;
      case 'cash_out': return <Wallet size={16} className="text-rose-600" />;
      case 'contract': return <Landmark size={16} className="text-bank-primary" />;
      case 'bond': return <Briefcase size={16} className="text-amber-600" />;
      case 'bond_request_approved': return <CheckCircle size={16} className="text-emerald-600" />;
      case 'bond_request_rejected': return <XCircle size={16} className="text-rose-600" />;
      case 'ipo_request_approved': return <CheckCircle size={16} className="text-emerald-600" />;
      case 'ipo_request_rejected': return <XCircle size={16} className="text-rose-600" />;
      case 'support_message': return <Headphones size={16} className="text-bank-primary" />;
      case 'support_closed': return <Headphones size={16} className="text-slate-500" />;
      case 'price_alert': return <BellRing size={16} className="text-amber-600" />;
      default: return <FileChartLine size={16} className="text-bank-text-muted" />;
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            chrome === 'dark'
              ? 'text-white/75 hover:bg-white/10 hover:text-white'
              : 'text-bank-text-muted hover:bg-bank-bg/80 hover:text-bank-text dark:hover:bg-white/10',
          )}
          aria-label="Benachrichtigungen"
          title="Benachrichtigungen"
        >
          <Bell size={18} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center tabular-nums ring-2 ring-bank-primary">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="z-[200] flex w-[min(92vw,380px)] max-h-[min(calc(100dvh-5.5rem),560px)] flex-col overflow-hidden rounded-lg border border-bank-border bg-popover p-0 text-popover-foreground shadow-lg"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-bank-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-bank-text-muted" />
            <p className="text-sm font-semibold text-bank-text">Benachrichtigungen</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchItems}
              disabled={loading}
              className="rounded p-1.5 text-bank-text-muted transition-colors hover:bg-bank-bg hover:text-bank-text disabled:opacity-50"
              title="Aktualisieren"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            {items.length > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] text-bank-text-muted transition-colors hover:text-bank-primary"
                title="Als gelesen markieren"
              >
                <Check size={12} /> Gelesen
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1">
          {loading && items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <RefreshCw size={18} className="animate-spin text-bank-text-muted/60 mx-auto mb-2" />
              <p className="text-xs text-bank-text-muted">Wird geladen...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell size={26} className="mx-auto mb-2 text-bank-text-muted/30" />
              <p className="text-sm text-bank-text-muted">Keine Benachrichtigungen</p>
              <p className="text-xs text-bank-text-muted/70 mt-1">Aktionen erscheinen hier, sobald sie eintreten.</p>
            </div>
          ) : (
            <ul ref={listRef} className="divide-y divide-bank-border/60">
              {items.map((item) => {
                const isNew = new Date(item.time).getTime() > new Date(lastSeen).getTime();
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleClick(item)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-bank-bg transition-colors ${isNew ? 'bg-bank-primary/[0.03]' : ''}`}
                    >
                      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-bank-bg flex items-center justify-center">
                        {iconFor(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-bank-text line-clamp-1">{item.title}</p>
                          {isNew && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-bank-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-bank-text-muted line-clamp-2 mt-0.5">{item.description}</p>
                        <p className="text-[10px] text-bank-text-muted/70 mt-1">{timeAgo(item.time)}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
