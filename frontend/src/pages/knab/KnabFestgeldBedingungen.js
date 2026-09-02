import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';

const KnabFestgeldBedingungen = () => {
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-[#F4F5F7] knab-doc-root">
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
            to="/banks/knab/festgeld"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F3844]/50 hover:text-[#2F3844] tracking-wide transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Zurück
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 border border-[#3E4A59]/20 bg-white px-4 py-2 text-xs font-medium text-[#3E4A59] hover:bg-[#3E4A59]/[0.04] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Drucken
          </button>
        </div>
      </div>

      <div className="doc-paper mx-auto max-w-[860px] bg-white shadow-sm border border-gray-200/60 mb-12">
        <div className="bg-[#3E4A59] px-8 py-6 md:px-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="rounded bg-white px-3 py-1.5"><img src="/assets/bank-logos/knab.svg" alt="Knab" className="h-5 w-auto object-contain" /></div>
            <div className="h-6 w-px bg-white/20" />
            <p className="text-white/50 text-[10px] tracking-[0.2em] uppercase">Niederlande</p>
          </div>
          <h1 className="text-white text-xl font-medium tracking-[0.01em]">Bedingungen für das Festgeldkonto</h1>
        </div>

        <div className="px-8 py-8 md:px-10 text-[13px] leading-[1.7] text-[#1d2939]">
          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">1. Kunde</h2>
            <p className="mb-3">
              <strong>1.1.</strong> Die Eröffnung und Führung von Konten erfolgt ausschließlich für volljährige
              natürliche Personen mit Wohnsitz und gewöhnlichem Aufenthalt in Niederlande.
              Die Konten sind auf eigene Rechnung zu führen. Die Bank eröffnet keine Konten
              im Namen anderer. Das Konto darf ausschließlich privat genutzt werden, eine
              Nutzung als Geschäftskonto für Freiberufler, Gewerbetreibende oder land- und
              forstwirtschaftliche Betriebe ist nicht zulässig. Es werden Gemeinschaftskonten eröffnet.
            </p>
            <p className="mb-3">
              <strong>1.2.</strong> Beabsichtigt der Kunde, innerhalb der nächsten drei Monate seinen Wohnsitz oder
              gewöhnlichen Aufenthaltsort außerhalb Niederlandes zu verlegen, ist er
              verpflichtet, dies der Bank unverzüglich mitzuteilen. Verfügt der Kunde nicht mehr
              über einen Wohnsitz oder gewöhnlichen Aufenthalt in Niederlande, kann die Bank
              das Festgeldkonto auflösen und den Saldo (einschließlich aufgelaufener Zinsen) auf
              das Verrechnungskonto auszahlen. Die Bank wird den Kunden über die Schließung
              informieren.
            </p>
            <p>
              <strong>1.3.</strong> Das Festgeldkonto steht nur Kunden zur Verfügung, die bereits über ein Girokonto
              verfügen. Die Auflösung des Girokontos führt daher automatisch zur
              vorzeitigen Beendigung eines aktiven Festgeldkontos.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">2. Konto und Kontoführung</h2>
            <p className="mb-3">
              Beim Festgeldkonto handelt es sich um eine Termineinlage, bei der die Bank für einen
              festgelegten Anlagezeitraum einen festen Zinssatz gewährt. Der Kunde stellt der Bank bei
              der Kontoeröffnung eine einmalige Einlage (den „Anlagebetrag") für den vereinbarten
              Anlagezeitraum zur Verfügung, für die ein laufzeitabhängiger, fest garantierter Zins
              vereinbart wird. Das Festgeldkonto wird ausschließlich in Euro geführt und erfordert
              einen Mindestanlagebetrag von 20.000,00 EUR. Der maximale Anlagebetrag beträgt
              1.000.000,00 EUR.
            </p>
            <p>
              Der Kontovertrag beinhaltet die Abbuchung des Anlagebetrages vom Verrechnungskonto,
              die Kontoführung, die Zinszahlung sowie die Überweisung des Gesamtguthabens bei
              Fälligkeit auf das Verrechnungskonto. Das Festgeldkonto nimmt nicht am Zahlungsverkehr teil.
              Auf das Festgeldkonto ausgestellte Lastschriften und Schecks werden von der
              Bank nicht eingelöst. Eingehende Überweisungen zu Gunsten des Festgeldkontos werden abgelehnt.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">3. Gebühren</h2>
            <p className="mb-3">Die Eröffnung und Führung des Festgeldkontos sind kostenlos.</p>
            <p>
              Für Aufträge des Kunden, die außerhalb der gewöhnlichen Kontoführung liegen, wie etwa
              einen Zweitdruck einer Steuerbescheinigung, behält sich die Bank vor, ein Entgelt zu
              erheben, dessen Höhe sich nach dem „Preis- und Leistungsverzeichnis" richtet bzw.
              zwischen Kunde und Bank vereinbart wird. Das „Preis- und Leistungsverzeichnis" ist auf
              der Internetseite der Bank verfügbar. Der Kunde trägt die Kosten Dritter sowie seine
              eigenen Kosten (z.&nbsp;B. für Ferngespräche und Porto). Etwaige zusätzliche
              Telekommunikationskosten sind im „Preis- und Leistungsverzeichnis" aufgeführt.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">4. Vertragslaufzeit, Fälligkeit</h2>
            <p className="mb-3">
              Die Vertragslaufzeit beginnt mit dem Tag der Wertstellung des vertraglich vereinbarten
              Anlagebetrags auf dem Festgeldkonto (Valutatag). Als Valutatag gilt stets der Tag der
              Wertstellung, der ein Bankarbeitstag ist. Die Festgeldvereinbarung endet mit Ablauf der
              vereinbarten Laufzeit. Das Ende der vereinbarten Laufzeit ist der letzte Tag der
              vereinbarten Laufzeit („Fälligkeitsdatum").
            </p>
            <p>
              Der Kunde kann verlangen, dass der Anlagebetrag vor dem Fälligkeitsdatum ganz oder
              teilweise freigegeben wird („Vorzeitige Freigabe"). Die Vorzeitige Freigabe führt zu einer
              Reduzierung des Zinssatzes auf den Reduzierten Zinssatz in Bezug
              auf den vorzeitig freigegebenen Teil des Anlagebetrags.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">5. Zinsen, Steuern</h2>
            <p className="mb-3">
              <strong>5.1.</strong> Das Festgeldkonto ist für die Dauer des Anlagezeitraums verzinst.
              Der vereinbarte Zinssatz (der „Vereinbarte Zinssatz") ergibt sich aus der
              Festgeldvereinbarung, ebenso wie der reduzierte Zinssatz im Falle einer
              Vorzeitigen Freigabe des Anlagebetrags (der „Reduzierte Zinssatz").
              Der Vereinbarte Zinssatz und der Reduzierte Zinssatz gelten für das Festgeldkonto
              als fest vereinbart.
            </p>
            <p className="mb-3">
              <strong>5.2.</strong> Die Zinsen werden dem im Vertrag des Kunden benannten Referenzkonto am
              jeweiligen Fälligkeitsdatum oder am Datum der vorzeitigen Freigabe
              gutgeschrieben; dies erfolgt gegebenenfalls gemeinsam
              mit der vollständigen oder teilweisen Rückzahlung des Anlagebetrags.
            </p>
            <p className="mb-3">
              <strong>5.3.</strong> Die Zinsberechnung erfolgt auf der Grundlage von 365 Tagen im Jahr.
            </p>
            <p>
              <strong>5.4.</strong> Einkünfte sind grundsätzlich steuerpflichtig. Sofern die Voraussetzungen für
              die Befreiung vom Steuerabzug (Vorlage einer gültigen NV-Bescheinigung,
              Freistellungsauftrag etc.) nicht vorliegen, wird die Bank die entsprechenden
              Steuern sowie ggf. weitere anfallende Abzüge nach den jeweiligen gesetzlichen
              Vorschriften einbehalten und an das zuständige Finanzamt abführen. Bei Fragen
              sollte sich der Kunde an sein zuständiges Finanzamt oder seinen Steuerberater
              wenden, insbesondere wenn der Kunde einer Steuerpflicht im Ausland unterliegt.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">6. Einzahlungen, Abhebungen, Rückzahlungen</h2>
            <p>
              Einzahlungen auf das Festgeldkonto sind während der Vertragslaufzeit nicht möglich. Die
              Rückzahlung des Anlagebetrags (ganz oder teilweise, je nach Fall) und der aufgelaufenen
              Zinsen erfolgt am Fälligkeitsdatum oder, im Falle einer Vorzeitigen Freigabe, an dem Tag,
              an dem der Kunde die Vorzeitige Freigabe beantragt (das „Datum der Vorzeitigen
              Freigabe") auf das Girokonto des Kunden bei der Bank.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">7. Verfügungen am Ende der Festgeldvereinbarung</h2>
            <p>
              Mit der vollständigen Rückzahlung des Guthabens auf das Festgeldkonto am
              Fälligkeitsdatum oder, falls einschlägig, einem Datum der Vorzeitigen Freigabe wird das
              Festgeldkonto automatisch geschlossen.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">8. Beendigung</h2>
            <p className="mb-3">
              <strong>8.1.</strong> Der Kunde kann jederzeit durch Beantragung einer Vorzeitigen Freigabe den
              Festgeldvertrag ganz oder teilweise kündigen. Entscheidet sich der Kunde für
              eine Vorzeitige Freigabe, werden Zinsen in Bezug auf den vorzeitig
              freigegebenen (Teil des) Anlagebetrags nur in Höhe des
              festgelegten Reduzierten Zinssatzes gewährt.
            </p>
            <p className="mb-3">
              <strong>8.2.</strong> Das Recht des Kunden, den Festgeldvertrag aus wichtigem Grund ohne Einhaltung
              einer Kündigungsfrist vollständig zu kündigen, bleibt unberührt. Im Falle einer
              vorzeitigen Kündigung des Festgeldvertrags aus wichtigem Grund werden
              Zinsen in Höhe des Vereinbarte Zinssatzes auf den Anlagebetrag gewährt. Die
              Kündigung muss schriftlich an die jeweils andere Vertragspartei erfolgen.
            </p>
            <p>
              <strong>8.3.</strong> Die Bank ist berechtigt, den Festgeldvertrag unter Berücksichtigung der Interessen
              des Kunden zu kündigen, insbesondere wenn das Verrechnungskonto (z.&nbsp;B.
              aufgrund der Ablehnung einer Lastschrift) einen negativen Saldo aufweist oder
              wenn der Kunde gegen die in Nr. 1 genannten Verpflichtungen verstößt.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">9. Abtretung/Verpfändung</h2>
            <p>
              Das Guthaben auf dem Festgeldkonto sowie alle anderen Rechte und Ansprüche, die sich
              aus oder im Zusammenhang mit dem Festgeldkonto bei der Bank ergeben, können weder
              ganz noch teilweise an Dritte abgetreten oder verpfändet werden. Das Pfandrecht der
              Bank gemäß Ziffer 14 der Allgemeinen Geschäftsbedingungen der Bank bleibt hiervon
              unberührt.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-[#3E4A59] mb-3">10. Schlussbestimmungen</h2>
            <p className="mb-3">
              <strong>10.1. Allgemeine Geschäftsbedingungen</strong><br />
              Die Allgemeinen Geschäftsbedingungen der Bank gelten auch für das
              Festgeldkonto. Bei Abweichungen zwischen den in den Allgemeinen
              Geschäftsbedingungen der Bank festgelegten Bedingungen und diesen Bedingungen
              für das Festgeldkonto haben letztere Vorrang. Darüber hinaus gelten für einzelne
              Geschäftsbeziehungen (z.&nbsp;B. für den Zahlungsverkehr) Sonderbedingungen, die
              Abweichungen oder Ergänzungen zu den Allgemeinen Geschäftsbedingungen der
              Bank enthalten können. Die Sonderbedingungen sind auf der Website der Bank
              unter www.knab.nl einsehbar. Auf Wunsch werden sie dem Kunden ausgehändigt
              bzw. zugesandt.
            </p>
            <p>
              <strong>10.2. Geltendes Recht</strong><br />
              Das Festgeldkonto unterliegt deutschem Recht.
            </p>
          </section>
        </div>

        <div className="border-t border-gray-200 px-8 py-4 md:px-10">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Knab B.V. | Thomas R. Malthusstraat 1-3 | 1066 JR Amsterdam | Niederlande | KvK-Nr.: 30100799
          </p>
        </div>
      </div>
    </div>
  );
};

export default KnabFestgeldBedingungen;
