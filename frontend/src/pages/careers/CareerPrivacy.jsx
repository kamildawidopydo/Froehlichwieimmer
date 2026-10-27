import React from 'react';
import PageMeta from '@/components/PageMeta';

const S = ({ title, children }) => (
  <section className="mt-8"><h2 className="text-xl font-semibold text-[#1E222C]">{title}</h2><div className="mt-3 space-y-3 leading-relaxed text-[#444]">{children}</div></section>
);

export default function CareerPrivacy() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 lg:px-8" data-testid="career-privacy">
      <PageMeta title="Datenschutzhinweise für Bewerber | Essence Invest" description="Informationen zur Verarbeitung personenbezogener Daten im Bewerbungsverfahren." path="/karriere/datenschutz" />
      <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">Entwurf – diese Hinweise müssen vor Veröffentlichung rechtlich geprüft und freigegeben werden.</p>
      <h1 className="mt-8 font-display text-4xl">Datenschutzhinweise für Bewerberinnen und Bewerber</h1>
      <S title="1. Verantwortliche Stelle">
        <p>Fröhlich Vermögensberatung GmbH (Marke: Essence Invest), Bösgrunder Weg 62, 55543 Bad Kreuznach. Kontakt Datenschutz: [Platzhalter: E-Mail-Adresse des Datenschutzbeauftragten]</p>
      </S>
      <S title="2. Zweck und Rechtsgrundlage">
        <p>Wir verarbeiten Ihre Angaben und Unterlagen ausschließlich zur Durchführung des Bewerbungsverfahrens (Art. 6 Abs. 1 lit. b DSGVO i. V. m. § 26 BDSG). Freiwillige Angaben verarbeiten wir auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).</p>
      </S>
      <S title="3. Verarbeitete Daten">
        <p>Name, Kontaktdaten, gewünschte Position, Angaben zu Berufserfahrung und Eintrittstermin, Ihre Nachricht sowie hochgeladene Dokumente (z. B. Lebenslauf).</p>
      </S>
      <S title="4. Übertragung und Speicherung">
        <p>Die Übertragung erfolgt verschlüsselt (TLS). Unterlagen werden in einem geschützten Speicher abgelegt und sind ausschließlich für berechtigte Personen aus dem Recruiting und der Geschäftsführung zugänglich. Eine öffentliche Einsicht ist ausgeschlossen.</p>
      </S>
      <S title="5. Speicherdauer">
        <p>Nach Abschluss des Verfahrens werden Ihre Daten nach [Platzhalter: Aufbewahrungsfrist, z. B. 6 Monate] gelöscht, sofern Sie keiner längeren Speicherung zugestimmt haben oder gesetzliche Pflichten entgegenstehen.</p>
      </S>
      <S title="6. Ihre Rechte">
        <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch und Widerruf einer Einwilligung. Zudem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.</p>
      </S>
    </div>
  );
}
