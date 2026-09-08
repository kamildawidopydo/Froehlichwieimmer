import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Inbox,
  Mail,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supportApi } from '@/services/supportApi';
import { useAuth } from '@/context/AuthContext';
import { PageContainer, PageHeader, SurfaceCard } from '@/components/dashboard/PageHeader';
import SupportContactBar from '@/components/dashboard/support/SupportContactBar';
import { CardListSkeleton } from '@/components/Skeleton';
import { cn } from '@/lib/utils';
import useAutoAnimateRef from '@/hooks/useAutoAnimateRef';

const STATUS_META = {
  open: {
    label: 'Offen',
    icon: Clock,
    cls: 'border-amber-300/55 bg-amber-50 text-amber-700',
  },
  pending: {
    label: 'In Bearbeitung',
    icon: Clock,
    cls: 'border-bank-accent/35 bg-bank-accent/5 text-bank-accent',
  },
  closed: {
    label: 'Geschlossen',
    icon: CheckCircle2,
    cls: 'border-emerald-300/55 bg-emerald-50 text-emerald-700',
  },
};

const fmtDateTime = (iso) => {
  if (!iso) return '';
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

const SupportPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const messagesEndRef = useRef(null);
  const ticketsListRef = useAutoAnimateRef(!loadingTickets && tickets.length > 0);
  const messagesListRef = useAutoAnimateRef(!loadingMessages && messages.length > 0);

  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    setLoadingTickets(true);
    try {
      // Session 82.70 — Mongo-native GET /api/support/tickets.
      const data = await supportApi.listTickets();
      setTickets(data || []);
      if (!activeId && (data || []).length > 0) {
        setActiveId(data[0].id);
      }
    } catch (err) {
      toast.error('Tickets konnten nicht geladen werden.');
    } finally {
      setLoadingTickets(false);
    }
  }, [user?.id, activeId]);

  const fetchMessages = useCallback(async (ticketId) => {
    if (!ticketId) return;
    setLoadingMessages(true);
    try {
      const data = await supportApi.listMessages(ticketId);
      setMessages(data || []);
    } catch (err) {
      toast.error('Nachrichten konnten nicht geladen werden.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const markRead = useCallback(async (ticketId) => {
    if (!ticketId) return;
    try {
      await supportApi.markRead(ticketId);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, unread_for_user: 0 } : t)),
      );
    } catch {
      /* Best effort — Zähler synchronisiert sich beim nächsten Abruf */
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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

  // Session 82.70 — Realtime durch sichtbarkeitsgesteuerten 45-s-Poll ersetzt.
  useEffect(() => {
    if (!user?.id) return undefined;
    const POLL_MS = 45000;
    let cancelled = false;
    const tick = () => {
      if (cancelled || typeof document !== 'undefined' && document.hidden) return;
      fetchTickets();
      if (activeId) fetchMessages(activeId);
    };
    const iv = setInterval(tick, POLL_MS);
    const onFocus = () => tick();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      clearInterval(iv);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user?.id, activeId, fetchTickets, fetchMessages]);

  const activeTicket = useMemo(
    () => tickets.find((t) => t.id === activeId) || null,
    [tickets, activeId],
  );

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const body = input.trim();
    if (!body || !activeId || !user?.id) return;
    if (activeTicket?.status === 'closed') {
      toast.info(
        t('dashboardShell.support.closedHint', {
          defaultValue: 'Dieses Ticket ist geschlossen. Bitte starten Sie eine neue Nachricht.',
        }),
      );
      return;
    }
    setSending(true);
    try {
      const optimistic = {
        id: `tmp-${Date.now()}`,
        ticket_id: activeId,
        sender_id: user.id,
        sender_role: 'user',
        body,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setInput('');
      let real;
      try {
        real = await supportApi.createMessage(activeId, body);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(body);
        throw err;
      }
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id).concat(real ? [real] : []),
      );
    } catch (err) {
      toast.error('Senden fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t('shell.user.support', { defaultValue: 'Support' })}
        title={t('dashboardShell.support.pageTitle', { defaultValue: 'Hilfe & Kontakt' })}
        icon={MessageCircle}
        description={t('dashboardShell.support.pageDescription', {
          defaultValue: 'Schreiben Sie mit unserem Kundenservice — Antworten erscheinen hier in Echtzeit.',
        })}
      />

      <SupportContactBar />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <SurfaceCard accent padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-bank-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Inbox size={14} strokeWidth={1.5} className="text-bank-gold" />
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                Meine Anfragen
              </p>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-bank-text-muted">{tickets.length}</span>
          </div>
          {loadingTickets ? (
            <div className="p-4">
              <CardListSkeleton count={3} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-[13px] text-bank-text-muted">
                {t('dashboardShell.support.noTickets', { defaultValue: 'Noch keine Konversationen' })}
              </p>
              <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowNew(true)}>
                <Mail size={14} strokeWidth={1.5} />
                {t('dashboardShell.support.firstMessage', { defaultValue: 'Erstes Anliegen melden' })}
              </Button>
            </div>
          ) : (
            <ul ref={ticketsListRef} className="max-h-[60vh] divide-y divide-bank-border overflow-y-auto">
              {tickets.map((t) => {
                const meta = STATUS_META[t.status] || STATUS_META.open;
                const Icon = meta.icon;
                const isActive = t.id === activeId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={cn(
                        'relative w-full px-4 py-3 text-left transition-colors hover:bg-bank-bg/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/35',
                        isActive && 'bg-bank-bg/60',
                      )}
                    >
                      {isActive && (
                        <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] bg-bank-gold" />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[13px] font-medium text-bank-text">
                          {t.subject}
                        </p>
                        {t.unread_for_user > 0 && (
                          <span className="inline-flex h-5 shrink-0 items-center justify-center border border-bank-gold/55 bg-bank-gold/10 px-1.5 font-mono text-[10px] tabular-nums text-bank-gold">
                            {t.unread_for_user}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em]',
                            meta.cls,
                          )}
                        >
                          <Icon size={10} strokeWidth={1.5} /> {meta.label}
                        </span>
                        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                          {fmtDateTime(t.last_message_at || t.created_at)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard accent padded={false} className="flex min-h-[60vh] flex-col">
          {!activeTicket ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-bank-primary/20 bg-bank-primary/10 text-bank-primary">
                <MessageCircle size={28} strokeWidth={1.25} />
              </div>
              <div>
                <p className="text-[16px] font-semibold text-bank-text">
                  {t('dashboardShell.support.emptyTitle', { defaultValue: 'Wie können wir helfen?' })}
                </p>
                <p className="mx-auto mt-2 max-w-sm text-[13px] leading-snug text-bank-text-muted">
                  {t('dashboardShell.support.emptyBody', {
                    defaultValue:
                      'Wählen Sie links eine Konversation oder schreiben Sie uns direkt — telefonisch und per E-Mail erreichen Sie uns oben.',
                  })}
                </p>
              </div>
              <Button variant="primary" onClick={() => setShowNew(true)}>
                <Mail size={15} strokeWidth={1.5} />
                {t('dashboardShell.support.writeMessage', { defaultValue: 'Nachricht schreiben' })}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-bank-border px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-bank-text">
                    {activeTicket.subject}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                    Eröffnet · {fmtDateTime(activeTicket.created_at)}
                  </p>
                </div>
                {(() => {
                  const meta = STATUS_META[activeTicket.status] || STATUS_META.open;
                  const Icon = meta.icon;
                  return (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]',
                        meta.cls,
                      )}
                    >
                      <Icon size={11} strokeWidth={1.5} /> {meta.label}
                    </span>
                  );
                })()}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-bank-bg/35 px-4 py-5">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-8 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                    <Loader2 size={14} className="mr-2 animate-spin" /> Lade Nachrichten…
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-bank-text-muted">
                    Noch keine Nachrichten
                  </p>
                ) : (
                  <div ref={messagesListRef} className="space-y-3">
                  {messages.map((m) => {
                    const isMe = m.sender_role === 'user';
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          'flex max-w-[80%] flex-col',
                          isMe ? 'ml-auto items-end' : 'mr-auto items-start',
                        )}
                      >
                        <div
                          className={cn(
                            'whitespace-pre-wrap break-words border px-3.5 py-2 text-[13.5px] leading-snug',
                            isMe
                              ? 'border-bank-primary/35 bg-gradient-to-br from-bank-primary to-bank-ink text-white shadow-sm'
                              : 'border-bank-border bg-white text-bank-text',
                            m._optimistic && 'opacity-60',
                          )}
                        >
                          {m.body}
                        </div>
                        <span className="mt-1 px-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-bank-text-muted">
                          {isMe ? 'Sie' : 'Support'} · {fmtTime(m.created_at)}
                        </span>
                      </div>
                    );
                  })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 border-t border-bank-border bg-white p-3"
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
                  placeholder={
                    activeTicket.status === 'closed'
                      ? t('dashboardShell.support.closedPlaceholder', {
                          defaultValue: 'Ticket geschlossen — bitte neue Nachricht starten.',
                        })
                      : t('dashboardShell.support.messagePlaceholder', {
                          defaultValue: 'Nachricht schreiben… (Enter = senden)',
                        })
                  }
                  disabled={activeTicket.status === 'closed' || sending}
                  className="max-h-40 flex-1 resize-none border border-bank-border bg-bank-bg/35 px-3 py-2 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
                />
                <Button
                  variant="primary"
                  size="default"
                  type="submit"
                  disabled={
                    !input.trim() || sending || activeTicket.status === 'closed'
                  }
                  className="shrink-0"
                >
                  {sending ? (
                    <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <Send size={14} strokeWidth={1.5} />
                  )}
                  Senden
                </Button>
              </form>
            </>
          )}
        </SurfaceCard>
      </div>

      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onCreated={(newId) => {
            setShowNew(false);
            fetchTickets();
            setActiveId(newId);
          }}
          userId={user?.id}
        />
      )}
    </PageContainer>
  );
};

