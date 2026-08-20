import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRINZIPIEN = [
  { n: '01', title: 'Langfristigkeit', body: 'Finanzielle Entscheidungen sollten nicht ausschließlich von kurzfristigen Marktbewegungen bestimmt werden. Wir denken in Zeiträumen, die zu den Zielen unserer Kunden passen — nicht in Quartalen.' },
  { n: '02', title: 'Diversifikation', body: 'Vermögen sollte — abhängig von der individuellen Situation — nicht unnötig von einer einzelnen Anlage, Branche oder Anlageklasse abhängig sein.' },
  { n: '03', title: 'Risikobewusstsein', body: 'Renditechancen und Risiken müssen gemeinsam betrachtet werden. Chancen zu betrachten, ohne die dazugehörigen Risiken zu benennen, halten wir für unvollständig.' },
  { n: '04', title: 'Liquidität', body: 'Verfügbare Mittel können ein wichtiger Bestandteil einer ausgewogenen Vermögensplanung sein. Sparkonten und Einlagen betrachten wir deshalb als möglichen Baustein einer übergeordneten Struktur.' },
  { n: '05', title: 'Verständlichkeit', body: 'Kunden sollen nachvollziehen können, welche Überlegungen hinter einer finanziellen Entscheidung stehen. Wir kommunizieren ohne Fachchinesisch und erklären Chancen und Risiken transparent.' },
  { n: '06', title: 'Regelmäßige Überprüfung', body: 'Lebenssituationen, Märkte und Ziele verändern sich. Deshalb sollte eine Vermögensstruktur regelmäßig überprüft und — wo nötig — angepasst werden.' },
];

const PROZESS = ['Kennenlernen', 'Situation verstehen', 'Möglichkeiten besprechen', 'Entscheidung', 'Begleitung', 'Regelmäßige Überprüfung'];

