import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PageMeta from '@/components/PageMeta';
import Pullquote from '@/components/editorial/Pullquote';
import TocSticky from '@/components/editorial/TocSticky';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'rahmen', label: 'Rechtliche Compliance' },
  { id: 'aufsicht', label: 'Regulatorischer Rahmen' },
  { id: 'kunden', label: 'Kundenbeziehungen' },
  { id: 'aml', label: 'Geldwäscheprävention' },
  { id: 'kontrolle', label: 'Interne Kontrolle' },
];

const articleSplit = 'flex w-full min-w-0 max-w-full flex-col gap-y-10 lg:grid lg:grid-cols-12 lg:gap-x-8';
const articleMainCol = 'w-full min-w-0 max-w-full lg:col-span-7';
const articleSideCol = 'w-full min-w-0 max-w-full lg:col-span-5';

const ComplianceImage = ({ src, alt, className = '' }) => (
  <div
    className={cn(
      'relative w-full min-w-0 overflow-hidden border border-bank-border bg-muted/40 shadow-editorial-md',
      className,
    )}
  >
    <span className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-bank-gold/65 to-transparent" />
    <img src={src} alt={alt} className="h-full w-full object-cover object-center" loading="lazy" />
  </div>
);

const Compliance = () => {
  const reduce = useReducedMotion();
  const fade = (i = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.55, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] },
  });

  const SectionHead = ({ id, title }) => (
    <header id={id} className="w-full min-w-0 max-w-full scroll-mt-32">
      <h2
        className="w-full max-w-full break-words font-display text-[clamp(1.35rem,4vw+0.65rem,2.25rem)] font-light leading-[1.15] tracking-[-0.005em] text-bank-text [overflow-wrap:anywhere]"
        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
      >
        {title}
      </h2>
      <div className="mt-5 h-px w-16 bg-bank-gold/55" aria-hidden />
    </header>
  );

  const proseClass =
    'prose-copy mt-8 w-full min-w-0 max-w-full space-y-6 font-sans text-[15px] leading-[1.8] text-bank-text-muted sm:max-w-prose sm:text-[15.5px] sm:leading-[1.85]';

  return (
    <div className="min-h-screen w-full min-w-0 bg-bank-bg">
      <PageMeta
        title="Rechtliche Compliance"
        description="Rechtliche und regulatorische Grundlagen bei Fröhlich Vermögensberatung: Compliance-Standards, Verantwortlichkeiten und Aufsicht."
        path="/compliance"
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-bank-ink text-white">
        <div className="topo-pattern absolute inset-0 opacity-[0.07]" aria-hidden />
        <div
          className="pointer-events-none absolute -bottom-20 left-0 h-[min(420px,80vw)] w-[min(420px,80vw)] -translate-x-1/4 rounded-full bg-bank-gold/10 blur-3xl sm:left-[-8%] sm:h-[420px] sm:w-[420px] sm:translate-x-0"
          aria-hidden
        />
        <div className="relative mx-auto w-full min-w-0 max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <div className="max-w-3xl">
            <h1
              className="mt-6 break-words font-display text-display-md font-light leading-[0.98] tracking-[-0.02em] sm:text-display-lg"
              style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
            >
              Rechtliche
              <span className="block italic text-bank-gold-soft">Compliance.</span>
            </h1>
            <div className="mt-8 h-px w-24 bg-bank-gold/70" aria-hidden />
            <p className="mt-7 max-w-2xl font-sans text-[1.02rem] leading-[1.8] text-white/75">
              Konsequente Einhaltung gesetzlicher und regulatorischer Vorgaben — als Grundlage für Integrität,
              Stabilität und langfristiges Vertrauen.
            </p>
          </div>
        </div>
      </section>

      {/* MAIN with sticky TOC */}
      <section className="mx-auto w-full min-w-0 max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-y-16 lg:grid lg:grid-cols-12 lg:gap-x-10">
          <div className="w-full min-w-0 lg:col-span-3">
            <TocSticky items={sections} />
          </div>

          <div className="w-full min-w-0 max-w-full lg:col-span-9">
            <motion.article {...fade(0)} className={articleSplit}>
              <div className={articleMainCol}>
                <SectionHead
                  id="rahmen"
                  title={
                    <>
                      Rechtliche Compliance —
                      <span className="italic text-bank-text-muted"> als Haltung.</span>
                    </>
                  }
                />
                <div className={proseClass}>
                  <p className="drop-cap text-bank-text">
                    Fröhlich Vermögensberatung legt größten Wert auf die konsequente Einhaltung sämtlicher anwendbarer gesetzlicher,
                    regulatorischer und aufsichtsrechtlicher Vorgaben. Compliance ist für uns kein isolierter
                    Geschäftsbereich, sondern ein zentraler Bestandteil unserer Unternehmensführung, unserer
                    Risikokultur sowie unseres täglichen Handelns.
                  </p>
                  <p>
                    Unser Anspruch ist es, eine nachhaltige, transparente und verantwortungsvolle Geschäftstätigkeit
                    sicherzustellen. Dabei verstehen wir die Einhaltung rechtlicher Rahmenbedingungen nicht
                    ausschließlich als Verpflichtung, sondern als grundlegende Voraussetzung für Integrität, Stabilität
                    und langfristiges Vertrauen im Umgang mit unseren Kunden, Geschäftspartnern und Dienstleistern.
                  </p>
                  <p>
                    Fröhlich Vermögensberatung verpflichtet sich zu einem hohen ethischen Standard in allen Geschäftsbereichen. Wir
                    fördern eine Unternehmenskultur, die auf Transparenz, Verantwortungsbewusstsein und regelkonformem
                    Verhalten basiert. Verstöße gegen interne oder externe Vorgaben werden nicht toleriert und
                    konsequent verfolgt.
                  </p>
                </div>
              </div>
              <div className={articleSideCol}>
                <ComplianceImage
                  src="/assets/compliance/peace-headphones.png"
                  alt="Entspannte Person mit Kopfhörern im warmen Licht — Sinnbild für Ruhe und Vertrauen"
                  className="aspect-[3/4] max-h-[min(92vh,640px)] min-h-[320px] lg:ml-auto lg:max-w-md"
                />
              </div>
            </motion.article>

            <div className="my-20 flex items-center gap-5" aria-hidden>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-bank-gold">§</span>
              <span className="h-px flex-1 bg-bank-border" />
            </div>

            <motion.article {...fade(0)} className="w-full min-w-0 max-w-full lg:max-w-3xl">
              <SectionHead
                id="aufsicht"
                title={
                  <>
                    Regulatorischer Rahmen
                    <span className="block italic text-bank-text-muted">und Aufsicht.</span>
                  </>
                }
              />
              <div className={proseClass}>
                <p>
                  Als in Europa tätiges Finanzdienstleistungsunternehmen orientiert sich Fröhlich Vermögensberatung an den geltenden
                  nationalen und europäischen Rechtsvorschriften. Dazu zählen insbesondere Regelwerke zur
                  Finanzmarktregulierung, zur Verhinderung von Geldwäsche sowie zur Bekämpfung von
                  Terrorismusfinanzierung und Finanzkriminalität.
                </p>
                <p>
                  Darüber hinaus berücksichtigen wir die einschlägigen Empfehlungen internationaler Organisationen wie
                  der Financial Action Task Force (FATF) sowie die Vorgaben der Europäischen Union im Bereich der
                  Geldwäscheprävention und Finanzmarktintegrität.
                </p>
                <p>
                  Unsere internen Richtlinien und Prozesse werden regelmäßig überprüft und bei Bedarf an neue
                  gesetzliche oder regulatorische Anforderungen angepasst, um jederzeit ein angemessenes und wirksames
                  Compliance-System sicherzustellen.
                </p>
              </div>

              <Pullquote className="min-w-0 max-w-full">
                Regelkonformität ist kein Etikett. Sie ist die Frequenz, auf der wir senden.
              </Pullquote>
            </motion.article>

            <div className="my-20 flex items-center gap-5" aria-hidden>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-bank-gold">§</span>
              <span className="h-px flex-1 bg-bank-border" />
            </div>

            <motion.article {...fade(0)} className={articleSplit}>
              <div className={cn(articleSideCol, 'order-2 lg:order-1')}>
                <ComplianceImage
                  src="/assets/compliance/customer-train.png"
                  alt="Lächelnde Person in modernem Zug — Sinnbild für Kundenbeziehung und Transparenz"
                  className="aspect-[3/4] max-h-[min(88vh,600px)] min-h-[300px] lg:max-w-sm"
                />
              </div>
              <div className={cn(articleMainCol, 'order-1 lg:order-2')}>
                <SectionHead
                  id="kunden"
                  title={
                    <>
                      Kundenbeziehungen &amp;
                      <span className="italic text-bank-text-muted"> Beschwerdemanagement.</span>
                    </>
                  }
                />
                <div className={proseClass}>
                  <p>
                    Die Beziehung zu unseren Kunden ist geprägt von Transparenz, Fairness und Professionalität. Alle
                    Kundenanfragen und Beschwerden werden strukturiert, objektiv und zeitnah bearbeitet. Unser Ziel ist
                    es, für jede Anfrage eine sachgerechte und nachvollziehbare Lösung zu finden.
                  </p>
                  <p>
                    Wir betrachten Kundenfeedback als wichtigen Bestandteil unserer kontinuierlichen Weiterentwicklung.
                    Es trägt dazu bei, interne Prozesse zu verbessern und die Qualität unserer Dienstleistungen
                    nachhaltig zu erhöhen.
                  </p>
                  <p>
                    Das Beschwerdemanagement ist in interne Richtlinien eingebettet, die eine einheitliche und faire
                    Bearbeitung aller Anliegen gewährleisten.
                  </p>
                </div>
              </div>
            </motion.article>

            <div className="my-20 flex items-center gap-5" aria-hidden>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-bank-gold">§</span>
              <span className="h-px flex-1 bg-bank-border" />
            </div>

            <motion.article {...fade(0)} className={articleSplit}>
              <div className={articleMainCol}>
                <SectionHead
                  id="aml"
                  title={
                    <>
                      Geldwäsche-, Terrorismus- &amp;
                      <span className="block italic text-bank-text-muted">Sanktionsprävention.</span>
                    </>
                  }
                />
                <div className={proseClass}>
                  <p>
                    Fröhlich Vermögensberatung verfolgt eine strikte Null-Toleranz-Politik gegenüber Geldwäsche,
                    Terrorismusfinanzierung sowie jeglichen Verstößen gegen nationale oder internationale Sanktions-
                    und Embargovorschriften.
                  </p>
                  <p>
                    Zur Umsetzung dieser Anforderungen haben wir umfassende interne Kontroll- und Überwachungssysteme
                    implementiert. Diese umfassen insbesondere:
                  </p>
                </div>
                <ul className="mt-8 w-full min-w-0 max-w-full space-y-4 border-l-2 border-bank-gold/55 pl-5 sm:pl-6">
                  {[
                    'Identifikation und Verifizierung von Kunden im Rahmen des „Know Your Customer“-Prinzips (KYC)',
                    'Feststellung und Dokumentation wirtschaftlich Berechtigter (Beneficial Ownership)',
                    'Laufende Überwachung von Geschäftsbeziehungen und Transaktionen',
                    'Abgleich mit aktuellen nationalen und internationalen Sanktions- und PEP-Listen',
                    'Risikobasierte Bewertung von Kunden und Geschäftsaktivitäten',
                  ].map((line, idx) => (
                    <li key={line} className="flex min-w-0 gap-3 text-[14px] leading-[1.7] text-bank-text-muted sm:gap-4 sm:text-[14.5px]">
                      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-bank-gold">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">{line}</span>
                    </li>
                  ))}
                </ul>
                <div className={proseClass}>
                  <p>
                    Diese Maßnahmen dienen dazu, potenzielle Risiken frühzeitig zu erkennen und zu minimieren sowie die
                    Integrität unserer Geschäftsbeziehungen zu gewährleisten.
                  </p>
                  <p>
                    Sollten im Rahmen einer Geschäftsbeziehung Zweifel hinsichtlich der Identität eines Kunden, der
                    Herkunft von Vermögenswerten oder der Rechtmäßigkeit einer Transaktion bestehen, behalten wir uns
                    vor, zusätzliche Prüfungen vorzunehmen oder Geschäftsbeziehungen im Einklang mit den gesetzlichen
                    Vorgaben einzuschränken oder zu beenden.
                  </p>
                </div>
              </div>
              <div className={cn(articleSideCol, 'lg:sticky lg:top-32 lg:self-start')}>
                <ComplianceImage
                  src="/assets/compliance/journey-mirror.png"
                  alt="Rückspiegel mit Personen auf der Fahrt — Sinnbild für Weiterentwicklung und verantwortungsvolle Begleitung"
                  className="aspect-[3/4] max-h-[min(90vh,620px)] min-h-[280px] lg:max-w-md lg:justify-self-end"
                />
              </div>
            </motion.article>

            <div className="my-20 flex items-center gap-5" aria-hidden>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-bank-gold">§</span>
              <span className="h-px flex-1 bg-bank-border" />
            </div>

            <motion.article
              {...fade(0)}
              className="relative w-full min-w-0 max-w-full overflow-hidden border border-bank-border bg-white p-5 sm:p-10 lg:p-12"
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-bank-gold/55 via-bank-gold/65 to-transparent" />
              <SectionHead
                id="kontrolle"
                title={
                  <>
                    Interne Kontrolle
                    <span className="italic text-bank-text-muted"> &amp; unabhängige Prüfung.</span>
                  </>
                }
              />
              <div className={proseClass}>
                <p>
                  Die Wirksamkeit unseres Compliance- und Risikomanagementsystems wird regelmäßig durch interne
                  Kontrollfunktionen sowie unabhängige Prüfungsinstanzen überwacht. Hierzu zählen insbesondere interne
                  Revisionen sowie externe Prüfungen im Rahmen gesetzlicher und regulatorischer Anforderungen.
                </p>
                <p>
                  Diese Prüfungen dienen der Sicherstellung, dass unsere Prozesse angemessen, wirksam und aktuell sind
                  und den geltenden Anforderungen entsprechen. Festgestellte Optimierungspotenziale werden systematisch
                  analysiert und in unsere internen Prozesse integriert.
                </p>
              </div>
            </motion.article>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Compliance;