const NewTicketModal = ({ onClose, onCreated, userId }) => {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (!subject.trim() || !message.trim() || !userId) return;
    setSubmitting(true);
    try {
      const ticket = await supportApi.createTicket({
        subject: subject.trim(),
        body: message.trim(),
      });
      toast.success(
        t('dashboardShell.support.created', { defaultValue: 'Nachricht gesendet — wir melden uns in Kürze.' }),
      );
      onCreated(ticket.id);
    } catch (err) {
      toast.error('Erstellen fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-ticket-title"
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(8,30,56,0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <form
        onSubmit={handleCreate}
        className="relative w-full max-w-lg border border-bank-border bg-white shadow-editorial-lg"
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/65 via-bank-gold/35 to-transparent" />
        <div className="p-6">
          <p className="inline-flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-bank-gold" />
            {t('dashboardShell.support.modalEyebrow', { defaultValue: 'Kundenservice' })}
          </p>
          <h2
            id="new-ticket-title"
            className="dashboard-page-title mt-2 text-[1.4rem] font-semibold leading-tight text-bank-text"
          >
            {t('dashboardShell.support.modalTitle', { defaultValue: 'Nachricht schreiben' })}
          </h2>
          <span aria-hidden className="my-3 block h-px w-12 bg-bank-gold/55" />
          <p className="text-[13px] leading-snug text-bank-text-muted">
            {t('dashboardShell.support.modalHint', {
              defaultValue: 'Beschreiben Sie Ihr Anliegen — wir antworten meist innerhalb eines Werktags.',
            })}
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                Betreff
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="z. B. Frage zu meiner Festgeld-Anlage"
                maxLength={120}
                autoFocus
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-bank-text-muted">
                Nachricht
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
                className="mt-1.5 w-full resize-y border border-bank-border bg-bank-bg/35 px-3 py-2 text-sm focus:border-bank-gold/55 focus:outline-none focus:ring-2 focus:ring-bank-accent/35"
                placeholder="Dein Anliegen…"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline-ink" onClick={onClose} disabled={submitting}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
            >
              {submitting ? (
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <Send size={14} strokeWidth={1.5} />
              )}
              {t('dashboardShell.support.send', { defaultValue: 'Senden' })}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SupportPage;
