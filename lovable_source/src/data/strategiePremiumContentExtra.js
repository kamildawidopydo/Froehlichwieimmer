/**
 * Session 80.21b — Premium-Content für die 9 verbleibenden Strategie-Topics.
 * Struktur identisch zu strategiePremiumContent.js (Session 80.21a Flagships).
 * Wird von `strategiePremiumContent.js` in `premiumTopics` gemerged.
 */

/** @type {Record<string, import('./strategiePremiumContent').PremiumTopic>} */
export const premiumTopicsExtra = {
  // ─────────────────────────── Dividendenstrategien ──────────────────────
  dividendenstrategien: {
    summary:
      'Dividendenstrategien setzen auf Unternehmen, die einen Teil ihres Gewinns regelmäßig ausschütten. Im Mittelpunkt stehen laufende Erträge, die Qualität des Geschäftsmodells und die Verlässlichkeit der Ausschüttungspolitik — nicht die reine Kursspekulation.',
    quickFacts: [
      { label: 'Ziel', value: 'laufende Erträge aus Ausschüttungen' },
      { label: 'Zeithorizont', value: 'mittel- bis langfristig' },
      { label: 'Komplexität', value: 'mittel' },
      { label: 'Schwerpunkt', value: 'Ausschüttungsqualität' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Ein Anlagestil, bei dem die Auswahl von Aktien und Fonds stark an der Ausschüttungspolitik orientiert ist — mit dem Ziel eines planbaren Cashflows.',
      },
      {
        title: 'Grundidee',
        body: 'Nicht jeder Gewinn muss thesauriert werden. Ein Teil der Gesamtrendite wird bewusst in Form von Dividenden vereinnahmt — spürbar, kalkulierbar, jährlich wiederkehrend.',
      },
      {
        title: 'Warum das Thema relevant ist',
        body: 'In Ansparphasen wirken Dividenden über Wiederanlage. In Entnahmephasen liefern sie Zahlungsströme, ohne dass Anteile verkauft werden müssen.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Dividendenwerte werden häufig als ausschüttungsorientierter Baustein eingesetzt — ergänzend zu wachstumsstarken oder breit indexierten Positionen.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'planbare Zahlungen schätzen, ohne Anteile veräußern zu müssen.',
        'einen ruhigeren Renditepfad bevorzugen und stärker auf etablierte Geschäftsmodelle setzen möchten.',
        'in der Ruhestandsplanung Ausschüttungen als Bestandteil ihrer Entnahmestrategie einplanen.',
        'Total-Return-Bausteine mit einer sichtbaren Cashflow-Komponente kombinieren wollen.',
      ],
    },
    howItWorks: [
      'Anlageziel klären — reiner Cashflow, Wiederanlage oder eine Mischung aus beidem.',
      'Auswahluniversum festlegen (Länder, Sektoren, Marktkapitalisierung).',
      'Ausschüttungsquote und Bilanzqualität prüfen — nicht die Dividendenhöhe allein.',
      'Diversifikation über Branchen und Regionen sicherstellen, um Klumpenrisiken zu vermeiden.',
      'Regelmäßig überprüfen, ob Ausschüttungspolitik und Geschäftsmodell noch zusammenpassen.',
    ],
    aspects: [
      {
        iconName: 'percent',
        title: 'Dividendenrendite als Kennzahl',
        body: 'Die Dividendenrendite setzt die letzte Ausschüttung ins Verhältnis zum aktuellen Kurs. Sie ist eine erste Orientierung — aber allein selten aussagekräftig.',
      },
      {
        iconName: 'book',
        title: 'Ausschüttungsquote im Blick',
        body: 'Eine Ausschüttungsquote deutlich über 80 % kann tragfähig sein — muss es aber nicht. Sie sagt viel über den Spielraum in schlechteren Jahren aus.',
      },
      {
        iconName: 'trending-up',
        title: 'Dividendenwachstum',
        body: 'Kontinuierlich steigende Ausschüttungen sind häufig ein Qualitätssignal. Wachstum ist wichtiger als eine einmalige hohe Rendite.',
      },
      {
        iconName: 'layers',
        title: 'Branchenkonzentration vermeiden',
        body: 'Klassische Dividendenzahler sitzen häufig in Versorger-, Telekom- und Finanzsektoren. Wer nur nach Rendite sucht, konzentriert das Portfolio ohne es zu merken.',
      },
      {
        iconName: 'alert-triangle',
        title: 'Dividendenfallen',
        body: 'Eine sehr hohe Rendite ist manchmal ein Warnsignal. Sie kann auf einen stark gefallenen Kurs oder eine kaum tragfähige Ausschüttung hindeuten.',
      },
      {
        iconName: 'target',
        title: 'Total Return statt Rendite pur',
        body: 'Entscheidend ist die Summe aus Kurs- und Ausschüttungsentwicklung. Wer nur die Dividende betrachtet, verkennt Chancen und Risiken der Position.',
      },
    ],
    example: {
      title: 'Ein Vergleich zweier Werte',
      body: 'Ein Unternehmen A schüttet 6 % Dividendenrendite, die Ausschüttungsquote liegt bei 95 % und der Gewinn stagniert seit Jahren. Ein Unternehmen B zahlt 3 %, wächst aber stetig und behält Spielraum für schwierige Jahre. Aus reiner Rendite-Sicht wirkt A attraktiver — aus Sicht einer Dividendenstrategie ist B in vielen Fällen die robustere Wahl.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Regelmäßige Zahlungsströme unabhängig vom Kursverlauf.',
      'Häufig geringere Schwankungen bei etablierten Ausschüttungszahlern.',
      'Sichtbarer Cashflow-Beitrag zur Gesamtrendite.',
      'Passt gut zu Entnahmestrategien im Ruhestand.',
    ],
    considerations: [
      'Ausschüttungen können jederzeit gekürzt oder ausgesetzt werden.',
      'Hohe Renditen sind gelegentlich ein Warnsignal, kein Vorteil.',
      'Die steuerliche Behandlung von Dividenden kann Renditen relativ zu Kursgewinnen belasten.',
      'Konzentrationsrisiken durch stark ausschüttungsorientierte Sektoren sind real.',
    ],
    mistakes: [
      'Die Position ausschließlich nach Dividendenrendite auswählen.',
      'Ausschüttungsquote und Bilanzqualität ignorieren — Kürzungen kündigen sich häufig an.',
      'Diversifikation vernachlässigen, weil Dividendenwerte oft aus wenigen Sektoren stammen.',
      'Den Total Return unter den Tisch fallen lassen und nur auf den Cashflow schauen.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'cashflow', label: 'Ich möchte regelmäßige Ausschüttungen erhalten, unabhängig vom Kurs.' },
        { value: 'growth', label: 'Ich lege Wert auf steigende Dividenden statt auf hohe Einmalrenditen.' },
        { value: 'diversified', label: 'Ich möchte Klumpenrisiken durch breite Streuung vermeiden.' },
        { value: 'total-return', label: 'Ich betrachte Kurs- und Ausschüttungsentwicklung immer gemeinsam.' },
        { value: 'ruhestand', label: 'Ich plane Dividenden als Baustein für meine Ruhestandsphase.' },
      ],
      summary:
        'Diese Punkte helfen dabei, den passenden Zuschnitt einer Dividendenstrategie zu finden — vom breiten Dividenden-ETF bis zu ausgewählten Einzelwerten.',
    },
    comparison: {
      leftTitle: 'Dividendenstrategie',
      rightTitle: 'Value Investing',
      rows: [
        { label: 'Grundidee', left: 'Auswahl über Ausschüttungspolitik', right: 'Auswahl über innere Bewertung' },
        { label: 'Fokus', left: 'Cashflow und Ausschüttungsqualität', right: 'Substanz und Bewertungsniveau' },
        { label: 'Ertragsquelle', left: 'Dividenden plus Kurspotenzial', right: 'Bewertungsangleichung über Zeit' },
        { label: 'Zeitrahmen', left: 'mittel- bis langfristig', right: '5–10 Jahre und länger' },
        { label: 'Aufwand', left: 'mittel — Kennzahlen und Qualität', right: 'hoch — eigenständige Bewertung' },
        {
          label: 'Typische Frage',
          left: 'Wie verlässlich schüttet das Unternehmen aus?',
          right: 'Was ist dieses Unternehmen wirklich wert?',
        },
      ],
    },
    related: [
      { label: 'Value Investing', path: '/strategie/anlagestile/value-investing' },
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
      { label: 'Altersvorsorge', path: '/strategie/altersvorsorge/altersvorsorge' },
    ],
    faqs: [
      {
        q: 'Ist eine hohe Dividendenrendite immer gut?',
        a: 'Nicht zwangsläufig. Ein sehr hoher Wert kann auf einen stark gefallenen Kurs oder eine kaum tragfähige Ausschüttung hindeuten. Die Kombination aus Rendite, Ausschüttungsquote und Wachstum ist aussagekräftiger.',
      },
      {
        q: 'Sind Dividendenaktien defensiver als der breite Markt?',
        a: 'Häufig ja — aber nicht immer. Etablierte Dividendenzahler stammen oft aus konservativen Sektoren. In Krisen können jedoch auch dort Ausschüttungen gekürzt werden.',
      },
      {
        q: 'Passen Dividendenstrategien zu jüngeren Anlegern?',
        a: 'Ergänzend häufig ja. In sehr langen Ansparphasen empfehlen sich meist zusätzlich wachstumsorientierte Positionen — der Fokus muss nicht auf Ausschüttungen liegen.',
      },
      {
        q: 'Wie unterscheiden sich Dividendenaktien und Dividenden-ETFs?',
        a: 'ETFs bilden systematisch einen Index nach — häufig mit Qualitätsfiltern. Sie streuen breit, sind aber vom jeweiligen Indexkonzept abhängig. Einzelwerte erlauben mehr Kontrolle, benötigen aber mehr Aufwand.',
      },
      {
        q: 'Was bedeutet Total Return in diesem Kontext?',
        a: 'Total Return meint die Summe aus Kursveränderung und wiederangelegten Ausschüttungen. Eine Dividendenstrategie sollte über Total Return bewertet werden — nicht über die reine Ausschüttungshöhe.',
      },
    ],
  },

  // ─────────────────────────── Impact Investing ──────────────────────────
  'impact-investing': {
    summary:
      'Impact Investing verfolgt einen doppelten Anspruch: eine finanzielle Rendite plus eine explizite, messbare Wirkung auf Umwelt oder Gesellschaft. Der Ansatz geht damit über klassische ESG-Auswahl hinaus — Wirkung wird aktiv angestrebt und dokumentiert.',
    quickFacts: [
      { label: 'Ziel', value: 'finanzielle Rendite + messbare Wirkung' },
      { label: 'Zeithorizont', value: 'langfristig, oft mit Kapitalbindung' },
      { label: 'Komplexität', value: 'hoch' },
      { label: 'Schwerpunkt', value: 'Wirkungsmessung' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Ein Investment-Ansatz mit expliziter Wirkungsabsicht — vom Klimaprojekt über Sozialwohnungsbau bis zu Bildungsangeboten. Rendite und Wirkung stehen gleichberechtigt nebeneinander.',
      },
      {
        title: 'Grundidee',
        body: 'Kapital fließt gezielt in Vorhaben, die ohne diese Anlage nicht oder nicht in gleicher Form entstünden. Die Wirkung ist Teil des Investment-Cases — nicht Nebenprodukt.',
      },
      {
        title: 'Warum das Thema wächst',
        body: 'Reporting-Standards, Green Bonds und thematische Fondsvehikel machen Impact-Investments zugänglicher. Zugleich steigt die Nachfrage von Anlegern, die Kapital sichtbar wirken sehen wollen.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Impact-Investments dienen häufig als thematische Ergänzung — nicht als Ersatz für ein breit diversifiziertes Portfolio.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'einen expliziten Beitrag über die reine Kapitalallokation hinaus leisten möchten.',
        'akzeptieren, dass Wirkung Zeit braucht und selten linear verläuft.',
        'bereit sind, für definierte Themen längere Kapitalbindungen in Kauf zu nehmen.',
        'Wirkungsberichte und Kennzahlen als Teil ihrer Anlageüberprüfung nutzen möchten.',
      ],
    },
    howItWorks: [
      'Wirkungsziel definieren — Klima, Bildung, Gesundheit, sozialer Wohnraum oder ein Mix.',
      'Passende Anlagevehikel identifizieren (Themenfonds, Green Bonds, Genossenschaftsanteile, Direktinvestments).',
      'Intentionalität prüfen — ist die Wirkung tatsächlich Kern des Investment-Cases?',
      'Kennzahlen zur Wirkungsmessung festlegen und Berichte des Anbieters strukturiert lesen.',
      'Regelmäßig prüfen, ob Wirkung und Rendite gemeinsam entstehen — und ob Zielkonflikte auftreten.',
    ],
    aspects: [
      {
        iconName: 'target',
        title: 'Intentionalität',
        body: 'Impact verlangt eine dokumentierte Wirkungsabsicht — nicht nur eine nachträgliche Zuordnung von ESG-Kennzahlen zu bestehenden Positionen.',
      },
      {
        iconName: 'award',
        title: 'Additionalität',
        body: 'Zentrale Frage: Entsteht durch das Investment ein zusätzlicher Beitrag, der ohne dieses Kapital nicht möglich wäre? Additionalität ist der schwierigste, aber wichtigste Maßstab.',
      },
      {
        iconName: 'file-text',
        title: 'Wirkungsmessung',
        body: 'Verbreitete Rahmen sind IRIS+ und die SDG-orientierte Berichterstattung. Wirkung wird über harte Kennzahlen erfasst — nicht über Marketing-Texte.',
      },
      {
        iconName: 'alert-triangle',
        title: 'Impact-Washing',
        body: 'Nicht jedes Vehikel mit „Impact" im Namen erfüllt den Anspruch. Prüfen Sie Methodik, Prüfstellen und die konkrete Wirkung.',
      },
      {
        iconName: 'clock',
        title: 'Zielkonflikte akzeptieren',
        body: 'Manche Wirkungsziele stehen kurzfristig quer zur Rendite. Ein Impact-Investment ist selten schnell profitabel — Geduld ist Teil des Konzepts.',
      },
      {
        iconName: 'layers',
        title: 'Liquidität variiert stark',
        body: 'Green Bonds sind meist gut handelbar, direkte Projektbeteiligungen häufig nicht. Die Liquidität bestimmt die Größe der Position im Portfolio.',
      },
    ],
    example: {
      title: 'Ein Green-Bond-Beispiel',
      body: 'Eine Anlegerin zeichnet eine grüne Anleihe eines europäischen Versorgers. Die Emissionsmittel fließen laut Rahmenwerk ausschließlich in den Ausbau erneuerbarer Erzeugung. Der Emittent berichtet jährlich die installierte Leistung und die vermiedenen Emissionen — mit Prüfung durch eine externe Stelle. Rendite entspricht einer vergleichbaren nicht-grünen Anleihe des Emittenten.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Verbindung von Rendite und dokumentierter Wirkung.',
      'Zugang zu Zukunftsthemen wie erneuerbare Energien, nachhaltige Infrastruktur und Bildung.',
      'Transparente Berichterstattung — sofern Standards ernsthaft eingehalten werden.',
      'Portfolio-Ergänzung mit klar definierter inhaltlicher Ausrichtung.',
    ],
    considerations: [
      'Wirkungsmessung ist methodisch anspruchsvoll und selten branchenübergreifend vergleichbar.',
      'Einige Impact-Anlagen sind langfristig gebunden oder nur eingeschränkt liquide.',
      'Projekt- oder länderspezifische Risiken können sich stärker auswirken als bei breiten Indizes.',
      'Datenqualität und Prüfstandards variieren — nicht jeder Wirkungsbericht ist belastbar.',
    ],
    mistakes: [
      'Impact und ESG synonym verwenden. Beide Ansätze verfolgen unterschiedliche Ansprüche.',
      'Sich allein auf den Fondsnamen verlassen — Prospekte und Wirkungsberichte prüfen.',
      'Kurzfristige Renditeschwäche als Beleg werten, dass „Impact nicht funktioniert".',
      'Additionalität nicht hinterfragen — nicht jedes grüne Investment schafft zusätzlichen Nutzen.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'measurable', label: 'Ich möchte die Wirkung meiner Anlage konkret nachvollziehen können.' },
        { value: 'additional', label: 'Ich möchte, dass mein Kapital zusätzliche Wirkung ermöglicht.' },
        { value: 'theme', label: 'Ich habe ein Wirkungsthema, das mir persönlich wichtig ist.' },
        { value: 'bond', label: 'Ich möchte einen liquiden Einstieg über Green Bonds oder Themenfonds.' },
        { value: 'private', label: 'Ich bin bereit, für stärkere Wirkung längere Bindungen zu akzeptieren.' },
      ],
      summary:
        'Diese Punkte grenzen ein, welche Impact-Vehikel und welche Wirkungsthemen zu Ihrer Situation und Liquiditätsplanung passen.',
    },
    comparison: {
      leftTitle: 'Impact Investing',
      rightTitle: 'ESG',
      rows: [
        { label: 'Grundidee', left: 'Explizit messbare Wirkungsabsicht', right: 'Systematische Berücksichtigung von ESG-Kriterien' },
        { label: 'Anspruch', left: 'Wirkung Teil des Investment-Cases', right: 'Auswahl und Ausschlüsse' },
        { label: 'Umsetzung', left: 'Themenfonds, Green Bonds, Direktinvestments', right: 'Breite Fonds- und ETF-Angebote' },
        { label: 'Messung', left: 'IRIS+, SDG-Kennzahlen, projektbezogene Metriken', right: 'ESG-Ratings, SFDR-Kategorien' },
        { label: 'Liquidität', left: 'variiert je Vehikel — teils gebunden', right: 'in der Regel gut handelbar' },
        {
          label: 'Typische Frage',
          left: 'Welche konkrete Wirkung entsteht durch mein Kapital?',
          right: 'Wie nachhaltig ist mein Portfolio ausgerichtet?',
        },
      ],
    },
    related: [
      { label: 'Nachhaltige Investments (ESG)', path: '/strategie/nachhaltigkeit/nachhaltige-investments-esg' },
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
      { label: 'Vermögensübertragung', path: '/strategie/generationen/vermoegensuebertragung' },
    ],
    faqs: [
      {
        q: 'Ist Impact Investing dasselbe wie Spende?',
        a: 'Nein. Impact-Investing verfolgt weiterhin eine finanzielle Rendite. Es verbindet sie mit einer klaren, dokumentierten Wirkungsabsicht — Kapital wird angelegt, nicht abgegeben.',
      },
      {
        q: 'Was bedeutet Additionalität?',
        a: 'Additionalität beschreibt die Frage, ob durch das Investment eine Wirkung entsteht, die ohne dieses Kapital so nicht möglich gewesen wäre. Sie ist der anspruchsvollste, aber aussagekräftigste Maßstab für Impact.',
      },
      {
        q: 'Wie erkenne ich seriöse Impact-Fonds?',
        a: 'Anhaltspunkte sind eine dokumentierte Wirkungsabsicht, klare Kennzahlen, externe Prüfstellen, transparente Berichterstattung und ein Bezug zu etablierten Rahmenwerken wie IRIS+ oder den SDGs.',
      },
      {
        q: 'Muss ich für Impact-Investing auf Rendite verzichten?',
        a: 'Nicht zwangsläufig. Manche Impact-Vehikel liefern marktübliche Renditen. Andere akzeptieren bewusst Renditeabschläge zugunsten stärkerer Wirkung — das sollte bei der Auswahl transparent sein.',
      },
    ],
  },

  // ─────────────────────────── Vermögensschutz ────────────────────────────
  vermoegensschutz: {
    summary:
      'Vermögensschutz beschreibt Strategien, die das bestehende Vermögen robust gegen Wertverluste, Konzentration und Liquiditätsengpässe machen sollen — bevor über neue Renditequellen nachgedacht wird. Der Ansatz ist defensiv, aber nicht statisch.',
    quickFacts: [
      { label: 'Ziel', value: 'Vermögen widerstandsfähig aufstellen' },
      { label: 'Zeithorizont', value: 'übergreifend, laufend zu prüfen' },
      { label: 'Komplexität', value: 'mittel' },
      { label: 'Schwerpunkt', value: 'Risikostreuung + Liquidität' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Ein Rahmen für den Umgang mit Risiken im bestehenden Vermögen — von Diversifikation über Liquidität bis zu Gegenparteirisiken.',
      },
      {
        title: 'Grundidee',
        body: 'Bevor Rendite optimiert wird, sollten offensichtliche Verluststrukturen abgebaut werden. Erhalten ist häufig schwieriger als aufbauen.',
      },
      {
        title: 'Warum das Thema wichtig ist',
        body: 'Kaufkraftverluste, Konzentrationsrisiken und Liquiditätslücken sind stille Vermögensvernichter. Vermögensschutz macht sie sichtbar und adressierbar.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Vermögensschutz ist keine Anlageklasse, sondern eine Perspektive. Sie ergänzt Vermögensaufbau, Altersvorsorge und Übertragungsplanung.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'ein gewachsenes Vermögen strukturiert überprüfen möchten.',
        'eine Vermögensübergabe planen und vorher Klumpen abbauen wollen.',
        'nach Marktphasen mit starken Bewegungen ihre Aufstellung neu ordnen möchten.',
        'die Balance aus Rendite, Liquidität und Sicherheit systematisch neu ausrichten wollen.',
      ],
    },
    howItWorks: [
      'Vermögensinventur — Anlagen, Kredite, Immobilien, Beteiligungen, Liquidität konsolidiert erfassen.',
      'Risiko- und Klumpenanalyse — Konzentrationen sichtbar machen, sowohl über Anlageklassen als auch über Einzeltitel.',
      'Liquiditätsplanung definieren — kurzfristige Reserven, mittelfristige Bedarfe und langfristige Anlage klar trennen.',
      'Gegenparteirisiken und Verwahrstruktur prüfen (z. B. Verteilung über Banken, Depots, Anlagevehikel).',
      'Struktur regelmäßig überprüfen — bei Vermögensänderungen, Marktverschiebungen oder Lebensphasenwechseln.',
    ],
    aspects: [
      {
        iconName: 'layers',
        title: 'Diversifikation als Basis',
        body: 'Streuung über Anlageklassen, Regionen und Währungen reduziert die Wirkung einzelner Fehlentwicklungen. Sie ist keine Garantie, aber der wirksamste Hebel.',
      },
      {
        iconName: 'briefcase',
        title: 'Liquidität als Werkzeug',
        body: 'Ausreichende Liquidität verhindert, dass langfristige Positionen in Krisenphasen aus Not aufgelöst werden müssen. Sie ist Schutz und Optionalität zugleich.',
      },
      {
        iconName: 'shield',
        title: 'Konzentrationsrisiken abbauen',
        body: 'Ein einzelner Arbeitgeber, eine Immobilie, ein Fonds oder eine Beteiligung kann rasch zum dominanten Faktor werden. Konzentration ist häufig gewachsen — nicht bewusst gewählt.',
      },
      {
        iconName: 'alert-triangle',
        title: 'Vermeintlich sichere Anlagen',
        body: 'Anlagen mit „sicher" im Namen sind es nicht zwingend. Auch Sichteinlagen, Anleihen und Immobilien tragen Risiken — nur andere als Aktien.',
      },
      {
        iconName: 'clock',
        title: 'Notgroschen definieren',
        body: 'Eine Liquiditätsreserve über 3–12 Monate Ausgaben ist der praktische Grundschutz. Sie trennt Sparen von echter Anlage und stabilisiert Entscheidungen.',
      },
      {
        iconName: 'file-text',
        title: 'Struktur dokumentieren',
        body: 'Wer Vermögen schützt, dokumentiert es sauber: Depots, Zugänge, Verträge, Verwahrstellen. Angehörige und Bevollmächtigte müssen im Ernstfall handlungsfähig sein.',
      },
    ],
    example: {
      title: 'Ein einfacher Blick auf die Struktur',
      body: 'Ein Ehepaar hält 65 % seines liquiden Vermögens in einer einzigen Aktienposition, weil diese über Jahre stark gestiegen ist. Im Rahmen einer Vermögensschutz-Perspektive wird die Position schrittweise reduziert und in einen breit gestreuten Basis-Baustein sowie eine Liquiditätsreserve umgeschichtet. Ziel ist keine höhere Rendite, sondern eine Struktur, die auch ein schwaches Jahr dieser einen Aktie aushält.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Widerstandsfähigkeit gegen Einzelereignisse und Marktphasen.',
      'Klarere Trennung zwischen Notgroschen, mittelfristigem Kapital und langfristiger Anlage.',
      'Fundament für alle weiteren Strategien wie Aufbau, Vorsorge und Übertragung.',
      'Bessere Handlungsfähigkeit im Krisenfall — persönlich wie familiär.',
    ],
    considerations: [
      'Vermögensschutz ist kein renditegetriebener Ansatz — Erwartungen entsprechend kalibrieren.',
      'Diversifikation dämpft Verluste, verhindert sie aber nicht vollständig.',
      'Zu hohe Liquiditätsreserven belasten die Kaufkraft, wenn sie unbegrenzt liegen bleiben.',
      'Steuerliche und rechtliche Fragen sollten mit qualifizierten Beratern geklärt werden.',
    ],
    mistakes: [
      'Diversifikation an einzelnen Positionen aufhängen statt am Portfolio als Ganzem.',
      'Liquiditätsreserve in Wertpapieren halten, deren Kurs im Ernstfall schwankt.',
      'Vermögensschutz nur einmalig durchführen — er ist ein laufender Prozess.',
      'Konzentrationsrisiken durch emotionale Bindung an einzelne Positionen ignorieren.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'inventur', label: 'Ich möchte einen strukturierten Überblick über mein Vermögen bekommen.' },
        { value: 'diversify', label: 'Ich möchte Klumpenrisiken abbauen oder verstehen.' },
        { value: 'liquidity', label: 'Ich möchte meine Liquiditätsreserve realistisch dimensionieren.' },
        { value: 'crisis', label: 'Ich möchte für Krisenphasen handlungsfähig aufgestellt sein.' },
        { value: 'docs', label: 'Ich möchte Zugänge und Dokumentation für Angehörige klar regeln.' },
      ],
      summary:
        'Diese Punkte bilden die Grundlage für eine strukturierte Vermögensschutz-Betrachtung — inklusive Blick auf Liquidität, Diversifikation und Dokumentation.',
    },
    comparison: {
      leftTitle: 'Vermögensschutz',
      rightTitle: 'Vermögensaufbau',
      rows: [
        { label: 'Grundidee', left: 'Bestehendes robust aufstellen', right: 'Kapital über Zeit vermehren' },
        { label: 'Zeitrahmen', left: 'laufend, phasenübergreifend', right: 'mittel- bis langfristig' },
        { label: 'Fokus', left: 'Risikostreuung + Liquidität', right: 'Sparrate + Anlagemix' },
        { label: 'Renditeanspruch', left: 'nicht primär', right: 'zentral' },
        { label: 'Auslöser', left: 'Vermögensänderungen, Lebensphasen', right: 'regelmäßige Sparbeiträge, Ziele' },
        {
          label: 'Typische Frage',
          left: 'Wie robust ist mein Vermögen aufgestellt?',
          right: 'Wie erreiche ich mein Sparziel?',
        },
      ],
    },
    related: [
      { label: 'Inflationsschutz', path: '/strategie/schutz-steuerung/inflationsschutz' },
      { label: 'Vermögensübertragung', path: '/strategie/generationen/vermoegensuebertragung' },
      { label: 'Altersvorsorge', path: '/strategie/altersvorsorge/altersvorsorge' },
    ],
    faqs: [
      {
        q: 'Ist Vermögensschutz nur für sehr vermögende Anleger relevant?',
        a: 'Nein. Grundprinzipien wie Diversifikation, Liquiditätsreserve und Dokumentation sind auf jedes Vermögen anwendbar — die Umsetzung skaliert mit der Größe.',
      },
      {
        q: 'Wie hoch sollte die Liquiditätsreserve sein?',
        a: 'Eine verbreitete Faustregel liegt bei 3–12 Monatsausgaben, abhängig von Lebenssituation, Einkommensstabilität und weiteren Verpflichtungen. Die konkrete Höhe ist individuell.',
      },
      {
        q: 'Kann eine Immobilie Teil des Vermögensschutzes sein?',
        a: 'Ja — sie ist häufig ein bedeutender Baustein. Zugleich sollte sie nicht die einzige tragende Säule sein: Immobilien tragen Konzentrations-, Kosten- und Liquiditätsrisiken.',
      },
      {
        q: 'Was passiert bei einer Bankeninsolvenz mit meinem Depot?',
        a: 'Wertpapiere im Depot sind Sondervermögen und gehören dem Anleger, nicht der Bank. Bargeld auf Konten ist im EU-Rahmen bis 100.000 Euro pro Bank und Kunde geschützt. Bei größeren Beträgen empfiehlt sich eine Verteilung.',
      },
    ],
  },

  // ─────────────────────────── Inflationsschutz ──────────────────────────
  inflationsschutz: {
    summary:
      'Inflation zehrt am Realwert von Vermögen. Inflationsschutz ist keine einzelne Anlage, sondern eine Denkweise: Man betrachtet reale Renditen, prüft Anlagen unter Kaufkraft-Aspekten und wählt Bausteine, die verschieden auf Preissteigerungen reagieren.',
    quickFacts: [
      { label: 'Ziel', value: 'Kaufkraft langfristig erhalten' },
      { label: 'Zeithorizont', value: 'mittel- bis langfristig' },
      { label: 'Komplexität', value: 'mittel' },
      { label: 'Schwerpunkt', value: 'reale statt nominale Rendite' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Ein Rahmen, um Vermögen so aufzustellen, dass Kaufkraftverluste durch Inflation begrenzt werden — ohne unrealistische Garantien.',
      },
      {
        title: 'Grundidee',
        body: 'Es zählt nicht der nominale Betrag, sondern die reale Kaufkraft. 100 Euro heute sind bei 3 % Inflation in zehn Jahren spürbar weniger wert.',
      },
      {
        title: 'Warum das Thema wichtig ist',
        body: 'Auch in ruhigen Marktphasen wirkt Inflation still im Hintergrund. Ohne bewusste Ausrichtung verlieren vermeintlich „sichere" Anlagen an Substanz.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Inflationsschutz ist Teil des Vermögensschutzes und begleitet Vermögensaufbau und Altersvorsorge. Er ersetzt sie nicht.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'in Phasen erhöhter Inflation ihre Anlagestruktur prüfen möchten.',
        'sich mit dem Unterschied zwischen realer und nominaler Rendite auseinandersetzen wollen.',
        'lange Anlagehorizonte haben und Kaufkraftverluste vermeiden möchten.',
        'vor größeren Ausgaben stehen und ihre Sparziele inflationssicher planen wollen.',
      ],
    },
    howItWorks: [
      'Reale statt nominale Rendite bewerten — Inflation aus Ergebnissen herausrechnen.',
      'Anlagemix diversifizieren — Sachwerte, breite Aktien-Indizes, ausgewählte Anleihen und Liquidität sinnvoll kombinieren.',
      'Sparrate an Inflation anpassen — regelmäßige Erhöhung statt jahrelange Fixierung.',
      'Laufzeitrisiken bei Anleihen bewusst gestalten. Sehr lange Laufzeiten reagieren stärker auf Zinsänderungen.',
      'Struktur regelmäßig überprüfen — Inflationsphasen sind nicht konstant, sie schwanken über die Zeit.',
    ],
    aspects: [
      {
        iconName: 'trending-down',
        title: 'Kaufkraft als Referenzgröße',
        body: 'Ein Depot, das nominal wächst, kann real verlieren. Wer nur den Endstand betrachtet, verkennt die inflationsbedingte Erosion.',
      },
      {
        iconName: 'layers',
        title: 'Anlageklassen unterschiedlich betroffen',
        body: 'Aktien breiter Indizes reagieren langfristig anders als kurzlaufende Anleihen. Sachwerte wie Immobilien und Rohstoffe wirken oft dämpfend — nicht automatisch schützend.',
      },
      {
        iconName: 'percent',
        title: 'Reale Rendite als Maßstab',
        body: 'Reale Rendite = Nominalrendite abzüglich Inflation. Für Sparziele über Jahre ist dieser Wert entscheidend, nicht der ausgewiesene Zinssatz.',
      },
      {
        iconName: 'clock',
        title: 'Laufzeitrisiken',
        body: 'Lange Anleihen leiden stärker unter steigenden Zinsen. Kurze Laufzeiten sind flexibler, liefern aber in Niedrigzinsphasen weniger.',
      },
      {
        iconName: 'alert-triangle',
        title: 'Kein Produkt als sicherer Schutz',
        body: 'Es gibt keine einzelne Anlageklasse, die Inflation zuverlässig ausgleicht. Auch inflationsindexierte Anleihen sind ein Baustein — kein Allheilmittel.',
      },
      {
        iconName: 'shield',
        title: 'Notgroschen prüfen',
        body: 'Große Liquiditätsreserven verlieren in Inflationsphasen deutlich. Sinnvoll ist eine bewusst dimensionierte Reserve — nicht ein zu großes Cash-Polster.',
      },
    ],
    example: {
      title: 'Ein Zahlenbild zur Kaufkraft',
      body: 'Ein Sparer hält 50.000 Euro auf einem unverzinsten Konto. Bei einer durchschnittlichen Inflationsrate von 3 % über zehn Jahre bleibt die nominale Summe unverändert. Die reale Kaufkraft entspricht jedoch nur noch rund 37.000 Euro von heute. Der Verlust ist nicht sichtbar auf dem Kontoauszug, aber in dem, was man dafür kaufen kann.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Bewusstsein für reale statt nur nominale Renditen.',
      'Bessere Bewertung von „sicheren" Anlagen unter Kaufkraft-Aspekten.',
      'Stringentere Planung bei langen Sparzielen.',
      'Fundament für eine belastbare Ruhestandsphase.',
    ],
    considerations: [
      'Es gibt keinen einzelnen Baustein, der Inflation garantiert ausgleicht.',
      'Sachwerte reagieren zeitlich versetzt und nicht immer wie erwartet.',
      'Sehr lange Anleihen können in Inflationsphasen deutlich verlieren.',
      'Inflationserwartungen ändern sich schnell — Prognosen bleiben Prognosen.',
    ],
    mistakes: [
      'Die eigene Anlage nur an Nominalzinsen messen.',
      'Große Sichteinlagen über Jahre unverzinst halten.',
      'Sehr lange Anleihen als „sicher" einordnen, ohne Zinsänderungsrisiko zu betrachten.',
      'Sachwerte pauschal als Inflationsschutz kaufen, ohne Bewertung und Kostenstruktur zu prüfen.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'real-return', label: 'Ich möchte meine Renditen künftig real, nicht nur nominal bewerten.' },
        { value: 'reserve', label: 'Ich möchte meinen Notgroschen inflationsgerecht dimensionieren.' },
        { value: 'sachwerte', label: 'Ich möchte Sachwerte in meinem Depot bewusster einordnen.' },
        { value: 'bond-duration', label: 'Ich möchte Laufzeitrisiken meiner Anleihen prüfen.' },
        { value: 'goal', label: 'Ich möchte langfristige Sparziele inflationsbereinigt planen.' },
      ],
      summary:
        'Diese Punkte helfen dabei, den eigenen Umgang mit Inflation zu strukturieren — ohne auf einzelne Produkte als vermeintliches Wundermittel zu setzen.',
    },
    comparison: {
      leftTitle: 'Inflationsschutz',
      rightTitle: 'Allgemeiner Vermögensaufbau',
      rows: [
        { label: 'Grundidee', left: 'Kaufkraft erhalten', right: 'Vermögen wachsen lassen' },
        { label: 'Bezugsgröße', left: 'reale Rendite', right: 'Sparziel + nominale Entwicklung' },
        { label: 'Fokus', left: 'Anlagemix + Laufzeitprofile', right: 'Sparrate + Anlagemix' },
        { label: 'Rolle im Portfolio', left: 'Perspektive für alle Bausteine', right: 'aktive Wachstumsstrategie' },
        { label: 'Typische Frage', left: 'Wie halte ich meine Kaufkraft?', right: 'Wie erreiche ich mein Sparziel?' },
        {
          label: 'Typisches Werkzeug',
          left: 'diversifizierter Mix inkl. Sachwerte, kurzer Anleihen',
          right: 'ETF-Sparplan, Vorsorgemantel, klare Zieldefinition',
        },
      ],
    },
    related: [
      { label: 'Vermögensschutz', path: '/strategie/schutz-steuerung/vermoegensschutz' },
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
      { label: 'Private Rentenvorsorge', path: '/strategie/altersvorsorge/private-rentenvorsorge' },
    ],
    faqs: [
      {
        q: 'Sind Aktien ein sicherer Inflationsschutz?',
        a: 'Langfristig haben breit gestreute Aktienindizes historisch reale Renditen geliefert. Kurzfristig können Aktien in Inflationsphasen jedoch stark schwanken — eine Garantie gibt es nicht.',
      },
      {
        q: 'Was sind inflationsindexierte Anleihen?',
        a: 'Anleihen, deren Nennwert und Kupons an die Inflation gekoppelt sind. Sie bieten einen konkreten Bezug zur Inflation, tragen aber weiterhin Zinsänderungsrisiken und Ausfallrisiken des Emittenten.',
      },
      {
        q: 'Sollte ich mein Bargeld reduzieren?',
        a: 'Nicht pauschal. Eine Liquiditätsreserve bleibt sinnvoll. Übergroße Cash-Bestände verlieren aber real. Die Frage ist weniger „ob", sondern „in welcher Höhe".',
      },
      {
        q: 'Ist Gold ein Inflationsschutz?',
        a: 'Gold reagiert historisch uneinheitlich auf Inflation. In manchen Phasen wirkt es stabilisierend, in anderen nicht. Als kleiner Baustein möglich — nicht als tragende Säule.',
      },
    ],
  },

  // ─────────────────────────── Vermögensaufbau ───────────────────────────
  vermoegensaufbau: {
    summary:
      'Vermögensaufbau ist die strukturierte Umwandlung regelmäßiger Sparbeträge in ein wachsendes Portfolio. Nicht der einzelne Anlagetipp entscheidet — sondern Sparrate, Zeit, Kosten und ein diversifizierter Anlagemix.',
    quickFacts: [
      { label: 'Ziel', value: 'Kapital über Zeit vermehren' },
      { label: 'Zeithorizont', value: 'mittel- bis langfristig' },
      { label: 'Komplexität', value: 'gering bis mittel' },
      { label: 'Schwerpunkt', value: 'Sparrate + Anlagemix' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Ein systematischer Prozess: regelmäßig sparen, breit anlegen, Kosten niedrig halten, die Struktur regelmäßig überprüfen.',
      },
      {
        title: 'Grundidee',
        body: 'Nicht das Timing entscheidet, sondern die Zeit im Markt. Konsequentes, regelmäßiges Investieren ist einer der stärksten Hebel im privaten Vermögensaufbau.',
      },
      {
        title: 'Warum das Thema wichtig ist',
        body: 'Zinsen allein reichen selten für langfristige Ziele. Vermögensaufbau nutzt Renditechancen von Kapitalmärkten — bewusst und in einem angemessenen Rahmen.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Vermögensaufbau ist der Motor zwischen Liquiditätsreserve und Vorsorge. Er speist Ziele wie Immobilie, Ausbildung, Ruhestand oder Übertragung.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'regelmäßig Kapital zurücklegen möchten und einen mittel- bis langfristigen Horizont haben.',
        'ihre Sparbeiträge chancenorientiert einsetzen und den reinen Zinsansatz überwinden möchten.',
        'ein konkretes Ziel verfolgen — Ausbildung, Wohnen, Ruhestand oder Familienübertragung.',
        'ihre Anlage strukturiert und kostenbewusst aufstellen möchten.',
      ],
    },
    howItWorks: [
      'Ziel und Zeithorizont präzise formulieren — je klarer, desto einfacher die Umsetzung.',
      'Sparrate festlegen — realistisch, aber ambitioniert genug für das Ziel.',
      'Anlagemix wählen (Aktien-, Anleihen-, ergänzende Bausteine) passend zu Zeit und Risikoprofil.',
      'Kostenstruktur prüfen — Verwaltungskosten, Ordergebühren und Fondskosten wirken linear über die Jahre.',
      'Regelmäßig prüfen und ggf. rebalancieren — nicht dauernd umschichten, aber im Blick behalten.',
    ],
    aspects: [
      {
        iconName: 'clock',
        title: 'Zeit ist der stärkste Hebel',
        body: 'Der Zinseszinseffekt wirkt exponentiell. Wer fünf Jahre früher startet, schafft mit gleicher Sparrate häufig ein deutlich anderes Ergebnis.',
      },
      {
        iconName: 'trending-up',
        title: 'Regelmäßiges Investieren',
        body: 'Sparpläne kaufen in schwachen Phasen mehr Anteile und in starken weniger. Der Cost-Average-Effekt glättet Einstiegsentscheidungen automatisch.',
      },
      {
        iconName: 'layers',
        title: 'Breite Streuung',
        body: 'Weltweit anlegen, über Länder, Sektoren und Anlageklassen streuen. Konzentrierte Wetten haben ihren Platz — nicht aber als Basis des Aufbaus.',
      },
      {
        iconName: 'percent',
        title: 'Kosten konsequent senken',
        body: '1 % Kostenunterschied pro Jahr kann über 30 Jahre ein Viertel des Endwerts kosten. Kosten sind linear steuerbar — Renditen nicht.',
      },
      {
        iconName: 'shield',
        title: 'Liquiditätsreserve nicht vergessen',
        body: 'Vermögensaufbau setzt eine solide Notreserve voraus. Wer im Notfall Depotanteile verkaufen muss, verzichtet oft auf den erhofften Zeithorizont.',
      },
      {
        iconName: 'target',
        title: 'Rebalancing als Disziplin',
        body: 'Wenn ein Baustein deutlich stärker steigt, wächst automatisch das Risiko. Rebalancing bringt die Struktur zurück in die geplante Balance — nüchtern, nicht emotional.',
      },
    ],
    example: {
      title: 'Ein Sparplan über 20 Jahre',
      body: 'Ein Anleger investiert monatlich 200 Euro in einen breit gestreuten Welt-ETF. Er passt die Sparrate alle drei Jahre um 5 % an und lässt Ausschüttungen wiederanlegen. Nach 20 Jahren ergibt sich ein deutlich anderes Bild als bei einer starr gehaltenen Sparrate — nicht wegen Timing oder Fondswahl, sondern wegen Sparrate, Zeit und Wiederanlage.',
      disclaimer: 'Vereinfachtes Beispiel — keine Renditeprognose.',
    },
    advantages: [
      'Nutzt Zinseszinseffekt und regelmäßige Kaufdisziplin.',
      'Skaliert mit dem Einkommen und lässt sich schrittweise ausbauen.',
      'Klare Struktur — leicht überprüfbar und übertragbar.',
      'Fundament für konkrete Lebensziele und Vorsorge.',
    ],
    considerations: [
      'Kursverluste sind Teil des Weges, nicht Ausnahme.',
      'Kosten wirken linear und werden häufig unterschätzt.',
      'Ohne Notreserve besteht das Risiko, in schwachen Phasen verkaufen zu müssen.',
      'Sparraten sollten regelmäßig angepasst werden — nicht jahrzehntelang unverändert bleiben.',
    ],
    mistakes: [
      'Auf den perfekten Einstiegszeitpunkt warten und daher gar nicht starten.',
      'In Krisen die Sparrate stoppen — genau dort wirkt Cost-Average am stärksten.',
      'Zu viele Fonds parallel laufen lassen und die Kosten aus dem Blick verlieren.',
      'Ohne definierten Notgroschen investieren und im Ernstfall unter Zwang verkaufen.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'goal', label: 'Ich habe ein konkretes Ziel, für das ich Vermögen aufbauen möchte.' },
        { value: 'monthly', label: 'Ich möchte eine feste monatliche Sparrate etablieren.' },
        { value: 'passive', label: 'Ich möchte den Aufbau möglichst kostengünstig und passiv gestalten.' },
        { value: 'automate', label: 'Ich möchte Sparrate und Rebalancing weitgehend automatisieren.' },
        { value: 'timing', label: 'Ich möchte mich von der Frage nach dem richtigen Timing befreien.' },
      ],
      summary:
        'Diese Punkte konkretisieren, wie Ihr Vermögensaufbau strukturell aussehen kann — von Sparrate über Anlagemix bis zur Automatisierung.',
    },
    comparison: {
      leftTitle: 'Vermögensaufbau',
      rightTitle: 'Vermögensschutz',
      rows: [
        { label: 'Grundidee', left: 'Kapital über Zeit vermehren', right: 'Bestehendes robust aufstellen' },
        { label: 'Rolle', left: 'Motor', right: 'Fundament' },
        { label: 'Aktion', left: 'regelmäßig sparen + investieren', right: 'strukturieren + diversifizieren' },
        { label: 'Renditeanspruch', left: 'zentral', right: 'nicht primär' },
        { label: 'Zeithorizont', left: 'mittel- bis langfristig', right: 'übergreifend, laufend zu prüfen' },
        { label: 'Typische Frage', left: 'Wie erreiche ich mein Sparziel?', right: 'Wie robust ist mein Vermögen aufgestellt?' },
      ],
    },
    related: [
      { label: 'Inflationsschutz', path: '/strategie/schutz-steuerung/inflationsschutz' },
      { label: 'Vermögensaufbau für Kinder', path: '/strategie/generationen/vermoegensaufbau-fuer-kinder' },
      { label: 'Private Rentenvorsorge', path: '/strategie/altersvorsorge/private-rentenvorsorge' },
    ],
    faqs: [
      {
        q: 'Wie viel sollte ich monatlich sparen?',
        a: 'Das hängt vom Ziel, Zeithorizont und Nettoeinkommen ab. Ein häufiger Orientierungswert liegt bei 10–20 % des Nettoeinkommens, kombiniert mit einer soliden Liquiditätsreserve.',
      },
      {
        q: 'Ist es besser, monatlich zu investieren oder eine Einmalanlage zu tätigen?',
        a: 'Statistisch schneidet die Einmalanlage bei ausreichend langem Horizont häufig besser ab. Verhaltenspsychologisch ist der Sparplan aber oft robuster — man bleibt eher dabei.',
      },
      {
        q: 'Was ist ein sinnvoller Anlagemix zum Aufbau?',
        a: 'Für lange Horizonte ist ein hoher Aktienanteil verbreitet, ergänzt um Anleihen und Liquidität. Die konkrete Aufteilung hängt von Zeit, Risikoprofil und persönlichen Zielen ab.',
      },
      {
        q: 'Sollte ich in Krisen die Sparrate stoppen?',
        a: 'Grundsätzlich nicht. Genau dort wirkt der Cost-Average-Effekt am stärksten. Wer in schwachen Phasen aussetzt, verschenkt einen zentralen Vorteil regelmäßigen Investierens.',
      },
    ],
  },

  // ─────────────────────────── Altersvorsorge ────────────────────────────
  altersvorsorge: {
    summary:
      'Altersvorsorge betrachtet die Ruhestandsphase als Ganzes: gesetzliche Ansprüche, betriebliche Bausteine und private Vorsorge zusammen. Ziel ist nicht ein einzelnes Produkt, sondern ein tragfähiges Zusammenspiel — inklusive Auszahlungslogik.',
    quickFacts: [
      { label: 'Ziel', value: 'gesamtes Ruhestandseinkommen strukturieren' },
      { label: 'Zeithorizont', value: 'oft mehrere Jahrzehnte' },
      { label: 'Komplexität', value: 'mittel bis hoch' },
      { label: 'Schwerpunkt', value: 'Drei-Säulen-Zusammenspiel' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Der Rahmen, in dem gesetzliche Rente, betriebliche Altersvorsorge und private Vorsorge zu einer einzigen Ruhestandsplanung zusammengeführt werden.',
      },
      {
        title: 'Grundidee',
        body: 'Kein Baustein trägt allein. Erst die Kombination aus gesetzlicher, betrieblicher und privater Vorsorge liefert in vielen Lebensmodellen einen tragfähigen Ruhestand.',
      },
      {
        title: 'Warum das Thema wichtig ist',
        body: 'Die gesetzliche Rente wurde für ein anderes demografisches Bild entworfen. Wer den Ruhestand plant, kalkuliert Versorgungslücken früh — und nicht erst kurz davor.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Altersvorsorge ist die längste Sparphase im Leben. Sie prägt Struktur, Sparrate und Anlagemix aller anderen Bausteine mit.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'ein realistisches Gesamtbild ihres späteren Einkommens bekommen möchten.',
        'gesetzliche, betriebliche und private Bausteine bewusst aufeinander abstimmen möchten.',
        'ihre spätere Auszahlungsphase strukturiert planen möchten — nicht erst zum Rentenbeginn.',
        'die Auswirkungen von Inflation, Langlebigkeit und Kosten auf ihren Ruhestand einordnen wollen.',
      ],
    },
    howItWorks: [
      'Bedarf im Ruhestand grob schätzen — heutigen Lebensstandard, Inflation und Fixkosten realistisch ansetzen.',
      'Gesetzliche Ansprüche aus Renteninformationen ableiten und mögliche Lücken sichtbar machen.',
      'Betriebliche Vorsorge prüfen — Anwartschaften, Zuschüsse, spätere Sozialabgaben.',
      'Private Vorsorge dazuplanen — Depot, ETF-Sparplan, fondsgebundene Rentenversicherung oder Kombinationen.',
      'Auszahlungsphase gestalten: Reihenfolge der Entnahmen, Puffer für schwache Marktphasen, Kapital vs. lebenslange Rente.',
    ],
    aspects: [
      {
        iconName: 'file-text',
        title: 'Drei Säulen ernst nehmen',
        body: 'Gesetzlich, betrieblich, privat — jede Säule hat andere Regeln, Kosten und steuerliche Wirkungen. Erst das Zusammenspiel ergibt ein belastbares Bild.',
      },
      {
        iconName: 'trending-down',
        title: 'Versorgungslücke sichtbar machen',
        body: 'Die Lücke zwischen gewünschtem und erwartetem Einkommen ist der Startpunkt jeder ernsthaften Ruhestandsplanung. Ohne sie planen viele Anleger ins Ungefähre.',
      },
      {
        iconName: 'clock',
        title: 'Ansparphase vs. Entnahmephase',
        body: 'Beim Sparen dominieren Zeit und Kosten. Bei der Entnahme werden Reihenfolge, Steuern und Marktrisiken zum Thema. Beide Phasen brauchen eigene Regeln.',
      },
      {
        iconName: 'shield',
        title: 'Langlebigkeitsrisiko',
        body: 'Wer länger lebt als geplant, braucht länger Einkommen. Lebenslange Rentenbausteine decken dieses Risiko — Kapitalauszahlungen tun das nicht automatisch.',
      },
      {
        iconName: 'percent',
        title: 'Kosten wirken lang',
        body: 'Ein halber Prozentpunkt mehr an Kosten wirkt über 30–40 Jahre stark. Kostenvergleiche gehören zum Vorsorge-Setup, nicht in die Kür.',
      },
      {
        iconName: 'briefcase',
        title: 'Flexibilität und Liquidität',
        body: 'Verträge mit langer Bindung sind steuerlich häufig attraktiv, verlieren aber an Flexibilität. Beides gegeneinander abzuwägen gehört zur Grundstruktur der Planung.',
      },
    ],
    example: {
      title: 'Ein Blick auf die drei Säulen',
      body: 'Ein 50-jähriger Angestellter erwartet aus gesetzlicher Rente monatlich 1.700 Euro und aus einer Direktversicherung 250 Euro. Sein gewünschter Nettobedarf liegt bei 2.600 Euro (heutige Kaufkraft). Die verbleibende Lücke von rund 650 Euro monatlich ist die konkrete Zielgröße seiner privaten Vorsorge — hochgerechnet auf Inflation, Steuerwirkung und geplantes Renteneintrittsalter.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Klarer Blick auf das gesamte Ruhestandseinkommen statt Einzelbausteine.',
      'Sichtbare Versorgungslücke als Basis konkreter Zielplanung.',
      'Kombination aus Sicherheit, Rendite und Flexibilität möglich.',
      'Frühe Planung eröffnet steuerliche und finanzielle Handlungsräume.',
    ],
    considerations: [
      'Prognosen zu gesetzlichen Ansprüchen sind nicht unveränderlich.',
      'Steuerliche und sozialversicherungsrechtliche Regeln können sich über die Jahre ändern.',
      'Sehr lange Vertragsbindungen begrenzen spätere Anpassungen.',
      'Die Auszahlungsphase wird oft unterschätzt — sie ist strategisch anspruchsvoller als das Sparen.',
    ],
    mistakes: [
      'Nur eine Säule betrachten und die anderen als „geregelt" abhaken.',
      'Ohne konkretes Zielbild sparen — Beitrag ohne Rechnung wirkt beruhigend, ist aber selten passend.',
      'Kosten und Effektivkosten der einzelnen Vehikel nicht vergleichen.',
      'Die Auszahlungsphase erst zum Rentenbeginn planen.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'gesamtbild', label: 'Ich möchte ein Gesamtbild aus gesetzlicher, betrieblicher und privater Vorsorge.' },
        { value: 'luecke', label: 'Ich möchte meine Versorgungslücke konkret beziffern können.' },
        { value: 'flex', label: 'Ich lege Wert auf Flexibilität in der Ansparphase.' },
        { value: 'lifelong', label: 'Ich möchte den Langlebigkeitsschutz einer lebenslangen Rente berücksichtigen.' },
        { value: 'entnahme', label: 'Ich möchte die Entnahmephase strukturiert vorplanen.' },
      ],
      summary:
        'Diese Punkte bilden die Grundlage einer strukturierten Ruhestandsplanung — inklusive Blick auf Lücke, Flexibilität, Langlebigkeit und Entnahmelogik.',
    },
    comparison: {
      leftTitle: 'Altersvorsorge (Gesamtbild)',
      rightTitle: 'Private Rentenvorsorge',
      rows: [
        { label: 'Grundidee', left: 'Zusammenspiel aller drei Säulen', right: 'Freiwillige private Sparlösung' },
        { label: 'Anspruch', left: 'Gesamtes Ruhestandseinkommen', right: 'Ergänzung der gesetzlichen Rente' },
        { label: 'Kernfrage', left: 'Wie schließe ich meine Versorgungslücke?', right: 'Wie strukturiere ich meinen privaten Vorsorge-Baustein?' },
        { label: 'Umfang', left: 'übergreifend', right: 'ein Baustein im Gesamtbild' },
        { label: 'Kombination', left: 'gesetzlich + bAV + privat', right: 'Depot, Rentenversicherung, Kombinationen' },
        { label: 'Typische Frage', left: 'Reicht mein späteres Einkommen?', right: 'Welches Vehikel passt für meinen privaten Sparanteil?' },
      ],
    },
    related: [
      { label: 'Private Rentenvorsorge', path: '/strategie/altersvorsorge/private-rentenvorsorge' },
      { label: 'Betriebliche Altersvorsorge', path: '/strategie/altersvorsorge/betriebliche-altersvorsorge' },
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
    ],
    faqs: [
      {
        q: 'Wie zuverlässig ist die Renteninformation?',
        a: 'Sie ist eine Prognose auf Basis heutiger Regeln und Ihrer bisherigen Beitragsjahre. Sie zeigt eine belastbare Größenordnung, keine exakte spätere Zahl.',
      },
      {
        q: 'Ist Altersvorsorge nur ein Thema ab 40?',
        a: 'Nein. Je länger die Ansparphase, desto wirksamer der Zinseszins. Wer früh startet, kann mit kleineren Beträgen viel bewegen.',
      },
      {
        q: 'Ist bAV oder private Vorsorge besser?',
        a: 'Beides hat seinen Platz. Die bAV bietet steuerliche Effekte in der Ansparphase, die private Vorsorge bleibt vollständig portabel. In der Praxis ergibt eine Kombination oft das robusteste Bild.',
      },
      {
        q: 'Wie plant man die Entnahmephase?',
        a: 'Kern sind eine liquide Reserve für schwache Marktphasen, eine strukturierte Entnahmereihenfolge und die Frage nach lebenslangen versus kapitalisierten Zahlungen. Steuern und Sozialabgaben gehören zwingend dazu.',
      },
    ],
  },

  // ─────────────────────────── Betriebliche Altersvorsorge ────────────────
  'betriebliche-altersvorsorge': {
    summary:
      'Die betriebliche Altersvorsorge (bAV) ergänzt die private Vorsorge über den Arbeitgeber. Sie kann steuerlich und sozialversicherungsrechtlich attraktiv sein — bringt aber Bindungen mit, die vor Abschluss verstanden sein wollen.',
    quickFacts: [
      { label: 'Ziel', value: 'zusätzliche Rente über den Arbeitgeber' },
      { label: 'Zeithorizont', value: 'bis Renteneintritt' },
      { label: 'Komplexität', value: 'mittel bis hoch' },
      { label: 'Schwerpunkt', value: 'Entgeltumwandlung + Zuschüsse' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Vorsorge, die über den Arbeitgeber organisiert wird. Fünf Durchführungswege stehen zur Verfügung — vom Direktvertrag bis zur Unterstützungskasse.',
      },
      {
        title: 'Grundidee',
        body: 'Beschäftigte sparen aus dem Bruttogehalt, häufig ergänzt um Arbeitgeber- oder Tarifzuschüsse. Im Ergebnis entsteht ein zusätzliches Alterseinkommen.',
      },
      {
        title: 'Warum das Thema wichtig ist',
        body: 'Ohne bAV liegen viele Arbeitnehmer allein bei gesetzlicher und privater Vorsorge — bAV kann eine dritte Säule ergänzen, sofern die Konditionen stimmen.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Die bAV ist selten der einzige Baustein, aber häufig ein steuerlich geprägter Ergänzungsbaustein — insbesondere bei substanziellem Arbeitgeberzuschuss.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'sozialversicherungspflichtig beschäftigt sind und Angebote ihres Arbeitgebers prüfen möchten.',
        'ihre gesamte Altersvorsorge über alle Säulen strukturiert planen wollen.',
        'die steuerliche Wirkung von Entgeltumwandlung besser einordnen möchten.',
        'vor einem Jobwechsel stehen und Anwartschaften klären wollen.',
      ],
    },
    howItWorks: [
      'Angebot des Arbeitgebers prüfen — Durchführungsweg, Anbieter, Zuschüsse und Anlageform.',
      'Wirkung berechnen — Netto-Effekt in der Ansparphase, Wirkung auf Sozialabgaben.',
      'Vertragskonditionen prüfen — Rentengarantien, Beitragsgarantien, Fondsauswahl, Kosten.',
      'Unverfallbarkeit und Portabilität klären — was passiert bei Arbeitgeberwechsel?',
      'Auszahlungsphase mitdenken — Kapitalwahl oder lebenslange Rente, Steuer und Sozialabgaben in der Rente.',
    ],
    aspects: [
      {
        iconName: 'briefcase',
        title: 'Fünf Durchführungswege',
        body: 'Direktversicherung, Pensionskasse, Pensionsfonds, Unterstützungskasse und Direktzusage. Jede Variante folgt anderen Regeln — insbesondere zur Bilanzierung, Absicherung und Auszahlung.',
      },
      {
        iconName: 'award',
        title: 'Arbeitgeberzuschuss als Hebel',
        body: 'Seit 2022 gilt ein gesetzlicher Zuschuss von in der Regel 15 % auf umgewandelte Beiträge, sofern Sozialabgaben eingespart werden. Höhere Zuschüsse sind möglich und häufig entscheidend.',
      },
      {
        iconName: 'file-text',
        title: 'Entgeltumwandlung',
        body: 'Beiträge fließen aus dem Bruttogehalt in den Vertrag — in der Ansparphase steuer- und häufig sozialabgabenfrei. Später greift die nachgelagerte Besteuerung.',
      },
      {
        iconName: 'clock',
        title: 'Portabilität',
        body: 'Bei einem Arbeitgeberwechsel ist die Übernahme oder Beitragsfreistellung Regelfall — je nach Durchführungsweg mit unterschiedlichen Optionen.',
      },
      {
        iconName: 'percent',
        title: 'Sozialabgaben in der Rente',
        body: 'Auf Betriebsrenten fallen häufig Kranken- und Pflegeversicherungsbeiträge an. Dies mindert das Netto in der Auszahlungsphase spürbar — Freibeträge inklusive.',
      },
      {
        iconName: 'alert-triangle',
        title: 'Flexibilität ist begrenzt',
        body: 'Beiträge lassen sich meist stoppen, aber nicht frei umverteilen. Direkte Zugriffe während der Ansparphase sind in der Regel nicht möglich.',
      },
    ],
    example: {
      title: 'Ein Modell-Zuschuss',
      body: 'Ein Angestellter wandelt 200 Euro brutto pro Monat in eine Direktversicherung um. Der Arbeitgeber zahlt darauf 15 % Zuschuss, also 30 Euro monatlich, hinzu. In Summe fließen 230 Euro in den Vertrag, während sich das Netto-Einkommen des Angestellten um deutlich weniger als 200 Euro reduziert. Ob sich die bAV lohnt, hängt zusätzlich von Vertragskosten und späteren Sozialabgaben ab.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlageempfehlung.',
    },
    advantages: [
      'Steuer- und teilweise sozialabgabenfreier Aufbau in der Ansparphase.',
      'Arbeitgeber- und Tarifzuschüsse möglich — häufig der zentrale Hebel.',
      'Organisierter, ratensparender Aufbau von Alterskapital.',
      'Optional lebenslange Rentenzahlung möglich.',
    ],
    considerations: [
      'Beiträge sind während der Ansparphase weitgehend gebunden.',
      'Auf Betriebsrenten fallen häufig Kranken- und Pflegeversicherungsbeiträge an.',
      'Nicht alle Verträge sind kostengünstig oder transparent.',
      'Bei Arbeitgeberwechseln ist eine sorgfältige Übernahme oder Beitragsfreistellung nötig.',
    ],
    mistakes: [
      'bAV abschließen, ohne die Vertragskosten mit einer privaten Alternative zu vergleichen.',
      'Nur den Bruttoeffekt betrachten und Sozialabgaben in der Rente ausblenden.',
      'Bei Arbeitgeberwechsel den Vertrag ohne Prüfung ruhen lassen.',
      'bAV als „Standardlösung" annehmen, ohne persönlichen Vorsorge-Mix zu prüfen.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'zuschuss', label: 'Ich möchte Arbeitgeberzuschüsse voll ausschöpfen.' },
        { value: 'costs', label: 'Ich möchte die Kosten meiner bAV mit privaten Alternativen vergleichen.' },
        { value: 'portable', label: 'Ich lege Wert auf Portabilität bei möglichen Arbeitgeberwechseln.' },
        { value: 'entlast', label: 'Ich möchte in der Ansparphase Sozialabgaben und Steuer reduzieren.' },
        { value: 'lifelong', label: 'Ich möchte in der Rentenphase eine planbare Zahlung erhalten.' },
      ],
      summary:
        'Diese Punkte helfen dabei, die bAV im Kontext Ihrer gesamten Vorsorge einzuordnen — statt sie isoliert zu bewerten.',
    },
    comparison: {
      leftTitle: 'Betriebliche Altersvorsorge',
      rightTitle: 'Private Rentenvorsorge',
      rows: [
        { label: 'Grundidee', left: 'Vorsorge über den Arbeitgeber', right: 'Freiwillige, private Sparlösung' },
        { label: 'Beitragsleistung', left: 'meist aus dem Bruttogehalt', right: 'aus Netto oder Brutto (je nach Vehikel)' },
        { label: 'Steuer Ansparphase', left: 'steuer- und teils sozialabgabenfrei', right: 'Depot nach Abgeltungsteuer, Versicherung mit Sonderregeln' },
        { label: 'Portabilität', left: 'bei Arbeitgeberwechsel eingeschränkt', right: 'vollständig frei' },
        { label: 'Zuschüsse', left: 'Arbeitgeber- und Tarifzuschüsse möglich', right: 'keine' },
        { label: 'Rente vs. Kapital', left: 'oft mit Rentenoption', right: 'Depot flexibel, Versicherung mit Wahlrecht' },
      ],
    },
    related: [
      { label: 'Private Rentenvorsorge', path: '/strategie/altersvorsorge/private-rentenvorsorge' },
      { label: 'Altersvorsorge – Überblick', path: '/strategie/altersvorsorge/altersvorsorge' },
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
    ],
    faqs: [
      {
        q: 'Lohnt sich bAV auch ohne Arbeitgeberzuschuss?',
        a: 'Meist eingeschränkt. Ohne Zuschuss bleiben die steuerlichen Effekte in der Ansparphase — die Sozialabgaben in der Rentenphase relativieren sie jedoch häufig. Der Vergleich mit einer privaten Alternative ist entscheidend.',
      },
      {
        q: 'Was passiert bei einem Jobwechsel?',
        a: 'Je nach Durchführungsweg wird der Vertrag mitgenommen, beim neuen Arbeitgeber fortgeführt oder beitragsfrei gestellt. Die Optionen sollten vor dem Wechsel geprüft werden — nicht danach.',
      },
      {
        q: 'Fallen wirklich Sozialabgaben auf die spätere Betriebsrente an?',
        a: 'In der Regel ja, sofern die Betriebsrente eine bestimmte Freigrenze überschreitet. Kranken- und Pflegeversicherungsbeiträge mindern die spätere Auszahlung. Diese Wirkung sollte in die Gesamtbetrachtung einfließen.',
      },
      {
        q: 'Kann ich meine bAV kündigen?',
        a: 'Nein — eine Kündigung im klassischen Sinn ist meist nicht vorgesehen. Möglich sind Beitragsfreistellung, in Ausnahmefällen Übertragung oder Weiterführung. Vorzeitige Kapitalzugriffe sind stark eingeschränkt.',
      },
    ],
  },

  // ─────────────────────────── Vermögensaufbau für Kinder ────────────────
  'vermoegensaufbau-fuer-kinder': {
    summary:
      'Für Kinder aufzubauen bedeutet, den vielleicht längsten Anlagehorizont in einer Familie strukturiert zu nutzen. Selbst kleine Sparraten wirken über zwei Jahrzehnte spürbar — vorausgesetzt, Struktur, Kosten und rechtliche Rahmen stimmen.',
    quickFacts: [
      { label: 'Ziel', value: 'Kapital für Ausbildung, Wohnen, Start' },
      { label: 'Zeithorizont', value: '15–20 Jahre und länger' },
      { label: 'Komplexität', value: 'gering bis mittel' },
      { label: 'Schwerpunkt', value: 'Zeit + Kostenstruktur' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Sparen und Investieren für ein Kind — oft mit einem konkreten Ziel wie Ausbildung, Wohnen oder erste Selbstständigkeit im jungen Erwachsenenalter.',
      },
      {
        title: 'Grundidee',
        body: 'Der Anlagehorizont ist der größte Vorteil. Wer früh startet und breit anlegt, macht sich Zeit und Zinseszins bewusst zunutze.',
      },
      {
        title: 'Warum das Thema wichtig ist',
        body: 'Ausbildungswege werden individueller und teurer. Ein selbst aufgebauter Vermögensbaustein gibt jungen Erwachsenen Handlungsspielraum am Start ihres Lebens.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Das Kinderdepot ist eine Ergänzung — nicht die Hauptvorsorge der Eltern. Es ist zweckgebunden und rechtlich klar zuordenbar.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'ihren Kindern einen finanziellen Grundstein für Ausbildung oder Selbstständigkeit legen möchten.',
        'kleinere, regelmäßige Beträge über zwei Jahrzehnte konsequent investieren wollen.',
        'die Rechte und Verfügungslogik eines Kinderdepots vor Volljährigkeit verstehen möchten.',
        'einen zweckgebundenen Baustein mit klarer Rolle im Familienvermögen etablieren wollen.',
      ],
    },
    howItWorks: [
      'Ziel klären — Ausbildung, Wohnen, Führerschein, Auslandsjahr oder unspezifisches Startkapital.',
      'Rechtlichen Rahmen wählen: Depot auf den Namen des Kindes oder Elternteils, mit unterschiedlichen Konsequenzen.',
      'Regelmäßige Sparrate festlegen und breit gestreute Vehikel wählen — meist Welt-ETFs oder gestreute Aktienfonds.',
      'Regelmäßig überprüfen — spätestens vor Volljährigkeit die Struktur an das nahende Auszahlungsziel anpassen.',
      'Übergabe planen — welches Ziel, welche Rechte, welche Kommunikation mit dem Kind bei Volljährigkeit.',
    ],
    aspects: [
      {
        iconName: 'clock',
        title: 'Zeit ist der größte Hebel',
        body: 'Bei 20 Jahren Anlagehorizont wirken selbst kleine Sparraten stark. Ein zusätzliches Jahrzehnt verändert das Ergebnis oft deutlich stärker als eine höhere Sparrate.',
      },
      {
        iconName: 'briefcase',
        title: 'Depot auf Kind oder Eltern',
        body: 'Ein Depot auf das Kind gehört rechtlich dem Kind — nach Volljährigkeit auch faktisch. Ein Depot auf die Eltern bleibt in deren Verfügungsgewalt. Beide Wege haben ihre Vor- und Nachteile.',
      },
      {
        iconName: 'shield',
        title: 'Volljährigkeit als Zäsur',
        body: 'Ab dem 18. Geburtstag verfügt das Kind frei über sein Depot. Frühzeitige finanzielle Bildung und offene Kommunikation reduzieren mögliche Überraschungen.',
      },
      {
        iconName: 'percent',
        title: 'Kosten konsequent gering halten',
        body: 'Kinderdepots sind bei vielen Anbietern kostenfrei oder deutlich vergünstigt. Über 20 Jahre sind Kostenunterschiede erheblich — sie werden häufig unterschätzt.',
      },
      {
        iconName: 'layers',
        title: 'Breite Streuung als Basis',
        body: 'Ein globaler Aktien-ETF ist für lange Horizonte häufig die tragende Säule. Konzentrierte Wetten sind für Kinderdepots meist ungeeignet.',
      },
      {
        iconName: 'target',
        title: 'Zweckbindung mitdenken',
        body: 'Wer ein konkretes Ziel verfolgt, plant die letzten Jahre vor Erreichen defensiver. Ein 100-%-Aktien-Depot ist zwei Jahre vor Auszahlung selten die passende Struktur.',
      },
    ],
    example: {
      title: 'Ein Sparplan über 18 Jahre',
      body: 'Eltern eröffnen ein Kinderdepot bei Geburt und investieren monatlich 75 Euro in einen breit gestreuten Welt-ETF. Sie erhöhen die Sparrate alle drei Jahre um 10 %. Über 18 Jahre entsteht ein Kapitalstock, dessen konkrete Höhe von Marktrendite abhängt — dessen Struktur aber unabhängig vom Marktglück robust und kostengünstig aufgestellt bleibt.',
      disclaimer: 'Vereinfachtes Beispiel — keine Renditeprognose.',
    },
    advantages: [
      'Nutzt den längsten möglichen Anlagehorizont in der Familie.',
      'Kleine Sparraten reichen für spürbare Effekte.',
      'Rechtlich klar zuordenbar — sinnvoll bei Übertragungen zwischen Generationen.',
      'Bildungsvehikel: Kinder erleben Sparen, Investieren und Marktbewegungen praktisch mit.',
    ],
    considerations: [
      'Ab Volljährigkeit entscheidet das Kind frei — die Übergabe sollte inhaltlich vorbereitet sein.',
      'Erträge im Kinderdepot fallen unter das Kind und können Auswirkungen auf Steuern und Freibeträge haben.',
      'Sehr konservativ angelegte Kinderdepots verlieren real oft mehr, als sie sichern.',
      'Ausschließliche Zweckbindung („nur für Ausbildung") ist rechtlich schwer durchsetzbar.',
    ],
    mistakes: [
      'Kinderdepot in reinen Sparbüchern oder Tagesgeldern parken und den Zeithorizont verschenken.',
      'Zu spät starten und Sparrate nachträglich stark erhöhen müssen.',
      'Die letzten zwei bis drei Jahre vor Auszahlung nicht defensiver ausrichten.',
      'Übergabe an das Kind mit 18 nicht vorbereiten — weder inhaltlich noch finanziell edukativ.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'goal', label: 'Ich habe ein konkretes Ziel wie Ausbildung, Wohnen oder Selbstständigkeit im Blick.' },
        { value: 'ownership', label: 'Ich möchte den rechtlichen Rahmen (Depot auf Kind oder Eltern) bewusst wählen.' },
        { value: 'passive', label: 'Ich möchte kostengünstig und breit gestreut investieren.' },
        { value: 'education', label: 'Ich möchte mein Kind früh am Thema Geld und Investieren teilhaben lassen.' },
        { value: 'handover', label: 'Ich möchte die Übergabe bei Volljährigkeit inhaltlich vorbereiten.' },
      ],
      summary:
        'Diese Punkte helfen dabei, den passenden Rahmen für den Vermögensaufbau Ihres Kindes zu wählen — von Rechtsstruktur über Anlagemix bis zur späteren Übergabe.',
    },
    comparison: {
      leftTitle: 'Vermögensaufbau für Kinder',
      rightTitle: 'Allgemeiner Vermögensaufbau',
      rows: [
        { label: 'Zeithorizont', left: 'meist bis zur Volljährigkeit', right: 'individuell, oft langfristig' },
        { label: 'Rechtsträger', left: 'Kind oder Eltern (je nach Wahl)', right: 'meist Anleger selbst' },
        { label: 'Ziel', left: 'Ausbildung, Wohnen, Startkapital', right: 'individuelle Sparziele' },
        { label: 'Struktur zum Ende', left: 'defensiver zur Auszahlung hin', right: 'abhängig vom Anlageziel' },
        { label: 'Anspruch', left: 'Übergabe an junge Erwachsene', right: 'eigene Nutzung' },
        {
          label: 'Typische Frage',
          left: 'Wie starte ich früh und wie übergebe ich später sauber?',
          right: 'Wie erreiche ich mein Sparziel effizient?',
        },
      ],
    },
    related: [
      { label: 'Vermögensaufbau', path: '/strategie/schutz-steuerung/vermoegensaufbau' },
      { label: 'Vermögensübertragung', path: '/strategie/generationen/vermoegensuebertragung' },
      { label: 'Altersvorsorge', path: '/strategie/altersvorsorge/altersvorsorge' },
    ],
    faqs: [
      {
        q: 'Depot auf das Kind oder auf die Eltern — was ist besser?',
        a: 'Beides ist möglich. Ein Depot auf das Kind nutzt den kindlichen Sparerpauschbetrag und ordnet das Vermögen rechtlich klar zu — mit den entsprechenden Rechten ab Volljährigkeit. Ein Elterndepot bleibt in der Verfügungsgewalt der Eltern.',
      },
      {
        q: 'Sind Kinderdepots wirklich günstiger?',
        a: 'Bei vielen Anbietern ja — Depotführung ist häufig kostenlos und Sparpläne sind vergünstigt. Kosten sind ein zentraler Faktor über 18–20 Jahre.',
      },
      {
        q: 'Was passiert steuerlich, wenn ich in das Depot einzahle?',
        a: 'Regelmäßige Beträge in üblicher Höhe sind meist unkritisch. Größere Übertragungen können schenkungsteuerlich relevant sein und sollten mit qualifizierter Beratung geklärt werden.',
      },
      {
        q: 'Wie bereite ich mein Kind auf die Übergabe vor?',
        a: 'Frühzeitige Gespräche, gemeinsame Sichtung des Depots, altersgerechte Bildung zu Sparen und Investieren. Die Übergabe wird dann nicht zum Ereignis, sondern zum letzten Schritt eines langen Prozesses.',
      },
    ],
  },

  // ─────────────────────────── Vermögensübertragung ──────────────────────
  vermoegensuebertragung: {
    summary:
      'Vermögensübertragung ist mehr als Erbschaft: Sie umfasst Schenkung, Nachfolgeplanung und die Ordnung des eigenen Vermögens zu Lebzeiten. Wer früh plant, gewinnt Optionen — steuerlich, rechtlich und vor allem familiär.',
    quickFacts: [
      { label: 'Ziel', value: 'Vermögen strukturiert weitergeben' },
      { label: 'Zeithorizont', value: 'jahrzehntelang, laufend' },
      { label: 'Komplexität', value: 'hoch' },
      { label: 'Schwerpunkt', value: 'Struktur + Kommunikation' },
    ],
    shortExplanation: [
      {
        title: 'Was ist das?',
        body: 'Die geordnete Weitergabe von Vermögen — durch Schenkung, letztwillige Verfügung oder eine Kombination beider Wege.',
      },
      {
        title: 'Grundidee',
        body: 'Vermögen entsteht selten in einer Generation. Wer über Generationen plant, denkt Aufbau und Übergabe gemeinsam — und trennt sie nicht künstlich.',
      },
      {
        title: 'Warum das Thema wichtig ist',
        body: 'Unstrukturierte Übertragungen belasten Familien häufig mehr als das Vermögen selbst. Klare Regeln schaffen Sicherheit für alle Seiten.',
      },
      {
        title: 'Rolle in einer Finanzplanung',
        body: 'Übertragung ist eine langfristige Perspektive. Sie prägt Struktur, Liquidität und Konzentrationen bereits während des laufenden Vermögensaufbaus.',
      },
    ],
    suitableFor: {
      intro: 'Das Thema kann für Menschen interessant sein, die …',
      points: [
        'ihr Vermögen zu Lebzeiten strukturiert an die nächste Generation übergeben möchten.',
        'eine unklare Erbsituation oder komplexere Familienverhältnisse ordnen wollen.',
        'gewachsene Immobilien-, Unternehmens- oder Depotbestände in eine Nachfolge einbinden möchten.',
        'ihre Vermögensstruktur so aufstellen möchten, dass eine spätere Übergabe ohne Zwang verläuft.',
      ],
    },
    howItWorks: [
      'Vermögensinventur — alle Bestandteile, Verwahrstellen, Verpflichtungen und Beteiligten erfassen.',
      'Familiäre Ziele klären — wer soll was, wann und in welcher Form erhalten?',
      'Rechtliche und steuerliche Instrumente mit qualifizierter Beratung sichten — Schenkung, Testament, Vollmachten.',
      'Liquidität für Übertragungen und Erbfälle sicherstellen — Immobilien und Beteiligungen sind selten kurzfristig teilbar.',
      'Übertragung schrittweise umsetzen und Struktur regelmäßig überprüfen, wenn sich Vermögen oder Familie verändern.',
    ],
    aspects: [
      {
        iconName: 'file-text',
        title: 'Dokumentation als Basis',
        body: 'Ein aktuelles Vermögensverzeichnis, klare Regelungen zu Vollmachten und Verwahrstellen sind der Grundstein — nicht ein möglichst kunstvolles Testament.',
      },
      {
        iconName: 'clock',
        title: 'Zeit strukturieren',
        body: 'Schenkungen zu Lebzeiten können Freibeträge alle zehn Jahre erneut nutzen. Wer früh startet, verteilt Übertragungen sauber über die Zeit.',
      },
      {
        iconName: 'briefcase',
        title: 'Vermögensstruktur überdenken',
        body: 'Illiquide Vermögen wie Immobilien oder Unternehmensanteile lassen sich nicht per Kontoauszug teilen. Struktur und Liquidität gehören zur Übertragungsplanung.',
      },
      {
        iconName: 'shield',
        title: 'Familiäre Ziele klären',
        body: 'Erst wenn Ziele und Rollen abgestimmt sind, greifen rechtliche und steuerliche Instrumente. Ohne Gespräch bleibt jedes Modell fragil.',
      },
      {
        iconName: 'award',
        title: 'Fachliche Beratung notwendig',
        body: 'Steuer-, Erb- und Familienrecht sind komplex. Diese Perspektive gibt Orientierung — die individuelle Umsetzung braucht qualifizierten juristischen und steuerlichen Rat.',
      },
      {
        iconName: 'alert-triangle',
        title: 'Häufige Reibungspunkte',
        body: 'Ungleiche Behandlung, unklare Nachfolge in Unternehmen, fehlende Vollmachten, alte Testamente — diese Punkte tauchen in vielen Familien wieder auf.',
      },
    ],
    example: {
      title: 'Ein Rahmenbild — kein Rezept',
      body: 'Ein Ehepaar beginnt mit einer Vermögensinventur, notiert alle Konten, Depots, Immobilien und Beteiligungen. Anschließend werden gemeinsam mit den Kindern die grundsätzlichen Ziele geklärt. Auf dieser Basis erstellen Anwalt und Steuerberater ein aufeinander abgestimmtes Paket aus Testament, Schenkungsstrategie und Vollmachten. Die Struktur wird alle drei bis fünf Jahre gemeinsam überprüft.',
      disclaimer: 'Vereinfachtes Beispiel — keine individuelle Anlage-, Steuer- oder Rechtsberatung.',
    },
    advantages: [
      'Klare Regelungen entlasten Familien und Erben in schwierigen Momenten.',
      'Schrittweise Übertragung ermöglicht Nutzung von Freibeträgen über Zeit.',
      'Frühe Planung eröffnet zusätzliche rechtliche und finanzielle Handlungsräume.',
      'Vermögensstruktur wird gezielt auf spätere Teilbarkeit ausgerichtet.',
    ],
    considerations: [
      'Rechtliche und steuerliche Regeln ändern sich — Struktur ist keine einmalige Aufgabe.',
      'Nicht jedes Vermögen lässt sich sauber teilen; Immobilien und Beteiligungen sind besonders sensibel.',
      'Familiäre Dynamik ist kein Randthema — sie ist häufig der zentrale Faktor.',
      'Individuelle Umsetzung braucht qualifizierte anwaltliche und steuerliche Beratung.',
    ],
    mistakes: [
      'Übertragung erst zum Erbfall regeln und die eigene Handlungsfähigkeit unterschätzen.',
      'Testament schreiben, aber Vollmachten und Verwahrstellen unklar lassen.',
      'Vermögen nur nach Zahlen aufteilen und familiäre Aspekte übersehen.',
      'Auf steuerliche Aspekte reduzieren und rechtliche Struktur vernachlässigen.',
    ],
    selfCheck: {
      question: 'Welche Punkte sind für Sie persönlich wichtig?',
      options: [
        { value: 'inventur', label: 'Ich möchte einen strukturierten Überblick über mein Vermögen für die Übertragung.' },
        { value: 'schritt', label: 'Ich möchte Übertragungen schrittweise zu Lebzeiten gestalten.' },
        { value: 'dokumente', label: 'Ich möchte Vollmachten, Testament und Verfügungen aktuell halten.' },
        { value: 'kommunikation', label: 'Ich möchte offene Gespräche mit der Familie über Struktur und Ziele führen.' },
        { value: 'liquidity', label: 'Ich möchte Liquidität für Übertragungen und Erbfälle sicherstellen.' },
      ],
      summary:
        'Diese Punkte grenzen die Bausteine einer Übertragungsplanung ein — ohne einzelne rechtliche oder steuerliche Empfehlungen zu ersetzen.',
    },
    comparison: {
      leftTitle: 'Vermögensübertragung',
      rightTitle: 'Vermögensaufbau für Kinder',
      rows: [
        { label: 'Grundidee', left: 'strukturiert weitergeben', right: 'für Kinder aufbauen' },
        { label: 'Zeitpunkt', left: 'zu Lebzeiten und im Erbfall', right: 'während der Kindheit und Jugend' },
        { label: 'Betrag', left: 'oft größere Summen und Vermögensteile', right: 'meist regelmäßige Sparraten' },
        { label: 'Rechtsrahmen', left: 'Schenkung, Testament, Vollmachten', right: 'Depotstruktur, elterliche Sorge' },
        { label: 'Fokus', left: 'Struktur + Kommunikation', right: 'Zeit + Kostenstruktur' },
        {
          label: 'Typische Frage',
          left: 'Wie ordne ich meine Nachfolge?',
          right: 'Wie starte ich den Kapitalaufbau für mein Kind?',
        },
      ],
    },
    related: [
      { label: 'Vermögensaufbau für Kinder', path: '/strategie/generationen/vermoegensaufbau-fuer-kinder' },
      { label: 'Vermögensschutz', path: '/strategie/schutz-steuerung/vermoegensschutz' },
      { label: 'Private Rentenvorsorge', path: '/strategie/altersvorsorge/private-rentenvorsorge' },
    ],
    faqs: [
      {
        q: 'Ab wann sollte man sich mit Vermögensübertragung beschäftigen?',
        a: 'So früh wie möglich — mindestens dann, wenn Immobilien, Unternehmensanteile oder größere Depotvolumina vorhanden sind. Frühe Planung schafft die meisten Handlungsspielräume.',
      },
      {
        q: 'Schenkung oder Erbschaft — was ist besser?',
        a: 'Beides hat seinen Platz. Schenkungen zu Lebzeiten nutzen Freibeträge über Zeit und ermöglichen Steuerung. Erbschaft regelt, was zu Lebzeiten nicht übertragen wurde. Die Kombination beider Wege ist der Regelfall.',
      },
      {
        q: 'Kann diese Website die konkrete Umsetzung übernehmen?',
        a: 'Nein. Die Inhalte geben Orientierung. Die individuelle Umsetzung — Testament, Steuergestaltung, Nachlassregelung — braucht qualifizierten anwaltlichen und steuerlichen Rat.',
      },
      {
        q: 'Welche Rolle spielt Liquidität im Erbfall?',
        a: 'Eine große. Steuern und Ausgleichszahlungen sind häufig kurzfristig fällig, während Immobilien und Beteiligungen nicht sofort verkäuflich sind. Liquiditätsplanung gehört zur Übertragungsstruktur.',
      },
    ],
  },
};
