import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Wallet, TrendingUp, LineChart, FileText, Layers, Users } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LUCIDE_STROKE = 1.4;

const LEISTUNGEN = [
  { icon: Wallet, title: 'Sparkonten & Liquidität', body: 'Für Kunden, die einen Teil ihres Vermögens verfügbar oder planbar verzinst halten möchten — Tagesgeld, Festgeld und liquide Reserven als Bestandteil einer übergeordneten Struktur.', href: '/comparison', cta: 'Zum Sparvergleich' },
  { icon: TrendingUp, title: 'Vermögensaufbau', body: 'Langfristige Betrachtung unterschiedlicher Möglichkeiten des Vermögensaufbaus — mit Fokus auf Diversifikation, Risikobewusstsein und regelmäßiger Überprüfung.', href: '/philosophie', cta: 'Unsere Philosophie' },
  { icon: LineChart, title: 'Aktien', body: 'Unternehmensbeteiligungen als möglicher Bestandteil langfristiger Vermögensstrukturen — Chancen und Risiken werden gemeinsam betrachtet.', href: '/wissen', cta: 'Anlageklassen verstehen' },
  { icon: FileText, title: 'Anleihen', body: 'Festverzinsliche Wertpapiere von Unternehmen oder Staaten als möglicher Bestandteil diversifizierter Strategien — mit unterschiedlichen Laufzeiten und Bonitäten.', href: '/wissen/anleihe-erklaert', cta: 'Was ist eine Anleihe?' },
  { icon: Layers, title: 'Diversifizierte Anlagekonzepte', body: 'Unterschiedliche Anlageklassen können abhängig von Zielen, Anlagehorizont und Risikobereitschaft miteinander kombiniert werden — individuell, nicht pauschal.', href: '/philosophie#konservativ', cta: 'Unser Ansatz' },
  { icon: Users, title: 'Persönliche Beratung', body: 'Individuelle Situation verstehen, Möglichkeiten erklären und langfristig begleiten — ohne Zeitdruck, ohne Produktdruck.', href: '/contact', cta: 'Gespräch vereinbaren' },
];

const BAUSTEINE = [
  { title: 'Liquidität & Sparkonten', func: 'Verfügbarkeit, Planbarkeit und mögliche Verzinsung.', risks: 'Kaufkraftverlust bei geringer Verzinsung; Zinssätze können sich ändern.', horizon: 'kurz- bis mittelfristig' },
  { title: 'Aktien', func: 'Beteiligung an der wirtschaftlichen Entwicklung von Unternehmen.', risks: 'Kursschwankungen, unternehmensspezifische und marktbezogene Risiken bis hin zum Totalverlust.', horizon: 'langfristig' },
  { title: 'Anleihen', func: 'Regelmäßige Zinszahlungen und planbare Rückzahlung — abhängig von Bonität und Laufzeit.', risks: 'Zins-, Bonitäts- und Kursrisiko; Ausfall des Emittenten möglich.', horizon: 'mittel- bis langfristig' },
  { title: 'Weitere geeignete Anlagen', func: 'Ergänzende Bausteine, sofern sie zur individuellen Situation und zum regulatorischen Rahmen passen.', risks: 'Produktspezifisch — werden bei Bedarf im persönlichen Gespräch erläutert.', horizon: 'individuell' },
];

