/** @typedef {'aktien' | 'anleihen' | 'fonds' | 'tagesgeld' | 'festgeld' | 'flexgeld'} ProductInquiryKey */
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { productInquiryCards } from '@/data/productInquiryQuestions';
import { siteImages } from '@/data/siteImages';

const EASE = [0.22, 1, 0.36, 1];

const PAPER_NOISE_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E";

/** Produkt-Screenshot: persönlicher Bereich / Dashboard (public) */
const EDITORIAL_KONDITIONEN_IMAGE_SRC = `${process.env.PUBLIC_URL ?? ''}/assets/marketing/home-konditionen-dashboard.png`;

const PRODUCT_ORDER = /** @type {const} */ (['aktien', 'anleihen', 'fonds', 'tagesgeld', 'festgeld', 'flexgeld']);

const PROCESS_ICON = siteImages.home.processIcons;

/** Prozess-Schritte — Infografik (keine Button-Karten) */
const PROCESS_STEPS = [
  {
    key: '1',
    title: 'Produkt wählen',
    detail: 'Aktien, Anleihen, Fonds, Tages-, Fest- oder Flexgeld',
    iconSrc: PROCESS_ICON.chooseProduct,
    iconAlt: 'Produkt wählen — gestapelte Produktkarten',
  },
  {
    key: '2',
    title: 'Fragen beantworten',
    detail: 'Kurzer Eignungs-Check',
    iconSrc: PROCESS_ICON.answerQuestions,
    iconAlt: 'Fragen beantworten — Checkliste',
  },
  {
    key: '3',
    title: 'Daten senden',
    detail: 'Sicher & verschlüsselt',
    iconSrc: PROCESS_ICON.sendData,
    iconAlt: 'Daten senden — sichere Übertragung',
  },
  {
    key: '4',
    title: 'Persönliches Angebot',
    detail: 'Individuelle Konditionen',
    iconSrc: PROCESS_ICON.personalOffer,
    iconAlt: 'Persönliches Angebot — bestätigtes Dokument',
    isFinal: true,
  },
];

