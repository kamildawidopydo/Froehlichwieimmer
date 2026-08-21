/**
 * Phase 5 copy blocks — imported by siteCopy.js (no circular deps).
 * Formal-warm German; same meaning, refreshed phrasing.
 */

export const savingsCopy = {
  sharedDeposit:
    'In der EU und im EWR sind Einlagen bei lizenzierten Banken gesetzlich bis 100.000 € pro Person und Institut abgesichert. Wir vermitteln ausschließlich Angebote regulierter Partnerbanken — Herkunftsland und Einlagensicherung sind im Vergleich nachvollziehbar ausgewiesen.',
  sharedTax:
    'Zinserträge unterliegen der Abgeltungssteuer (25 % zzgl. Solidaritätszuschlag und ggf. Kirchensteuer). Mit Freistellungsauftrag nutzen Sie den Sparerpauschbetrag (2026: 1.000 € bzw. 2.000 € bei Verheirateten). Die Bank kann die Abführung häufig automatisch vornehmen.',
  guides: {
    festgeld: {
      heroTitle: 'Festgeld verständlich erklärt',
      heroLede:
        'Sie legen einen Betrag für eine vereinbarte Laufzeit an und erhalten einen garantierten Zinssatz. Planbar, nachvollziehbar und mit europäischer Einlagensicherung — geeignet für mittelfristige Ziele.',
      definition:
        'Festgeld ist eine Termineinlage mit fester Laufzeit und festem Zinssatz. Während der Laufzeit ist das Kapital in der Regel nicht täglich verfügbar — dafür erhalten Sie planbare Erträge und oft höhere Zinsen als beim Tagesgeld.',
      cardLede: 'Fester Zinssatz über einen definierten Zeitraum — planbar und übersichtlich.',
      metaDescription:
        'Festgeld einfach erklärt: Definition, Vorteile, Einlagensicherung, Steuern und FAQ — mit Vergleich regulierter EU-Partnerbanken.',
    },
    flexgeld: {
      heroTitle: 'Flexgeld verständlich erklärt',
      heroLede:
        'Zwischen Tages- und Festgeld: attraktive Zinsen bei mehr Flexibilität als bei klassischer Termineinlage — Kündigungsfristen und Konditionen sind transparent dokumentiert.',
      definition:
        'Flexgeld verbindet oft höhere Zinsen als Tagesgeld mit einer vereinbarten Kündigungsfrist statt fester Laufzeit. Geeignet für Sparer, die Rendite anstreben, ohne vollständig auf Liquidität zu verzichten.',
      cardLede: 'Flexibel bleiben und von attraktiven Konditionen profitieren — ohne feste Bindung.',
      metaDescription:
        'Flexgeld erklärt: Kündigungsfristen, Einlagensicherung, Steuern und Vergleich — Partnerangebote auf einen Blick.',
    },
    tagesgeld: {
      heroTitle: 'Tagesgeld verständlich erklärt',
      heroLede:
        'Ihr Geld bleibt täglich verfügbar und wird verzinst — die bewährte Lösung für Notgroschen, kurzfristige Rücklagen und maximale Liquidität bei regulierten Instituten.',
      definition:
        'Ein Tagesgeldkonto ist ein verzinstes Sparkonto ohne feste Laufzeit. Verfügung erfolgt über ein Referenzkonto; der Zinssatz ist variabel und orientiert sich am Marktumfeld.',
      cardLede: 'Täglich verfügbar und verzinst — ideal für liquide Reserven.',
      metaDescription:
        'Tagesgeld verständlich erklärt: Notgroschen, Steuern, Einlagensicherung, FAQ und Vergleich.',
    },
  },
};

