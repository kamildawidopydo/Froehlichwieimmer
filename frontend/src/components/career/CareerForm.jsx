import React, { useState } from 'react';
import { ArrowLeft, Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/apiBase';

const inputCls =
  'w-full rounded-lg border border-[#E4DED3] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#1A1A1D] placeholder:text-[#8C8578] outline-none transition-colors focus:border-[#36A852] focus:bg-white';

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-[#6B6459]">{label}</span>
    {children}
  </label>
);

export const CareerForm = ({ onBack, onDone }) => {
  const [cv, setCv] = useState(null);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('consent', fd.get('consent') ? 'true' : 'false');
    if (cv) fd.set('cv', cv);
    setSending(true);
    try {
      const res = await fetch(apiUrl('/api/career/apply'), { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Bitte Eingaben prüfen.');
      onDone();
    } catch (err) {
      toast.error(err.message || 'Bewerbung konnte nicht gesendet werden.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5" data-testid="career-form">
      <button type="button" onClick={onBack} data-testid="career-form-back-btn" className="inline-flex items-center gap-1.5 text-xs text-[#8C8578] hover:text-[#1A1A1D]">
        <ArrowLeft size={14} /> Zurück
      </button>
      <h2 className="font-display text-2xl text-[#1F4D3A]">Ihre Bewerbung</h2>
      <Field label="Vor- und Nachname *">
        <input name="name" required minLength={2} maxLength={120} className={inputCls} data-testid="career-form-name-input" />
      </Field>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="E-Mail *">
          <input name="email" type="email" required maxLength={200} className={inputCls} data-testid="career-form-email-input" />
        </Field>
        <Field label="Telefon">
          <input name="phone" type="tel" maxLength={60} className={inputCls} data-testid="career-form-phone-input" />
        </Field>
      </div>
      <Field label="Nachricht">
        <textarea name="message" rows={3} maxLength={4000} className={`${inputCls} resize-none`} placeholder="Kurz zu Ihrer Erfahrung" data-testid="career-form-message-input" />
      </Field>
      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-[#D6CFC2] px-3.5 py-2.5 text-sm text-[#6B6459] transition-colors hover:border-[#36A852]" data-testid="career-form-cv-label">
        <Paperclip size={15} className="text-[#36A852]" />
        <span className="min-w-0 truncate">{cv ? cv.name : 'Lebenslauf anhängen (PDF/Word, max. 8 MB)'}</span>
        <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCv(e.target.files?.[0] || null)} data-testid="career-form-cv-input" />
      </label>
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[#6B6459]">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-[#36A852]" data-testid="career-form-consent-checkbox" />
        Ich willige ein, dass meine Angaben zur Bearbeitung meiner Bewerbung gespeichert und verarbeitet werden. *
      </label>
      <button
        type="submit"
        disabled={sending}
        data-testid="career-form-submit-btn"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1F4D3A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#218739] disabled:opacity-60"
      >
        {sending && <Loader2 size={16} className="animate-spin" />}
        {sending ? 'Wird gesendet …' : 'Bewerbung absenden'}
      </button>
    </form>
  );
};
