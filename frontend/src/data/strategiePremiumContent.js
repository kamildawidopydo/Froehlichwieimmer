/**
 * Session 80.21a — Premium-Content für Flagship-Strategieseiten.
 *
 * Additiv zur bestehenden `strategieContent.js` (jene bleibt Quelle für Nav,
 * Overview, Category-Listings und alle nicht ausgebauten Themen). Diese
 * Datei liefert nur den strukturierten Zusatz-Content für die drei Flagships:
 *   - value-investing
 *   - nachhaltige-investments-esg
 *   - private-rentenvorsorge
 *
 * `StrategieDetail.jsx` lädt via `findPremium(topicSlug)`. Existiert
 * ein Premium-Blob, wird das Premium-Layout gerendert. Sonst greift der
 * bestehende Sections/FAQ-Fallback — die neun übrigen Topics bleiben
 * unverändert.
 */

/**
 * @typedef {Object} PremiumQuickFact
 * @property {string} label
 * @property {string} value
 */

/**
 * @typedef {Object} PremiumAspect
 * @property {string} iconName  lucide-react icon-name (z.B. "shield")
 * @property {string} title
 * @property {string} body
 */

/**
 * @typedef {Object} PremiumRelated
 * @property {string} label
 * @property {string} path
 */

/**
 * @typedef {Object} PremiumComparisonRow
 * @property {string} label
 * @property {string} left
 * @property {string} right
 */

/**
 * @typedef {Object} PremiumComparison
 * @property {string} leftTitle
 * @property {string} rightTitle
 * @property {PremiumComparisonRow[]} rows
 */

/**
 * @typedef {Object} PremiumSelfCheckOption
 * @property {string} value
 * @property {string} label
 */

/**
 * @typedef {Object} PremiumSelfCheck
 * @property {string} question
 * @property {PremiumSelfCheckOption[]} options
 * @property {string} summary  Neutrale Zusammenfassung nach Auswahl (kein Scoring).
 */

/**
 * @typedef {Object} PremiumTopic
 * @property {string} summary
 * @property {PremiumQuickFact[]} quickFacts
 * @property {{ title: string, body: string }[]} shortExplanation
 * @property {{ intro: string, points: string[] }} suitableFor
 * @property {string[]} howItWorks
 * @property {PremiumAspect[]} aspects
 * @property {{ title: string, body: string, disclaimer: string }} example
 * @property {string[]} advantages
 * @property {string[]} considerations
 * @property {string[]} mistakes
 * @property {PremiumSelfCheck} selfCheck
 * @property {PremiumComparison} comparison
 * @property {PremiumRelated[]} related
 * @property {{ q: string, a: string }[]} faqs
 */

