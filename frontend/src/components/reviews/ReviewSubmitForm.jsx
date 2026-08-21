import React, { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Send, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StarsPicker } from '@/components/reviews/RatingStars';
import { reviewsApi } from '@/services/reviewsApi';

const initialState = {
  first_name: '', last_name: '', email: '',
  rating: 0, text: '', consent: false, website: '',
};

const ReviewSubmitForm = ({ onSubmitted, dark = false }) => {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.first_name.trim()) return 'Bitte geben Sie Ihren Vornamen an.';
    if (!form.last_name.trim()) return 'Bitte geben Sie Ihren Nachnamen an.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
    if (form.rating < 1 || form.rating > 5) return 'Bitte wählen Sie 1 bis 5 Sterne.';
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
      await reviewsApi.submit(form);
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
        <h3 className="font-serif text-2xl">Vielen Dank für Ihre Bewertung.</h3>
        <p className={`text-[14.5px] leading-relaxed ${label}`}>
          Ihre Bewertung wurde erfolgreich übermittelt und wird vor der Veröffentlichung von uns geprüft. Nach der
          Prüfung kann die Bewertung auf unserer Website veröffentlicht werden.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className={`mt-2 text-[12.5px] font-medium uppercase tracking-[0.2em] ${dark ? 'text-bank-gold' : 'text-bank-primary'} hover:underline`}
          data-testid="review-submit-another"
        >
          Weitere Bewertung abgeben
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
        <h3 className="font-serif text-2xl leading-snug">Ihre Meinung ist uns wichtig.</h3>
        <p className={`mt-2 text-[14px] leading-relaxed ${label}`}>
          Sie sind Kunde bei uns und möchten Ihre Erfahrung teilen? Wir freuen uns über Ihr Feedback.
        </p>
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
        <span className={`text-[12.5px] font-medium uppercase tracking-[0.14em] ${label}`}>Bewertung</span>
        <StarsPicker value={form.rating} onChange={(v) => set('rating', v)} size={34} />
      </div>

      <label className="flex flex-col gap-1.5 text-[12.5px]">
        <span className={`font-medium uppercase tracking-[0.14em] ${label}`}>Ihre Erfahrung</span>
        <textarea
          required minLength={10} maxLength={2000} rows={5}
          value={form.text} onChange={(e) => set('text', e.target.value)}
          className={`rounded-xl border px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:ring-2 ${input}`}
          data-testid="review-text"
          placeholder="Beschreiben Sie Ihre Zusammenarbeit mit uns …"
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
          {submitting ? 'Wird übermittelt …' : 'Bewertung absenden'}
        </Button>
      </div>
    </form>
  );
};

export default ReviewSubmitForm;
