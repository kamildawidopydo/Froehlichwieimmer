import { getApiBase } from '@/lib/apiBase';
import React, { useState } from 'react';
import axios from 'axios';
import { Send, Check, Loader2 } from 'lucide-react';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';

const BASE = getApiBase();
const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: false, timeout: 12000 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const NewsletterSignup = () => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (state === 'submitting') return;
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setState('error');
      setMessage('Bitte eine gültige E-Mail-Adresse eingeben.');
      return;
    }
    if (!consent) {
      setState('error');
      setMessage('Bitte bestätigen Sie den Datenschutzhinweis.');
      return;
    }
    setState('submitting');
    setMessage('');
    try {
      const res = await api.post('/newsletter/subscribe', {
        email: trimmed,
        source: 'home-finance-news',
        consent: true,
      });
      const already = res?.data?.status === 'already_subscribed';
      setState('success');
      setMessage(
        already
          ? 'Sie sind bereits eingetragen — danke für Ihr Interesse.'
          : 'Vielen Dank — der wöchentliche Digest kommt jeden Freitagvormittag.',
      );
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setState('error');
      setMessage(
        typeof detail === 'string' && detail.length < 140
          ? detail
          : 'Anmeldung konnte gerade nicht verarbeitet werden. Bitte später erneut versuchen.',
      );
    }
  };

  const isSuccess = state === 'success';
  const isSubmitting = state === 'submitting';

  return (
    <section
      id="home-newsletter"
      data-testid="home-newsletter"
      className="border-t border-bank-border bg-white"
    >
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:px-12 lg:py-20">
        <div>
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.28em] text-bank-primary/80">
            Wöchentlicher Digest
          </p>
          <h3 className="mt-3 font-display text-[1.5rem] font-light leading-tight tracking-tight text-bank-ink sm:text-[1.8rem]">
            Finanznachrichten der Woche — freitags in Ihrem Postfach.
          </h3>
          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-bank-text-muted">
            Ausgewählte Meldungen zu Kapitalmärkten, Zinsen, Fonds und Konjunktur —
            redaktionell einsortiert, ohne Werbung, jederzeit abbestellbar.
          </p>
        </div>

        {isSuccess ? (
          <div
            data-testid="home-newsletter-success"
            className="flex flex-col justify-center border border-bank-border bg-bank-cream/30 px-6 py-8 sm:px-8"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-bank-primary/30 bg-white text-bank-primary">
                <Check size={16} strokeWidth={LUCIDE_STROKE} aria-hidden />
              </span>
              <p className="font-display text-[1.1rem] font-light leading-snug text-bank-ink">
                Vielen Dank.
              </p>
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-bank-text-muted">{message}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            data-testid="home-newsletter-form"
            noValidate
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="home-newsletter-email" className="sr-only">
                E-Mail-Adresse
              </label>
              <input
                id="home-newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === 'error') {
                    setState('idle');
                    setMessage('');
                  }
                }}
                placeholder="ihre@email.de"
                data-testid="home-newsletter-email"
                aria-invalid={state === 'error' ? 'true' : undefined}
                disabled={isSubmitting}
                className="min-w-0 flex-1 border border-bank-border bg-white px-4 py-3 font-sans text-[15px] text-bank-ink placeholder:text-bank-text-muted/70 focus:border-bank-primary focus:outline-none focus:ring-2 focus:ring-bank-primary/20"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                data-testid="home-newsletter-submit"
                className={cn(
                  'inline-flex shrink-0 items-center justify-center gap-2 border border-bank-ink bg-bank-ink px-6 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-colors',
                  isSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-bank-ink/85',
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} strokeWidth={LUCIDE_STROKE} className="animate-spin" aria-hidden />
                    Wird gesendet
                  </>
                ) : (
                  <>
                    Kostenlos abonnieren
                    <Send size={13} strokeWidth={LUCIDE_STROKE} aria-hidden />
                  </>
                )}
              </button>
            </div>

            <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-bank-text-muted">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                data-testid="home-newsletter-consent"
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 shrink-0 border-bank-border text-bank-primary focus:ring-bank-primary/30"
              />
              <span>
                Ich willige ein, dass meine E-Mail zur Zusendung des wöchentlichen
                Finanznachrichten-Digests verarbeitet wird. Die Einwilligung ist jederzeit
                über den Abmelde-Link in jeder E-Mail widerrufbar.{' '}
                <a
                  href="/datenschutz"
                  className="underline underline-offset-2 hover:text-bank-primary"
                >
                  Datenschutzerklärung
                </a>
                .
              </span>
            </label>

            {state === 'error' && message ? (
              <p
                role="alert"
                data-testid="home-newsletter-error"
                className="border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] leading-snug text-red-900"
              >
                {message}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
};

export default NewsletterSignup;
