import { getApiBase } from '@/lib/apiBase';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const client = axios.create({ baseURL: `${getApiBase()}/api`, withCredentials: true });

/**
 * StockNotificationBell — Session 80.84.
 * Dezente Glocke im Header für eingeloggte Nutzer. Zeigt die 5 neuesten
 * Aktien-Alarm-Notifications. Verwendet ausschließlich `/api/stock-notifications`.
 * Kein Polling — einmal beim Mount, danach nur nach Nutzer-Aktionen.
 */
export default function StockNotificationBell({ chrome = 'light' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unseen, setUnseen] = useState(0);
  const wrapRef = useRef(null);

  const load = async () => {
    if (!user) return;
    try {
      const { data } = await client.get('/stock-notifications', { params: { limit: 5 } });
      setItems(data.items || []);
      setUnseen(data.unseen_count || 0);
    } catch { /* keep prior */ }
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open]);

  if (!user) return null;

  const markSeen = async (id) => {
    try {
      await client.post(`/stock-notifications/${id}/seen`);
      setItems((cur) => cur.map((n) => n.id === id ? { ...n, seen: true } : n));
      setUnseen((u) => Math.max(0, u - 1));
    } catch { /* ignore */ }
  };

  const iconColor = chrome === 'light' ? 'text-bank-text' : 'text-white';

  return (
    <div ref={wrapRef} className="relative" data-testid="stock-notification-bell-wrap">
      <button
        type="button"
        onClick={() => setOpen((v) => { const next = !v; if (next) load(); return next; })}
        aria-label={`Benachrichtigungen, ${unseen} ungelesen`}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="stock-notification-bell"
        className={cn(
          'relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
          chrome === 'light' ? 'hover:bg-neutral-100' : 'hover:bg-white/10',
        )}
      >
        <Bell className={cn('h-5 w-5', iconColor)} strokeWidth={LUCIDE_STROKE} aria-hidden />
        {unseen > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bank-primary px-1 font-mono text-[10px] font-medium leading-none text-white"
            aria-hidden
          >{unseen > 99 ? '99+' : unseen}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[70] mt-2 w-[340px] max-w-[92vw] rounded-xl border border-bank-border bg-white shadow-xl dark:bg-bank-surface"
          data-testid="stock-notification-popover"
        >
          <div className="border-b border-bank-border px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Benachrichtigungen</p>
            <p className="mt-0.5 font-mono text-[10px] text-bank-text-muted">
              {unseen > 0 ? `${unseen} ungelesen` : 'Alles gelesen'}
            </p>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-bank-text-muted">Keine Benachrichtigungen bisher.</p>
          ) : (
            <ul className="divide-y divide-bank-border/60 max-h-[380px] overflow-y-auto">
              {items.map((n) => {
                // Session 82.52 — Type-aware Rendering. Backward-compat:
                // Preisalarm-Docs ohne `type`/`route` behalten das alte
                // Symbol-Prefix + Deep-Link zur Aktie.
                const type = n.type || 'price_alert_triggered';
                const isPriceAlert = type === 'price_alert_triggered';
                const primaryLabel = isPriceAlert && n.symbol
                  ? `${n.symbol} · ${(n.title || '').replace(`${n.symbol}: `, '')}`
                  : (n.title || '');
                const deepLink = n.route
                  || (n.symbol ? `/aktien/${encodeURIComponent(n.symbol)}` : null);
                const deepLinkLabel = isPriceAlert
                  ? 'Aktie ansehen'
                  : type === 'order_executed' ? 'Order öffnen'
                  : type === 'ipo_allocated' ? 'Zuteilung öffnen'
                  : type === 'bond_executed' ? 'Anleihe öffnen'
                  : 'Details öffnen';
                return (
                  <li key={n.id} className={cn('px-4 py-3', !n.seen && 'bg-bank-primary/5')} data-testid={`bell-notif-${n.id}`} data-notif-type={type}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-bank-text">
                          {primaryLabel}
                          {!n.seen && <span className="ml-1.5 rounded-full bg-bank-primary/15 px-1.5 py-0 font-mono text-[9px] uppercase tracking-[0.12em] text-bank-primary-strong">Neu</span>}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-bank-text-muted">{n.body}</p>
                        <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-bank-text-muted">
                          {n.triggered_at && new Date(n.triggered_at).toLocaleString('de-DE')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {deepLink && (
                        <Link
                          to={deepLink}
                          onClick={() => setOpen(false)}
                          className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:text-bank-primary-strong"
                        >{deepLinkLabel}</Link>
                      )}
                      {!n.seen && (
                        <button
                          type="button"
                          onClick={() => markSeen(n.id)}
                          className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:text-bank-text"
                        >Als gelesen markieren</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-bank-border px-4 py-3 text-center">
            <Link
              to="/meine-alarme"
              onClick={() => setOpen(false)}
              className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-primary-strong hover:underline"
            >Alle Alarme &amp; Benachrichtigungen</Link>
          </div>
        </div>
      )}
    </div>
  );
}
