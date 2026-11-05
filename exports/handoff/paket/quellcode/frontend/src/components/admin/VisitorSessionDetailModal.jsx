import React, { useCallback, useEffect, useState } from 'react';
// Session 82.101 · Supabase-RPC entfernt · Visitor-Session-Detail liegt bis
// zum FastAPI-Backend als DATA_SOURCE_UNAVAILABLE vor (keine Fake-Visitor-Daten).
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MapPin, Monitor, Smartphone, ExternalLink } from 'lucide-react';

const formatTime = (iso) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const formatDuration = (sec) => {
  const s = Number(sec || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

const EVENT_LABELS = {
  page_view: 'Seitenaufruf',
  click: 'Klick',
  rage_click: 'Rage-Klick',
  dead_click: 'Dead Click',
  scroll_depth: 'Scroll',
  conversion: 'Conversion',
  js_error: 'JS-Fehler',
  form_abandon: 'Formular abgebrochen',
  outbound_click: 'Externer Link',
  heartbeat: 'Heartbeat',
  tab_hidden: 'Tab verlassen',
  tab_visible: 'Tab aktiv',
  session_end: 'Session Ende',
};

const eventDetail = (ev) => {
  const p = ev.event_payload || {};
  switch (ev.event_type) {
    case 'page_view':
      return p.title ? `${p.path || ev.page_path} — ${p.title}` : (ev.page_path || '');
    case 'click':
    case 'rage_click':
    case 'dead_click':
      return `"${p.label || p.tag || 'Element'}"${p.x != null ? ` (${p.x}, ${p.y})` : ''}`;
    case 'scroll_depth':
      return `${p.depth}%`;
    case 'conversion':
      return `Ziel: ${p.goal || 'unknown'}${p.product ? ` · ${p.product}` : ''}`;
    case 'js_error':
      return p.message || 'Fehler';
    case 'form_abandon':
      return `Felder: ${(p.fieldsTouched || []).join(', ')}`;
    case 'outbound_click':
      return p.href || '';
    default:
      return ev.page_path || '';
  }
};

const VisitorSessionDetailModal = ({ sessionId, open, onOpenChange }) => {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('DATA_SOURCE_UNAVAILABLE: Visitor-Session-Detail-Backend nicht verfügbar (Session 82.101).');
    setSession(null);
    setEvents([]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) load();
  }, [open, sessionId, load]);

  const name = session?.user_id
    ? [session.first_name, session.last_name].filter(Boolean).join(' ') || session.email || 'User'
    : 'Anonym';

  const geo = [session?.city, session?.region, session?.country].filter(Boolean).join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">Session-Details</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-bank-text-muted">
            <Loader2 size={24} className="animate-spin mr-2" />
            Laden…
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {!loading && session && (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm border border-bank-border rounded-xl p-4 bg-bank-bg/30 shrink-0">
              <div>
                <p className="text-[10px] uppercase text-bank-text-muted">Besucher</p>
                <p className="font-medium text-bank-text">{name}</p>
                <p className="text-[10px] font-mono text-bank-text-muted">{session.id}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-bank-text-muted">Aktuelle Seite</p>
                <p className="font-medium text-bank-text truncate">{session.current_path || '–'}</p>
                <p className="text-[10px] text-bank-text-muted">
                  {session.page_views} Seiten · Scroll max {session.max_scroll_depth || 0}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-bank-text-muted">Gerät</p>
                <p className="inline-flex items-center gap-1 text-bank-text">
                  {session.device_type === 'mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
                  {session.device_type} · {session.browser} · {session.os}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-bank-text-muted">Standort</p>
                <p className="inline-flex items-center gap-1 text-bank-text">
                  <MapPin size={12} />
                  {geo || 'Unbekannt'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase text-bank-text-muted">Quelle</p>
                <p className="text-xs text-bank-text truncate">
                  {session.referrer || 'Direkt / Bookmark'}
                </p>
                {(session.utm_source || session.utm_campaign) && (
                  <p className="text-[10px] text-bank-text-muted mt-0.5">
                    UTM: {session.utm_source || '—'} / {session.utm_medium || '—'} / {session.utm_campaign || '—'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase text-bank-text-muted">Gestartet</p>
                <p className="text-xs">{formatTime(session.started_at)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-bank-text-muted">Verweildauer</p>
                <p className="text-xs">{formatDuration(session.duration_seconds)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 mt-2">
              <p className="text-xs font-medium text-bank-text-muted mb-2 uppercase tracking-wider">
                Event-Verlauf ({events.length})
              </p>
              <div className="divide-y divide-bank-border border border-bank-border rounded-xl overflow-hidden">
                {events.length === 0 ? (
                  <p className="p-6 text-sm text-center text-bank-text-muted">Keine Events</p>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-bank-bg/30">
                      <span className="shrink-0 text-[10px] font-medium uppercase text-bank-text-muted w-24">
                        {EVENT_LABELS[ev.event_type] || ev.event_type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-bank-text truncate">{eventDetail(ev)}</p>
                        {ev.page_path && (
                          <p className="text-[10px] text-bank-text-muted font-mono truncate">{ev.page_path}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] text-bank-text-muted whitespace-nowrap">
                        {formatTime(ev.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {session.entry_path && session.entry_path !== session.current_path && (
              <p className="text-[10px] text-bank-text-muted shrink-0 flex items-center gap-1">
                <ExternalLink size={10} />
                Einstieg: {session.entry_path}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VisitorSessionDetailModal;
