import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Send, ShieldCheck, X as XIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StarsPicker } from '@/components/reviews/RatingStars';
import { reviewsApi } from '@/services/reviewsApi';
import { REVIEW_TOPICS } from '@/data/reviewTopics';

const initialState = {
  first_name: '', last_name: '', email: '',
  rating: 0, text: '', customer_since: '', topics: [], invite_token: '',
  consent: false, website: '',
};

const CUSTOMER_SINCE_OPTIONS = [
  { value: '', label: 'Keine Angabe' },
  { value: 'unter_1', label: 'weniger als 1 Jahr' },
  { value: '1_bis_3', label: '1–3 Jahre' },
  { value: '3_bis_5', label: '3–5 Jahre' },
  { value: 'ueber_5', label: 'mehr als 5 Jahre' },
];

const ReviewSubmitForm = ({ onSubmitted, dark = false, variant = 'review' }) => {
  const isTestimonial = variant === 'testimonial';
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('einladung');
    if (!token) return;
    reviewsApi.getInvite(token)
      .then((info) => {
        setInviteInfo(info);
        setForm((f) => ({
          ...f,
          first_name: info.first_name || f.first_name,
          last_name: info.last_name || f.last_name,
          email: info.email || f.email,
          invite_token: token,
        }));
      })
      .catch(() => setInviteInfo({ error: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('einladung')]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTopic = (slug) => {
    setForm((f) => {
      if (f.topics.includes(slug)) return { ...f, topics: f.topics.filter((s) => s !== slug) };
      if (f.topics.length >= 3) {
        toast.info('Bitte höchstens 3 Themen wählen.');
        return f;
      }
      return { ...f, topics: [...f.topics, slug] };
    });
  };

  const validate = () => {
    if (!form.first_name.trim()) return 'Bitte geben Sie Ihren Vornamen an.';
    if (!form.last_name.trim()) return 'Bitte geben Sie Ihren Nachnamen an.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
    if (!isTestimonial && (form.rating < 1 || form.rating > 5)) return 'Bitte wählen Sie 1 bis 5 Sterne.';
    if (form.text.trim().length < 10) return 'Bitte schreiben Sie mindestens 10 Zeichen zu Ihrer Erfahrung.';
    if (!form.consent) return 'Bitte bestätigen Sie die Datenschutzhinweise.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (isTestimonial && (!form.rating || form.rating < 1)) delete payload.rating;
      if (!payload.customer_since) delete payload.customer_since;
      await reviewsApi.submit(payload);
      setSuccess(true);
      setForm(initialState);
      onSubmitted?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || 'Bewertung konnte nicht übermittelt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  const surface = dark ? 'bg-white/[0.03] border-white/10 text-white' : 'bg-white border-bank-border text-bank-text';
  const label = dark ? 'text-white/70' : 'text-bank-text-muted';
  const input = dark
    ? 'bg-white/5 border-white/15 text-white placeholder-white/40 focus:border-bank-gold focus:ring-bank-gold/30'
    : 'bg-white border-bank-border text-bank-text placeholder-bank-text-muted/60 focus:border-bank-primary focus:ring-bank-primary/25';

  if (success) {
    return (
      <div
        className={`flex flex-col items-start gap-4 rounded-2xl border p-8 ${surface}`}
        data-testid="review-success"
        role="status"
      >
        <CheckCircle2 className={dark ? 'h-8 w-8 text-emerald-300' : 'h-8 w-8 text-emerald-600'} strokeWidth={1.4} />
        <h3 className="font-serif text-2xl">Vielen Dank für Ihre Rückmeldung.</h3>
        <p className={`text-[14.5px] leading-relaxed ${label}`}>
          {isTestimonial
            ? 'Ihre Erfahrung wurde erfolgreich übermittelt. Nach einer kurzen Prüfung kann sie auf unserer Website veröffentlicht werden.'
            : 'Ihre Bewertung wurde erfolgreich übermittelt und wird vor der Veröffentlichung von uns geprüft. Nach der Prüfung kann die Bewertung auf unserer Website veröffentlicht werden.'}
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className={`mt-2 text-[12.5px] font-medium uppercase tracking-[0.2em] ${dark ? 'text-bank-gold' : 'text-bank-primary'} hover:underline`}
          data-testid="review-submit-another"
        >
          {isTestimonial ? 'Weitere Erfahrung teilen' : 'Weitere Bewertung abgeben'}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`flex flex-col gap-5 rounded-2xl border p-6 sm:p-8 ${surface}`}
      data-testid="review-submit-form"
      noValidate
    >
      <div>
        <h3 className="font-serif text-2xl leading-snug">
          {isTestimonial ? 'Ihre Erfahrung mit uns' : 'Ihre Meinung ist uns wichtig.'}
        </h3>
        <p className={`mt-2 text-[14px] leading-relaxed ${label}`}>
          {isTestimonial
            ? 'Sie sind Kunde von Fröhlich Vermögensberatung und möchten Ihre Erfahrung teilen? Wir freuen uns über Ihre persönliche Rückmeldung.'
            : 'Sie sind Kunde bei uns und möchten Ihre Erfahrung teilen? Wir freuen uns über Ihr Feedback.'}
        </p>
        {inviteInfo && !inviteInfo.error && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
              dark ? 'border-bank-gold/40 bg-bank-gold/10 text-white' : 'border-bank-gold/40 bg-bank-gold/10 text-bank-text'
            }`}
            data-testid="invite-banner"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 text-bank-gold" strokeWidth={1.6} />
            <div>
              <p className="font-medium">Ihre persönliche Einladung ist gültig.</p>
              <p className={`mt-0.5 ${dark ? 'text-white/70' : 'text-bank-text-muted'}`}>
                {inviteInfo.note || 'Vielen Dank, dass Sie sich die Zeit nehmen, Ihre Erfahrung mit uns zu teilen.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[12.5px]">
          <span className={`font-medium uppercase tracking-[0.14em] ${label}`}>Vorname</span>
          <input
            type="text" required value={form.first_name} onChange={(e) => set('first_name', e.target.value)}
            className={`h-11 rounded-xl border px-3 text-[14px] focus:outline-none focus:ring-2 ${input}`}
            data-testid="review-firstname"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[12.5px]">
          <span className={`font-medium uppercase tracking-[0.14em] ${label}`}>Nachname</span>
          <input
            type="text" required value={form.last_name} onChange={(e) => set('last_name', e.target.value)}
            className={`h-11 rounded-xl border px-3 text-[14px] focus:outline-none focus:ring-2 ${input}`}
            data-testid="review-lastname"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-[12.5px]">
        <span className={`font-medium uppercase tracking-[0.14em] ${label}`}>E-Mail-Adresse</span>
        <input
          type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
          className={`h-11 rounded-xl border px-3 text-[14px] focus:outline-none focus:ring-2 ${input}`}
          data-testid="review-email"
        />
        <span className={`text-[11px] ${label}`}>Wird ausschließlich intern zur Prüfung verwendet — nie öffentlich sichtbar.</span>
      </label>

      <div className="flex flex-col gap-2">
        <span className={`text-[12.5px] font-medium uppercase tracking-[0.14em] ${label}`}>
          {isTestimonial ? 'Zufriedenheit (optional)' : 'Bewertung'}
        </span>
        <StarsPicker value={form.rating} onChange={(v) => set('rating', v)} size={34} />
      </div>

      {isTestimonial && (
        <label className="flex flex-col gap-1.5 text-[12.5px]">
          <span className={`font-medium uppercase tracking-[0.14em] ${label}`}>Seit wann sind Sie Kunde? (optional)</span>
          <select
            value={form.customer_since}
            onChange={(e) => set('customer_since', e.target.value)}
            className={`h-11 rounded-xl border px-3 text-[14px] focus:outline-none focus:ring-2 ${input}`}
            data-testid="review-customer-since"
          >
            {CUSTOMER_SINCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )}

      {isTestimonial && (
        <div className="flex flex-col gap-2">
          <span className={`text-[12.5px] font-medium uppercase tracking-[0.14em] ${label}`}>
            Themen (optional, max. 3)
          </span>
          <div className="flex flex-wrap gap-2" data-testid="review-topics-picker">
            {REVIEW_TOPICS.map((t) => {
              const active = form.topics.includes(t.slug);
              return (
                <button
                  type="button"
                  key={t.slug}
                  onClick={() => toggleTopic(t.slug)}
                  data-testid={`topic-chip-${t.slug}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                    active
                      ? (dark ? 'border-bank-gold bg-bank-gold/20 text-bank-gold' : 'border-bank-primary bg-bank-primary text-white')
                      : (dark ? 'border-white/20 bg-transparent text-white/70 hover:border-white/40' : 'border-bank-border bg-white text-bank-text-muted hover:border-bank-primary/40')
                  }`}
                >
                  {t.label}
                  {active && <XIcon className="h-3 w-3" strokeWidth={1.8} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-[12.5px]">
        <span className={`font-medium uppercase tracking-[0.14em] ${label}`}>
          {isTestimonial ? 'Ihre persönliche Erfahrung' : 'Ihre Erfahrung'}
        </span>
        <textarea
          required minLength={10} maxLength={2000} rows={5}
          value={form.text} onChange={(e) => set('text', e.target.value)}
          className={`rounded-xl border px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:ring-2 ${input}`}
          data-testid="review-text"
          placeholder={isTestimonial
            ? 'Was schätzen Sie an unserer Zusammenarbeit? Wie erleben Sie unsere Betreuung, Erreichbarkeit oder Beratung?'
            : 'Beschreiben Sie Ihre Zusammenarbeit mit uns …'}
        />
        <span className={`text-[11px] ${label}`}>{form.text.length} / 2000 Zeichen · Nur Text — HTML wird entfernt.</span>
      </label>

      {/* Honeypot — never displayed to users */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => set('website', e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0 pointer-events-none"
        style={{ position: 'absolute', left: '-9999px' }}
      />

      <label className="flex items-start gap-3 text-[13px] leading-relaxed">
        <input
          type="checkbox" checked={form.consent} onChange={(e) => set('consent', e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0"
          data-testid="review-consent"
        />
        <span className={dark ? 'text-white/70' : 'text-bank-text-muted'}>
          Ich bestätige, dass ich Kunde von Fröhlich Vermögensberatung bin und stimme der Verarbeitung meiner Angaben
          zur Prüfung und Veröffentlichung meiner Bewertung gemäß{' '}
          <Link to="/legal/privacy" className={`font-medium underline ${dark ? 'text-bank-gold' : 'text-bank-primary'}`}>
            Datenschutzerklärung
          </Link>{' '}
          zu.
        </span>
      </label>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`inline-flex items-center gap-2 text-[11.5px] ${label}`}>
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.4} />
          Bewertungen werden vor der Veröffentlichung manuell geprüft.
        </p>
        <Button
          type="submit"
          disabled={submitting}
          className={`rounded-full ${dark ? 'bg-bank-gold text-bank-ink hover:bg-bank-gold/90' : ''}`}
          data-testid="review-submit-btn"
        >
          <Send className="mr-2 h-4 w-4" />
          {submitting ? 'Wird übermittelt …' : (isTestimonial ? 'Erfahrung teilen' : 'Bewertung absenden')}
        </Button>
      </div>
    </form>
  );
};

export default ReviewSubmitForm;