export default function Leistungen() {
  return (
    <div className="min-h-screen w-full bg-bank-bg text-bank-text">
      <PageMeta title="Unsere Leistungen" description="Vermögensberatung von Fröhlich — Sparkonten, Vermögensaufbau, Aktien, Anleihen, diversifizierte Anlagekonzepte und persönliche Betreuung." path="/leistungen" />

      {/* HERO */}
      <section className="border-b border-bank-border bg-bank-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-bank-gold">Unsere Leistungen</p>
          <h1 className="mt-6 max-w-4xl font-display text-display-md font-light leading-[1.02] tracking-[-0.02em] sm:text-display-lg lg:text-display-xl" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Vermögensberatung,<br />
            <span className="text-bank-gold">die zu Ihrer Situation passt.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-[16px]">
            Von Liquiditäts- und Sparlösungen bis zu ausgewählten Kapitalmarktanlagen — abhängig von Zielen, Anlagehorizont und Risikobereitschaft.
          </p>
        </div>
      </section>

      {/* 6 LEISTUNGEN — editorial, keine Karten-Kästen */}
      <section className="border-b border-bank-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-14 lg:gap-y-16">
            {LEISTUNGEN.map(({ icon: Icon, title, body, href, cta }, i) => (
              <article
                key={title}
                data-testid={`leistung-${title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}`}
                className="group flex flex-col"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">
                    {String(i + 1).padStart(2, '0')} — Leistung
                  </span>
                  <span className="h-px flex-1 bg-bank-border" aria-hidden />
                  <Icon
                    className="h-5 w-5 shrink-0 text-bank-primary"
                    strokeWidth={LUCIDE_STROKE}
                    aria-hidden
                  />
                </div>
                <h3
                  className="mt-5 font-display text-[1.5rem] font-light leading-tight tracking-[-0.015em] text-bank-text sm:text-[1.65rem]"
                  style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
                >
                  {title}
                </h3>
                <p className="mt-4 flex-1 text-[15px] leading-[1.75] text-bank-text-muted">{body}</p>
                <Link
                  to={href}
                  className="mt-6 inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-bank-primary transition-colors hover:text-bank-primary/80"
                >
                  <span className="border-b border-transparent transition-colors group-hover:border-bank-primary/50">
                    {cta}
                  </span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.6} aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* LIQUIDITÄT IST VERMÖGEN */}
      <section className="border-b border-bank-border bg-bank-surface/30 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Ein besonderer Schwerpunkt</p>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Liquidität ist ebenfalls Vermögen.
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_2fr]">
            <div className="space-y-5 text-[15.5px] leading-[1.85] text-bank-text-muted">
              <p>Nicht jedes Vermögen muss permanent am Kapitalmarkt investiert sein. Gerade bei größeren Vermögen können Liquiditätsreserven, kurzfristig verfügbare Mittel und verzinsliche Einlagen eine wichtige Rolle spielen.</p>
              <p>Aus den Bedürfnissen unserer Kunden heraus hat sich deshalb auch die Beschäftigung mit Sparkonten und Einlagenlösungen zu einem Bestandteil unserer Betreuung entwickelt.</p>
              <p>Wir betrachten Liquidität nicht isoliert, sondern als möglichen Bestandteil einer übergeordneten Vermögensstruktur.</p>
              <div className="pt-2">
                <Link to="/comparison" data-testid="leistungen-cta-sparen" className={cn(buttonVariants({ variant: 'outline-ink', size: 'lg' }), 'inline-flex cursor-pointer')}>
                  Mehr über Sparkonten erfahren
                </Link>
              </div>
            </div>
            <aside className="rounded-2xl border border-bank-border bg-white p-6 shadow-editorial-sm dark:bg-bank-surface sm:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-text-muted">Funktionen von Liquidität</p>
              <ul className="mt-4 space-y-3 text-[14.5px] text-bank-text">
                {['Handlungsspielraum für geplante Ausgaben', 'Reserve für unerwartete Situationen', 'Baustein einer diversifizierten Struktur', 'Kurz- bis mittelfristige Planbarkeit'].map((item) => (
                  <li key={item} className="flex items-start gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-bank-gold" aria-hidden /><span>{item}</span></li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      {/* BAUSTEINE / ANLAGEKLASSEN */}
      <section id="bausteine" className="border-b border-bank-border py-16 sm:py-20 scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Wissen</p>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Bausteine einer Vermögensstruktur
          </h2>
          <p className="mt-6 max-w-2xl text-[15px] leading-[1.8] text-bank-text-muted">Neutrale Einordnung möglicher Anlageklassen. Keine individuelle Anlageempfehlung — die konkrete Zusammensetzung wird immer im persönlichen Gespräch erarbeitet.</p>
          <div className="mt-10 divide-y divide-bank-border border-y border-bank-border">
            {BAUSTEINE.map(({ title, func, risks, horizon }) => (
              <div key={title} className="grid gap-4 py-7 lg:grid-cols-[1fr_2fr_2fr_1fr] lg:gap-8">
                <h3 className="font-display text-[1.2rem] font-light leading-tight tracking-[-0.01em] text-bank-text" style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}>{title}</h3>
                <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Mögliche Funktion</p><p className="mt-2 text-[14px] leading-relaxed text-bank-text-muted">{func}</p></div>
                <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Wesentliche Risiken</p><p className="mt-2 text-[14px] leading-relaxed text-bank-text-muted">{risks}</p></div>
                <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bank-text-muted">Anlagehorizont</p><p className="mt-2 text-[14px] leading-relaxed text-bank-text">{horizon}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IHRE ZIELE / CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Ihre Ziele</p>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Ihre Ziele bestimmen den Weg.
          </h2>
          <p className="mt-6 max-w-2xl text-[15.5px] leading-[1.85] text-bank-text-muted">Vor finanziellen Entscheidungen sollten zunächst einige grundlegende Fragen beantwortet werden:</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {['Was möchten Sie mit Ihrem Vermögen erreichen?', 'Welche Mittel möchten Sie verfügbar halten?', 'Welchen Anlagehorizont haben Sie?', 'Welche Wertschwankungen können und möchten Sie tragen?', 'Welche Erfahrungen haben Sie mit Kapitalanlagen?', 'Welche zukünftigen finanziellen Verpflichtungen bestehen?'].map((q) => (
              <li key={q} className="rounded-xl border border-bank-border bg-bank-surface/40 px-5 py-4 text-[14.5px] leading-relaxed text-bank-text">{q}</li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/contact" data-testid="leistungen-cta-contact" className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'inline-flex cursor-pointer')}>
              Persönliches Gespräch vereinbaren <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} aria-hidden />
            </Link>
            <a href="mailto:kundenservice@kapital-direkt24.de" className={cn(buttonVariants({ variant: 'outline-ink', size: 'lg' }), 'inline-flex cursor-pointer')}>Kundenservice</a>
          </div>
        </div>
      </section>
    </div>
  );
}
