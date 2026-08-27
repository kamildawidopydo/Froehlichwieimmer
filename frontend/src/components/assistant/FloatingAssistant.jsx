import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, ArrowUpRight } from 'lucide-react';
import axios from 'axios';

/**
 * Session 80.38 — Globaler Fröhlich Assistent (Floating Chat).
 * - Petrol-Launcher unten rechts, keine Ampel-Farben.
 * - Panel Desktop 400px, Mobile Bottom-Sheet.
 * - Antworten von /api/assistant/chat (Intent-Routing, Retrieval, LLM).
 */
const BASE = process.env.REACT_APP_BACKEND_URL;
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

const FloatingAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
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
      setMessages((m) => [...m, { role: 'assistant', content: data.answer,
                                   sources: data.sources || [],
                                   actions: data.suggested_actions || [] }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant',
        content: 'Der Assistent ist momentan nicht erreichbar. Sie können uns Ihr Anliegen trotzdem über das Kontakt-Formular senden.',
        actions: [{ label: 'Beratung anfragen', href: '/kontakt' }] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="assistant-launcher"
          aria-label="Fröhlich Assistent öffnen"
          className="fixed bottom-6 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-bank-petrol-strong text-white shadow-lg transition-all hover:scale-105 sm:bottom-8 sm:right-8"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={1.7} />
        </button>
      )}
      {open && (
        <div
          data-testid="assistant-panel"
          className="fixed inset-x-0 bottom-0 z-[70] flex h-[85vh] flex-col bg-white shadow-2xl sm:bottom-8 sm:right-8 sm:left-auto sm:top-auto sm:h-[640px] sm:w-[400px] sm:rounded-lg sm:border sm:border-bank-border"
          role="dialog"
          aria-label="Fröhlich Assistent"
        >
          <header className="flex items-center justify-between border-b border-bank-border px-5 py-3.5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-petrol-strong">Fröhlich Assistent</p>
              <p className="mt-0.5 text-[11px] text-bank-text-muted">Fragen zu Zinsen, Sparangeboten und Vorsorge</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Chat schließen"
              data-testid="assistant-close"
              className="rounded-full p-1.5 text-bank-text-muted hover:bg-neutral-100"
            ><X className="h-4 w-4" /></button>
          </header>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4" data-testid="assistant-messages">
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
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-bank-border px-4 py-3"
          >
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
        </div>
      )}
    </>
  );
};

export default FloatingAssistant;