export default function Philosophie() {
  return (
    <div className="min-h-screen w-full bg-bank-bg text-bank-text">
      <PageMeta title="Unsere Philosophie" description="Die sechs Grundsätze der Fröhlich Vermögensberatung GmbH — langfristig, diversifiziert, risikobewusst und verständlich." path="/philosophie" />

      {/* HERO */}
      <section className="border-b border-bank-border bg-bank-ink text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-bank-gold">Unsere Philosophie</p>
          <h1 className="mt-6 max-w-4xl font-display text-display-md font-light leading-[1.02] tracking-[-0.02em] sm:text-display-lg lg:text-display-xl" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Sechs Grundsätze,<br />
            <span className="text-bank-gold">an denen wir uns orientieren.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-[16px]">
            Unsere Arbeit folgt klaren Prinzipien. Sie sind keine Marketing-Formeln, sondern das Ergebnis unseres Anspruchs an eine langfristig ausgerichtete, risikobewusste und nachvollziehbare Vermögensberatung.
          </p>
        </div>
      </section>

      {/* 6 GRUNDSÄTZE */}
      <section className="border-b border-bank-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <dl className="grid gap-y-10 sm:grid-cols-2 sm:gap-x-16">
            {PRINZIPIEN.map(({ n, title, body }) => (
              <div key={n} data-testid={`prinzip-${n}`}>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-text-muted">{n} — Prinzip</p>
                <dt className="mt-3 font-display text-[1.5rem] font-light leading-tight tracking-[-0.015em] text-bank-text sm:text-[1.65rem]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>{title}</dt>
                <dd className="mt-3 max-w-md text-[15px] leading-[1.8] text-bank-text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* WARUM DIVERSIFIKATION */}
      <section className="border-b border-bank-border bg-bank-surface/30 py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Diversifikation</p>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Warum nicht alles auf eine Karte setzen?
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-[15.5px] leading-[1.85] text-bank-text-muted">
              <p>Unterschiedliche Anlageklassen reagieren unterschiedlich auf wirtschaftliche Entwicklungen. Eine diversifizierte Vermögensstruktur kann dazu beitragen, Abhängigkeiten von einzelnen Anlagen zu reduzieren.</p>
              <p>Die konkrete Zusammensetzung muss sich jedoch nach finanziellen Zielen, Risikobereitschaft, Anlagehorizont, Liquiditätsbedarf und persönlichen Umständen richten. Eine pauschale Musterlösung gibt es nicht.</p>
            </div>
            <ul className="space-y-4">
              {['Finanzielle Ziele', 'Risikobereitschaft', 'Anlagehorizont', 'Liquiditätsbedarf', 'Persönliche Umstände'].map((k, i) => (
                <li key={k} className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 border-b border-bank-border pb-3 text-[15.5px] leading-relaxed text-bank-text">
                  <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-bank-gold">{String(i + 1).padStart(2, '0')}</span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* KONSERVATIVER ANSATZ */}
      <section className="border-b border-bank-border py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-bank-gold">Unser Ansatz</p>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em] text-bank-text" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Chancen nutzen. Risiken bewusst betrachten.
          </h2>
          <div className="mt-8 max-w-3xl space-y-5 text-[15.5px] leading-[1.85] text-bank-text-muted">
            <p>Konservativ bedeutet für uns nicht, Kapitalmarktanlagen grundsätzlich zu vermeiden. Es bedeutet vielmehr, Chancen nicht isoliert von ihren Risiken zu betrachten.</p>
            <p>Abhängig von der individuellen Situation können Liquidität, Sparkonten, Aktien, Anleihen und weitere geeignete Anlageformen unterschiedliche Funktionen innerhalb einer Vermögensstruktur übernehmen.</p>
          </div>
          <figure className="mt-10 border-l-2 border-bank-gold/60 pl-6 sm:pl-8">
            <blockquote className="max-w-3xl font-display text-[clamp(1.25rem,2.4vw+0.6rem,1.75rem)] font-light leading-[1.2] tracking-[-0.015em] text-bank-text" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
              „Nicht die maximale Rendite um jeden Preis steht im Mittelpunkt, sondern eine Vermögensstruktur, die zur persönlichen Situation des Kunden passt."
            </blockquote>
            <figcaption className="mt-5 font-mono text-[11px] uppercase tracking-[0.24em] text-bank-text-muted">Fröhlich Vermögensberatung</figcaption>
          </figure>
        </div>
      </section>

      {/* LANGFRISTIGE ZUSAMMENARBEIT */}
      <section className="border-b border-bank-border bg-bank-ink py-16 text-white sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">Zusammenarbeit</p>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.1] tracking-[-0.02em]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            Wir denken nicht in Abschlüssen, sondern in Beziehungen.
          </h2>
          <div className="mt-8 max-w-3xl space-y-5 text-[15.5px] leading-[1.85] text-white/85">
            <p>Unser Ziel ist nicht, eine einzelne finanzielle Entscheidung zu begleiten und anschließend den Kontakt zu verlieren. Wir möchten unsere Kunden langfristig begleiten.</p>
            <p>Denn finanzielle Ziele verändern sich. Familien entstehen. Unternehmen entwickeln sich. Vermögen wächst. Lebenssituationen ändern sich. Und auch Kapitalmärkte verändern sich. Deshalb verstehen wir Vermögensberatung als langfristigen Prozess.</p>
          </div>

          {/* Prozess — editorial Timeline ohne Karten */}
          <ol className="mt-12 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-6">
            {PROZESS.map((step, i) => (
              <li key={step} className="border-t border-white/20 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bank-gold/85">{String(i + 1).padStart(2, '0')}</p>
                <p className="mt-3 font-display text-[1.05rem] font-light leading-snug text-white" style={{ fontVariationSettings: "'opsz' 120, 'SOFT' 100" }}>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <div className="rounded-3xl border border-bank-border bg-bank-surface-elev/80 p-8 shadow-editorial-md dark:bg-bank-surface/80 sm:p-12 lg:p-14">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-bank-gold">Persönliches Gespräch</p>
            <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.55rem,3.2vw+0.6rem,2.35rem)] font-light leading-[1.05] tracking-[-0.02em] text-bank-text" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
              Fragen zu Ihrer Vermögensplanung?
            </h2>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-[1.8] text-bank-text-muted">Lassen Sie uns persönlich darüber sprechen. Ein Erstgespräch ist für Sie unverbindlich.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact" data-testid="philo-cta-contact" className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'inline-flex cursor-pointer')}>
                Kontakt aufnehmen
                <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.6} aria-hidden />
              </Link>
              <Link to="/leistungen" data-testid="philo-cta-services" className={cn(buttonVariants({ variant: 'outline-ink', size: 'lg' }), 'inline-flex cursor-pointer')}>
                Unsere Leistungen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
