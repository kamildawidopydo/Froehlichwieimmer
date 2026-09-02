import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * „So einfach geht's" — Rahmenlose 3-Schritt-Sektion im Editorial-Stil.
 *
 * Der `imageSrc`-Prop (default: null) rendert eine Royal-Blue-SVG als Platzhalter.
 * Später einfach ein echtes Bild reingeben, z.B.:
 *   import creditProcessImage from '@/assets/credit-process.png';
 *   <CreditProcessSteps imageSrc={creditProcessImage} imageAlt="Beispielhafter Ablauf eines digitalen Kreditantrags" />
 */
const STEPS = [
  {
    n: '1',
    title: 'Eckdaten für den Wunschkredit eingeben',
    body: 'Geben Sie die wichtigsten Angaben zu Ihrem gewünschten Kredit ein — Wunschbetrag, Laufzeit und Verwendungszweck.',
  },
  {
    n: '2',
    title: 'Kreditangebote erhalten und vergleichen',
    body: 'Passende Angebote verschiedener Anbieter werden übersichtlich dargestellt und lassen sich in Ruhe vergleichen.',
  },
  {
    n: '3',
    title: 'Kreditantrag abschließen',
    body: 'Der weitere Antrag erfolgt beim jeweiligen Anbieter. Angaben, Identifizierung und Unterlagen werden dort entsprechend dessen Prozess eingereicht.',
  },
];

const DefaultIllustration = () => (
  // Dezente Royal-Blue-SVG-Platzhalter-Illustration:
  // digitaler Kreditantrag → Identitätsprüfung → Dokumentenupload → Abschluss.
  // Verwendet ausschließlich Royal-Blue-Töne + Warmgold-Akzent, keine externen Marken/Logos.
  <svg
    role="img"
    aria-label="Beispielhafter Ablauf eines digitalen Kreditantrags"
    viewBox="0 0 480 360"
    className="h-auto w-full max-w-[520px]"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="cpBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="rgb(237,240,247)" />
        <stop offset="1" stopColor="rgb(247,243,236)" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="480" height="360" fill="url(#cpBg)" />

    {/* Phone mockup */}
    <rect x="60" y="45" width="180" height="290" rx="18" fill="#ffffff" stroke="rgb(54,168,82)" strokeWidth="2" />
    <rect x="72" y="65" width="156" height="24" rx="4" fill="rgb(237,240,247)" />
    <rect x="72" y="98" width="156" height="10" rx="2" fill="rgb(199,210,229)" />
    <rect x="72" y="115" width="110" height="10" rx="2" fill="rgb(199,210,229)" />
    <rect x="72" y="145" width="156" height="34" rx="4" fill="rgb(237,240,247)" />
    <rect x="82" y="156" width="60" height="12" rx="2" fill="rgb(54,168,82)" />
    <rect x="72" y="188" width="156" height="34" rx="4" fill="rgb(237,240,247)" />
    <rect x="82" y="199" width="90" height="12" rx="2" fill="rgb(54,168,82)" />
    <rect x="72" y="240" width="156" height="34" rx="17" fill="rgb(54,168,82)" />
    <rect x="118" y="252" width="64" height="10" rx="2" fill="#ffffff" />
    <circle cx="150" cy="309" r="8" fill="none" stroke="rgb(199,210,229)" strokeWidth="2" />

    {/* Arrow */}
    <path d="M256 180 L296 180" stroke="rgb(181,136,83)" strokeWidth="2" strokeLinecap="round" />
    <path d="M290 174 L296 180 L290 186" stroke="rgb(181,136,83)" strokeWidth="2" strokeLinecap="round" fill="none" />

    {/* Document + ID card */}
    <rect x="308" y="70" width="128" height="80" rx="6" fill="#ffffff" stroke="rgb(54,168,82)" strokeWidth="2" />
    <circle cx="330" cy="100" r="12" fill="rgb(237,240,247)" stroke="rgb(54,168,82)" strokeWidth="1.5" />
    <rect x="352" y="86" width="70" height="8" rx="2" fill="rgb(54,168,82)" />
    <rect x="352" y="102" width="54" height="6" rx="2" fill="rgb(199,210,229)" />
    <rect x="316" y="122" width="112" height="6" rx="2" fill="rgb(199,210,229)" />
    <rect x="316" y="134" width="76" height="6" rx="2" fill="rgb(199,210,229)" />

    {/* Upload arrow (Dokumentenupload) */}
    <rect x="308" y="170" width="128" height="70" rx="6" fill="#ffffff" stroke="rgb(54,168,82)" strokeWidth="2" />
    <path d="M372 218 L372 188 M362 198 L372 188 L382 198" stroke="rgb(54,168,82)" strokeWidth="2" strokeLinecap="round" fill="none" />
    <rect x="336" y="224" width="72" height="4" rx="2" fill="rgb(199,210,229)" />

    {/* Success check (Abschluss) */}
    <circle cx="372" cy="290" r="34" fill="rgb(54,168,82)" />
    <path d="M356 291 L368 303 L390 279" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

    {/* Gold accent dot */}
    <circle cx="440" cy="60" r="6" fill="rgb(181,136,83)" />
  </svg>
);

const CreditProcessSteps = ({ imageSrc = null, imageAlt = 'Beispielhafter Ablauf eines digitalen Kreditantrags' }) => (
  <section
    className="editorial-shell py-16 sm:py-20"
    aria-labelledby="credit-process-steps-heading"
    data-testid="credit-process-steps"
  >
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Ablauf</p>
        <h2
          id="credit-process-steps-heading"
          className="mt-3 font-serif text-3xl leading-tight text-bank-ink sm:text-4xl"
        >
          So einfach geht's
        </h2>
        <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-bank-text-muted">
          In drei transparenten Schritten zum passenden Kreditangebot — bequem online.
        </p>

        <ol className="mt-10 space-y-8" aria-label="Drei Schritte zum Kredit">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative grid grid-cols-[auto_1fr] gap-5" data-testid={`credit-process-step-${s.n}`}>
              <div className="relative flex flex-col items-center">
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center font-serif text-lg text-bank-primary"
                >
                  {s.n}
                </span>
                {i < STEPS.length - 1 && (
                  <span aria-hidden className="mt-1 h-14 w-px bg-bank-gold/40" />
                )}
              </div>
              <div className="pt-1.5">
                <h3 className="font-serif text-xl leading-snug text-bank-ink">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-bank-text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <a
            href="#credit-results"
            className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-bank-primary underline-offset-4 transition-colors hover:text-bank-primary-hover hover:underline"
            data-testid="credit-process-steps-cta"
          >
            Jetzt Kreditvergleich starten
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.7} />
          </a>
        </div>
      </div>

      <div className="flex items-center justify-center lg:justify-end">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAlt}
            loading="lazy"
            decoding="async"
            className="h-auto w-full max-w-[520px]"
          />
        ) : (
          <DefaultIllustration />
        )}
      </div>
    </div>
  </section>
);

export default CreditProcessSteps;
