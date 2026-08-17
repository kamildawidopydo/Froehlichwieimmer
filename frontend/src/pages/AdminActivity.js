import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
} from '@/components/admin/AdminSubpageChrome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Search,
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  AlertTriangle,
  Heart,
  HeartOff,
  Scale,
  FileText,
  Mail,
  KeyRound,
  UserCog,
  Radio,
  Star,
} from 'lucide-react';

const PAGE_SIZE = 200;

const EVENT_META = {
  login: { label: 'Anmeldung', icon: LogIn, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  logout: { label: 'Abmeldung', icon: LogOut, color: 'text-slate-500', bg: 'bg-slate-100' },
  login_failed: { label: 'Fehlgeschlagene Anmeldung', icon: AlertTriangle, color: 'text-bank-error', bg: 'bg-bank-error/10' },
  register: { label: 'Registrierung', icon: UserPlus, color: 'text-bank-primary', bg: 'bg-bank-primary/10' },
  password_reset_request: { label: 'Passwort-Reset angefragt', icon: KeyRound, color: 'text-amber-600', bg: 'bg-amber-100' },
  password_reset_complete: { label: 'Passwort geändert', icon: KeyRound, color: 'text-amber-700', bg: 'bg-amber-100' },
  favorite_add: { label: 'Favorit hinzugefügt', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100' },
  favorite_remove: { label: 'Favorit entfernt', icon: HeartOff, color: 'text-slate-500', bg: 'bg-slate-100' },
  comparison_run: { label: 'Vergleich durchgeführt', icon: Scale, color: 'text-bank-secondary', bg: 'bg-bank-accent/15' },
  application_submit: { label: 'Antrag eingereicht', icon: FileText, color: 'text-violet-600', bg: 'bg-violet-100' },
  offer_interest_submit: { label: 'Angebotsanfrage', icon: Mail, color: 'text-pink-600', bg: 'bg-pink-100' },
  product_inquiry_submit: { label: 'Produkt-Anfrage (Startseite)', icon: Mail, color: 'text-amber-700', bg: 'bg-amber-100' },
  profile_update: { label: 'Profil aktualisiert', icon: UserCog, color: 'text-bank-accent', bg: 'bg-bank-accent/15' },
  contract_view: { label: 'Vertrag angesehen', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100' },
  page_view: { label: 'Seitenaufruf', icon: Activity, color: 'text-slate-500', bg: 'bg-slate-100' },
  offer_review_submit: { label: 'Bewertung eingereicht', icon: Star, color: 'text-amber-600', bg: 'bg-amber-100' },
  offer_review_guest_submit: { label: 'Gast-Bewertung eingereicht', icon: Star, color: 'text-amber-600', bg: 'bg-amber-100' },
  offer_review_approve: { label: 'Bewertung freigegeben', icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  offer_review_reject: { label: 'Bewertung abgelehnt', icon: Star, color: 'text-bank-error', bg: 'bg-bank-error/10' },
  offer_review_delete: { label: 'Bewertung entfernt', icon: Star, color: 'text-slate-500', bg: 'bg-slate-100' },
};

const getMeta = (type) => EVENT_META[type] || { label: type, icon: Activity, color: 'text-slate-500', bg: 'bg-slate-100' };

const formatDateTime = (iso) => {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const formatRelative = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `vor ${Math.floor(diff)} s`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} h`;
  return `vor ${Math.floor(diff / 86400)} d`;
};

const AdminActivity = () => {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterUserId, setFilterUserId] = useState('all');
  const [filterEventType, setFilterEventType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const channelRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!liveEnabled) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel('admin-activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_activity_log' },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev].slice(0, PAGE_SIZE));
          setNewCount((n) => n + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [liveEnabled]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .order('first_name', { ascending: true });
    setUsers(data || []);
  };

  const fetchEvents = async () => {
    setLoading(true);
    setNewCount(0);
    const { data, error } = await supabase
      .from('user_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    if (!error) setEvents(data || []);
    setLoading(false);
  };

  const userMap = useMemo(() => {
    const m = {};
    users.forEach((u) => {
      m[u.id] = u;
    });
    return m;
  }, [users]);

  const userLabel = (u) => {
    if (!u) return '–';
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name ? `${name} (${u.email || '–'})` : u.email || u.id;
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return events.filter((e) => {
      if (filterUserId !== 'all' && e.user_id !== filterUserId) return false;
      if (filterEventType !== 'all' && e.event_type !== filterEventType) return false;
      if (term) {
        const u = userMap[e.user_id];
        const hay = [
          e.event_type,
          u?.first_name,
          u?.last_name,
          u?.email,
          e.event_payload ? JSON.stringify(e.event_payload) : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [events, filterUserId, filterEventType, searchTerm, userMap]);

  const eventTypeOptions = useMemo(() => {
    const set = new Set(events.map((e) => e.event_type));
    Object.keys(EVENT_META).forEach((k) => set.add(k));
    return Array.from(set).sort();
  }, [events]);

  return (
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Monitoring"
          title="Benutzeraktivitäten"
          titleIcon={Activity}
          description={`Live-Feed aller Ereignisse · letzte ${PAGE_SIZE} Einträge.`}
          actions={
            <>
              <button
                type="button"
                onClick={() => setLiveEnabled((v) => !v)}
                aria-pressed={liveEnabled}
                className={`inline-flex h-10 items-center gap-2 border px-3 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35 ${
                  liveEnabled
                    ? 'border-emerald-300/55 bg-emerald-50 text-emerald-700'
                    : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-gold/55 hover:text-bank-text'
                }`}
                title="Live-Updates an/aus"
              >
                <Radio size={12} strokeWidth={1.5} className={liveEnabled ? 'animate-pulse' : ''} />
                {liveEnabled ? 'Live' : 'Pausiert'}
              </button>
              <Button variant="outline-ink" onClick={fetchEvents}>
                <RefreshCw size={13} strokeWidth={1.5} /> Neu laden
              </Button>
            </>
          }
        />

        {newCount > 0 && (
          <div className="relative mb-4 flex items-center justify-between border border-emerald-300/55 bg-emerald-50 px-4 py-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-emerald-700">
              {newCount} neue{newCount === 1 ? 's' : ''} Ereignis{newCount === 1 ? '' : 'se'} empfangen
            </span>
            <button
              onClick={() => setNewCount(0)}
              className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
            >
              Schliessen
            </button>
          </div>
        )}

        <AdminToolbarCard>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suche: Name, E-Mail, Payload…"
              className="pl-9"
              aria-label="Aktivitäten suchen"
            />
          </div>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="h-10 border border-bank-border bg-white px-3 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
            aria-label="Benutzer filtern"
          >
            <option value="all">Alle Benutzer</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </select>
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="h-10 border border-bank-border bg-white px-3 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
            aria-label="Ereignistyp filtern"
          >
            <option value="all">Alle Ereignistypen</option>
            {eventTypeOptions.map((t) => (
              <option key={t} value={t}>
                {getMeta(t).label} ({t})
              </option>
            ))}
          </select>
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
              <Activity size={28} strokeWidth={1.4} className="mx-auto mb-3 text-bank-gold/55" />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bank-text-muted">
                Keine Ereignisse gefunden
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-bank-border">
              {filtered.map((e) => {
                const meta = getMeta(e.event_type);
                const Icon = meta.icon;
                const u = userMap[e.user_id];
                const payloadStr = e.event_payload
                  ? JSON.stringify(e.event_payload)
                  : null;

                return (
                  <li
                    key={e.id}
                    className="px-5 py-3 transition-colors hover:bg-bank-bg/45"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-bank-border bg-bank-bg/60">
                        <Icon size={15} strokeWidth={1.5} className={meta.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold/55" />
                          <span className="truncate text-[13px] text-bank-text">
                            {u
                              ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.id
                              : e.user_id
                                ? 'Unbekannter Benutzer'
                                : 'Anonym'}
                          </span>
                          {u?.email && (
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                              {u.email}
                            </span>
                          )}
                        </div>
                        {payloadStr && payloadStr !== '{}' && (
                          <pre className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap break-all border border-bank-border bg-bank-bg/45 px-2 py-1 font-mono text-[11px] text-bank-text-muted">
                            {payloadStr}
                          </pre>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text">
                          {formatRelative(e.created_at)}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] tabular-nums text-bank-text-muted/85">
                          {formatDateTime(e.created_at)}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
};

export default AdminActivity;
