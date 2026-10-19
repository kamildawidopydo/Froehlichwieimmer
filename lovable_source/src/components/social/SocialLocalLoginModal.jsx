import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Mail, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOCIAL_PREVIEW_LIGHT } from '@/components/social/socialPreviewLight';

const PLATFORM_META = {
  instagram: {
    title: 'Bei Instagram fortfahren',
    subtitle: 'Melden Sie sich lokal an, um diese Funktion zu nutzen.',
    primaryClass: 'text-white hover:opacity-95',
    primaryStyle: {
      background: 'linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%)',
    },
    disclaimer:
      'Lokale Anmeldung · Es wird kein Passwort abgefragt. Es werden keine Daten an Facebook, Instagram oder LinkedIn übertragen.',
    Logo: () => (
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md"
        style={{
          background: 'linear-gradient(45deg, #F58529 0%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%)',
        }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </span>
    ),
  },
  facebook: {
    title: 'Bei Facebook fortfahren',
    subtitle: 'Melden Sie sich lokal an, um diese Funktion zu nutzen.',
    primaryClass: 'bg-[#1877F2] text-white hover:bg-[#166fe5]',
    primaryStyle: undefined,
    disclaimer:
      'Lokale Anmeldung · Es wird kein Passwort abgefragt. Es werden keine Daten an Facebook, Instagram oder LinkedIn übertragen.',
    Logo: () => (
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1877F2] text-[28px] font-bold text-white shadow-md"
        aria-hidden
      >
        f
      </span>
    ),
  },
  linkedin: {
    title: 'Bei LinkedIn fortfahren',
    subtitle: 'Melden Sie sich lokal an, um diese Funktion zu nutzen.',
    primaryClass: 'bg-[#0A66C2] text-white hover:bg-[#004182]',
    primaryStyle: undefined,
    disclaimer:
      'Lokale Anmeldung · Es wird kein Passwort abgefragt. Es werden keine Daten an Facebook, Instagram oder LinkedIn übertragen.',
    Logo: () => (
      <span
        className="flex h-14 w-14 items-center justify-center rounded-md bg-[#0A66C2] text-[22px] font-bold text-white shadow-md"
        aria-hidden
      >
        in
      </span>
    ),
  },
};

const SocialLocalLoginModal = ({ open, platform = 'instagram', onClose, onContinue }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.instagram;
  const Logo = meta.Logo;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setDisplayName('');
      setEmail('');
    }
  }, [open]);

  if (!open) return null;

  const handleContinue = () => {
    const name = displayName.trim();
    if (!name) return;
    onContinue?.({ displayName: name, email: email.trim() || null });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-local-login-title"
        className={cn(SOCIAL_PREVIEW_LIGHT, 'relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10')}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-[#94a3b8] transition-colors hover:bg-black/[0.04] hover:text-[#4a5568]"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <div className="px-6 pb-6 pt-10 text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2
            id="social-local-login-title"
            className="font-display mt-6 text-[1.65rem] font-light leading-snug tracking-[-0.02em] text-[#1a1a1a]"
            style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
          >
            {meta.title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#64748b]">{meta.subtitle}</p>

          <div className="mt-8 space-y-4 text-left">
            <div>
              <label htmlFor="social-login-display-name" className="mb-1.5 block text-[12px] font-medium text-[#64748b]">
                Anzeigename
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" strokeWidth={1.75} />
                <input
                  id="social-login-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ihr Anzeigename"
                  className="w-full rounded-xl border border-[#e2e8f0] py-2.5 pl-10 pr-3 text-[15px] text-[#1a1a1a] outline-none transition-colors focus:border-[#94a3b8] focus:ring-1 focus:ring-[#94a3b8]/30"
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="social-login-email" className="text-[12px] font-medium text-[#64748b]">
                  E-Mail-Adresse
                </label>
                <span className="text-[11px] italic text-[#94a3b8]">optional</span>
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" strokeWidth={1.75} />
                <input
                  id="social-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="optional"
                  className="w-full rounded-xl border border-[#e2e8f0] py-2.5 pl-10 pr-3 text-[15px] text-[#1a1a1a] outline-none transition-colors focus:border-[#94a3b8] focus:ring-1 focus:ring-[#94a3b8]/30"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!displayName.trim()}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold transition-colors disabled:opacity-45',
                meta.primaryClass,
              )}
              style={meta.primaryStyle}
            >
              Fortfahren
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-[#e2e8f0] bg-white py-3 text-[15px] font-semibold text-[#1a1a1a] transition-colors hover:bg-[#f8fafc]"
            >
              Abbrechen
            </button>
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-[#94a3b8]">{meta.disclaimer}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SocialLocalLoginModal;
