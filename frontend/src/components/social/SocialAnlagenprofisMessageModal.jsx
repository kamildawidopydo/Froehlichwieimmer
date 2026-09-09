import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOCIAL_PREVIEW_LIGHT } from '@/components/social/socialPreviewLight';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const IG_GRADIENT =
  'linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%)';

const PLATFORM_META = {
  instagram: {
    title: 'Nachricht an Fröhlich Vermögensberatung GmbH',
    subtitle: 'Schreiben Sie uns direkt — ohne echtes Instagram-Konto.',
    Logo: () => (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: IG_GRADIENT }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </span>
    ),
    shell: 'rounded-2xl bg-white ring-1 ring-[#dbdbdb]/80',
    headerBorder: 'border-b border-[#efefef]',
    titleClass: 'text-[17px] font-semibold text-[#262626]',
    subtitleClass: 'text-[13px] text-[#8e8e8e]',
    labelClass: 'text-[12px] font-semibold text-[#262626]',
    inputClass:
      'rounded-lg border border-[#dbdbdb] bg-[#fafafa] text-[14px] text-[#262626] placeholder:text-[#8e8e8e] focus:border-[#0095F6] focus:bg-white focus:ring-1 focus:ring-[#0095F6]/25',
    submitClass: 'rounded-lg text-[14px] font-semibold text-white hover:opacity-95',
    submitStyle: { background: IG_GRADIENT },
    footerClass: 'text-[11px] text-[#8e8e8e]',
    closeClass: 'text-[#262626] hover:bg-[#efefef]',
  },
  facebook: {
    title: 'Nachricht senden',
    subtitle: 'Kontaktieren Sie Fröhlich Vermögensberatung GmbH über diese Seiten-Vorschau.',
    Logo: () => (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-[22px] font-bold text-white"
        aria-hidden
      >
        f
      </span>
    ),
    shell: 'rounded-lg bg-white ring-1 ring-[#dddfe2]',
    headerBorder: 'border-b border-[#dddfe2] bg-[#f0f2f5]/60',
    titleClass: 'text-[20px] font-bold text-[#050505]',
    subtitleClass: 'text-[15px] text-[#65676b]',
    labelClass: 'text-[13px] font-semibold text-[#050505]',
    inputClass:
      'rounded-md border border-[#ccd0d5] bg-white text-[15px] text-[#050505] placeholder:text-[#65676b] focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2]/30',
    submitClass:
      'rounded-md bg-[#1877F2] text-[15px] font-semibold text-white hover:bg-[#166fe5]',
    submitStyle: undefined,
    footerClass: 'text-[12px] text-[#65676b]',
    closeClass: 'text-[#65676b] hover:bg-[#e4e6eb]',
  },
  linkedin: {
    title: 'Nachricht an Fröhlich Vermögensberatung GmbH',
    subtitle: 'Ihre Anfrage wird an unser Team weitergeleitet.',
    Logo: () => (
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#0A66C2] text-[18px] font-bold text-white"
        aria-hidden
      >
        in
      </span>
    ),
    shell: 'rounded-lg bg-white ring-1 ring-[#E0E0E0]',
    headerBorder: 'border-b border-[#E0E0E0]',
    titleClass: 'text-[18px] font-semibold text-[rgba(0,0,0,0.9)]',
    subtitleClass: 'text-[14px] text-[#666]',
    labelClass: 'text-[12px] font-semibold text-[rgba(0,0,0,0.9)]',
    inputClass:
      'rounded-md border border-[#E0E0E0] bg-white text-[14px] text-[rgba(0,0,0,0.9)] placeholder:text-[#666] focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/30',
    submitClass:
      'rounded-full bg-[#0A66C2] text-[14px] font-semibold text-white hover:bg-[#004182]',
    submitStyle: undefined,
    footerClass: 'text-[12px] text-[#666]',
    closeClass: 'text-[#666] hover:bg-[#0000000a]',
  },
};

const SocialAnlagenprofisMessageModal = ({ open, platform = 'instagram', onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const meta = PLATFORM_META[platform] ?? PLATFORM_META.instagram;
  const Logo = meta.Logo;
  const fieldId = (field) => `social-msg-${platform}-${field}`;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) {
      setName('');
      setEmail('');
      setMessage('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      toast.error('Bitte füllen Sie alle Felder aus.');
      return;
    }

    setSubmitting(true);
    try {
      // Session 82.101 · Supabase-Insert entfernt (siehe AdminSocialPreviewMessages
      // BLOCKED_SAFE_BACKEND_MISSING). Bis sicherer FastAPI-Endpoint existiert,
      // erhält der Nutzer eine transparente Info-Nachricht statt Fake-Success.
      toast.info('Der Nachrichten-Kanal wird aktuell erneuert (82.101). Bitte kontaktieren Sie uns direkt per E-Mail.');
      const error = null;
      if (error) throw error;
      onClose();
    } catch {
      toast.error('Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 bg-black/45"
        onClick={submitting ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`social-anlagenprofis-message-title-${platform}`}
        className={cn(SOCIAL_PREVIEW_LIGHT, 'relative w-full max-w-md overflow-hidden shadow-2xl', meta.shell)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('flex items-start gap-3 px-5 pb-4 pt-5', meta.headerBorder)}>
          <Logo />
          <div className="min-w-0 flex-1 pr-8">
            <h2 id={`social-anlagenprofis-message-title-${platform}`} className={meta.titleClass}>
              {meta.title}
            </h2>
            <p className={cn('mt-1 leading-snug', meta.subtitleClass)}>{meta.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              'absolute right-3 top-3 rounded-full p-1.5 transition-colors disabled:opacity-50',
              meta.closeClass,
            )}
            aria-label="Schließen"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5">
          <div className="space-y-3.5">
            <div>
              <label htmlFor={fieldId('name')} className={cn('mb-1 block', meta.labelClass)}>
                Name
              </label>
              <input
                id={fieldId('name')}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ihr Name"
                required
                disabled={submitting}
                className={cn('w-full px-3 py-2.5 outline-none transition-colors disabled:opacity-60', meta.inputClass)}
              />
            </div>
            <div>
              <label htmlFor={fieldId('email')} className={cn('mb-1 block', meta.labelClass)}>
                E-Mail
              </label>
              <input
                id={fieldId('email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
                disabled={submitting}
                className={cn('w-full px-3 py-2.5 outline-none transition-colors disabled:opacity-60', meta.inputClass)}
              />
            </div>
            <div>
              <label htmlFor={fieldId('body')} className={cn('mb-1 block', meta.labelClass)}>
                Nachricht
              </label>
              <textarea
                id={fieldId('body')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ihre Nachricht…"
                rows={4}
                required
                disabled={submitting}
                className={cn(
                  'w-full resize-none px-3 py-2.5 outline-none transition-colors disabled:opacity-60',
                  meta.inputClass,
                )}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'mt-5 flex w-full items-center justify-center gap-2 py-2.5 transition-colors disabled:opacity-60',
              meta.submitClass,
            )}
            style={meta.submitStyle}
          >
            <Send className="h-4 w-4" strokeWidth={2} />
            {submitting ? 'Wird gesendet…' : 'Nachricht absenden'}
          </button>

          <p className={cn('mt-4 text-center leading-relaxed', meta.footerClass)}>
            Ihre Nachricht wird nach dem Absenden direkt an die Fröhlich Vermögensberatung GmbH zur Bearbeitung weitergeleitet.
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default SocialAnlagenprofisMessageModal;
