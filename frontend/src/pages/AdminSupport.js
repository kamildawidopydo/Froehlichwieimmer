import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Inbox,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminSurfaceCard,
} from '@/components/admin/AdminSubpageChrome';
import { cn } from '@/lib/utils';

const STATUS_META = {
  open: {
    label: 'Offen',
    icon: Clock,
    cls: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  pending: {
    label: 'In Bearbeitung',
    icon: Clock,
    cls: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  closed: {
    label: 'Geschlossen',
    icon: CheckCircle2,
    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

const STATUS_FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'open', label: 'Offen' },
  { id: 'pending', label: 'In Bearbeitung' },
  { id: 'closed', label: 'Geschlossen' },
];

const fmtDateTime = (iso) => {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

const userLabel = (p) => {
  if (!p) return 'Unbekannter Kunde';
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return name || p.email || 'Unbekannt';
};

const AdminSupport = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(
          'id, user_id, subject, status, unread_for_admin, unread_for_user, last_message_at, created_at, profiles:user_id(email, first_name, last_name)',
        )
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      toast.error('Tickets konnten nicht geladen werden: ' + (err?.message || err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMessages = useCallback(async (ticketId) => {
    if (!ticketId) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      toast.error('Nachrichten konnten nicht geladen werden: ' + (err?.message || err));
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const markRead = useCallback(async (ticketId) => {
    if (!ticketId) return;
    try {
      await supabase.rpc('mark_support_thread_read', {
        p_ticket_id: ticketId,
        p_role: 'admin',
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, unread_for_admin: 0 } : t)),
      );
    } catch {
      // best effort
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    fetchMessages(activeId);
    markRead(activeId);
  }, [activeId, fetchMessages, markRead]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  // Realtime: tüm support_tickets ve support_messages değişiklikleri admin görür
  useEffect(() => {
    const ch = supabase
      .channel('admin_support_threads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const msg = payload?.new;
          if (!msg) return;
          if (msg.ticket_id === activeId) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
            );
            if (msg.sender_role === 'user') markRead(activeId);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeId, load, markRead]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      const u = t.profiles;
      const hay = [
        t.subject,
        u?.email,
        u?.first_name,
        u?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tickets, statusFilter, search]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'closed').length;
    const today = tickets.filter((t) => {
      if (!t.created_at) return false;
      const d = new Date(t.created_at);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }).length;
    const unread = tickets.reduce(
      (s, t) => s + Number(t.unread_for_admin || 0),
      0,
    );
    return { open, today, unread };
  }, [tickets]);

  const activeTicket = useMemo(
    () => tickets.find((t) => t.id === activeId) || null,
    [tickets, activeId],
  );

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const body = input.trim();
    if (!body || !activeId || !user?.id) return;
    setSending(true);
    try {
      const optimistic = {
        id: `tmp-${Date.now()}`,
        ticket_id: activeId,
        sender_id: user.id,
        sender_role: 'admin',
        body,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput('');
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: activeId,
        sender_id: user.id,
        sender_role: 'admin',
        body,
      });
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        throw error;
      }
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } catch (err) {
      toast.error('Senden fehlgeschlagen: ' + (err?.message || err));
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!activeId) return;
    setStatusUpdating(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', activeId);
      if (error) throw error;
      toast.success(
        newStatus === 'closed'
          ? 'Ticket geschlossen.'
          : newStatus === 'pending'
            ? 'Ticket auf "In Bearbeitung" gesetzt.'
            : 'Ticket erneut geöffnet.',
      );
      setTickets((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, status: newStatus } : t)),
      );
    } catch (err) {
      toast.error('Statusänderung fehlgeschlagen: ' + (err?.message || err));
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <AdminSubpageLayout>
      <AdminSubpageHeader
        eyebrow="Admin"
        title="Support-Postfach"
        titleIcon={MessageCircle}
        description="Eingehende Kunden-Nachrichten in Echtzeit. Status verwalten, Antworten senden, Tickets schließen."
        actions={
          <Button
            variant="outline"
            onClick={load}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Aktualisieren
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <AdminSurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-bank-text-muted">Offene Tickets</p>
          <p className="text-2xl font-bold text-bank-text mt-1">{stats.open}</p>
        </AdminSurfaceCard>
        <AdminSurfaceCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-bank-text-muted">Heute eröffnet</p>
          <p className="text-2xl font-bold text-bank-text mt-1">{stats.today}</p>
        </AdminSurfaceCard>
        <AdminSurfaceCard className="p-4 col-span-2 sm:col-span-1">
          <p className="text-xs uppercase tracking-wider text-bank-text-muted">Ungelesen (Admin)</p>
          <p
            className={cn(
              'text-2xl font-bold mt-1',
              stats.unread > 0 ? 'text-bank-error' : 'text-bank-text-muted',
            )}
          >
            {stats.unread}
          </p>
        </AdminSurfaceCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <AdminSurfaceCard className="overflow-hidden flex flex-col">
          <div className="p-3 border-b border-bank-border/60 space-y-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-bank-text-muted pointer-events-none"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suche Kunde / Betreff…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors',
                    statusFilter === f.id
                      ? 'bg-bank-ink text-white border-bank-ink'
                      : 'bg-white text-bank-text-muted border-bank-border/60 hover:bg-bank-bg',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[65vh]">
            {loading ? (
              <div className="p-6 text-center text-sm text-bank-text-muted">
                <Loader2 size={16} className="animate-spin inline mr-2" /> Lade Tickets…
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-6 text-center text-sm text-bank-text-muted flex flex-col items-center gap-2">
                <Inbox size={28} className="text-bank-text-muted/60" />
                Keine Tickets in dieser Ansicht.
              </div>
            ) : (
              <ul className="divide-y divide-bank-border/60">
                {filteredTickets.map((t) => {
                  const meta = STATUS_META[t.status] || STATUS_META.open;
                  const Icon = meta.icon;
                  const isActive = t.id === activeId;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(t.id)}
                        className={cn(
                          'w-full text-left px-3.5 py-3 hover:bg-bank-primary/[0.04] transition-colors',
                          isActive && 'bg-bank-primary/[0.06]',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-bank-text truncate">
                              {t.subject}
                            </p>
                            <p className="text-[11px] text-bank-text-muted truncate flex items-center gap-1 mt-0.5">
                              <UserIcon size={10} /> {userLabel(t.profiles)}
                            </p>
                          </div>
                          {t.unread_for_admin > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-bank-accent text-bank-primary text-[10px] font-bold shrink-0">
                              {t.unread_for_admin}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
                              meta.cls,
                            )}
                          >
                            <Icon size={10} /> {meta.label}
                          </span>
                          <span className="text-[10px] text-bank-text-muted shrink-0">
                            {fmtDateTime(t.last_message_at || t.created_at)}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminSurfaceCard>

        <AdminSurfaceCard className="flex flex-col min-h-[65vh]">
          {!activeTicket ? (
            <div className="flex-1 flex items-center justify-center text-sm text-bank-text-muted p-6 text-center">
              Wähle links ein Ticket aus, um die Konversation zu öffnen.
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-bank-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-bank-text truncate">
                    {activeTicket.subject}
                  </p>
                  <p className="text-[11px] text-bank-text-muted truncate">
                    {userLabel(activeTicket.profiles)}
                    {activeTicket.profiles?.email
                      ? ` · ${activeTicket.profiles.email}`
                      : ''}
                    {' · eröffnet am '}
                    {fmtDateTime(activeTicket.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const meta = STATUS_META[activeTicket.status] || STATUS_META.open;
                    const Icon = meta.icon;
                    return (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium',
                          meta.cls,
                        )}
                      >
                        <Icon size={12} /> {meta.label}
                      </span>
                    );
                  })()}
                  {activeTicket.status !== 'closed' ? (
                    <>
                      {activeTicket.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={statusUpdating}
                          onClick={() => handleStatusChange('pending')}
                          className="gap-1"
                        >
                          <Clock size={13} /> Übernehmen
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusUpdating}
                        onClick={() => handleStatusChange('closed')}
                        className="gap-1"
                      >
                        <Lock size={13} /> Schließen
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange('open')}
                      className="gap-1"
                    >
                      <Unlock size={13} /> Erneut öffnen
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-bank-bg/40">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-bank-text-muted text-sm">
                    <Loader2 size={16} className="animate-spin mr-2" /> Lade Nachrichten…
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-bank-text-muted py-8">
                    Noch keine Nachrichten in diesem Ticket.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_role === 'admin';
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          'flex flex-col max-w-[80%]',
                          isMe ? 'items-end ml-auto' : 'items-start mr-auto',
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words shadow-sm border',
                            isMe
                              ? 'bg-bank-ink text-white border-bank-ink'
                              : 'bg-white text-bank-text border-bank-border/60',
                            m._optimistic && 'opacity-60',
                          )}
                        >
                          {m.body}
                        </div>
                        <span className="text-[10px] text-bank-text-muted mt-1 px-1">
                          {isMe ? 'Support (Sie)' : 'Kunde'} · {fmtTime(m.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-bank-border/60 p-3 flex items-end gap-2 bg-white"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Antwort an den Kunden… (Enter = senden, Shift+Enter = Zeilenumbruch)"
                  disabled={sending}
                  className="flex-1 resize-none rounded-xl border border-bank-border/60 px-3 py-2 text-sm bg-bank-bg/40 focus:outline-none focus:ring-2 focus:ring-bank-primary/30 max-h-40"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="bg-bank-ink text-white hover:bg-bank-ink-elev gap-2 shrink-0"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Senden
                </Button>
              </form>
            </>
          )}
        </AdminSurfaceCard>
      </div>
    </AdminSubpageLayout>
  );
};

export default AdminSupport;