function ProcessInfographic({ prefersReduced }) {
  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-48px' },
    transition: { duration: prefersReduced ? 0 : 0.55, ease: EASE, delay: prefersReduced ? 0 : 0.08 * i },
  });

  return (
    <div className="relative mt-12 border-t border-[rgb(var(--bank-ink)/0.08)] pt-10 lg:mt-14 lg:pt-12">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-bank-primary/75">
          So geht&apos;s weiter
        </p>
        <p className="mt-3 font-display text-lg font-light tracking-tight text-bank-ink sm:text-xl">
          Vier Schritte bis zu Ihrem Angebot
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-4xl lg:mt-12">
        {/* Horizontale Verbindungslinie (Desktop) */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[12%] right-[12%] top-[1.65rem] hidden h-px lg:block"
        >
          <div className="h-full bg-gradient-to-r from-transparent via-[rgb(var(--bank-primary)/0.35)] to-transparent" />
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[rgb(var(--bank-primary)/0.22)]" />
        </div>

        <ol className="relative grid gap-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
          {PROCESS_STEPS.map((step, i) => {
            const { key, title, detail, isFinal, iconSrc, iconAlt } = step;

            return (
            <motion.li
              key={key}
              {...reveal(i)}
              className="relative flex min-w-0 flex-col items-center px-3 pb-8 text-center last:pb-0 sm:pb-0"
            >
              {/* Vertikale Verbindung (Mobile / Tablet) */}
              {i < PROCESS_STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-[3.35rem] h-[calc(100%-3.35rem)] w-px -translate-x-1/2 bg-gradient-to-b from-[rgb(var(--bank-primary)/0.28)] to-[rgb(var(--bank-primary)/0.08)] sm:hidden"
                />
              ) : null}

              {/* Pfeil zwischen Schritten (Desktop) */}
              {i < PROCESS_STEPS.length - 1 ? (
                <ArrowRight
                  aria-hidden
                  className="pointer-events-none absolute -right-1.5 top-[1.15rem] hidden h-3.5 w-3.5 text-[rgb(var(--bank-primary)/0.45)] lg:block xl:-right-2"
                  strokeWidth={LUCIDE_STROKE}
                />
              ) : null}

              {/* Knoten */}
              <div className="relative z-[1] flex flex-col items-center">
                <div
                  className={cn(
                    'relative flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full sm:h-14 sm:w-14',
                    isFinal
                      ? 'bg-[linear-gradient(145deg,rgb(var(--bank-primary)),rgb(var(--bank-ink)))] shadow-[0_10px_28px_-10px_rgb(var(--bank-primary)/0.55)]'
                      : 'border-2 border-[rgb(var(--bank-primary)/0.35)] bg-white shadow-[0_4px_18px_-8px_rgb(var(--bank-ink)/0.18)]',
                  )}
                >
                  <img
                    src={iconSrc}
                    alt={iconAlt}
                    width={48}
                    height={48}
                    decoding="async"
                    className={cn(
                      'h-8 w-8 shrink-0 object-contain object-center sm:h-9 sm:w-9',
                      isFinal && 'brightness-0 invert',
                    )}
                  />
                  {!isFinal ? (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-bank-ink font-mono text-[9px] font-bold tabular-nums text-white shadow-sm">
                      {key}
                    </span>
                  ) : null}
                </div>

                <span className="mt-4 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-bank-text-muted">
                  Schritt {key}
                </span>
                <p className="mt-1.5 font-display text-[13px] font-light leading-snug text-bank-ink sm:text-sm">
                  {title}
                </p>
                <p className="mt-1 max-w-[11rem] text-[11px] leading-relaxed text-bank-text-muted">
                  {detail}
                </p>
              </div>
            </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Exklusive Konditionen — qualifizierte Anleger */
const QUALIFIED_BENEFIT_ROWS = [
  {
    key: 'aktien-rabatt',
    title: (
      <>
        Bis zu <strong className="font-semibold text-bank-ink">3&nbsp;% Abschlag</strong> auf ausgewählte Aktienkäufe*
      </>
    ),
    detail: null,
  },
  {
    key: 'aktien-konditionen',
    title: (
      <>
        Exklusive <strong className="font-semibold text-bank-ink">Aktienkonditionen</strong> &amp; Cashback-Vorteile
      </>
    ),
    detail: null,
  },
  {
    key: 'anleihen',
    title: (
      <>
        Exklusive <strong className="font-semibold text-bank-ink">Anleihe-Konditionen</strong> &amp; Bonuszinsen
      </>
    ),
    detail:
      'Zugang zu attraktiven Kupons, Zeichnungsvorteilen und exklusiven Emissionsangeboten.',
  },
  {
    key: 'einlagen',
    title: (
      <>
        Bis zu <strong className="font-semibold text-bank-ink">300&nbsp;€ Bonus</strong> auf Tagesgeld, Festgeld &amp;
        Flexgeld
      </>
    ),
    detail: null,
  },
  {
    key: 'partner',
    title: (
      <>
        Zugang zu ausgewählten <strong className="font-semibold text-bank-ink">Partnerbank-Angeboten</strong>
      </>
    ),
    detail: null,
  },
  {
    key: 'profil',
    title: (
      <>
        Individuelle <strong className="font-semibold text-bank-ink">Lösungen</strong> passend zu Ihrem
        Anlegerprofil
      </>
    ),
    detail: null,
  },
];

/**
 * Produktwahl mit Kurzfragebogen — vor dem Produktüberblick.
 */
/**
 * @param {{ onOpenWizard: (key: ProductInquiryKey) => void }} props
 */
const HomeInvestmentSpectrum = ({ onOpenWizard }) => {
  const prefersReduced = useReducedMotion();

  const reveal = (i = 0) => ({
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-72px' },
    transition: { duration: prefersReduced ? 0 : 0.62, ease: EASE, delay: prefersReduced ? 0 : 0.04 * i },
  });

  return (
    <div
      id="home-investment-spectrum"
      className="relative border-b border-[rgb(var(--bank-ink)/0.06)] bg-[linear-gradient(180deg,#f4f4f2_0%,#fafafa_45%,#ffffff_100%)]"
      data-testid="home-investment-spectrum"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[length:180px_180px] opacity-[0.35] mix-blend-multiply"
        style={{ backgroundImage: `url("${PAPER_NOISE_DATA_URL}")` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/4 h-[min(55vw,420px)] w-[min(55vw,420px)] rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--bank-ink)/0.04),transparent_68%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-[min(40vw,320px)] w-[min(40vw,320px)] rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--bank-primary)/0.08),transparent_70%)] blur-3xl"
      />

      <section className="relative border-t border-[rgb(var(--bank-ink)/0.06)] py-14 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <motion.article
            {...reveal(0)}
            className="relative mx-auto max-w-[min(100%,72rem)] overflow-hidden rounded-[1.75rem] border border-[rgb(var(--bank-ink)/0.08)] bg-white p-7 shadow-[0_1px_0_rgb(255_255_255/0.9)_inset,0_48px_100px_-50px_rgb(9_33_66/0.12)] sm:p-10 md:p-12 lg:p-14"
          >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 top-0 h-[min(100%,28rem)] w-[min(70%,28rem)] rounded-full bg-[radial-gradient(ellipse_at_center,rgb(var(--bank-primary)/0.09),transparent_68%)] blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--bank-ink)/0.06),transparent_65%)] blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--bank-ink)/0.14)] to-transparent"
              />

              <div className="relative">
                <header className="mx-auto max-w-[52rem] text-center">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-bank-primary/80 sm:text-xs">
                    Qualifizierte Anleger
                  </p>
                  <h3 className="mt-5 font-display text-display-sm text-bank-ink sm:mt-6">
                    Exklusive Konditionen. Für qualifizierte Anleger.
                  </h3>
                  <div
                    aria-hidden
                    className="mx-auto mt-7 flex h-px w-20 items-center justify-center gap-2 sm:mt-8 sm:w-24"
                  >
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-bank-primary/50" />
                    <span className="h-1 w-1 shrink-0 rounded-full bg-bank-primary/60" />
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-bank-primary/50" />
                  </div>
                  <p className="mx-auto mt-8 max-w-[46rem] text-lg leading-[1.75] text-bank-text-muted sm:text-xl sm:leading-[1.72]">
                    Nach erfolgreicher Beantwortung ausgewählter Anlegerfragen und einer internen Eignungsprüfung
                    erhalten Sie Zugang zu exklusiven Konditionen für{' '}
                    <span className="font-semibold text-bank-ink">Aktien, Anleihen</span> sowie für{' '}
                    <span className="font-semibold text-bank-ink">Tagesgeld, Festgeld und Flexgeld</span>.
                  </p>
                </header>

                <div className="mx-auto mt-12 max-w-[68rem] sm:mt-14 lg:mt-16">
                  <motion.figure
                    {...reveal(1)}
                    className="group relative overflow-hidden rounded-[1.5rem] border border-[rgb(var(--bank-ink)/0.1)] shadow-[0_36px_90px_-50px_rgb(9_33_66/0.4)]"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/11] lg:aspect-[1024/585]">
                      <img
                        src={EDITORIAL_KONDITIONEN_IMAGE_SRC}
                        alt="Anlegerin verwaltet Vermögen, Anlagen und Marktdaten am Laptop in ihrem persönlichen Bereich."
                        width={1024}
                        height={585}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-[42%_center] transition-[transform,filter] duration-1200 ease-out group-hover:scale-[1.02] group-hover:brightness-[1.03] sm:object-center"
                      />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bank-ink/75 via-bank-ink/20 to-bank-ink/35 sm:from-bank-ink/65 sm:via-bank-ink/10 sm:to-transparent"
                      />
                      <div className="absolute left-0 right-0 top-0 flex items-start justify-between gap-3 px-4 py-4 sm:items-center sm:px-8 sm:py-6">
                        <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-white/90 sm:text-[10px] sm:tracking-[0.32em]">
                          Persönlicher Bereich
                        </p>
                        <p className="hidden max-w-[14rem] text-right font-mono text-[9px] uppercase leading-snug tracking-[0.18em] text-white/80 sm:block sm:text-[10px] sm:tracking-[0.28em]">
                          Symbolik
                        </p>
                      </div>
                      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-10 sm:pb-9">
                        <p className="max-w-[18ch] font-display text-[1.35rem] font-light leading-[1.2] tracking-tight text-white sm:max-w-[34ch] sm:text-[1.875rem] lg:text-[2.125rem]">
                          Vermögen, Anlagen und Markt — an einem Ort.
                        </p>
                        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/80 sm:hidden">
                          Symbolik
                        </p>
                      </figcaption>
                    </div>
                  </motion.figure>

                  <div className="mt-14 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-[rgb(var(--bank-ink)/0.14)] pb-6 sm:mt-16 lg:mt-20">
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-bank-primary/80">
                        Ihre Vorteile
                      </p>
                      <p className="mt-3 font-display text-2xl font-light tracking-tight text-bank-ink sm:text-3xl lg:text-[2rem]">
                        Sechs Konditionen, je nach Anlageform und Investitionshöhe.
                      </p>
                    </div>
                  </div>

                  <ol className="mt-10 grid list-none gap-x-10 gap-y-10 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-x-12 lg:gap-y-14">
                    {QUALIFIED_BENEFIT_ROWS.map((row, i) => (
                      <motion.li
                        key={row.key}
                        {...reveal(i + 2)}
                        className="group/item relative pt-7"
                      >
                        <span
                          aria-hidden
                          className="absolute left-0 top-0 h-px w-10 bg-bank-primary/60 transition-[width] duration-500 ease-out group-hover/item:w-16"
                        />
                        <p className="mt-3 font-display text-[1.1rem] font-light leading-[1.4] text-bank-ink sm:text-[1.2rem] lg:text-[1.25rem]">
                          {row.title}
                        </p>
                        {row.detail ? (
                          <p className="mt-3 text-[0.9375rem] leading-relaxed text-bank-text-muted">
                            {row.detail}
                          </p>
                        ) : null}
                      </motion.li>
                    ))}
                  </ol>
                </div>

                <p className="mx-auto mt-14 max-w-[48rem] text-center text-sm leading-relaxed text-bank-text-muted sm:mt-16 sm:text-[0.9375rem]">
                  * Abhängig von Marktbedingungen, Produktverfügbarkeit und internen Richtlinien. Kein Rechtsanspruch;
                  die endgültigen Konditionen ergeben sich aus dem individuellen Prüfungsergebnis.
                </p>

                <div className="mt-10 overflow-hidden rounded-xl border border-[rgb(var(--bank-ink)/0.1)] sm:mt-12 lg:mt-14">
                  <div className="grid divide-y divide-[rgb(var(--bank-ink)/0.08)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    {PRODUCT_ORDER.map((key, i) => {
                      const meta = productInquiryCards[key];
                      return (
                        <motion.div
                          key={key}
                          {...reveal(i + 3)}
                          className="flex min-h-full flex-col bg-white px-6 py-8 sm:px-7 sm:py-9 lg:px-8"
                        >
                          <h4 className="font-display text-[1.35rem] font-light leading-snug tracking-tight text-bank-ink sm:text-[1.4rem]">
                            {meta.title}
                          </h4>
                          <div className="mt-5 flex-1 space-y-4 text-[14px] leading-[1.7] text-bank-text-muted">
                            <p>{meta.description}</p>
                            {meta.descriptionExtra ? <p>{meta.descriptionExtra}</p> : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenWizard(key)}
                            data-testid={`spectrum-wizard-${key}`}
                            className="group/btn mt-8 inline-flex w-fit items-center gap-1.5 rounded-full border border-bank-border/80 px-5 py-2.5 text-[13px] font-normal text-bank-text transition-colors duration-200 hover:border-bank-primary/30 hover:text-bank-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/25 focus-visible:ring-offset-2"
                          >
                            Fragen beantworten
                            <ArrowRight
                              className="h-3.5 w-3.5 opacity-50 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:opacity-80"
                              strokeWidth={1.25}
                              aria-hidden
                            />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <ProcessInfographic prefersReduced={prefersReduced} />

                <p className="mt-8 text-center text-[11px] leading-relaxed text-bank-text-muted sm:text-xs">
                  Ihre Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.
                </p>
              </div>
            </motion.article>
        </div>
      </section>
    </div>
  );
};

export default HomeInvestmentSpectrum;