export const calculatorCopy = {
  toc: [
    { id: 'rechner', label: 'Rechner' },
    { id: 'marktzinsen', label: 'Marktzinsen' },
    { id: 'steuern', label: 'Steuern' },
    { id: 'vergleich', label: 'Vergleich & Produkte' },
    { id: 'faq', label: 'FAQ' },
  ],
  productTypes: [
    {
      id: 'Festgeld',
      label: 'Festgeld',
      slug: 'festgeld',
      defaultMonths: 12,
      defaultMode: 'simple',
      hint: 'Fester Zinssatz über die gesamte Laufzeit — typischerweise einfache Verzinsung am Ende.',
    },
    {
      id: 'Flexgeld',
      label: 'Flexgeld',
      slug: 'flexgeld',
      defaultMonths: 24,
      defaultMode: 'simple',
      hint: 'Festzins bei Haltedauer bis Laufzeitende; vorzeitige Kündigung oft mit Basiszins.',
    },
    {
      id: 'Tagesgeld',
      label: 'Tagesgeld',
      slug: 'tagesgeld',
      defaultMonths: 12,
      defaultMode: 'compound',
      hint: 'Täglich verfügbar — Projektion häufig mit jährlicher Wiederanlage modelliert.',
    },
  ],
  interestModes: [
    { id: 'simple', label: 'Einfache Zinsen', short: 'Einfach' },
    { id: 'compound', label: 'Zinseszins (jährlich)', short: 'Zinseszins' },
  ],
  ratePresets: [2.5, 3.0, 3.5, 4.0, 4.5],
  faq: [
    {
      q: 'Was ist der Unterschied zwischen einfachen Zinsen und Zinseszins?',
      a: 'Bei einfachen Zinsen wird der Zinssatz nur auf das ursprüngliche Kapital berechnet — üblich bei vielen Festgeld-Verträgen mit Auszahlung am Laufzeitende. Beim Zinseszins werden bereits gutgeschriebene Zinsen mitverzinst. Die konkrete Verzinsung hängt vom Angebot der Partnerbank ab.',
    },
    {
      q: 'Wie werden Steuern im Rechner berücksichtigt?',
      a: 'Optional können Sie die Abgeltungsteuer (25 % zzgl. Solidaritätszuschlag, ohne Kirchensteuer) abziehen lassen. Der Freistellungsauftrag mindert die steuerpflichtigen Zinsen — Standardannahme: 1.000 € Sparerpauschbetrag (Ledige). Verheiratete können bis zu 2.000 € nutzen.',
    },
    {
      q: 'Sind die Ergebnisse verbindlich?',
      a: 'Nein. Der Rechner dient der Orientierung. Verbindliche Konditionen, Mindestanlagen, Zinsgutschriften und Gebühren entnehmen Sie dem jeweiligen Angebot im Vergleich bzw. den Vertragsunterlagen der Partnerbank.',
    },
    {
      q: 'Wo finde ich aktuelle Marktzinsen?',
      a: 'Im Bereich „Aktuelle Top-Zinsen“ sehen Sie die höchsten verfügbaren Sätze aus unserem Angebotsbestand. Für alle Konditionen nutzen Sie den Sparvergleich mit Filtern nach Produkt, Land und Laufzeit.',
    },
    {
      q: 'Kann ich meine Eingaben in den Antrag übernehmen?',
      a: 'Ja. Über „Werte übernehmen“ gelangen Sie zum Antragsassistenten mit vorausgefülltem Anlagebetrag, Laufzeit und Zinssatz. Alternativ starten Sie direkt im Vergleich mit passenden Produktfiltern.',
    },
  ],
};

export const homeCtaCopy = {
  growth: {
    eyebrow: 'Wachstum mit Überblick',
    title: 'Heute strukturiert.',
    titleAccent: 'Morgen nachvollziehbar.',
    heading: 'Bereit, Ihr Erspartes',
    headingAccent: 'sinnvoll einzusetzen?',
    lede:
      'Schließen Sie sich Sparerinnen und Sparern an, die klare Zinskonditionen bei regulierten Partnerbanken suchen — übersichtlich, geprüft, transparent.',
    button: 'Jetzt loslegen',
  },
  bonus: {
    eyebrow: 'Limitiertes Angebot',
    title: 'Jetzt Bonus sichern.',
    lede:
      'Ausgewählte Neukundenangebote mit Willkommensprämie — Konditionen und Mindestanlage sind im jeweiligen Angebot ausgewiesen.',
    button: 'Angebote vergleichen',
  },
};

