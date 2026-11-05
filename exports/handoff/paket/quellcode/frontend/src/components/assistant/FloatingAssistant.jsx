import { getApiBase } from '@/lib/apiBase';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, ArrowUpRight, UserRoundCheck } from 'lucide-react';
import axios from 'axios';

/**
 * Session 80.38–80.40 — Globaler Fröhlich Assistent (Floating Chat + Human-Handoff).
 * - Petrol-Launcher unten rechts.
 * - Panel Desktop 400 × 640 px / Mobile Bottom-Sheet.
 * - Antworten von /api/assistant/chat.
 * - Session 80.40: Inline-Handoff-Formular mit Honeypot, Consent, Datensparsam.
 */
const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api` });

const QUICK = [
  'Welche Tagesgeldzinsen sind aktuell verfügbar?',
  'Was ist der Unterschied zwischen Tagesgeld und Festgeld?',
  'Wie kann ich für den Ruhestand vorsorgen?',
  'Was bedeuten die aktuellen Zinsen für Sparer?',
];

const WELCOME = {
  role: 'assistant',
  content: 'Guten Tag. Wie kann ich Ihnen helfen? Ich kann Fragen zu Zinsen, Sparangeboten, Geldanlage, Vorsorge und den Inhalten unserer Plattform beantworten.',
};

const HandoffForm = ({ onSuccess, onCancel, historyRef, currentRoute }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [concern, setConcern] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const shownAtRef = useRef(Date.now());

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!consent) { setError('Bitte den Datenschutzhinweis bestätigen.'); return; }
    if (name.trim().length < 2) { setError('Bitte einen Namen angeben.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Bitte eine gültige E-Mail-Adresse angeben.'); return; }
    if (concern.trim().length < 4) { setError('Bitte kurz Ihr Anliegen beschreiben.'); return; }
    // Zeit-Guard: Formular <1.5s ausgefüllt → sehr wahrscheinlich Bot.
    // Auto-Retry: statt Fehler zu zeigen, warten wir die verbleibende Zeit ab.
    const remaining = 1500 - (Date.now() - shownAtRef.current);
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining + 40));
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/assistant/handoff', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        concern: concern.trim(),
        current_route: currentRoute,
        conversation_history: (historyRef?.current || []).slice(-6),
        website, // honeypot
        hp_ts: shownAtRef.current,
        consent: true,
      });
      onSuccess(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Übermittlung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2.5" data-testid="assistant-handoff-form">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-petrol-strong">Beratungsanfrage</p>
        <p className="mt-0.5 text-[12px] text-bank-text-muted">Wir melden uns innerhalb von 24 Stunden zurück.</p>
      </div>

      {/* Honeypot — für Menschen unsichtbar */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="asst-hp-website">Website (bitte leer lassen)</label>
        <input
          id="asst-hp-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <input
        type="text"
        placeholder="Ihr Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={200}
        required
        className="w-full rounded-lg border border-bank-border px-3 py-2 text-[13px] outline-none focus:border-bank-petrol-strong"
        data-testid="handoff-name-input"
      />
      <input
        type="email"
        placeholder="E-Mail-Adresse"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={200}
        required
        className="w-full rounded-lg border border-bank-border px-3 py-2 text-[13px] outline-none focus:border-bank-petrol-strong"
        data-testid="handoff-email-input"
      />
      <input
        type="tel"
        placeholder="Telefon (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        maxLength={60}
        className="w-full rounded-lg border border-bank-border px-3 py-2 text-[13px] outline-none focus:border-bank-petrol-strong"
        data-testid="handoff-phone-input"
      />
      <textarea
        placeholder="Ihr Anliegen — bitte keine sensiblen Daten (IBAN/PIN/Kennwort)"
        value={concern}
        onChange={(e) => setConcern(e.target.value)}
        rows={3}
        maxLength={2000}
        required
        className="w-full rounded-lg border border-bank-border px-3 py-2 text-[13px] outline-none focus:border-bank-petrol-strong"
        data-testid="handoff-concern-textarea"
      />

      <label className="flex items-start gap-2 text-[11.5px] text-bank-text-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
          data-testid="handoff-consent-checkbox"
        />
        <span>
          Ich stimme zu, dass meine Angaben zur Bearbeitung der Anfrage gespeichert und ausschließlich intern verwendet werden.
          Sensible Daten wie IBAN oder Passwörter werden automatisch entfernt.
        </span>
      </label>

      {error && (
        <p className="rounded-md bg-rose-50 px-2.5 py-1.5 text-[12px] text-rose-800" data-testid="handoff-error">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-bank-petrol-strong px-4 py-2 text-[12.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          data-testid="handoff-submit-btn"
        >
          <UserRoundCheck className="h-3.5 w-3.5" />
          {submitting ? 'Wird gesendet…' : 'Anfrage senden'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-bank-border px-3 py-2 text-[12px] text-bank-text-muted hover:border-bank-petrol-strong hover:text-bank-text"
          data-testid="handoff-cancel-btn"
        >
          Zurück
        </button>
      </div>
    </form>
  );
};

const HIDDEN_PATH_PREFIXES = ['/admin', '/login', '/register', '/reset-password', '/karriere', '/recruiting'];

const FloatingAssistant = () => {
  const location = useLocation();
  const hidden = HIDDEN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [handoffMode, setHandoffMode] = useState(false);
  const [handoffSuccess, setHandoffSuccess] = useState(null);
  const listRef = useRef(null);
  const historyRef = useRef([]);

  // Für Handoff-Kontext: kompakte, PII-arme Historie (kein voller Text an Backend nötig).
  historyRef.current = useMemo(
    () => messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: (m.content || '').slice(0, 240) })),
    [messages]
  );

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, handoffMode, handoffSuccess]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); setHandoffMode(false); } };
    if (open) window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  const send = async (text) => {
    const msg = (text || '').trim();
    if (!msg || loading) return;
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/assistant/chat', {
        message: msg,
        conversation_history: messages.filter((m) => m.role !== 'system').slice(-4),
        current_route: location.pathname,
      });
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
          actions: data.suggested_actions || [],
          handoff: !!data.handoff_recommended,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Der Assistent ist momentan nicht erreichbar. Sie können uns Ihr Anliegen trotzdem übermitteln.',
          handoff: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startHandoff = () => { setHandoffSuccess(null); setHandoffMode(true); };

  if (hidden) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="assistant-launcher"
          aria-label="Fröhlich Assistent öffnen"
          className={`fixed ${location.pathname.startsWith('/dashboard') ? 'bottom-24 lg:bottom-8' : 'bottom-6 sm:bottom-8'} left-6 z-[95] flex h-14 w-14 items-center justify-center rounded-full bg-bank-petrol-strong text-white shadow-lg transition-all hover:scale-105 sm:left-8`}
        >
          <MessageCircle className="h-6 w-6" strokeWidth={1.7} />
        </button>
      )}
      {open && (
        <div
          data-testid="assistant-panel"
          className="fixed inset-x-0 bottom-0 z-[100] flex h-[85vh] flex-col bg-white shadow-2xl sm:bottom-8 sm:left-8 sm:right-auto sm:top-auto sm:h-[640px] sm:w-[400px] sm:rounded-lg sm:border sm:border-bank-border"
          role="dialog"
          aria-label="Fröhlich Assistent"
        >
          <header className="flex items-center justify-between border-b border-bank-border px-5 py-3.5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-petrol-strong">Fröhlich Assistent</p>
              <p className="mt-0.5 text-[11px] text-bank-text-muted">
                {handoffMode ? 'Beratungsanfrage übermitteln' : 'Fragen zu Zinsen, Sparangeboten und Vorsorge'}
              </p>
            </div>
            <button
              onClick={() => { setOpen(false); setHandoffMode(false); }}
              aria-label="Chat schließen"
              data-testid="assistant-close"
              className="rounded-full p-1.5 text-bank-text-muted hover:bg-neutral-100"
            ><X className="h-4 w-4" /></button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4" data-testid="assistant-messages">
            {!handoffMode && !handoffSuccess && (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[92%]'}>
                    <div className={`whitespace-pre-line text-[13.5px] leading-relaxed ${m.role === 'user'
                      ? 'rounded-lg bg-bank-primary/5 px-3.5 py-2.5 text-bank-text'
                      : 'text-bank-text'}`}>
                      {m.content}
                    </div>
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.sources.map((s, j) => (
                          <Link key={j} to={s.url} className="rounded-full border border-bank-border bg-neutral-50 px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:border-bank-petrol-strong hover:text-bank-petrol-strong">
                            {s.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.actions.map((a, k) => (
                          <Link key={k} to={a.href} className="inline-flex items-center gap-1 text-[12px] font-medium text-bank-petrol-strong hover:opacity-80" data-testid={`assistant-action-${k}`}>
                            {a.label} <ArrowUpRight className="h-3 w-3" strokeWidth={1.7} />
                          </Link>
                        ))}
                      </div>
                    )}
                    {m.handoff && (
                      <button
                        type="button"
                        onClick={startHandoff}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-bank-petrol-strong px-3 py-1 text-[11.5px] font-medium text-bank-petrol-strong hover:bg-bank-petrol-strong hover:text-white"
                        data-testid="assistant-handoff-cta"
                      >
                        <UserRoundCheck className="h-3.5 w-3.5" />
                        Berater kontaktieren
                      </button>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="mr-auto text-[12px] italic text-bank-text-muted" data-testid="assistant-typing">
                    Antwort wird erstellt…
                  </div>
                )}
                {messages.length === 1 && !loading && (
                  <div className="mt-4 space-y-1.5" data-testid="assistant-quick-questions">
                    {QUICK.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => send(q)}
                        className="w-full rounded-lg border border-bank-border px-3.5 py-2 text-left text-[12.5px] text-bank-text hover:border-bank-petrol-strong hover:bg-neutral-50"
                        data-testid={`assistant-quick-${i}`}
                      >{q}</button>
                    ))}
                  </div>
                )}
              </>
            )}

            {handoffMode && !handoffSuccess && (
              <HandoffForm
                onSuccess={(data) => { setHandoffSuccess(data); setHandoffMode(false); }}
                onCancel={() => setHandoffMode(false)}
                historyRef={historyRef}
                currentRoute={location.pathname}
              />
            )}

            {handoffSuccess && (
              <div className="rounded-xl border border-bank-petrol-strong/40 bg-neutral-50 p-4" data-testid="handoff-success">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-petrol-strong">Anfrage übermittelt</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-bank-text">
                  {handoffSuccess?.message || 'Vielen Dank. Wir melden uns innerhalb von 24 Stunden zurück.'}
                </p>
                <button
                  type="button"
                  onClick={() => { setHandoffSuccess(null); }}
                  className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-bank-petrol-strong hover:opacity-80"
                >
                  Zurück zum Chat
                </button>
              </div>
            )}
          </div>

          {!handoffMode && !handoffSuccess && (
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2 border-t border-bank-border px-4 py-3"
            >
              <button
                type="button"
                onClick={startHandoff}
                aria-label="Berater kontaktieren"
                title="Berater kontaktieren"
                className="rounded-full border border-bank-border p-2 text-bank-text-muted hover:border-bank-petrol-strong hover:text-bank-petrol-strong"
                data-testid="assistant-handoff-launcher"
              >
                <UserRoundCheck className="h-4 w-4" strokeWidth={1.7} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Frage eingeben …"
                data-testid="assistant-input"
                className="flex-1 rounded-full border border-bank-border bg-white px-4 py-2 text-[13px] outline-none focus:border-bank-petrol-strong"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                data-testid="assistant-send"
                className="rounded-full bg-bank-petrol-strong p-2.5 text-white disabled:opacity-40"
              ><Send className="h-4 w-4" /></button>
            </form>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingAssistant;
