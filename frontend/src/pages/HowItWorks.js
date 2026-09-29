import React from 'react';
import PageMeta from '@/components/PageMeta';

/**
 * Session 93 · Phase 4 — Transparenzseite.
 * Sitemap-Pfad: /so-funktioniert-der-vergleich (Alias von /how-it-works).
 */
export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-bank-bg pb-24">
      <PageMeta
        title="So funktioniert der Vergleich"
        description="Wie wir Angebote erfassen, Erträge berechnen und mit Affiliate-Links umgehen."
        path="/so-funktioniert-der-vergleich"
      />
      <section className="border-b border-bank-border bg-white">
        <div className="mx-auto max-w-[880px] px-5 py-14 sm:px-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">Transparenz</p>
          <h1 className="mt-2 font-display text-display-lg font-light text-bank-text">
            So funktioniert der Vergleich
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] text-bank-text-muted">
            Kurz, verständlich, ohne Marketing-Floskeln — hier erklären wir, wie unsere Sparangebot-
            Datenbasis, unsere Rechen-Logik und unsere CTA-Behandlung tatsächlich funktionieren.
          </p>
        </div>
      </section>
      <article className="mx-auto max-w-[880px] space-y-10 px-5 py-12 sm:px-8">
        <Section title="Wie werden Angebote erfasst?">
          Konditionen werden entweder manuell durch unser Team geprüft oder über autorisierte
          Datenquellen (Bank-Websites, Preisverzeichnisse, Partner-Feeds) eingespielt. Jeder
          Datensatz trägt eine <em>DataSource</em>-Kennung, ein Prüfdatum und — sofern öffentlich —
          einen Link zur Quelle. Aktuell enthält der Vergleich außerdem klar gekennzeichnete
          Demo-Konditionen für Test- und Vorschauzwecke.
        </Section>
        <Section title="Wie wird der erwartete Ertrag berechnet?">
          Unsere zentrale Rechen-Engine bildet Tagesgeld linear ab (Zins × Anlagebetrag × Monate ÷ 12)
          und berücksichtigt Aktions- und Folgezins getrennt. Beispiel: 4,00 % p.a. für 3 Monate,
          danach 2,10 % p.a. bei 25.000 € Anlage ergibt 643,75 € Ertrag — <strong>nicht</strong> 1.000 €.
          Bei Festgeld rechnen wir über die tatsächliche Vertragslaufzeit. Zinseszinseffekte innerhalb
          eines Jahres berücksichtigen wir bewusst konservativ nicht — Ihre Auszahlung kann höher liegen.
        </Section>
        <Section title={'Was bedeutet „zuletzt geprüft"?'}>
          Bei echten Konditionen zeigen wir das Datum der letzten manuellen oder automatischen
          Verifikation. Ist eine Kondition länger als 30 Tage nicht geprüft, wird sie als
          „Kondition wird überprüft" markiert. Demo-Konditionen werden niemals als „verifiziert"
          ausgewiesen — sie erscheinen ausschließlich mit dem Label „Demo-Konditionen".
        </Section>
        <Section title="Wie funktioniert die Sortierung?">
          Standard-Sortierung ist <em>Erwarteter Ertrag</em> für den eingegebenen Anlagebetrag.
          Alternativ nach nominalem Zinssatz, Laufzeit, Mindestanlage oder alphabetisch. Wir vergeben
          keine Scores, keine „Testsieger" und keine „Empfehlungen".
        </Section>
        <Section title="Wie funktioniert Einlagensicherung?">
          Innerhalb der EU sind Kundeneinlagen bei Kredit­instituten durch das jeweilige nationale
          Einlagensicherungs­system bis 100.000 € pro Einleger und Bank abgesichert (DGSD-Richtlinie
          2014/49/EU). Wir führen Bankland und Sicherungsland getrennt — Sitz und Absicherung können
          bei grenzüberschreitenden Angeboten abweichen.
        </Section>
        <Section title="Was sind Demo-Daten?">
          Solange kein autorisierter Datenfeed für eine bestimmte Bank/Region aktiv ist, verwenden
          wir Demo-Konditionen mit plausiblen, aber nicht marktaktuellen Zinssätzen. Diese
          Datensätze tragen zwingend die Kennung <code>is_demo</code> und werden im UI als
          „Demo-Konditionen" ausgewiesen.
        </Section>
        <Section title="Wie finanziert sich die Plattform?">
          Zum Teil über Affiliate-Vergütungen bei Abschluss über den „Zum Angebot"-Button. Die
          Zinsberechnung, die Sortierung und die Rangfolge werden davon nicht beeinflusst.
        </Section>
        <Section title="Wie werden Affiliate-Links behandelt?">
          Jeder Link kennt einen Typ (<em>affiliate · direct · information</em>), einen Status und
          eine Gültigkeitsspanne. Wir zeigen den „Zum Angebot"-Button ausschließlich, wenn ein aktiver,
          gültiger Link hinterlegt ist. Bei Affiliate-Beziehungen erscheint direkt am Button ein
          Transparenz-Hinweis: „Bei Abschluss können wir eine Vergütung erhalten."
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-light text-bank-text">{title}</h2>
      <p className="text-[14px] leading-relaxed text-bank-text-muted">{children}</p>
    </section>
  );
}
