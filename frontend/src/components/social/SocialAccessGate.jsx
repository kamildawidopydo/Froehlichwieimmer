import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const COPY = {
  platform: {
    title: 'Profilzugriff nicht verfügbar',
    body: (label) =>
      `Aus rechtlichen Gründen können wir keinen direkten Zugriff auf unser offizielles ${label}-Profil einbinden. Stattdessen sehen Sie eine integrierte Vorschau mit ausgewählten Inhalten unserer Seite.`,
    foot: (label) =>
      `Die Darstellung dient ausschließlich der Information. Es handelt sich nicht um die Live-Ansicht von ${label}.`,
  },
  profile: {
    title: 'Profilzugriff nicht verfügbar',
    body: () =>
      'Aus rechtlichen und datenschutzrechtlichen Gründen wird die direkte Profilansicht innerhalb dieser Webseiten-Vorschau nicht angeboten.',
    foot: () =>
      'Diese Ansicht zeigt eine integrierte Vorschau der jeweiligen Social-Media-Präsenz innerhalb unserer Webseite.',
  },
  composer: {
    title: 'Beitrag kann nicht veröffentlicht werden',
    body: () =>
      'Das Erstellen von Beiträgen ist in dieser Social-Media-Vorschau nicht möglich. Sie sehen eine statische Darstellung unserer Seite innerhalb unserer Website.',
    foot: () =>
      'Echte Veröffentlichungen erfolgen ausschließlich über offizielle Kanäle — nicht über diese Vorschau.',
  },
  message: {
    title: 'Nachrichten nicht verfügbar',
    body: (label) =>
      `Direktnachrichten lassen sich in dieser ${label}-Vorschau nicht öffnen. Für Anfragen nutzen Sie bitte die Kontaktmöglichkeiten auf unserer Website.`,
    foot: () => 'Es handelt sich nicht um die echte Instagram-Inbox.',
  },
  search: {
    title: 'Suche nicht verfügbar',
    body: (label) =>
      `Die ${label}-Suche ist in dieser integrierten Vorschau nicht verfügbar. Sie sehen eine statische Darstellung unserer Social-Media-Präsenz — keine Live-Verbindung zur Plattform.`,
    foot: (label) =>
      `Echte Suchfunktionen von ${label} können nur in der offiziellen App oder auf der Website der Plattform genutzt werden.`,
  },
};

const SocialAccessGate = ({
  variant = 'platform',
  platformLabel = 'Facebook',
  onClose,
  onAcknowledge,
  compact = false,
  className,
}) => {
  const copy = COPY[variant] ?? COPY.platform;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-[#FDFBF7] text-center',
        compact ? 'px-5 py-8' : 'min-h-[min(420px,70vh)] px-6 py-10 sm:px-10 sm:py-12',
        className,
      )}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border border-[#E8E4DC] bg-white shadow-sm"
        aria-hidden
      >
        <ShieldCheck className="h-8 w-8 text-[#1a3a6b]" strokeWidth={1.25} />
      </div>

      <h2
        id={
          variant === 'profile'
            ? 'social-profile-gate-title'
            : variant === 'composer'
              ? 'social-composer-gate-title'
              : variant === 'search'
                ? 'social-search-gate-title'
                : undefined
        }
        className={cn(
          'font-display max-w-md font-light leading-snug tracking-[-0.02em] text-[#1a1a1a]',
          compact ? 'mt-6 text-xl' : 'mt-8 text-[1.65rem] sm:text-[1.85rem]',
        )}
        style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}
      >
        {copy.title}
      </h2>

      <p className={cn('max-w-lg leading-relaxed text-[#4a5568]', compact ? 'mt-4 text-[14px]' : 'mt-5 text-[15px]')}>
        {copy.body(platformLabel)}
      </p>

      <p className={cn('max-w-md leading-relaxed text-[#94a3b8]', compact ? 'mt-3 text-[12px]' : 'mt-4 text-[13px]')}>
        {copy.foot(platformLabel)}
      </p>

      <div
        className={cn(
          'flex w-full flex-wrap items-center justify-center gap-3',
          compact ? 'mt-8' : 'mt-10 sm:justify-end',
          !compact && 'max-w-sm sm:max-w-none',
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-5 py-2.5 text-[14px] font-medium text-[#4a5568] transition-colors hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3a6b]/30"
        >
          Schließen
        </button>
        <button
          type="button"
          onClick={onAcknowledge}
          className="rounded-full bg-[#1F2937] px-6 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3a6b]/40 focus-visible:ring-offset-2"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
};

export default SocialAccessGate;
