import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import KNAB_BRAND from '@/data/knabBrand';

const { name, logo, address, kvk, colors } = KNAB_BRAND;
const footerLine = `${name} | ${address} | KvK-Nr.: ${kvk}`;

const KnabFlexgeldProduktinfo = () => {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen knab-doc-root" style={{ backgroundColor: colors.bg }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 14mm 14mm 14mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .knab-doc-root { background: white !important; min-height: auto !important; }
          .doc-paper { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; padding: 0 !important; }
          header.sticky, footer.bg-bank-primary, footer.relative { display: none !important; }
        }
      `}</style>

      <div className="no-print mx-auto max-w-[860px] px-4 pt-8 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/banks/knab/flexgeld"
            className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide transition-colors"
            style={{ color: `${colors.textMuted}` }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Zurück
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 border bg-white px-4 py-2 text-xs font-medium transition-colors"
            style={{ borderColor: `${colors.primary}33`, color: colors.primary }}
          >
            <Printer className="w-3.5 h-3.5" />
            Drucken
          </button>
        </div>
      </div>

      <div className="doc-paper mx-auto max-w-[860px] bg-white shadow-sm border border-gray-200/60 mb-12">
        <div className="px-8 py-6 md:px-10" style={{ backgroundColor: colors.primary }}>
          <div className="flex items-center gap-4 mb-3">
            <div className="rounded bg-white px-3 py-1.5">
              <img src={logo} alt="Knab" className="h-4 w-auto object-contain" />
            </div>
            <div className="h-6 w-px bg-white/20" />
            <p className="text-white/50 text-[10px] tracking-[0.2em] uppercase">{name}</p>
          </div>
          <h1 className="text-white text-xl font-medium tracking-[0.01em]">Produktinformationsblatt</h1>
          <p className="text-white/60 text-xs mt-1">Flexgeld — [Stand: 15.10.2025]</p>
        </div>

        <div className="px-8 py-8 md:px-10 text-[13px] leading-[1.7] text-[#1d2939]">
          <p className="mb-6 text-sm text-gray-500 italic">
            Dieses Dokument enthält auf Seite 1 eine zusammenfassende Darstellung der wichtigsten Produktmerkmale der
            Flexgeldanlage in EUR der {name} [Details auf den Folgeseiten]. Die Angaben stellen keine Anlageberatung
            dar. Eine aufmerksame Lektüre wird empfohlen. Weitere Details finden Sie in den Vertragsinformationen.
          </p>

          <div className="border border-gray-200 mb-8">
            <table className="w-full text-[13px]">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium w-[200px]" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Produktbezeichnung</td>
                  <td className="px-4 py-2.5">Flexgeld</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Produktart</td>
                  <td className="px-4 py-2.5">Termineinlage mit dreimonatiger Festzinsbindung, anschließend täglicher Verfügbarkeit</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Anbieter</td>
                  <td className="px-4 py-2.5">{name}<br />Thomas R. Malthusstraat 1-3<br />1066 JR Amsterdam, Niederlande<br />KvK-Nr.: {kvk}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Zinssätze</td>
                  <td className="px-4 py-2.5">Die aktuell gültigen Zinssätze und Laufzeiten finden Sie beim jeweiligen Laufzeitprodukt auf der Webseite bzw. nach Ihrer Registrierung.</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Mindest-/Maximaleinlage</td>
                  <td className="px-4 py-2.5">10.000,00 EUR / 1.000.000,00 EUR</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Einlagensicherung</td>
                  <td className="px-4 py-2.5">Bis zu 100.000,00 EUR je Kunde und je Bank.</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Verfügbarkeit</td>
                  <td className="px-4 py-2.5">Nach Ablauf der Festzinsbindung täglich verfügbar. [Details siehe Punkt 6]</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Verlängerung bei Fälligkeit</td>
                  <td className="px-4 py-2.5">Eine Verlängerung wird nicht automatisch veranlasst, sofern Sie keine Verlängerung beantragen. [Details siehe Punkt 5]</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Quellensteuer</td>
                  <td className="px-4 py-2.5">Es fällt keine Quellensteuer an. Die Kapitalertragsteuer, der Solidaritätszuschlag und gegebenenfalls die Kirchensteuer werden von der Bank einbehalten.</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Kosten</td>
                  <td className="px-4 py-2.5">Keine Kosten.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium" style={{ color: colors.primary, backgroundColor: colors.bgMuted }}>Benötigte Dokumente</td>
                  <td className="px-4 py-2.5">
                    ► Zur Eröffnung und Verlängerung genügt die Zusendung des unterzeichneten Flexgeldvertrags.<br />
                    ► Während der gesamten Laufzeit Ihrer Anlage muss der Bank ein gültiges Ausweisdokument vorliegen.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>1. Produktbeschreibung</h2>
            <p className="mb-3">
              Bei einer Flexgeldanlage handelt es sich um eine Termineinlage mit anfänglicher
              Festzinsbindung. Sie ermöglicht es Ihnen, einen Anlagebetrag einmalig für einen
              Zeitraum von drei Monaten zu einem fest vereinbarten Zinssatz fest anzulegen; im
              Anschluss ist das Guthaben täglich verfügbar.
            </p>
            <p className="mb-2"><strong>a] Währung:</strong> EUR</p>
            <p className="mb-2"><strong>b] Mindest-/Maximaleinlage:</strong> 10.000,00 EUR / 1.000.000,00 EUR</p>
            <p className="text-sm text-gray-500 ml-4 mb-3">
              Bitte beachten Sie: Die maximale Summe der bei der Bank angelegten Gelder darf
              1.000.000,00 EUR nicht überschreiten.
            </p>
            <p className="mb-3">
              <strong>c] Einlagensicherung:</strong> Einlagen inklusive Zinserträge sind bis zu einem maximalen Betrag von 100.000,00 EUR
              je Kunde und je Bank gesetzlich durch die niederländische Einlagensicherung (DGS) abgesichert.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>2. Renditechancen</h2>
            <p>
              Die jeweils gültigen Zinssätze und Konditionen werden für das entsprechende Produkt
              auf der Webseite bzw. nach erfolgter Registrierung ausgewiesen. Für die dreimonatige
              Festzinsphase gilt der vereinbarte Zinssatz verbindlich. Die während dieser Zeit
              anfallenden Zinsen werden – abzüglich etwaiger Steuern – zum Ende der
              Festzinsbindung dem Referenzkonto gutgeschrieben. Eine Kapitalisierung der Zinsen
              erfolgt nicht; es findet weder eine unterjährige Zinsausschüttung noch eine
              Zinseszinsberechnung statt. Die Zinsberechnung erfolgt nach der Methode act/360.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>3. Besteuerung</h2>
            <p className="mb-3">
              <strong>Besteuerung in Deutschland:</strong> Zinserträge unterliegen der Abgeltungsteuer, dem Solidaritätszuschlag sowie ggf.
              der Kirchensteuer. Die {name} ist zum Steuereinbehalt verpflichtet.
              Aufgrund des Abkommens zwischen Deutschland und den Niederlanden zur
              Vermeidung von Doppelbesteuerung können unterschiedliche Regelungen gelten.
            </p>
            <p className="mb-3">
              Einen Freistellungsauftrag können Sie nach der Kontoeröffnung in Ihrem
              Onlinebanking erteilen. Alternativ können Sie eine
              Nichtveranlagungsbescheinigung hochladen. Beachten Sie, dass dies mindestens
              28 Tage vor Zinszahlung erfolgen muss.
            </p>
            <p>
              Die Besteuerung richtet sich nach Ihren persönlichen Verhältnissen und kann
              Änderungen unterliegen. Zur Klärung steuerrechtlicher Fragen wird die
              Hinzuziehung eines Steuerberaters empfohlen.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>4. Kosten</h2>
            <p className="mb-2">Einmalige Kosten für Kontoeröffnung: keine</p>
            <p className="mb-2">Laufende Kosten für Kontoführung: keine</p>
            <p>
              Vertriebsvergütung: Fröhlich Vermögensberatung kapitalmitte.com
              erhält für die Vermittlung eine Provision von der Bank. Ihnen entstehen dadurch
              keine Kosten.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>5. Verlängerung bei Fälligkeit</h2>
            <p className="mb-3">
              Keine automatische Verlängerung. Ihr Flexgeld wird nach Fälligkeit nicht
              automatisch verlängert. Die aufgelaufenen Zinsen (abzüglich evtl. Steuern)
              werden ausgezahlt und nicht wieder angelegt.
            </p>
            <p className="mb-3">
              Bei Fälligkeit erfolgt die Rücküberweisung des Gesamtbetrags auf Ihr hinterlegtes
              Referenzkonto.
            </p>
            <p>
              Bei Verlängerung Ihres Flexgeldes haben Sie die Möglichkeit, erneut eine
              Laufzeitverlängerung zu veranlassen und dabei eine alternative, von der Bank
              angebotene Laufzeit zu wählen. Eine automatische Verlängerung der Flexgeldanlage findet nicht statt.
              Nach Ablauf der vereinbarten Laufzeit von 12 Monaten wird das Guthaben automatisch auf das
              von Ihnen benannte Referenzkonto überwiesen.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>6. Verfügbarkeit</h2>
            <p className="mb-2">Während der ersten 3 Monate ist die Einlage nicht verfügbar.</p>
            <p>Ab dem 4. Monat kann das Guthaben jederzeit ganz oder teilweise abgerufen werden.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>7. Risiken</h2>
            <p className="mb-3">
              <strong>Ausfallrisiko:</strong> Die Rückzahlung des Flexgeldes ist mit dem Insolvenzrisiko der {name}
              behaftet. Im Falle eines Einlagensicherungsfalls würde die Rückzahlung über den
              niederländischen Einlagensicherungsfonds gemäß den EU-Richtlinien abgewickelt.
              Durch die Einlagensicherung sind insgesamt 100.000,00 EUR je Kunde abgesichert.
            </p>
            <p className="mb-3">
              Die jeweilige Einlagensicherung eines Landes ist verpflichtet, die Auszahlung im
              Schadensfall binnen 7 Tagen vorzunehmen (Auszahlung in EUR). Insgesamt kann der
              Vorgang jedoch einige Wochen länger dauern, da zunächst festgestellt werden
              muss, ob tatsächlich ein Fall für die Einlagensicherung vorliegt.
            </p>
            <p>
              <strong>Länder- und Transferrisiko:</strong> Im Falle einer Einschränkung des Zahlungsverkehrs aus dem Land der Bank könnte
              es zu Problemen bei der Auszahlung kommen.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>8. Widerruf bei der Bank</h2>
            <p>
              Gemäß den Geschäftsbedingungen der Bank besteht ein 14-tägiges Widerrufsrecht.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: colors.primary }}>9. Anlagebedingungen</h2>
            <p>
              Bitte beachten Sie, dass sich die Bank grundsätzlich vorbehält, Anlagen einzelner
              Kunden ohne Angabe von Gründen abzulehnen, z.B. von „politisch exponierten
              Personen" im Sinne des Geldwäschegesetzes.
            </p>
          </section>
        </div>

        <div className="border-t border-gray-200 px-8 py-4 md:px-10">
          <p className="text-[10px] text-gray-400 leading-relaxed">{footerLine}</p>
        </div>
      </div>
    </div>
  );
};

export default KnabFlexgeldProduktinfo;
