import { getApiBase } from '@/lib/apiBase';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Inbox, RefreshCw, Search, X, Mail, Phone, MapPin, MessageSquare, CheckCircle2,
  Clock, Archive, Send, MailCheck, MailQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageMeta from '@/components/PageMeta';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';

const API = axios.create({
  baseURL: `${getApiBase()}/api`,
  withCredentials: true,
});

const STATUS_META = {
  new:         { label: 'Neu',            cls: 'bg-amber-50 text-amber-800 border-amber-200',    icon: Inbox },
  in_progress: { label: 'In Bearbeitung', cls: 'bg-blue-50 text-blue-800 border-blue-200',        icon: Clock },
  completed:   { label: 'Abgeschlossen',  cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  archived:    { label: 'Archiviert',     cls: 'bg-neutral-100 text-neutral-700 border-neutral-200', icon: Archive },
};

const STATUS_ORDER = ['new', 'in_progress', 'completed', 'archived'];

const STATUS_TIMELINE_LABEL = {
  new: 'Als „neu" markiert',
  in_progress: 'In Bearbeitung übernommen',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
};

const REPLY_MESSAGE_LIMIT = 3000;
const REPLY_SUBJECT_LIMIT = 200;
const DEFAULT_REPLY_SUBJECT = 'Ihre Anfrage bei Fröhlich Vermögensberatung';

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.new;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.cls}`}>
      <Icon className="h-3 w-3" strokeWidth={1.8} />
      {meta.label}
    </span>
  );
};

const formatDateDE = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const StatCard = ({ label, value, testId }) => (
  <div className="rounded-2xl border border-bank-border bg-white px-5 py-4" data-testid={testId}>
    <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">{label}</p>
    <p className="mt-1.5 font-serif text-2xl text-bank-text">{value}</p>
  </div>
);

// --- Timeline ---------------------------------------------------------------

const buildTimelineEvents = (handoff) => {
  const events = [];
  if (handoff.created_at) {
    events.push({
      kind: 'created',
      timestamp: handoff.created_at,
      label: 'Anfrage eingegangen',
      by: null,
    });
  }
  (handoff.status_history || []).forEach((ev) => {
    events.push({
      kind: 'status',
      timestamp: ev.changed_at,
      label: STATUS_TIMELINE_LABEL[ev.status] || ev.status,
      by: ev.changed_by,
      status: ev.status,
    });
  });
  (handoff.reply_history || []).forEach((ev) => {
    events.push({
      kind: 'reply',
      timestamp: ev.timestamp,
      label: 'Antwort an Kunden gesendet',
      by: ev.admin,
      subject: ev.subject,
    });
  });
  // Filtern + sortieren
  return events
    .filter((e) => e.timestamp)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const Timeline = ({ handoff }) => {
  const events = useMemo(() => buildTimelineEvents(handoff), [handoff]);
  if (events.length === 0) return null;
  const lastIdx = events.length - 1;
  return (
    <section data-testid="handoff-timeline">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">Verlauf</p>
      <ol className="mt-3 space-y-0">
        {events.map((ev, i) => {
          const isLast = i === lastIdx;
          const dotColor = isLast ? 'bg-bank-petrol-strong' : 'bg-neutral-300';
          const lineColor = 'bg-bank-border';
          return (
            <li key={`${ev.kind}-${i}`} className="relative flex gap-3 pb-4 last:pb-0" data-testid={`timeline-event-${ev.kind}`}>
              <div className="relative flex flex-col items-center">
                <span className={`mt-1 h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
                {!isLast && <span className={`mt-1 w-px flex-1 ${lineColor}`} aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-bank-text-muted">
                  {formatDateDE(ev.timestamp)}
                </p>
                <p className="mt-0.5 text-[13.5px] font-medium text-bank-text">{ev.label}</p>
                {ev.by && (
                  <p className="mt-0.5 text-[11.5px] text-bank-text-muted">von {ev.by}</p>
                )}
                {ev.subject && (
                  <p className="mt-0.5 text-[11.5px] italic text-bank-text-muted">Betreff: „{ev.subject}"</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

// --- Reply-Formular ---------------------------------------------------------

const ReplyForm = ({ handoff, onSuccess }) => {
  const [subject, setSubject] = useState(DEFAULT_REPLY_SUBJECT);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // {kind, text}

  const canSend = subject.trim().length > 0 && message.trim().length >= 4 && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setFeedback(null);
    try {
      const { data } = await API.post(`/admin/assistant-handoffs/${handoff.id}/reply`, {
        subject: subject.trim(),
        message: message.trim(),
      });
      setFeedback({ kind: 'success', text: 'Antwort wurde gesendet.' });
      setMessage('');
      onSuccess(data.handoff);
    } catch (e) {
      // Defensive Error-Copy: Edge-Proxies (Cloudflare o.ä.) können bei 5xx
      // eigene HTML-Fehlerseiten zurückliefern. Wir zeigen NUR unsere eigenen,
      // kurzen JSON-Details an — sonst neutralen deutschen Fallback.
      const detail = e?.response?.data?.detail;
      const isCleanText =
        typeof detail === 'string' &&
        detail.length > 0 &&
        detail.length <= 240 &&
        !/<[a-z][^>]*>/i.test(detail) &&
        !/cloudflare|bad gateway|error 1[0-9]{3}/i.test(detail);
      setFeedback({ kind: 'error', text: isCleanText ? detail : 'Versand fehlgeschlagen. Bitte in einer Minute erneut versuchen.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-bank-border p-4" data-testid="reply-form">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">Kunden antworten</p>
        <span className="rounded-full border border-bank-border px-2.5 py-0.5 font-mono text-[10px] text-bank-text-muted" data-testid="reply-recipient">
          an {handoff.email}
        </span>
      </div>

      <div>
        <label htmlFor="reply-subject" className="text-[11.5px] font-medium text-bank-text">Betreff</label>
        <Input
          id="reply-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value.slice(0, REPLY_SUBJECT_LIMIT))}
          maxLength={REPLY_SUBJECT_LIMIT}
          className="mt-1.5"
          data-testid="reply-subject-input"
        />
        <p className="mt-1 text-[10.5px] text-bank-text-muted">{subject.length}/{REPLY_SUBJECT_LIMIT}</p>
      </div>

      <div>
        <label htmlFor="reply-message" className="text-[11.5px] font-medium text-bank-text">Nachricht</label>
        <textarea
          id="reply-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, REPLY_MESSAGE_LIMIT))}
          rows={6}
          maxLength={REPLY_MESSAGE_LIMIT}
          placeholder="Kurze, persönliche Antwort. Keine sensiblen Daten hier einfügen."
          className="mt-1.5 w-full rounded-md border border-bank-border p-3 text-sm"
          data-testid="reply-message-textarea"
        />
        <p className="mt-1 text-[10.5px] text-bank-text-muted">{message.length}/{REPLY_MESSAGE_LIMIT} · mindestens 4 Zeichen</p>
      </div>

      {feedback && (
        <p
          className={`rounded-md px-2.5 py-1.5 text-[12px] ${
            feedback.kind === 'success'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-rose-50 text-rose-800'
          }`}
          data-testid={`reply-feedback-${feedback.kind}`}
        >
          {feedback.text}
        </p>
      )}

      <Button
        onClick={send}
        disabled={!canSend}
        className="w-full rounded-xl bg-bank-petrol-strong text-white hover:bg-bank-petrol-strong/90"
        data-testid="reply-send-btn"
      >
        <Send size={14} className="mr-2" />
        {sending ? 'Wird gesendet…' : 'Antwort senden'}
      </Button>
    </section>
  );
};

// --- Detail Drawer ---------------------------------------------------------

const DetailDrawer = ({ handoff, onClose, onUpdate }) => {
  const [status, setStatus] = useState(handoff.status || 'new');
  const [notes, setNotes] = useState(handoff.admin_notes || '');
  const [assigned, setAssigned] = useState(handoff.assigned_to || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Synchronisieren, wenn Handoff extern aktualisiert wird (z.B. nach Reply → in_progress).
    setStatus(handoff.status || 'new');
    setNotes(handoff.admin_notes || '');
    setAssigned(handoff.assigned_to || '');
  }, [handoff.id, handoff.status, handoff.admin_notes, handoff.assigned_to]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await API.patch(`/admin/assistant-handoffs/${handoff.id}`, {
        status, admin_notes: notes, assigned_to: assigned,
      });
      toast.success('Aktualisiert.');
      onUpdate(data);
    } catch (e) {
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 p-0 sm:p-4" data-testid="handoff-detail-drawer">
      <div className="w-full max-w-xl overflow-y-auto rounded-none bg-white shadow-2xl sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-bank-border bg-white px-6 py-4">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-petrol-strong">Assistent · Lead</p>
            <h2 className="mt-1 font-serif text-xl text-bank-text">{handoff.name}</h2>
            <p className="mt-1 text-[11.5px] text-bank-text-muted">Eingegangen {formatDateDE(handoff.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Schließen" className="rounded-full p-1.5 text-bank-text-muted hover:bg-neutral-100" data-testid="handoff-detail-close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-6 px-6 py-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={handoff.status} />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-bank-text-muted" data-testid="handoff-reply-count">
              {handoff.reply_count > 0
                ? `${handoff.reply_count} Antwort${handoff.reply_count > 1 ? 'en' : ''}`
                : 'Noch unbeantwortet'}
            </span>
          </div>

          <section className="space-y-2 rounded-xl border border-bank-border bg-neutral-50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">Kontakt</p>
            <div className="grid gap-1 text-[13.5px] text-bank-text">
              <a href={`mailto:${handoff.email}`} className="inline-flex items-center gap-2 hover:text-bank-petrol-strong">
                <Mail className="h-3.5 w-3.5" /> {handoff.email}
              </a>
              {handoff.phone && (
                <a href={`tel:${handoff.phone}`} className="inline-flex items-center gap-2 hover:text-bank-petrol-strong">
                  <Phone className="h-3.5 w-3.5" /> {handoff.phone}
                </a>
              )}
              {handoff.current_route && (
                <span className="inline-flex items-center gap-2 text-bank-text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Herkunftsseite: <span className="text-bank-text">{handoff.current_route}</span></span>
                </span>
              )}
            </div>
          </section>

          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">Anliegen</p>
            <p className="mt-2 whitespace-pre-line rounded-xl border-l-2 border-bank-petrol-strong bg-neutral-50 p-4 font-serif text-[15px] leading-relaxed text-bank-text" data-testid="handoff-detail-concern">
              {handoff.concern}
            </p>
          </section>

          <section>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">Kontext (datensparsam)</p>
            <p className="mt-2 text-[13px] text-bank-text-muted">{handoff.context_summary || '—'}</p>
            {handoff.recent_topics && handoff.recent_topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {handoff.recent_topics.map((t) => (
                  <span key={t} className="rounded-full border border-bank-border bg-white px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bank-text-muted">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>

          <Timeline handoff={handoff} />

          <ReplyForm handoff={handoff} onSuccess={onUpdate} />

          <section className="space-y-3 rounded-xl border border-bank-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-text-muted">Bearbeitung</p>

            <div>
              <label htmlFor="handoff-status" className="text-[11.5px] font-medium text-bank-text">Status</label>
              <select
                id="handoff-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-bank-border bg-white px-3 text-sm"
                data-testid="handoff-status-select"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="handoff-assigned" className="text-[11.5px] font-medium text-bank-text">Zugewiesen an</label>
              <Input
                id="handoff-assigned"
                value={assigned}
                onChange={(e) => setAssigned(e.target.value)}
                placeholder="berater@froehlich..."
                className="mt-1.5"
                data-testid="handoff-assigned-input"
              />
            </div>

            <div>
              <label htmlFor="handoff-notes" className="text-[11.5px] font-medium text-bank-text">Interne Notizen</label>
              <textarea
                id="handoff-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={4000}
                className="mt-1.5 w-full rounded-md border border-bank-border p-3 text-sm"
                placeholder="Interne Notizen zur Bearbeitung — nicht für Kunden sichtbar."
                data-testid="handoff-notes-textarea"
              />
              <p className="mt-1 text-[10.5px] text-bank-text-muted">{notes.length}/4000</p>
            </div>

            <Button
              onClick={save}
              disabled={saving}
              className="w-full rounded-xl bg-bank-petrol-strong text-white hover:bg-bank-petrol-strong/90"
              data-testid="handoff-save-btn"
            >
              {saving ? 'Speichern…' : 'Änderungen speichern'}
            </Button>
          </section>

          <p className="text-[11px] text-bank-text-muted">
            E-Mail-Benachrichtigungen: Admin {handoff.email_sent_admin ? 'zugestellt' : '—'} · Kunde {handoff.email_sent_customer ? 'zugestellt' : '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Inbox ------------------------------------------------------------------

const ReplySignal = ({ handoff }) => {
  const replied = (handoff.reply_count || 0) > 0;
  return (
    <div className="flex items-center gap-1.5 text-[11.5px]" data-testid={`row-reply-signal-${handoff.id}`}>
      {replied ? (
        <>
          <MailCheck size={13} className="text-bank-petrol-strong" strokeWidth={1.8} />
          <span className="text-bank-text-muted">
            Beantwortet · {formatDateDE(handoff.last_reply_at)}
          </span>
        </>
      ) : (
        <>
          <MailQuestion size={13} className="text-neutral-400" strokeWidth={1.8} />
          <span className="text-bank-text-muted">Noch unbeantwortet</span>
        </>
      )}
    </div>
  );
};

const AdminAssistantHandoffs = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_status: {}, last_7d: 0, last_30d: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // Session 80.41 — Race-Condition-freies Suchen: monotone Request-ID.
  const reqSeqRef = useRef(0);
  const abortRef = useRef(null);

  const runQuery = useCallback(async (statusOpt, searchOpt) => {
    const mySeq = ++reqSeqRef.current;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusOpt !== 'all') params.status = statusOpt;
      if (searchOpt && searchOpt.trim()) params.q = searchOpt.trim();
      const [listRes, statsRes] = await Promise.all([
        API.get('/admin/assistant-handoffs', { params, signal: controller.signal }),
        API.get('/admin/assistant-handoffs/stats', { signal: controller.signal }),
      ]);
      // Nur den aktuellsten Response übernehmen — ältere silently verwerfen.
      if (mySeq !== reqSeqRef.current) return;
      setItems(listRes.data.items || []);
      setStats(statsRes.data || { total: 0, by_status: {}, last_7d: 0, last_30d: 0 });
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      if (mySeq !== reqSeqRef.current) return;
      toast.error('Handoffs konnten nicht geladen werden.');
    } finally {
      if (mySeq === reqSeqRef.current) setLoading(false);
    }
  }, []);

  // Debounced search: 350 ms nach letztem Tastendruck. Status-Wechsel triggert sofort.
  useEffect(() => {
    const handle = setTimeout(() => { runQuery(statusFilter, search); }, 350);
    return () => clearTimeout(handle);
  }, [search, statusFilter, runQuery]);

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) || null,
    [items, selectedId]
  );

  const onUpdated = (updated) => {
    setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    // Stats separat aktualisieren (status ist ggf. gewechselt).
    API.get('/admin/assistant-handoffs/stats')
      .then((res) => setStats(res.data))
      .catch(() => {});
  };

  return (
    <>
      <PageMeta title="Assistent-Anfragen · Admin" />
      <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Leads"
          title="Assistent-Anfragen"
          titleIcon={Inbox}
          description="Human-Handoffs aus dem Fröhlich Assistenten. Datensparsam gespeichert, PII beim Empfang entfernt."
          actions={
            <Button variant="outline" onClick={() => runQuery(statusFilter, search)} disabled={loading} className="rounded-xl" data-testid="handoff-refresh-btn">
              <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Gesamt" value={stats.total} testId="stat-total" />
          <StatCard label="Neu" value={stats.by_status?.new || 0} testId="stat-new" />
          <StatCard label="In Bearbeitung" value={stats.by_status?.in_progress || 0} testId="stat-inprogress" />
          <StatCard label="7 Tage" value={stats.last_7d} testId="stat-7d" />
        </div>

        <AdminToolbarCard className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, E-Mail, Anliegen…"
              className="pl-9"
              data-testid="handoff-search-input"
              aria-label="Handoffs durchsuchen"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-full border px-3 py-1 text-[12px] ${statusFilter === 'all' ? 'border-bank-petrol-strong bg-bank-petrol-strong text-white' : 'border-bank-border text-bank-text hover:border-bank-petrol-strong'}`}
              data-testid="handoff-filter-all"
            >
              Alle
            </button>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-[12px] ${statusFilter === s ? 'border-bank-petrol-strong bg-bank-petrol-strong text-white' : 'border-bank-border text-bank-text hover:border-bank-petrol-strong'}`}
                data-testid={`handoff-filter-${s}`}
              >
                {STATUS_META[s].label} ({stats.by_status?.[s] || 0})
              </button>
            ))}
          </div>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">Kontakt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">Anliegen</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">Antwort</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-bank-text-muted">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-bank-text-muted">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bank-border/60" data-testid="handoff-list">
                {loading && items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-bank-text-muted">Wird geladen…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-bank-text-muted" data-testid="handoff-empty">Noch keine Anfragen in diesem Filter.</td></tr>
                ) : (
                  items.map((h) => (
                    <tr key={h.id} className={adminRowHover} data-testid={`handoff-row-${h.id}`}>
                      <td className="px-4 py-4 align-top text-sm text-bank-text-muted whitespace-nowrap">{formatDateDE(h.created_at)}</td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-bank-text">{h.name}</p>
                        <p className="text-[12px] text-bank-text-muted">{h.email}</p>
                        {h.assigned_to && (
                          <p className="mt-0.5 text-[11px] text-bank-text-muted">Zuständig: {h.assigned_to}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="line-clamp-2 max-w-md text-sm text-bank-text">{h.concern}</p>
                        {h.recent_topics && h.recent_topics.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {h.recent_topics.slice(0, 3).map((t) => (
                              <span key={t} className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-bank-text-muted">{t}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <ReplySignal handoff={h} />
                        {(h.reply_count || 0) > 0 && (
                          <p className="mt-0.5 text-[10.5px] text-bank-text-muted">{h.reply_count} Antwort{h.reply_count > 1 ? 'en' : ''}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top"><StatusBadge status={h.status} /></td>
                      <td className="px-4 py-4 align-top text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedId(h.id)} className="rounded-xl" data-testid={`handoff-open-${h.id}`}>
                          <MessageSquare size={13} className="mr-1.5" />
                          Öffnen
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSurfaceCard>
      </AdminSubpageLayout>

      {selected && (
        <DetailDrawer handoff={selected} onClose={() => setSelectedId(null)} onUpdate={onUpdated} />
      )}
    </>
  );
};

export default AdminAssistantHandoffs;
