import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import PageMeta from '@/components/PageMeta';
import Eyebrow from '@/components/editorial/Eyebrow';
import FondsGrundlagenInfographic from '@/components/fondsGrundlagen/FondsGrundlagenInfographic';

const Section = ({ eyebrow, headline, children, alt = false, id }) => (
  <section
    id={id}
    className={`border-b border-bank-border ${alt ? 'bg-bank-bg' : 'bg-white'}`}
  >
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {headline && (
        <h2 className="mt-3 max-w-3xl font-serif text-[28px] leading-tight text-bank-text sm:text-[34px]">
          {headline}
        </h2>
      )}
      <div className="mt-6">{children}</div>
    </div>
  </section>
);

const Card = ({ n, title, body }) => (
  <div className="border border-bank-border bg-white p-6">
    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
      {String(n).padStart(2, '0')}
    </p>
    <h3 className="mt-3 font-serif text-[19px] leading-snug text-bank-text">{title}</h3>
    <p className="mt-3 text-[14px] leading-relaxed text-bank-text-muted">{body}</p>
  </div>
);

/** Public educational page — /fonds-grundlagen */
const FondsGrundlagen = () => (
  <div className="bg-white" data-testid="fonds-grundlagen-page">
    <PageMeta
      title="Fonds-Grundlagen — Fröhlich Vermögensberatung"
      description="Was ist ein Fonds, wie funktioniert er, worin unterscheiden sich Fonds und ETFs — verständlich erklärt für Anleger."
      path="/fonds-grundlagen"
    />

    {/* HERO */}
    <section className="border-b border-bank-border">
      <div className="mx-auto max-w-6xl px-6 pb-14 pt-14 sm:px-10 sm:pt-20">
        <nav aria-label="Breadcrumb" className="text-[11px]">
          <ol className="flex flex-wrap items-center gap-1.5 font-mono uppercase tracking-[0.16em] text-bank-text-muted">
            <li><Link to="/" className="hover:text-bank-primary">Home</Link></li>
            <li aria-hidden>›</li>
            <li><Link to="/wissen" className="hover:text-bank-primary">Wissen</Link></li>
            <li aria-hidden>›</li>
            <li aria-current="page" className="text-bank-text">Fonds-Grundlagen</li>
          </ol>
        </nav>
        <div className="mt-6 max-w-3xl">
          <Eyebrow>Wissen &amp; Grundlagen</Eyebrow>
          <h1 className="mt-4 font-serif text-3xl leading-tight text-bank-text sm:text-[44px]">
            Fonds verstehen — verständlich erklärt
          </h1>
          <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-bank-text-muted">
            <p>
              Ein Investmentfonds bündelt das Kapital vieler Anleger und investiert es
              nach einer festgelegten Strategie in unterschiedliche Anlagen. Diese Seite
              erklärt Funktionsweise, Chancen und Risiken — ohne konkrete Anlage­empfehlungen.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* WAS IST EIN FONDS */}
    <Section eyebrow="Grundlage" headline="Was ist ein Fonds?">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4 text-[15.5px] leading-relaxed text-bank-text-muted">
          <p>
            Ein Fonds ist ein von einer Kapitalverwaltungsgesellschaft aufgelegtes
            Sondervermögen. Anleger kaufen Anteile am Fonds und werden damit anteilig
            am zugrunde liegenden Fondsvermögen beteiligt.
          </p>
          <p>
            Das Fondsvermögen wird nach einer im Prospekt beschriebenen Anlagestrategie
            in verschiedene Werte investiert — zum Beispiel Aktien, Anleihen, Immobilien
            oder eine Kombination daraus. Der Wert der Anteile kann steigen oder fallen.
          </p>
        </div>
        <div className="border border-bank-border bg-bank-bg p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
            Kernidee
          </p>
          <p className="mt-3 font-serif text-[18px] leading-snug text-bank-text">
            Viele Anleger, ein gemeinsam verwaltetes Portfolio.
          </p>
        </div>
      </div>
    </Section>

    {/* WIE FUNKTIONIERT EIN FONDS */}
    <Section eyebrow="Funktionsweise" headline="Wie funktioniert ein Fonds?" alt>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card n={1} title="Anteile erwerben" body="Anleger kaufen Fondsanteile und werden anteilig am Fondsvermögen beteiligt." />
        <Card n={2} title="Investition" body="Die Fondsgesellschaft investiert das gebündelte Vermögen gemäß der festgelegten Strategie." />
        <Card n={3} title="Wertentwicklung" body="Der Anteilswert kann steigen oder fallen — abhängig von der Entwicklung der Anlagen." />
        <Card n={4} title="Verwaltung" body="Aktiv gemanagt (Fondsmanagement wählt Titel aus) oder regelbasiert/passiv (Index abgebildet)." />
      </div>
    </Section>

    {/* FONDS VS EINZELANLAGE */}
    <Section eyebrow="Vergleich" headline="Fonds vs. Einzelanlage">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-bank-border p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Fonds</p>
          <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-bank-text-muted">
            <li>+ Diversifikation über viele Titel möglich</li>
            <li>+ Professionelles Management bei aktiven Fonds</li>
            <li>− Laufende Kosten und ggf. Ausgabeaufschlag</li>
            <li>− Keine direkte Kontrolle über einzelne Positionen</li>
          </ul>
        </div>
        <div className="border border-bank-border p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Einzelanlage</p>
          <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-bank-text-muted">
            <li>+ Direkte Kontrolle über Auswahl und Gewichtung</li>
            <li>+ Keine Fondsverwaltungsgebühr</li>
            <li>− Diversifikation muss selbst hergestellt werden</li>
            <li>− Höherer Aufwand für Recherche und Überwachung</li>
          </ul>
        </div>
      </div>
    </Section>

    {/* FONDS VS ETF */}
    <Section eyebrow="Vergleich" headline="Fonds vs. ETF" alt>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-bank-border bg-white p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Aktiv gemanagte Fonds</p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">
            Fondsmanagement wählt Titel aktiv aus mit dem Ziel, eine Benchmark zu über­treffen.
            Höhere laufende Kosten, dafür aktive Strategie.
          </p>
        </div>
        <div className="border border-bank-border bg-white p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">ETFs (passiv)</p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-bank-text-muted">
            {'Bilden einen Index regel\u00adbasiert nach. In der Regel geringere Kosten, kein aktives Management, unterschiedliche Replikations\u00admethoden.'}
          </p>
        </div>
      </div>
      <p className="mt-6 text-[13.5px] text-bank-text-muted">
        {'Welche Variante passt, h\u00e4ngt von individuellen Zielen, Anlagehorizont und Risikotragf\u00e4higkeit ab. Keine der beiden Varianten ist grunds\u00e4tzlich \u201ebesser\u201c.'}
      </p>
    </Section>

    {/* CHANCEN */}
    <Section eyebrow="Chancen" headline="Was Fonds Anlegern bieten können">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card n={1} title="Diversifikation" body="Bündelung vieler Wertpapiere reduziert das Einzeltitel­risiko." />
        <Card n={2} title="Marktzugang" body="Zugang zu Regionen, Branchen oder Anlageklassen, die einzeln schwer erreichbar wären." />
        <Card n={3} title="Strategiewahl" body="Von konservativ bis wachstumsorientiert — je nach Fondstyp verfügbar." />
        <Card n={4} title="Effizienz" body="Ein Kauf, ein Depot — statt vieler einzelner Positionen zu verwalten." />
      </div>
    </Section>

    {/* RISIKEN */}
    <Section eyebrow="Risiken" headline="Was Anleger beachten sollten" alt>
      <ul className="grid gap-3 text-[15px] leading-relaxed text-bank-text sm:grid-cols-2">
        <li className="border-l-2 border-bank-gold/70 pl-4">Kursverluste sind möglich — der Wert der Anteile kann fallen.</li>
        <li className="border-l-2 border-bank-gold/70 pl-4">Renditen sind nicht garantiert; historische Entwicklungen sind keine Prognose.</li>
        <li className="border-l-2 border-bank-gold/70 pl-4">Management­risiko bei aktiven Fonds — Strategien können scheitern.</li>
        <li className="border-l-2 border-bank-gold/70 pl-4">Gebühren und Kosten schmälern die Netto­rendite.</li>
        <li className="border-l-2 border-bank-gold/70 pl-4">Markt- und Branchen­risiken wirken auch auf breit gestreute Fonds.</li>
        <li className="border-l-2 border-bank-gold/70 pl-4">Bei Fremdwährungs­fonds: zusätzliche Wechselkurs­risiken.</li>
      </ul>
    </Section>

    {/* KOSTEN */}
    <Section eyebrow="Kosten" headline="Womit Anleger rechnen sollten">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card n={1} title="Laufende Kosten" body={'Verwaltung, Depotbank­gebühren und Betriebs­kosten des Fonds — meist als TER (\u201eGesamt­kosten­quote\u201c) ausgewiesen.'} />
        <Card n={2} title="Ausgabeaufschlag" body="Einmaliger Aufschlag beim Kauf klassischer Fonds­anteile. ETFs haben typischerweise keinen Ausgabe­aufschlag." />
        <Card n={3} title="Transaktions­kosten" body="Handelskosten für den Kauf/Verkauf von Fonds­anteilen im Depot, abhängig vom Anbieter." />
      </div>
      <p className="mt-6 text-[13.5px] text-bank-text-muted">
        Konkrete Kosten variieren je nach Fonds und Anbieter — bitte den Prospekt bzw.
        die wesent­lichen Anlegerinformationen (KID/BIB) lesen.
      </p>
    </Section>

    {/* FÜR WEN */}
    <Section eyebrow="Eignung" headline="Für wen können Fonds interessant sein?" alt>
      <div className="max-w-3xl space-y-4 text-[15.5px] leading-relaxed text-bank-text-muted">
        <p>
          Fonds können für Anleger interessant sein, die ihr Kapital breit streuen und
          nicht jedes einzelne Wertpapier selbst auswählen möchten. Sie sind ein möglicher
          Baustein einer langfristig ausgerichteten Vermögens­strategie.
        </p>
        <p>
          Welche Fonds­art konkret passt — aktiv oder passiv, defensiv oder wachstums­orientiert —
          hängt von persönlichen Zielen, Anlage­horizont und Risiko­tragfähigkeit ab.
        </p>
      </div>
    </Section>

    {/* SPEZIAL-AIF Infografik als weiterführendes Detail */}
    <Section eyebrow="Anwendungsbeispiel" headline="Wie ein Spezial-AIF konkret aufgebaut sein kann">
      <p className="mb-6 max-w-3xl text-[14.5px] leading-relaxed text-bank-text-muted">
        Als konkretes Beispiel finden Sie unten die Struktur des Fröhlich Vermögensberatung
        Spezial-AIF — mit Ablauf, Allokation, Risiko­steuerung und rechtlichen Hinweisen.
      </p>
      <FondsGrundlagenInfographic />
    </Section>

    {/* CTA */}
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
          Persönliches Gespräch
        </p>
        <h2 className="mt-3 max-w-3xl font-serif text-[26px] leading-tight text-bank-text sm:text-[32px]">
          Sie möchten prüfen, ob Fonds zu Ihrer Strategie passen?
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-bank-text-muted">
          Unsere Berater ordnen einzelne Anlage­formen im Zusammenhang mit Ihrer
          gesamten Vermögens­situation ein — ohne pauschale Empfehlungen.
        </p>
        <Link
          to="/contact"
          className="mt-6 inline-flex items-center gap-1.5 border-b border-bank-primary pb-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-bank-primary hover:text-bank-primary/80"
        >
          Gespräch anfragen <ArrowUpRight size={13} strokeWidth={1.7} />
        </Link>
        <p className="mt-10 border-t border-bank-border pt-4 font-mono text-[9.5px] uppercase tracking-[0.18em] text-bank-text-muted/80">
          Information der Fröhlich Vermögensberatung. Keine Anlage­beratung. Historische
          Entwicklungen sind keine Prognose für die Zukunft.
        </p>
      </div>
    </section>
  </div>
);

export default FondsGrundlagen;
