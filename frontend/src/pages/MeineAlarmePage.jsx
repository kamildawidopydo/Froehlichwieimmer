import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Trash2, Play, Pause, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const client = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`, withCredentials: true });

const TYPE_LABEL = {
  price_above: 'Kurs über',
  price_below: 'Kurs unter',
  earnings_reminder: 'Earnings-Erinnerung',
  ex_dividend_reminder: 'Ex-Dividende-Erinnerung',
  news_new: 'Neue Meldungen',
};

const FILTERS = [
  { key: 'all', label: 'Alle' },
  { key: 'active', label: 'Aktiv' },
  { key: 'paused', label: 'Pausiert' },
  { key: 'price', label: 'Kurs' },
  { key: 'events', label: 'Termine' },
  { key: 'news', label: 'News' },
];

/**
 * MeineAlarmePage — Session 80.83 · Watchlist Professional 4/4.
 * Persönliche Übersicht aller Aktien-Alarme + Notifications.
 */
export default function MeineAlarmePage() {
  const { user, isAuthed } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthed) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [a, n] = await Promise.all([client.get('/stock-alerts'), client.get('/stock-notifications', { params: { limit: 50 } })]);
        if (!alive) return;
        setAlerts(a.data.items || []);
        setNotifs(n.data.items || []);
      } catch { /* keep empty */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [isAuthed, navigate, location.pathname]);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'active') return a.is_active;
      if (filter === 'paused') return !a.is_active;
      if (filter === 'price') return a.alert_type === 'price_above' || a.alert_type === 'price_below';
      if (filter === 'events') return a.alert_type === 'earnings_reminder' || a.alert_type === 'ex_dividend_reminder';
      if (filter === 'news') return a.alert_type === 'news_new';
      return true;
    });
  }, [alerts, filter]);

  const toggle = async (a) => {
    try {
      const { data } = await client.patch(`/stock-alerts/${a.id}`, { is_active: !a.is_active });
      setAlerts((cur) => cur.map((x) => x.id === a.id ? data : x));
    } catch { toast.error('Aktion fehlgeschlagen.'); }
  };
  const del = async (a) => {
    try {
      await client.delete(`/stock-alerts/${a.id}`);
      setAlerts((cur) => cur.filter((x) => x.id !== a.id));
      toast.success('Alarm gelöscht.');
    } catch { toast.error('Aktion fehlgeschlagen.'); }
  };
  const markSeen = async (n) => {
    try {
      await client.post(`/stock-notifications/${n.id}/seen`);
      setNotifs((cur) => cur.map((x) => x.id === n.id ? { ...x, seen: true } : x));
    } catch { /* ignore */ }
  };
  const markAllSeen = async () => {
    const unread = notifs.filter((n) => !n.seen);
    if (unread.length === 0) return;
    await Promise.all(unread.map((n) => client.post(`/stock-notifications/${n.id}/seen`).catch(() => null)));
    setNotifs((cur) => cur.map((n) => ({ ...n, seen: true })));
    toast.success('Alle als gelesen markiert.');
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-14 sm:px-10" data-testid="meine-alarme-page">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Persönlicher Bereich</p>
      <h1 className="mt-3 font-display text-[2rem] font-light leading-tight text-bank-text">Meine Alarme</h1>
      <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-bank-text-muted">
        Übersicht aller persönlichen Aktien-Alarme und Benachrichtigungen. Diese Informationen dienen ausschließlich der allgemeinen Information und stellen keine Anlageberatung dar.
      </p>

      {/* Filter */}
      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            data-testid={`filter-${f.key}`}
            className={cn(
              'min-h-[36px] rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
              filter === f.key
                ? 'border-bank-primary bg-bank-primary/10 text-bank-primary-strong'
                : 'border-bank-border text-bank-text-muted hover:text-bank-text',
            )}
          >{f.label}</button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">Wird geladen …</p>
      ) : (
        <>
          {/* Alerts */}
          <section className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Aktive Alarme ({filtered.length})</p>
            {filtered.length === 0 ? (
              <p className="mt-4 text-[13.5px] text-bank-text-muted">
                {alerts.length === 0
                  ? 'Sie haben noch keine Alarme angelegt. Öffnen Sie eine Aktien-Detailseite und klicken Sie auf „Alarm erstellen".'
                  : 'Keine Einträge für diesen Filter.'}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-bank-border/60 border border-bank-border" data-testid="alerts-list">
                {filtered.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3.5 dark:bg-bank-surface" data-testid={`alert-item-${a.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[15px] text-bank-text">
                        <Link to={`/aktien/${encodeURIComponent(a.symbol)}`} className="hover:text-bank-primary-strong">
                          {a.symbol}
                        </Link>
                        <span className="ml-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                          {TYPE_LABEL[a.alert_type] || a.alert_type}
                        </span>
                      </p>
                      <p className="mt-1 text-[12.5px] text-bank-text-muted">
                        {a.threshold != null && `Schwelle · ${a.threshold}`}
                        {a.reminder_days != null && `${a.reminder_days} Tag${a.reminder_days === 1 ? '' : 'e'} vorher`}
                        {' · '}Kanal: {a.channel === 'in_app_email' ? 'In-App + E-Mail' : 'Nur In-App'}
                        {' · '}{a.is_active ? 'Aktiv' : 'Pausiert'}
                        {a.last_triggered_at && ` · zuletzt ${new Date(a.last_triggered_at).toLocaleString('de-DE')}`}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => toggle(a)} aria-label={a.is_active ? 'Pausieren' : 'Aktivieren'}
                        data-testid={`alert-toggle-${a.id}`}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-bank-border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:text-bank-text">
                        {a.is_active ? <Pause className="h-3 w-3" strokeWidth={LUCIDE_STROKE} /> : <Play className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />}
                        {a.is_active ? 'Pause' : 'Start'}
                      </button>
                      <Link to={`/aktien/${encodeURIComponent(a.symbol)}`}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-bank-border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:text-bank-primary-strong">
                        <ExternalLink className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
                        Aktie
                      </Link>
                      <button type="button" onClick={() => del(a)} aria-label="Löschen"
                        data-testid={`alert-delete-${a.id}`}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-red-200 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3 w-3" strokeWidth={LUCIDE_STROKE} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notifications */}
          <section className="mt-14">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-primary-strong">Letzte Benachrichtigungen</p>
              {notifs.some((n) => !n.seen) && (
                <button type="button" onClick={markAllSeen} data-testid="mark-all-seen"
                  className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:text-bank-text">
                  Alle als gelesen markieren
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <p className="mt-4 text-[13.5px] text-bank-text-muted">Keine Benachrichtigungen bisher.</p>
            ) : (
              <ul className="mt-4 divide-y divide-bank-border/60 border border-bank-border" data-testid="notifications-list">
                {notifs.map((n) => (
                  <li key={n.id} className={cn('bg-white px-4 py-3.5 dark:bg-bank-surface', !n.seen && 'bg-bank-primary/5')} data-testid={`notif-${n.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-serif text-[15px] text-bank-text">
                          <Bell className="mr-1.5 inline h-3.5 w-3.5 text-bank-primary" strokeWidth={LUCIDE_STROKE} aria-hidden />
                          {n.title}
                          {!n.seen && <span className="ml-2 rounded-full bg-bank-primary/15 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-bank-primary-strong">Neu</span>}
                        </p>
                        <p className="mt-1 text-[13px] text-bank-text-muted">{n.body}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted">
                          {n.triggered_at && new Date(n.triggered_at).toLocaleString('de-DE')}
                          {n.trigger_value && ` · Ausgelöst bei ${n.trigger_value.toFixed(2)}`}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 gap-1.5">
                        <Link to={`/aktien/${encodeURIComponent(n.symbol)}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-bank-border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:text-bank-primary-strong">
                          Aktie
                        </Link>
                        {!n.seen && (
                          <button type="button" onClick={() => markSeen(n)}
                            className="inline-flex min-h-[36px] items-center rounded-full border border-bank-border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:text-bank-text">
                            Gelesen
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