/** @type {Record<string, PremiumTopic>} */
export const premiumTopics = {
  // ─────────────────────────── Value Investing ───────────────────────────
  'value-investing': {
    summary:
      'Value Investing sucht Unternehmen, deren Substanzwert vom Börsenkurs abweicht — und begründet die Entscheidung mit harten betriebswirtschaftlichen Kennzahlen. Der Ansatz stammt aus den 1930er-Jahren und zählt zu den am längsten dokumentierten Investmentschulen.',
    quickFacts: [
      { label: 'Ziel', value: 'Kauf unter dem inneren Wert' },
      { label: 'Zeithorizont', value: 'langfristig, 5–10 Jahre und länger' },
      { label: 'Komplexität', value: 'mittel bis hoch' },
      { label: 'Schwerpunkt', value: 'Fundamentalanalyse' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Ein Anlageansatz, bei dem die Auswahl auf einer eigenständigen Bewertung des Unternehmens beruht — nicht auf Trends oder Kursverläufen.',
      },
      {
        title: 'Grundidee',
        body: 'Kurzfristig reagiert der Markt oft emotional. Über längere Zeiträume nähert sich der Kurs jedoch dem an, was ein Unternehmen betriebswirtschaftlich tatsächlich wert ist.',
      },
      {
        title: 'Warum beschäftigen sich Anleger damit?',
        body: 'Weil der Ansatz nachvollziehbar bleibt: Bilanz, Cashflow, Verschuldung und Marktposition liefern harte Anhaltspunkte statt Prognosen.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'In einem breit gestreuten Portfolio kann Value stabilisierend wirken — insbesondere in Phasen, in denen Bewertungsdisziplin wieder stärker gewichtet wird.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'lange Anlagehorizonte akzeptieren und nicht auf kurzfristige Kursbewegungen reagieren möchten.',
        'Freude an fundamentalen Kennzahlen und Geschäftsmodellen haben.',
        'bereit sind, gegen den Konsens zu investieren, wenn die Zahlen dies rechtfertigen.',
        'Wert auf einen nachvollziehbaren Entscheidungsrahmen legen — statt auf Gefühlssignale.',
      ],
    },
    howItWorks: [
      'Fundamentaldaten sichten — Bilanz, Cashflow, Verschuldung, Wettbewerbsposition.',
      'Einen inneren Wert herleiten, etwa über Discounted-Cashflow-Modelle oder Kennzahlvergleiche.',
      'Nur kaufen, wenn der Marktpreis deutlich darunter liegt — die klassische „margin of safety".',
      'Das Investment über Jahre begleiten. Verkaufen, wenn der innere Wert erreicht wird oder die These bricht.',
      'Portfolio regelmäßig prüfen — nicht ständig umschichten, aber im Blick behalten.',
    ],
    aspects: [
      {
        iconName: 'book',
        title: 'Fundamentalanalyse als Basis',
        body: 'Statt auf Prognosen zu setzen, ordnet Value das Unternehmen wirtschaftlich ein. Grundlage sind Geschäftsberichte, Bilanzkennzahlen und die Qualität der Geschäftstätigkeit.',
      },
      {
        iconName: 'shield',
        title: 'Sicherheitsmarge',
        body: 'Ein Kauf erfolgt nur, wenn zwischen berechnetem Wert und Kurs ein deutlicher Puffer besteht. Der Puffer soll Bewertungsfehler und Überraschungen abfedern.',
      },
      {
        iconName: 'clock',
        title: 'Zeit als Verbündeter',
        body: 'Kurzfristige Marktschwankungen werden akzeptiert. Der Anspruch: Bewertungen setzen sich mit den Jahren durch.',
      },
      {
        iconName: 'target',
        title: 'Selektiv statt breit',
        body: 'Value-Anleger halten häufig konzentriertere Portfolios als reine Index-Investoren. Die Streuung bleibt trotzdem wichtig — meist über Branchen und Regionen.',
      },
      {
        iconName: 'alert-triangle',
        title: 'Value-Fallen erkennen',
        body: 'Ein niedrig bewertetes Unternehmen ist nicht automatisch günstig. Manchmal spiegelt der Kurs ein strukturelles Problem — genau darin liegt die Herausforderung.',
      },
      {
        iconName: 'layers',
        title: 'Fonds oder Einzelwerte',
        body: 'Value lässt sich über Faktor-ETFs, aktiv gemanagte Fonds oder Einzelwerte abbilden. Die Umsetzung entscheidet stärker über den Erfolg als das reine Etikett.',
      },
    ],
    example: {
      title: 'Ein einfaches Zahlenbild',
      body: 'Angenommen, ein etabliertes Konsumgüterunternehmen wird an der Börse mit dem 10-fachen seines Jahresgewinns bewertet, während vergleichbare Wettbewerber beim 18-fachen liegen. Ein Value-Ansatz würde nun prüfen, ob der Bewertungsabschlag durch echte Schwächen begründet ist oder eher durch aktuelle Marktstimmung. Ergibt die Analyse keinen strukturellen Nachteil, spricht dies aus Value-Sicht für ein Investment — mit der Bereitschaft, mehrere Jahre auf eine Angleichung zu warten.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Nachvollziehbare Entscheidungsgrundlage über Fundamentalzahlen.',
      'Fokus auf Substanz statt auf Kurstrends.',
      'Historisch etabliertes Konzept mit umfangreicher Literatur.',
      'Diszipliniert gegen emotionale Marktreaktionen.',
    ],
    considerations: [
      'Bewertungsansätze setzen Annahmen voraus, die falsch sein können.',
      'Value-Phasen verlaufen mitunter mehrere Jahre schwächer als Growth.',
      'Der Zeitaufwand für die Analyse ist deutlich höher als bei rein passiven Ansätzen.',
      'Konzentrierte Portfolios haben höhere Einzeltitel-Risiken.',
    ],
    mistakes: [
      'Ein Unternehmen kaufen, weil es einfach billig aussieht — ohne die Zahlen zu verstehen.',
      'Value als schnelle Renditequelle behandeln. Der Ansatz braucht Jahre, keine Monate.',
      'Die eigene Analyse nicht dokumentieren. Ohne schriftliche These fehlt bei Kursschwäche die Referenz.',
      'Bewertungsansätze verwechseln — KGV, KBV und Free-Cashflow-Renditen erzählen unterschiedliche Geschichten.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'fundamentals', label: 'Ich möchte fundamentale Kennzahlen selbst verstehen und einordnen können.' },
        { value: 'horizon', label: 'Ich habe einen Anlagehorizont von mindestens 5 Jahren.' },
        { value: 'contrarian', label: 'Ich möchte auch dann investiert bleiben, wenn der Markt anders bewertet als ich.' },
        { value: 'etf-route', label: 'Ich möchte Value über Fonds oder ETFs abbilden, nicht in Einzelwerten.' },
        { value: 'building-block', label: 'Ich möchte Value als einen Baustein neben anderen Ansätzen nutzen.' },
      ],
      summary:
        'Diese Punkte können Sie in einem persönlichen Gespräch gezielt ansprechen. Sie helfen dabei, den Ansatz an Ihre individuelle Situation anzupassen.',
    },
    comparison: {
      leftTitle: 'Value Investing',
      rightTitle: 'Dividendenstrategie',
      rows: [
        { label: 'Grundidee', left: 'Kauf unter innerem Wert', right: 'Regelmäßige Ausschüttungen als Ertragsquelle' },
        { label: 'Fokus', left: 'Substanz und Bewertung', right: 'Cashflow und Ausschüttungsqualität' },
        { label: 'Zeitrahmen', left: '5–10 Jahre und länger', right: 'mittel- bis langfristig' },
        { label: 'Ertragsquelle', left: 'Bewertungsangleichung', right: 'Dividenden plus Kurspotenzial' },
        { label: 'Aufwand', left: 'hoch (eigene Analyse)', right: 'mittel' },
        {
          label: 'Typische Frage',
          left: 'Was ist dieses Unternehmen wirklich wert?',
          right: 'Wie verlässlich schüttet das Unternehmen aus?',
        },
      ],
    },
    related: [
      { label: 'Dividendenstrategien', path: '/strategie/anlagestile/dividendenstrategien' },
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
      { label: 'Inflationsschutz', path: '/strategie/schutz-steuerung/inflationsschutz' },
    ],
    faqs: [
      {
        q: 'Ist Value Investing veraltet?',
        a: 'Nein. Bewertungsorientierte Ansätze bleiben ein etablierter Teil der Anlagelehre. Sie durchlaufen aber Phasen, in denen sie sich schwächer entwickeln als wachstumsbetonte Stile.',
      },
      {
        q: 'Kann ich Value Investing über ETFs abbilden?',
        a: 'Ja. Es existieren Faktor-ETFs, die systematisch nach Bewertungskennzahlen selektieren. Alternativ gibt es aktiv gemanagte Value-Fonds mit unterschiedlichen Auslegungen.',
      },
      {
        q: 'Wie lange sollte ich Value-Positionen halten?',
        a: 'Value entfaltet seine Idee typischerweise über mehrjährige Zeiträume. Ein Anlagehorizont von unter drei Jahren passt selten zum Stil.',
      },
      {
        q: 'Braucht Value Investing besonderes Fachwissen?',
        a: 'Für die Umsetzung über Fonds oder ETFs reichen Grundkenntnisse. Wer selbst analysieren möchte, sollte Bilanzstrukturen und einige Kennzahlen sicher lesen können — das lässt sich erlernen, braucht aber Zeit.',
      },
      {
        q: 'Kann Value in einem ETF-Depot ergänzt werden?',
        a: 'Ja. Ein Faktor-ETF oder aktiv gemanagter Value-Fonds kann als Stilkomponente neben einem breiten Weltindex genutzt werden.',
      },
    ],
  },

  // ─────────────────────────── Nachhaltige Investments (ESG) ───────────────
  'nachhaltige-investments-esg': {
    summary:
      'ESG-Investing verbindet finanzielle Ziele mit einem Regelwerk zu Umwelt, Sozialem und Unternehmensführung. Anders als das reine Ausschließen von Branchen ist ESG heute ein methodisch definiertes Feld — mit Kennzahlen, Berichtspflichten und mehreren Anlageansätzen.',
    quickFacts: [
      { label: 'Ziel', value: 'nachhaltige Anlagen mit finanzieller Rendite' },
      { label: 'Zeithorizont', value: 'mittel- bis langfristig' },
      { label: 'Komplexität', value: 'mittel' },
      { label: 'Schwerpunkt', value: 'Kriterien-basierte Auswahl' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'ESG ist ein Rahmen, um Unternehmen und Wertpapiere nach Umwelt-, Sozial- und Governance-Kriterien zu bewerten und daraus Investmententscheidungen abzuleiten.',
      },
      {
        title: 'Grundidee',
        body: 'Wer Kapital sinnvoll investieren möchte, kann finanzielle Ziele mit inhaltlichen Leitplanken kombinieren — statt Rendite und Werte getrennt zu betrachten.',
      },
      {
        title: 'Warum das Thema wächst',
        body: 'Regulierung wie SFDR und CSRD schafft Transparenz. Immer mehr Fonds müssen ihre Nachhaltigkeitsansätze offenlegen und mit Kennzahlen belegen.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'ESG lässt sich als Kern oder als Ergänzung nutzen — bei Aktien-, Anleihen- und Immobilien-Bausteinen.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'eigene finanzielle Ziele mit klaren Werten verbinden möchten.',
        'bereit sind, unterschiedliche Nachhaltigkeitsansätze zu verstehen und zu vergleichen.',
        'vor regulatorischen Vorgaben stehen — etwa Stiftungen oder institutionelle Anleger — und ESG-konform anlegen müssen.',
        'bei Anlageentscheidungen nicht nur finanzielle, sondern auch inhaltliche Kriterien systematisch berücksichtigen wollen.',
      ],
    },
    howItWorks: [
      'Prioritäten klären — Klima, soziale Aspekte, Governance oder mehrere Themen kombiniert.',
      'Umsetzungsweg wählen: Ausschluss, Best-in-Class, ESG-Integration oder Impact-orientierte Vehikel.',
      'Fondsprospekte und Vorvertragliche Informationen prüfen — insbesondere die SFDR-Kategorie und die zugrundeliegende Methodik.',
      'Portfolio breit strukturieren. Nachhaltigkeit ersetzt keine Diversifikation.',
      'Regelmäßig überprüfen, ob die Wirkung der gewählten Vehikel tatsächlich der eigenen Intention entspricht.',
    ],
    aspects: [
      {
        iconName: 'leaf',
        title: 'Ausschlussverfahren',
        body: 'Bestimmte Branchen — etwa fossile Rohstoffe oder Waffen — werden vom Anlageuniversum ausgeschlossen. Der Ansatz ist einfach umsetzbar, aber ohne explizites Wirkungsziel.',
      },
      {
        iconName: 'award',
        title: 'Best-in-Class',
        body: 'Investiert wird in die aus ESG-Sicht führenden Unternehmen einer Branche — auch dann, wenn die Branche selbst umstritten ist. So bleibt die Branchenstreuung erhalten.',
      },
      {
        iconName: 'layers',
        title: 'ESG-Integration',
        body: 'Nachhaltigkeitskennzahlen fließen in die reguläre Fundamentalanalyse ein. Sie beeinflussen die Auswahl, ohne sie strikt zu beschränken.',
      },
      {
        iconName: 'target',
        title: 'Impact-Ansätze',
        body: 'Der Anspruch geht über die Auswahl hinaus. Eine Wirkung wird explizit angestrebt und mit Kennzahlen dokumentiert — etwa vermiedene Emissionen oder finanzierte Projekte.',
      },
      {
        iconName: 'file-text',
        title: 'SFDR-Einordnung',
        body: 'Fonds werden in Artikel-6-, -8- oder -9-Kategorien eingeordnet. Die Einordnung sagt etwas über den Nachhaltigkeitsanspruch, nicht aber automatisch über die tatsächliche Wirkung.',
      },
      {
        iconName: 'alert-triangle',
        title: 'Greenwashing als Risiko',
        body: 'Nicht jedes nachhaltige Etikett hält, was es verspricht. Methodik, Bewertungsanbieter und Portfolio-Zusammensetzung entscheiden — nicht die Marketingzeile.',
      },
    ],
    example: {
      title: 'Ein Alltagsbeispiel',
      body: 'Eine Anlegerin möchte in ihrem ETF-Depot künftig Klimaaspekte stärker gewichten. Sie behält ihren globalen Basis-ETF und ergänzt ihn um einen ETF, der nach SFDR Artikel 8 klassifiziert ist und explizit fossile Energieträger ausschließt. Zusätzlich prüft sie den Anteil klimaorientierter Fonds am Gesamtdepot und wählt eine Größenordnung, die zu ihrer Diversifikation passt.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Verbindung von finanzieller und inhaltlicher Zielsetzung.',
      'Zunehmende Transparenz durch Regulierung und Berichtspflichten.',
      'Breite Produktauswahl über Aktien-, Anleihen- und Immobilienfonds.',
      'Grundlage für Anleger, die klassisch fossile Sektoren im Depot vermeiden möchten.',
    ],
    considerations: [
      'Ratings unterschiedlicher Anbieter kommen zu abweichenden Einschätzungen.',
      'Etiketten allein sagen wenig — die Methodik entscheidet.',
      'ESG-Konzentration kann kurzfristig zu höherer Volatilität führen.',
      'Die Umsetzung erfordert Zeit für Prospekt- und Methodenprüfung.',
    ],
    mistakes: [
      'Ausschließlich auf das Fondslabel achten und die Methodik ignorieren.',
      'Nachhaltigkeit mit garantiert höheren Renditen gleichsetzen. Beides sind unterschiedliche Fragen.',
      'Impact und ESG synonym verwenden. Nur echte Impact-Anlagen definieren ein messbares Wirkungsziel.',
      'Diversifikation aufgeben, um besonders „grün" zu wirken. Sektorwetten bleiben Risiken.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'no-fossil', label: 'Ich möchte fossile Energieträger im Depot vermeiden.' },
        { value: 'climate-path', label: 'Ich möchte den Klimapfad meiner Anlagen dokumentieren können.' },
        { value: 'social-governance', label: 'Ich lege Wert auf soziale und Governance-Kriterien, nicht nur Umwelt.' },
        { value: 'impact', label: 'Ich möchte gezielt in messbare Wirkungsprojekte investieren.' },
        { value: 'complement', label: 'Ich möchte ESG als Ergänzung nutzen, ohne mein Basis-Portfolio zu ersetzen.' },
      ],
      summary:
        'Diese Punkte helfen dabei, den passenden Nachhaltigkeitsansatz einzugrenzen — vom breiten ESG-ETF bis zum spezialisierten Impact-Fonds.',
    },
    comparison: {
      leftTitle: 'ESG',
      rightTitle: 'Impact Investing',
      rows: [
        {
          label: 'Grundidee',
          left: 'Systematische Berücksichtigung von ESG-Kriterien',
          right: 'Explizit messbare Wirkungsabsicht',
        },
        {
          label: 'Fokus',
          left: 'Auswahl und Ausschlüsse',
          right: 'Ziel-orientierte Projekte und Themen',
        },
        {
          label: 'Zeitrahmen',
          left: 'mittel- bis langfristig',
          right: 'langfristig, oft mit Kapitalbindung',
        },
        {
          label: 'Umsetzbar über',
          left: 'Breite Fonds- und ETF-Angebote',
          right: 'spezialisierte Fonds, Direktinvestments, Green Bonds',
        },
        {
          label: 'Messung',
          left: 'Kennzahlen und Ratings',
          right: 'definierte Wirkungs-Kennzahlen (z. B. eingesparte Tonnen CO₂)',
        },
        {
          label: 'Typische Frage',
          left: 'Wie nachhaltig ist mein Portfolio ausgerichtet?',
          right: 'Welche konkrete Wirkung entsteht durch mein Kapital?',
        },
      ],
    },
    related: [
      { label: 'Impact Investing', path: '/strategie/nachhaltigkeit/impact-investing' },
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
      { label: 'Private Rentenvorsorge', path: '/strategie/altersvorsorge/private-rentenvorsorge' },
    ],
    faqs: [
      {
        q: 'Bringt ESG automatisch weniger Rendite?',
        a: 'Empirisch ist der Zusammenhang uneinheitlich. In manchen Phasen liegen ESG-Portfolios vorne, in anderen nicht. Entscheidend sind Methodik, Kostenstruktur und Marktumfeld.',
      },
      {
        q: 'Ist Art. 9 immer nachhaltiger als Art. 8?',
        a: 'Art.-9-Fonds verfolgen ein nachhaltiges Anlageziel als Kern, Art.-8-Fonds berücksichtigen ESG-Aspekte. Ob ein Fonds zu Ihnen passt, hängt vom konkreten Ansatz ab, nicht allein vom Label.',
      },
      {
        q: 'Wie unterscheiden sich ESG-Ratings verschiedener Anbieter?',
        a: 'Die Anbieter gewichten Kennzahlen unterschiedlich und legen abweichende Datenquellen zugrunde. Zwei Ratings zum selben Unternehmen können daher zu unterschiedlichen Einschätzungen führen. Aufschlussreich ist ein Blick in die jeweiligen Methodikdokumente.',
      },
      {
        q: 'Was ist SFDR und warum taucht sie überall auf?',
        a: 'SFDR steht für Sustainable Finance Disclosure Regulation. Die EU-Verordnung verpflichtet Fondsanbieter, ihre Nachhaltigkeitsansätze offenzulegen und in Artikel-6-, -8- oder -9-Kategorien einzuordnen. Für Anleger wird die Vergleichbarkeit dadurch deutlich höher.',
      },
      {
        q: 'Sollte ich ausschließlich in ESG anlegen?',
        a: 'Das ist eine persönliche Entscheidung und häufig eine Frage der Depotstruktur. Viele Anleger nutzen ESG als eine Perspektive neben anderen — nicht als exklusive Regel.',
      },
    ],
  },

  // ─────────────────────────── Private Rentenvorsorge ─────────────────────
  'private-rentenvorsorge': {
    summary:
      'Die gesetzliche Rente allein reicht in vielen Fällen nicht aus, um den gewohnten Lebensstandard im Ruhestand zu halten. Private Rentenvorsorge schließt diese Lücke mit eigenem Kapital — flexibel als Depot oder verbindlich als Rentenversicherung.',
    quickFacts: [
      { label: 'Ziel', value: 'Ergänzung der gesetzlichen Rente' },
      { label: 'Zeithorizont', value: '15–40 Jahre je nach Alter' },
      { label: 'Komplexität', value: 'mittel' },
      { label: 'Schwerpunkt', value: 'Kapitalaufbau + Auszahlungslogik' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Sammelbegriff für alle Sparformen, mit denen Sie außerhalb von gesetzlicher und betrieblicher Rente eigenständig für den Ruhestand vorsorgen.',
      },
      {
        title: 'Grundidee',
        body: 'Über viele Jahre werden regelmäßig Sparbeiträge investiert. In der Auszahlungsphase entsteht daraus ein Kapital oder eine lebenslange Rente.',
      },
      {
        title: 'Warum das Thema wichtig ist',
        body: 'Die gesetzliche Rente wurde für ein anderes demografisches Bild entworfen. Für einen Ruhestand ohne finanzielle Einschnitte ist private Vorsorge in vielen Lebensmodellen zentral.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Private Rentenvorsorge ist ein Baustein von mehreren — im Zusammenspiel mit gesetzlicher Rente, bAV, Vermögensaufbau und einer soliden Liquiditätsreserve.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'ein realistisches Bild ihrer Rentenlücke bekommen möchten.',
        'ergänzend zur gesetzlichen Rente Kapital für später aufbauen wollen.',
        'steuerlich unterschiedliche Vorsorgewege sauber gegeneinander abwägen möchten.',
        'entscheiden möchten, ob Depot, Rentenversicherung oder eine Kombination besser passt.',
      ],
    },
    howItWorks: [
      'Rentenlücke schätzen — heutigen Bedarf, gesetzliche Ansprüche und Inflation grob gegeneinanderlegen.',
      'Sparziel und Zeithorizont definieren. Beides bildet die Grundlage für Sparrate und Anlagemix.',
      'Umsetzungsweg wählen — flexibles Depot, ETF-Sparplan, klassische Rentenversicherung oder eine Kombination.',
      'Kostenstruktur genau prüfen. Bei Versicherungslösungen sind Effektivkosten häufig entscheidender als die Bruttorendite.',
      'Alle zwei bis drei Jahre überprüfen, ob Sparrate, Anlagemix und persönliche Situation noch zusammenpassen.',
    ],
    aspects: [
      {
        iconName: 'trending-up',
        title: 'Zeithorizont als Hebel',
        body: 'Bei langen Sparphasen wirkt der Zinseszins deutlich. Ein Startunterschied von fünf Jahren verändert die Endsumme oft spürbar — bei gleicher Sparrate.',
      },
      {
        iconName: 'briefcase',
        title: 'Depot vs. Versicherungsmantel',
        body: 'Wertpapierdepots sind flexibel und transparent. Rentenversicherungen liefern lebenslange Zahlungen und steuerliche Sonderregeln — auf Kosten der Flexibilität.',
      },
      {
        iconName: 'percent',
        title: 'Effektivkosten prüfen',
        body: 'Bei Versicherungslösungen sind die Kosten oft in mehrere Positionen verteilt. Die Effektivkostenquote gibt einen Vergleichspunkt — sie steht im Produktinformationsblatt.',
      },
      {
        iconName: 'shield',
        title: 'Kaufkraft im Blick',
        body: 'Der reale Wert einer Rente hängt von der Inflation ab. Sachwertorientierte Anlagen können in der Ansparphase gegen Kaufkraftverluste helfen.',
      },
      {
        iconName: 'clock',
        title: 'Flexibilität bei der Auszahlung',
        body: 'Depotlösungen erlauben freie Entnahmen. Rentenverträge kennen häufig ein Kapitalwahlrecht — Sie entscheiden zu Rentenbeginn zwischen Einmalzahlung und lebenslanger Rente.',
      },
      {
        iconName: 'book',
        title: 'Steuerliche Wirkung',
        body: 'Die Besteuerung unterscheidet sich je nach Vehikel. Depots werden nach Abgeltungsteuer besteuert, Versicherungslösungen können vom Halbeinkünfteverfahren profitieren, wenn Fristen erfüllt sind.',
      },
    ],
    example: {
      title: 'Ein einfaches Rechenbeispiel',
      body: 'Eine 35-jährige Anlegerin plant, monatlich 250 Euro über 30 Jahre in einen breit gestreuten ETF-Sparplan zu investieren. Sie prüft parallel eine fondsgebundene Rentenversicherung mit ähnlichem Anlagekern. Der entscheidende Vergleich sind nicht die Bruttorenditen, sondern die Effektivkosten und die spätere steuerliche Behandlung: Der ETF-Weg ist flexibler, die Versicherung bietet unter Umständen bei sehr langer Laufzeit steuerliche Vorteile. Die Wahl hängt vom persönlichen Kontext ab.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Frei planbare Sparhöhe und Anlagemix.',
      'Ergänzt gesetzliche Rente und bAV zu einem tragfähigen Gesamtbild.',
      'Breite Produktauswahl vom ETF-Depot bis zur Rentenversicherung.',
      'In vielen Lösungen später Wahl zwischen Kapitalauszahlung und lebenslanger Rente.',
    ],
    considerations: [
      'Manche Versicherungslösungen sind sehr langfristig gebunden.',
      'Effektivkosten variieren stark und beeinflussen das Endergebnis deutlich.',
      'Wertpapierbasierte Lösungen unterliegen Kursschwankungen.',
      'Steuerliche Regeln können sich im Laufe der Ansparphase ändern.',
    ],
    mistakes: [
      'Vorsorge zu spät starten. Der Zeithorizont ist der Faktor, der schwer nachzuholen ist.',
      'Nur eine Vorsorgeform nutzen und die anderen ignorieren. Steuerliche und rechtliche Aspekte sprechen fast immer für eine Kombination.',
      'Ausschließlich auf die Bruttorendite achten. Bei Versicherungslösungen sagt sie ohne Effektivkosten wenig aus.',
      'Die Sparrate auch nach Gehaltssprüngen unverändert lassen. Regelmäßige Anpassungen sind ein einfacher Hebel.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'flexible-rate', label: 'Ich möchte meine Sparrate jederzeit flexibel anpassen können.' },
        { value: 'lifelong-rent', label: 'Ich lege Wert auf eine lebenslange Rentenzahlung.' },
        { value: 'tax-optimize', label: 'Ich möchte die spätere Auszahlung steuerlich optimieren.' },
        { value: 'self-managed', label: 'Ich möchte die Anlage im Depot selbst steuern.' },
        { value: 'bav-mix', label: 'Ich möchte betriebliche und private Vorsorge sauber miteinander verzahnen.' },
      ],
      summary:
        'Diese Punkte lassen sich in einem persönlichen Gespräch konkret verrechnen — inklusive Blick auf gesetzliche Rente, bAV und mögliche Steuereffekte.',
    },
    comparison: {
      leftTitle: 'Private Rentenvorsorge',
      rightTitle: 'Betriebliche Altersvorsorge',
      rows: [
        { label: 'Grundidee', left: 'Freiwillige, private Sparlösung', right: 'Über den Arbeitgeber organisierte Lösung' },
        {
          label: 'Beitragsleistung',
          left: 'aus Netto oder Brutto (je nach Vehikel)',
          right: 'meist aus dem Bruttogehalt (Entgeltumwandlung)',
        },
        {
          label: 'Steuer',
          left: 'Depots nach Abgeltungsteuer, Versicherungen mit Sonderregeln',
          right: 'Ansparphase steuer- und teilweise sozialabgabenfrei',
        },
        { label: 'Portabilität', left: 'vollständig frei', right: 'bei Arbeitgeberwechsel oft eingeschränkt' },
        {
          label: 'Sozialabgaben',
          left: 'keine in der Auszahlungsphase',
          right: 'oft fällig, besonders auf Betriebsrenten',
        },
        { label: 'Zuschüsse', left: 'keine', right: 'Arbeitgeber- oder Tarifzuschüsse möglich' },
      ],
    },
    related: [
      { label: 'Altersvorsorge – Überblick', path: '/strategie/altersvorsorge/altersvorsorge' },
      { label: 'Betriebliche Altersvorsorge', path: '/strategie/altersvorsorge/betriebliche-altersvorsorge' },
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
    ],
    faqs: [
      {
        q: 'Ab welchem Alter lohnt sich private Rentenvorsorge?',
        a: 'Grundsätzlich früh — je länger die Ansparphase, desto stärker der Zinseszinseffekt. Wer erst spät startet, kann die Sparrate erhöhen oder den Anlagemix stärker chancenorientiert wählen — beides mit den entsprechenden Risiken.',
      },
      {
        q: 'Ist eine Rentenversicherung teurer als ein ETF-Sparplan?',
        a: 'In vielen Fällen ja — die Effektivkosten der Versicherungslösung liegen über den Kosten eines reinen ETF-Depots. Zugleich enthält die Versicherung Zusatzleistungen wie lebenslange Rente oder Garantiebausteine. Die Frage ist, welchen Wert diese Zusätze für Sie haben.',
      },
      {
        q: 'Was ist besser: Einmalauszahlung oder lebenslange Rente?',
        a: 'Beides hat seine Berechtigung. Einmalauszahlungen sind flexibel und vererbbar; lebenslange Renten decken das Langlebigkeitsrisiko und bieten planbare Zahlungen. In der Praxis wird häufig eine Kombination gewählt.',
      },
      {
        q: 'Sollte ich private Vorsorge und bAV parallel nutzen?',
        a: 'Sehr häufig ja. Die bAV bietet steuerliche Effekte in der Ansparphase, die private Vorsorge bleibt vollständig portabel und flexibel. Wichtig ist die Abstimmung — nicht die reine Verdopplung.',
      },
    ],
  },
};

import { premiumTopicsExtra } from './strategiePremiumContentExtra';
import { premiumMeta } from './strategiePremiumMeta';

/** Merged registry: Flagships (80.21a) + weitere 9 Topics (80.21b) + Knowledge-Center-Meta (80.22). */
const mergedPremiumTopics = Object.keys({ ...premiumTopics, ...premiumTopicsExtra }).reduce((acc, slug) => {
  const base = premiumTopics[slug] || premiumTopicsExtra[slug];
  const meta = premiumMeta[slug];
  acc[slug] = meta ? { ...base, ...meta } : base;
  return acc;
}, {});

export const findPremium = (topicSlug) => mergedPremiumTopics[topicSlug] || null;
