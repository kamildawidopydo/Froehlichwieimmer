import { cn } from '@/lib/utils';

const TRUST_BADGES = [
  {
    src: '/assets/footer/trust/schufa-neutral.png',
    alt: '100 % SCHUFA-neutral',
    className: 'h-[4.5rem] w-auto sm:h-[5rem]',
  },
  {
    src: '/assets/footer/trust/ekomi-kundenauszeichnung.png',
    alt: 'eKomi Kundenauszeichnung',
    className: 'h-[4.25rem] w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem]',
  },
  {
    src: '/assets/footer/trust/tuv-saarland-datenschutz.png',
    alt: 'TÜV Saarland — Geprüfter Datenschutz, Systemprüfung',
    className: 'h-[2.75rem] w-auto max-w-[11rem] sm:h-[3rem] sm:max-w-[12.5rem]',
  },
];

export default function FooterTrustBadges({ className }) {
  return (
    <ul
      className={cn(
        'flex flex-wrap items-center justify-end gap-4 sm:gap-5',
        className,
      )}
      aria-label="Zertifizierungen und Vertrauenssiegel"
    >
      {TRUST_BADGES.map((badge) => (
        <li key={badge.src} className="shrink-0">
          <img
            src={badge.src}
            alt={badge.alt}
            width={120}
            height={80}
            loading="lazy"
            decoding="async"
            className={cn('object-contain object-center', badge.className)}
          />
        </li>
      ))}
    </ul>
  );
}