export const faqCopy = {
  categories: [
    { id: 'all', label: 'Alle' },
    { id: 'general', label: 'Allgemein' },
    { id: 'security', label: 'Sicherheit' },
    { id: 'taxes', label: 'Steuern' },
    { id: 'process', label: 'Ablauf' },
    { id: 'aktien', label: 'Aktien' },
    { id: 'anleihen', label: 'Anleihen' },
    { id: 'ipo', label: 'IPO' },
    { id: 'krypto', label: 'Krypto' },
    { id: 'tagesgeld', label: 'Tagesgeld' },
    { id: 'flexgeld', label: 'Flexgeld' },
    { id: 'notices', label: 'Wichtige Hinweise' },
    { id: 'risks', label: 'Risiken' },
  ],
  previewIds: [
    'aktien-was-ist',
    'aktien-risiken',
    'anleihen-was-ist',
    'ipo-teilnahme',
    'krypto-verwahrung',
    'depot-kosten',
  ],
  items: [
    {
      id: 'foreign-banks',
      category: 'general',
      question: 'Vergleichen Sie nur ausländische Banken?',
      answer:
        'Nein. Sie finden Angebote regulierter Banken aus Deutschland und weiteren EU-/EWR-Staaten. Land der Einlagensicherung, Aufsicht und Konditionen sind transparent ausgewiesen — Sie entscheiden bewusst, nicht „nur Ausland“.',
    },
    {
      id: 'what-is-br',
      category: 'general',
      question: 'Was ist Fröhlich Vermögensberatung?',
      answer:
        'Fröhlich Vermögensberatung ist eine Vergleichs- und Vermittlungsplattform für Spar- und Anlageprodukte bei regulierten Partnerbanken. Kundeneinlagen bei Tages-, Fest- oder Flexgeld werden nicht bei uns gehalten — Konten werden direkt bei der gewählten Bank geführt.',
    },
    {
      id: 'free',
      category: 'general',
      question: 'Ist die Nutzung kostenlos?',
      answer:
        'Ja, Vergleich und unverbindliche Anfragen sind für Sie kostenfrei. Es fallen keine versteckten Plattformgebühren an; verbindliche Konditionen ergeben sich aus dem Vertrag der jeweiligen Partnerbank.',
    },
    {
      id: 'multiple-offers',
      category: 'general',
      question: 'Kann ich mehrere Angebote vergleichen?',
      answer:
        'Ja. Filtern Sie nach Produktart, Zinssatz, Laufzeit, Land und Mindestanlage. Die EU-Einlagensicherung gilt jeweils pro Institut und Person (bis 100.000 €).',
    },
    {
      id: 'fest-vs-tages',
      category: 'general',
      question: 'Was ist der Unterschied zwischen Festgeld und Tagesgeld?',
      answer:
        'Festgeld: feste Laufzeit und in der Regel fester Zinssatz — Kapital ist gebunden. Tagesgeld: tägliche Verfügbarkeit, variable Zinsen. Viele Anleger kombinieren beides (Notgroschen plus planbare Anlage).',
    },
    {
      id: 'money-safe',
      category: 'security',
      question: 'Ist mein Geld sicher?',
      answer:
        'Bei lizenzierten Banken in der EU/EWR gilt die gesetzliche Einlagensicherung bis 100.000 € pro Person und Institut. Prüfen Sie im Angebot Land, Sicherungssystem und Aufsicht — diese Merkmale weisen wir aus.',
    },
    {
      id: 'eu-protection',
      category: 'security',
      question: 'Was ist die EU-Einlagensicherung?',
      answer:
        'Sie schützt Einlagen bis 100.000 € pro Kunde und Bank. Im Insolvenzfall zahlt der nationale Sicherungsfonds in der Regel innerhalb weniger Arbeitstage aus. Höhere Beträge können durch Verteilung auf mehrere Institute abgesichert werden.',
    },
    {
      id: 'trust-banks',
      category: 'security',
      question: 'Kann ich den Partnerbanken vertrauen?',
      answer:
        'Gelistete Institute sind lizenziert und unter nationaler Aufsicht (z. B. BaFin, ACPR, Banco de España). Vor Aufnahme prüfen wir regulatorische Rahmenbedingungen — Details stehen im jeweiligen Angebot.',
    },
    {
      id: 'data-protection',
      category: 'security',
      question: 'Wie schützt Fröhlich Vermögensberatung meine Daten?',
      answer:
        'Wir arbeiten DSGVO-konform, nutzen verschlüsselte Verbindungen (TLS) und geben Daten nur mit Ihrer Einwilligung oder zur Vertragserfüllung an Partner weiter — nicht zum Verkauf an Dritte.',
    },
    {
      id: 'tax-interest',
      category: 'taxes',
      question: 'Muss ich Steuern auf Zinsen zahlen?',
      answer:
        'Ja, Zinserträge unterliegen in Deutschland in der Regel der Abgeltungssteuer (25 % zzgl. Solidaritätszuschlag, ggf. Kirchensteuer). Mit Freistellungsauftrag nutzen Sie den Sparerpauschbetrag (2026: 1.000 €, Verheiratete 2.000 €).',
    },
    {
      id: 'saver-allowance',
      category: 'taxes',
      question: 'Was ist der Sparerpauschbetrag?',
      answer:
        'Steuerfreier Freibetrag für Kapitalerträge. Er muss bei der Bank per Freistellungsauftrag beantragt werden — andernfalls wird oft direkt abgeführt.',
    },
    {
      id: 'foreign-tax',
      category: 'taxes',
      question: 'Besteuerung bei ausländischen EU-Banken?',
      answer:
        'Zinsen sind steuerpflichtig; ausländische Banken führen meist keine deutsche Abgeltungssteuer ab. Angabe in der Steuererklärung (Anlage KAP) kann erforderlich sein — ggf. Doppelbesteuerungsabkommen beachten.',
    },
    {
      id: 'open-speed',
      category: 'process',
      question: 'Wie schnell ist die Kontoeröffnung?',
      answer:
        'Nach Ihrer Anfrage meldet sich die Partnerbank. Die Freigabe dauert oft wenige Minuten bis wenige Werktage — abhängig von Bank und Vollständigkeit der Unterlagen.',
    },
    {
      id: 'legitimation',
      category: 'process',
      question: 'Brauche ich eine Legitimation?',
      answer:
        'Ja. EU-Banken sind zur Identifikation verpflichtet. Gültiger Ausweis, Steuer-ID und oft ein Referenz-Girokonto gehören zum Standardprozess.',
    },
    {
      id: 'documents',
      category: 'process',
      question: 'Welche Dokumente werden benötigt?',
      answer:
        'Typisch: Personalausweis oder Reisepass, Adressnachweis, Steuer-Identifikationsnummer. Weitere Nachweise verlangt die Bank nur bei Bedarf — im Antrag ausgewiesen.',
    },
    {
      id: 'how-open',
      category: 'process',
      question: 'Wie eröffne ich ein Konto über Fröhlich Vermögensberatung?',
      answer:
        'Angebot wählen, unverbindliche Anfrage stellen. Die Bank kontaktiert Sie und führt die Eröffnung direkt beim Institut durch — wir vermitteln, verwalten kein Geld.',
    },
    {
      id: 'what-tagesgeld',
      category: 'tagesgeld',
      question: 'Was ist Tagesgeld?',
      answer:
        'Verzinstes Sparkonto ohne feste Laufzeit. Über ein Referenzkonto können Sie täglich verfügen; der Zinssatz ist variabel — ideal für Notgroschen und kurzfristige Liquidität.',
    },
    {
      id: 'tages-vs-giro',
      category: 'tagesgeld',
      question: 'Tagesgeld oder Girokonto?',
      answer:
        'Das Girokonto dient dem Zahlungsverkehr (oft 0 % Zins). Tagesgeld ist zum Anlegen gedacht und meist höher verzinst — Überweisungen laufen über ein verknüpftes Girokonto.',
    },
    {
      id: 'tages-rate-drop',
      category: 'tagesgeld',
      question: 'Kann die Bank den Tagesgeldzins senken?',
      answer:
        'Ja, Tagesgeldzinsen sind variabel. Achten Sie auf den Effektivzins nach Neukundenaktionen und vergleichen Sie regelmäßig im Live-Vergleich.',
    },
    {
      id: 'notgroschen',
      category: 'tagesgeld',
      question: 'Wie viel Notgroschen auf Tagesgeld?',
      answer:
        'Viele Experten empfehlen 3–6 Nettomonatsgehälter als liquide Reserve — auf einem gut verzinsten Tagesgeldkonto statt auf dem Girokonto.',
    },
    {
      id: 'what-flexgeld',
      category: 'flexgeld',
      question: 'Was ist Flexgeld?',
      answer:
        'Hybride Sparform: oft höhere Zinsen als Tagesgeld, aber mit vereinbarter Kündigungsfrist statt täglicher Verfügbarkeit. Konditionen sind bankenspezifisch — im Angebot prüfen.',
    },
    {
      id: 'flex-vs-fest',
      category: 'flexgeld',
      question: 'Flexgeld oder Festgeld?',
      answer:
        'Festgeld: maximale Zinsplanung für feste Laufzeiten. Flexgeld: höhere Zinsen mit Kündigungsfrist — für Sparer, die nicht vollständig auf Liquidität verzichten möchten.',
    },
    {
      id: 'flex-cancel-time',
      category: 'flexgeld',
      question: 'Wie lange dauert die Kündigungsfrist?',
      answer:
        'Häufig 30–90 Tage nach Einreichung der Kündigung, danach Auszahlung auf das Referenzkonto. Die genaue Frist steht in den Produktbedingungen der Bank.',
    },
    {
      id: 'flex-rate-variable',
      category: 'flexgeld',
      question: 'Sind Flexgeld-Zinsen variabel?',
      answer:
        'Oft gibt es eine garantierte Phase, danach kann der Zins variieren oder sinken. Achten Sie auf die Dauer der Zinsgarantie im Angebotsdetail.',
    },
    {
      id: 'flex-liquidity',
      category: 'flexgeld',
      question: 'Brauche ich mein Geld kurzfristig?',
      answer:
        'Flexgeld eignet sich nicht für sofortigen Zugriff. Für tägliche Liquidität ist Tagesgeld passender; für maximale Zinsplanung Festgeld mit passender Laufzeit.',
    },
    {
      id: 'what-festgeld',
      category: 'general',
      question: 'Was ist Festgeld?',
      answer:
        'Termineinlage mit fester Laufzeit und garantiertem Zinssatz. Kapital ist während der Laufzeit in der Regel nicht täglich verfügbar — planbare Erträge für mittelfristige Ziele.',
    },
    {
      id: 'fest-early-cancel',
      category: 'risks',
      question: 'Kann ich Festgeld vorzeitig kündigen?',
      answer:
        'Meist nicht oder nur mit erheblichem Zinsverlust. Legen Sie nur Geld an, das Sie bis zum Laufzeitende entbehren können.',
    },
    {
      id: 'fest-prolongation',
      category: 'notices',
      question: 'Automatische Verlängerung bei Festgeld?',
      answer:
        'Viele Banken verlängern automatisch, wenn Sie nicht rechtzeitig widersprechen — oft zu dann gültigen (niedrigeren) Konditionen. Laufzeitende notieren und Optionen vorab klären.',
    },
    {
      id: 'rate-change',
      category: 'notices',
      question: 'Können sich Zinsen im Vergleich ändern?',
      answer:
        'Ja. Der Live-Vergleich zeigt aktive Angebote; verbindlich sind die Konditionen zum Zeitpunkt der Kontoeröffnung bei der Bank. Prüfen Sie Neukundenaktionen und Laufzeiten der Zinsgarantie.',
    },
    {
      id: 'no-advice',
      category: 'notices',
      question: 'Ist das eine Anlageberatung?',
      answer:
        'Nein. Inhalte und Tools dienen der Information. Für individuelle Beratung wenden Sie sich an einen unabhängigen Finanzberater. Es gelten die Bedingungen der jeweiligen Partnerbank.',
    },
    {
      id: 'inflation',
      category: 'risks',
      question: 'Welche Risiken bestehen bei flexiblen Zinsanlagen?',
      answer:
        'Zinsen können die Kaufkraft nicht vollständig ausgleichen, wenn die Inflation höher ist als Ihr Nettoertrag nach Steuern. Sparprodukte dienen Stabilität und Planbarkeit, nicht spekulativer Rendite.',
    },
    {
      id: 'flex-product-risk',
      category: 'risks',
      question: 'Welche Risiken bei Flexgeld?',
      answer:
        'Zinsänderungen nach Aktionen, Kündigungsfristen, unterschiedliche Produktdefinitionen je Bank sowie politische/asymmetrische Risiken außerhalb des Einlagenschutzes bei Nicht-EU-Instituten (falls angeboten).',
    },
    {
      id: 'bonus-tax',
      category: 'taxes',
      question: 'Ist ein Neukundenbonus steuerpflichtig?',
      answer:
        'Ja, Boni gelten steuerlich als Kapitalertrag und unterliegen der Abgeltungssteuer — ggf. teilweise durch den Sparerpauschbetrag abgedeckt.',
    },
    {
      id: 'bonus-how',
      category: 'general',
      question: 'Wie erhalte ich einen Neukundenbonus?',
      answer:
        'Oft bei Erstabschluss über die Plattform, Mindestanlage und Mindesthaltefrist. Die genauen Bedingungen stehen im jeweiligen Angebot und in den Bankunterlagen.',
    },

    // ── Aktien ────────────────────────────────────────────────────────────
    {
      id: 'aktien-was-ist',
      category: 'aktien',
      question: 'Was ist eine Aktie und wie funktioniert der Aktienhandel?',
      answer:
        'Eine Aktie ist ein Miteigentumsanteil an einem börsennotierten Unternehmen. Sie erwerben Rechte am Unternehmen (z. B. auf Dividende und Stimmrecht) und partizipieren an Kurs­entwicklungen. Der Handel erfolgt über ein Wertpapierdepot bei einer regulierten Bank oder einem Broker — Aufträge werden an eine Börse (z. B. Xetra, NYSE) weitergeleitet.',
    },
    {
      id: 'aktien-risiken',
      category: 'aktien',
      question: 'Welche Risiken bestehen beim Investieren in Aktien?',
      answer:
        'Aktien unterliegen Kurs­schwankungen. Wesentliche Risiken sind das Unternehmens­risiko (Insolvenz), Marktrisiko (allgemeine Kurs­einbrüche), Währungs­risiko bei Fremdwährungs­titeln sowie Liquiditäts­risiken bei Nebenwerten. Ein Total­verlust ist möglich. Aktien eignen sich in der Regel für langfristige Anlage­horizonte (mind. 5–10 Jahre) und breite Diversifikation.',
    },
    {
      id: 'aktien-etf-unterschied',
      category: 'aktien',
      question: 'Was ist der Unterschied zwischen Einzelaktien und ETFs?',
      answer:
        'Einzelaktien bilden ein einzelnes Unternehmen ab — Chance und Risiko konzentriert. ETFs bündeln viele Aktien (z. B. den MSCI World mit über 1.500 Titeln) und streuen das Risiko automatisch über Länder und Branchen. Für die meisten Privatanleger sind breit gestreute ETFs die günstigere und ruhigere Basis­anlage.',
    },
    {
      id: 'aktien-dividenden',
      category: 'aktien',
      question: 'Was sind Dividenden und wie werden sie besteuert?',
      answer:
        'Dividenden sind Gewinn­ausschüttungen von Unternehmen an Aktionäre. In Deutschland unterliegen sie der Abgeltungssteuer (25 % zzgl. Soli, ggf. Kirchensteuer). Bei ausländischen Aktien wird zusätzlich Quellensteuer im Herkunftsland einbehalten — Doppelbesteuerungs­abkommen sind zu beachten.',
    },
    {
      id: 'aktien-order',
      category: 'aktien',
      question: 'Was ist der Unterschied zwischen Markt- und Limitorder?',
      answer:
        'Eine Marktorder wird sofort zum aktuellen Kurs ausgeführt — Sie erhalten schnelle Ausführung, aber keine Preis­garantie. Eine Limitorder wird nur bis zu einem von Ihnen festgelegten Preis ausgeführt — Sie steuern den Preis, riskieren aber, dass die Order nicht (vollständig) ausgeführt wird.',
    },

    // ── Anleihen ─────────────────────────────────────────────────────────
    {
      id: 'anleihen-was-ist',
      category: 'anleihen',
      question: 'Was ist eine Anleihe und wie funktioniert sie?',
      answer:
        'Eine Anleihe ist ein verzins­liches Wertpapier — Sie leihen dem Emittenten (Staat oder Unternehmen) Geld und erhalten dafür regelmäßige Zins­zahlungen (Kupon) sowie am Laufzeit­ende den Nennwert zurück. Anleihen gelten grundsätzlich als planbarer als Aktien, sind aber nicht risikofrei (Bonitäts- und Zinsänderungs­risiko).',
    },
    {
      id: 'anleihen-arten',
      category: 'anleihen',
      question: 'Welche Arten von Anleihen gibt es?',
      answer:
        'Die wichtigsten Kategorien: Staatsanleihen (z. B. Bundesanleihen, US Treasuries), Unternehmens­anleihen (Investment Grade bzw. High Yield), Pfandbriefe (durch Deckungsmasse besichert), Schwellen­länder­anleihen sowie Wandel- und inflations­indexierte Anleihen. Sie unterscheiden sich in Zinshöhe, Bonität und Liquidität.',
    },
    {
      id: 'anleihen-zinsrisiko',
      category: 'anleihen',
      question: 'Was bedeutet Zinsänderungsrisiko bei Anleihen?',
      answer:
        'Steigen die Marktzinsen, verlieren bereits ausgegebene Anleihen mit niedrigerem Kupon an Kurswert. Umgekehrt legen Kurse zu, wenn Zinsen fallen. Je länger die Rest­laufzeit (Duration), desto stärker der Effekt. Wer bis zur Endfälligkeit hält, erhält den Nennwert — der Kurs­verlust bleibt dann rein rechnerisch.',
    },
    {
      id: 'anleihen-rating',
      category: 'anleihen',
      question: 'Was sagt das Rating einer Anleihe aus?',
      answer:
        'Ratingagenturen (S&P, Moody\'s, Fitch) bewerten die Rück­zahlungs­wahrscheinlichkeit. Investment Grade (AAA bis BBB-) gilt als solide, High Yield / Junk (BB+ und schlechter) bietet höhere Zinsen bei entsprechend höherem Ausfall­risiko. Ratings sind eine Momentaufnahme und können sich ändern.',
    },
    {
      id: 'anleihen-vs-festgeld',
      category: 'anleihen',
      question: 'Anleihen oder Festgeld — was ist der Unterschied?',
      answer:
        'Festgeld ist ein Bank­einlagen­produkt mit gesetzlicher EU-Einlagen­sicherung bis 100.000 €. Anleihen sind Wertpapiere ohne Einlagen­sicherung — dafür oft mit höherer Rendite, aber Kurs- und Bonitätsrisiko. Festgeld eignet sich für planbare Sicherheit, Anleihen für gezielte Duration- und Bonitätswetten.',
    },

    // ── IPO ──────────────────────────────────────────────────────────────
    {
      id: 'ipo-was-ist',
      category: 'ipo',
      question: 'Was ist ein IPO (Börsengang)?',
      answer:
        'Bei einem Initial Public Offering (IPO) bietet ein Unternehmen erstmals Aktien öffentlich an der Börse an. Institutionelle und Privat­anleger können neue Aktien zum Emissions­preis zeichnen, bevor sie im regulären Börsenhandel notieren. Ziel des Unternehmens ist meist Kapital­beschaffung und höhere Sichtbarkeit.',
    },
    {
      id: 'ipo-teilnahme',
      category: 'ipo',
      question: 'Wie kann ich an einem IPO teilnehmen?',
      answer:
        'Sie benötigen ein Wertpapier­depot bei einer Bank oder einem Broker, der die jeweilige Emission anbietet. Innerhalb der Zeichnungs­frist geben Sie Ihre Order (Stück­zahl und Preis­spanne) auf. Die Zuteilung erfolgt nach Ende der Frist — bei Überzeichnung nicht garantiert. Als Fröhlich-Kunde informieren wir Sie über relevante Emissionen und unterstützen bei der Zeichnung.',
    },
    {
      id: 'ipo-risiken',
      category: 'ipo',
      question: 'Welche Risiken bestehen bei einem IPO?',
      answer:
        'IPOs sind besonders volatil: Kurs­schwankungen von 20 %+ am ersten Handelstag sind nicht ungewöhnlich. Zusätzliche Risiken: begrenzte historische Finanz­daten, mögliche Über­bewertung durch Emissions­euphorie, Lock-up-Perioden für Alt­aktionäre, sowie ausbleibende operative Ergebnisse in den ersten Quartalen. Nur Kapital investieren, dessen Total­verlust verkraftet werden kann.',
    },
    {
      id: 'ipo-zeichnung-kosten',
      category: 'ipo',
      question: 'Fallen bei der IPO-Zeichnung Gebühren an?',
      answer:
        'Der Emissions­preis selbst ist provisions­frei. Depot- und Order­gebühren der Bank können anfallen. Bei Nicht-Zuteilung entstehen keine Kosten. Details entnehmen Sie dem jeweiligen Emissions­prospekt und der Preisliste Ihrer Bank.',
    },
    {
      id: 'ipo-lockup',
      category: 'ipo',
      question: 'Was ist eine Lock-up-Periode?',
      answer:
        'Alt­aktionäre (Gründer, Investoren, Mitarbeiter) verpflichten sich beim IPO, ihre Aktien für einen definierten Zeitraum (meist 90–180 Tage) nicht zu verkaufen. Nach Ablauf der Lock-up-Frist kann zusätzliches Angebot auf den Markt kommen und den Kurs kurzfristig belasten.',
    },

    // ── Krypto ────────────────────────────────────────────────────────────
    {
      id: 'krypto-was-ist',
      category: 'krypto',
      question: 'Was sind Kryptowährungen?',
      answer:
        'Krypto­währungen sind digitale Vermögenswerte auf Basis von Blockchain-Technologie. Bekannteste Beispiele sind Bitcoin und Ethereum. Sie werden nicht von Zentralbanken emittiert und unterliegen erheblichen Kurs­schwankungen. Regulierungs­rahmen (u. a. EU-MiCA-Verordnung) entwickeln sich derzeit weiter.',
    },
    {
      id: 'krypto-verwahrung',
      category: 'krypto',
      question: 'Wie werden Kryptowerte sicher verwahrt?',
      answer:
        'Es gibt zwei Wege: (a) regulierte Verwahrer / Krypto­verwahr­stellen mit BaFin-Erlaubnis (bequem, aber Vertrauen in Dritten nötig), (b) Selbstverwahrung mittels Hardware-Wallet (voller Selbstschutz, aber volle Eigen­verantwortung für Recovery-Phrase). Kryptowerte unterliegen keiner EU-Einlagen­sicherung.',
    },
    {
      id: 'krypto-steuern',
      category: 'krypto',
      question: 'Wie werden Krypto-Gewinne in Deutschland besteuert?',
      answer:
        'Verkäufe innerhalb von 12 Monaten nach Kauf sind private Veräußerungs­geschäfte (Freigrenze 600 € pro Jahr) und unterliegen dem persönlichen Einkommensteuer­satz. Nach 12 Monaten Haltedauer sind Gewinne aktuell steuerfrei. Bei Staking oder Lending gelten Sonder­regeln — Steuerberater konsultieren.',
    },
    {
      id: 'krypto-risiken',
      category: 'krypto',
      question: 'Welche besonderen Risiken haben Kryptowerte?',
      answer:
        'Extreme Volatilität (>50 % Draw­downs möglich), Regulierungs­änderungen, Verlust­risiko bei Selbstverwahrung (verlorene Keys), Betrugs­risiken bei nicht regulierten Anbietern, sowie technische Risiken der Blockchain selbst. Kryptowerte sollten in der Regel nur einen kleinen Portfolio­anteil ausmachen.',
    },
    {
      id: 'krypto-anlageklasse',
      category: 'krypto',
      question: 'Sind Kryptowerte eine sinnvolle Anlageklasse?',
      answer:
        'Wir sehen Kryptowerte als spekulative, ergänzende Anlage­klasse — nicht als Kern­investment. Für Anleger, die diese Werte einbeziehen möchten, empfehlen wir eine kleine, disziplinierte Allokation, breite Diversifikation und ausschließlich regulierte Verwahrung oder gesicherte Selbstverwahrung. Keine Anlageempfehlung.',
    },

    // ── Depot & übergreifend ──────────────────────────────────────────────
    {
      id: 'depot-kosten',
      category: 'process',
      question: 'Was kostet ein Wertpapierdepot bei Fröhlich?',
      answer:
        'Die Depot­eröffnung selbst ist bei unseren Partnerbanken in der Regel kostenfrei. Order­gebühren fallen pro Wertpapier­kauf/-verkauf an und richten sich nach Bank und Handelsplatz. ETF-Sparpläne sind bei vielen Partnern gebührenfrei. Alle Konditionen weisen wir vor Depot­eröffnung transparent aus.',
    },
    {
      id: 'depot-diversifikation',
      category: 'process',
      question: 'Wie diversifiziere ich mein Portfolio sinnvoll?',
      answer:
        'Wir empfehlen Streuung über mehrere Anlage­klassen (Aktien, Anleihen, Immobilien, Rohstoffe), Regionen (Europa, USA, Schwellenländer) und Branchen. Zusätzlich sollten Anlage­horizont, Liquiditäts­bedarf und persönliche Situation berücksichtigt werden. Ihr Ansprechpartner entwickelt gemeinsam mit Ihnen eine passende Allokation.',
    },
    {
      id: 'anlage-vs-spekulation',
      category: 'notices',
      question: 'Was ist der Unterschied zwischen Anlage und Spekulation?',
      answer:
        'Anlage basiert auf Analyse, langfristigem Zeithorizont und Diversifikation — Ziel ist realer Vermögens­aufbau bei kalkulier­baren Risiken. Spekulation zielt auf kurzfristige Kurs­gewinne mit hohem Verlust­risiko. Fröhlich Vermögens­beratung positioniert sich klar auf der Anlage-Seite — informieren, einordnen, langfristig begleiten.',
    },
  ],
};

export const socialCopy = {
  tagline: 'EU-regulierte Sparvermittlung — klar, sicher, unabhängig.',
  linkedinAbout:
    'Wir vermitteln ausgewählte Tagesgeld-, Flexgeld- und Festgeldangebote europäischer Partnerbanken — mit persönlicher Betreuung aus Bad Kreuznach.',
};
