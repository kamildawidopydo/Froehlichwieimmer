/**
 * Session 80.19 — Strategie-Hub Content
 *
 * Struktur:
 *   categories: [{ slug, title, eyebrow, intro, topics: [{ slug, title, ... }] }]
 *
 * Alle Texte:
 *   - eigenständig für Kapital-Direkt24 geschrieben (keine 1:1 Kopien),
 *   - keine Renditeversprechen, keine individuellen Anlageempfehlungen,
 *   - für Normal-Anleger verständlich, fachlich seriös.
 */

const S = (
  slug,
  title,
  intro,
  sections,
  faqs = [],
  meta = {},
) => ({
  slug,
  title,
  intro,
  sections,   // [{ heading, body: string | string[] }]
  faqs,       // [{ q, a }]
  meta: {
    title: `${title} | Fröhlich Vermögensberatung`,
    description: meta.description || intro.slice(0, 155),
    ...meta,
  },
});

// Wiederkehrende Standard-Sektionen — jede Detailseite überschreibt sie individuell.
// Wir codieren die Sektionen als Objekt-Array, damit die Reihenfolge und Präsenz frei ist.

export const strategieCategories = [
  // ─────────────────────────── 1) Anlagestile ───────────────────────────
  {
    slug: 'anlagestile',
    title: 'Anlagestile',
    eyebrow: 'Anlagestile',
    icon: 'trending-up',
    lede: 'Zwei ausgewählte Anlagestile: analytisch geprägtes Value Investing und ertragsorientierte Dividendenstrategien.',
    intro:
      'Anlagestile beschreiben, nach welchen Prinzipien Wertpapiere ausgewählt und im Portfolio gehalten werden. Sie geben Ihrem Investieren Struktur — und machen Entscheidungen nachvollziehbar.',
    topics: [
      S(
        'value-investing',
        'Value Investing',
        'Value Investing bezeichnet einen Anlagestil, der gezielt Unternehmen sucht, deren Börsenwert aus Sicht des Anlegers unter dem inneren Wert liegt. Ziel ist eine Sicherheitsmarge: der Kaufpreis soll niedriger sein als eine sachlich hergeleitete Bewertung.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Value Investing geht auf Benjamin Graham und David Dodd zurück und wurde später besonders durch Warren Buffett bekannt. Die Grundidee: Der Markt ist kurzfristig oft emotional, langfristig aber ein „Wiegemeister" — der innere Wert eines Unternehmens setzt sich mit der Zeit durch.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Ausgangspunkt ist eine Fundamentalanalyse: Bilanz, Cashflow, Wettbewerbsposition, Verschuldung und Managementqualität werden bewertet.',
              'Der geschätzte innere Wert wird mit dem aktuellen Börsenkurs verglichen.',
              'Ein Kauf kommt nur infrage, wenn der Marktpreis deutlich unter dem inneren Wert liegt („margin of safety").',
              'Positionen werden in der Regel über Jahre gehalten, bis der Markt den Wert reflektiert oder sich die These verändert.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für Anlegerinnen und Anleger mit langem Atem, ausgeprägter Preissensibilität und Bereitschaft, gegen den kurzfristigen Konsens zu investieren. Value Investing eignet sich weniger für kurzfristige Handelsansätze.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Über lange Zeiträume hat sich der Ansatz akademisch häufig als robust gezeigt. Sollte der Markt den inneren Wert einpreisen, kann sich die anfängliche Bewertungslücke schließen.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Value-Fallen: Ein niedrig bewertetes Unternehmen kann strukturell in einem strauchelnden Geschäftsmodell stecken.',
              'Lange Wartezeiten: Der Markt braucht mitunter Jahre, bis Bewertungslücken schließen.',
              'Prozykliker: In sehr wachstumsorientierten Marktphasen kann Value gegenüber Growth relativ zurückbleiben.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Value ergänzt Wachstums- und Trendstrategien und kann in Marktphasen mit steigenden Zinsen oder Bewertungsdruck stabilisierend wirken. In der Regel wird Value nur als ein Baustein neben anderen Anlageklassen und Stilen genutzt.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf klare Auswahlkriterien, Diversifikation über Branchen und Regionen, Kostenstruktur bei Fonds/ETFs und darauf, dass die eigene Halte-Dauer zur Strategie passt.',
          },
        ],
        [
          {
            q: 'Ist Value Investing veraltet?',
            a: 'Nein. Bewertungsorientierte Ansätze bleiben ein etablierter Teil der Anlagelehre. Sie durchlaufen aber Phasen, in denen sie sich schwächer entwickeln als wachstumsbetonte Stile.',
          },
          {
            q: 'Kann ich Value Investing über ETFs abbilden?',
            a: 'Ja, es gibt Faktor-ETFs, die systematisch nach Bewertungskennzahlen selektieren. Alternativ existieren aktiv gemanagte Value-Fonds mit unterschiedlichen Auslegungen.',
          },
          {
            q: 'Wie lange sollte ich Value-Positionen halten?',
            a: 'Value entfaltet seine Idee typischerweise über mehrjährige Zeiträume. Ein Anlagehorizont von unter drei Jahren passt selten zum Stil.',
          },
        ],
        {
          description:
            'Value Investing verständlich erklärt: Grundidee, Vorgehen, Chancen und Risiken sowie die Rolle in einem diversifizierten Portfolio.',
        },
      ),
      S(
        'dividendenstrategien',
        'Dividendenstrategien',
        'Dividendenstrategien konzentrieren sich auf Unternehmen, die einen Teil ihres Gewinns regelmäßig ausschütten. Im Vordergrund stehen laufende Erträge, verlässliche Ausschüttungspolitik und die Qualität des zugrundeliegenden Geschäftsmodells.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Statt allein auf Kursgewinne zu setzen, wird ein Teil der erwarteten Gesamtrendite in Form von Dividenden vereinnahmt. Wer regelmäßige Ausschüttungen bevorzugt oder Cashflow-Aspekte betont, findet in Dividendenstrategien einen konsistenten Rahmen.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Auswahl von Unternehmen mit stabiler oder wachsender Ausschüttung.',
              'Prüfung der Ausschüttungsquote — nicht jede hohe Rendite ist tragfähig.',
              'Betrachtung der Bilanzqualität, Verschuldung und der Nachhaltigkeit des Cashflows.',
              'Streuung über Sektoren und Regionen, um Klumpenrisiken zu vermeiden.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für Anlegerinnen und Anleger, die laufende Zahlungsströme wertschätzen oder einen ruhigeren Renditepfad bevorzugen. Häufig genutzt im Zusammenhang mit Ausschüttungsplänen für die Ruhestandsphase.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Laufende Erträge unabhängig vom Kursverlauf, häufig geringere Schwankungen bei etablierten Dividendenzahlern und ein sichtbarer Cashflow-Beitrag zur Gesamtrendite.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Kürzungen oder Aussetzungen sind möglich, insbesondere in Krisen.',
              'Hohe Dividendenrenditen sind manchmal ein Warnsignal — nicht immer ein Vorteil.',
              'Steuerliche Behandlung von Dividenden kann Renditen relativ zu reinen Kursgewinnen beeinflussen.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Dividendenstrategien werden häufig als ausschüttungsorientierter Baustein neben wachstumsbetonten Positionen genutzt und können den ausschüttungsgetriebenen Cashflow eines Depots erhöhen.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf die Qualität der Ausschüttung (nicht nur Höhe), auf die Verteilung über Branchen und darauf, wie Ausschüttungen in der eigenen Steuersituation wirken.',
          },
        ],
        [
          {
            q: 'Ist eine hohe Dividendenrendite immer gut?',
            a: 'Nicht zwangsläufig. Ein sehr hoher Wert kann auf einen stark gefallenen Kurs oder eine kaum tragfähige Ausschüttung hindeuten.',
          },
          {
            q: 'Passen Dividendenstrategien zu jüngeren Anlegern?',
            a: 'Sie können ergänzend passen, sind aber selten der einzige Baustein — Wachstumsanteile sind bei langem Horizont typischerweise ebenfalls sinnvoll.',
          },
        ],
        { description: 'Dividendenstrategien verständlich: Idee, Auswahlkriterien, Chancen, Risiken und Rolle im Portfolio.' },
      ),
    ],
  },
  // ─────────────────────────── 2) Nachhaltigkeit ───────────────────────
  {
    slug: 'nachhaltigkeit',
    title: 'Nachhaltigkeit',
    eyebrow: 'Nachhaltigkeit',
    icon: 'leaf',
    lede: 'Anlagen, die ökologische, soziale und Governance-Aspekte konsequent mitdenken.',
    intro:
      'Nachhaltiges Investieren verbindet finanzielle Ziele mit Werten. Die Ansätze reichen von klassischer ESG-Integration bis zu Impact-Investments mit klar messbarem Wirkungsziel.',
    topics: [
      S(
        'nachhaltige-investments-esg',
        'Nachhaltige Investments (ESG)',
        'ESG steht für Environment (Umwelt), Social (Soziales) und Governance (Unternehmensführung). Nachhaltige Investments berücksichtigen diese Kriterien systematisch bei der Auswahl von Wertpapieren.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'ESG-Investing ist ein Sammelbegriff für unterschiedliche Verfahren: Ausschlusskriterien (bestimmte Branchen ausschließen), Best-in-Class (die nachhaltigsten Unternehmen einer Branche bevorzugen), Integration (ESG-Kennzahlen in die Fundamentalanalyse einfließen lassen) sowie Impact-Ansätze mit messbarem Ziel.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Definition der eigenen Prioritäten (z. B. Klima, Menschenrechte, Governance).',
              'Auswahl passender Fonds/ETFs bzw. Direktinvestments.',
              'Prüfung der zugrundeliegenden Methodik — Ratings unterscheiden sich je Anbieter.',
              'Regelmäßige Überprüfung, ob die Anlage tatsächlich die gesetzten Kriterien erfüllt.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für Anlegerinnen und Anleger, die finanzielle Ziele mit einem klaren Wertekompass verbinden möchten und bereit sind, sich mit unterschiedlichen Methodiken auseinanderzusetzen.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'ESG-Themen wie Energiewende, Digitalisierung und Ressourceneffizienz sind langfristige Wachstumsfelder. Zudem gewinnen Regulierung und Berichtspflichten an Bedeutung, was Transparenz und Vergleichbarkeit erhöht.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              '„Greenwashing" — Produkte tragen nachhaltige Etiketten, ohne die Kriterien substanziell zu erfüllen.',
              'Uneinheitliche Ratings: verschiedene Anbieter bewerten Unternehmen unterschiedlich.',
              'Konzentrationsrisiken, wenn Portfolios auf wenige nachhaltige Sektoren fokussieren.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'ESG-Investments lassen sich als Kern- oder Ergänzungsbaustein einsetzen und können mit klassischen Anlagestilen kombiniert werden. Eine bewusste Streuung bleibt entscheidend.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf die Methodik hinter dem Label (Art. 6/8/9-SFDR), die zugrundeliegenden Ratings, die Portfolio-Zusammensetzung und die Gesamtkosten des Vehikels.',
          },
        ],
        [
          {
            q: 'Bringt ESG automatisch weniger Rendite?',
            a: 'Empirisch ist der Zusammenhang uneinheitlich. In manchen Phasen liegen ESG-Portfolios vorne, in anderen nicht. Entscheidend sind Methodik, Kostenstruktur und Marktumfeld.',
          },
          {
            q: 'Ist Art. 9 immer nachhaltiger als Art. 8?',
            a: 'Art. 9-Fonds verfolgen ein nachhaltiges Anlageziel als Kern, Art. 8-Fonds berücksichtigen ESG-Aspekte. Ob ein Fonds zu Ihnen passt, hängt vom konkreten Ansatz ab, nicht allein vom Label.',
          },
        ],
        { description: 'ESG-Investing verständlich: Methoden, Chancen, Risiken und wie sich Nachhaltigkeit im Portfolio abbilden lässt.' },
      ),
      S(
        'impact-investing',
        'Impact Investing',
        'Impact Investing zielt bewusst darauf, neben einer finanziellen Rendite eine messbare positive Wirkung auf Umwelt oder Gesellschaft zu erreichen — vom Sozialwohnungsbau bis zu Klimaprojekten.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Anders als reines ESG-Investing verlangt Impact-Investing eine explizite Wirkungsabsicht und ein Messkonzept. Die Anlage soll ein klar definiertes Umwelt- oder Sozialziel unterstützen.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Festlegung des Wirkungsziels (z. B. Reduktion von CO₂, Zugang zu Bildung).',
              'Auswahl von Anlagevehikeln, die dieses Ziel adressieren (Fonds, Genossenschaftsanteile, Themen-Aktien, Green Bonds).',
              'Messung anhand definierter Kennzahlen (z. B. eingesparte Tonnen CO₂, versorgte Haushalte).',
              'Regelmäßige Berichte zur Wirkungs- und Finanzperformance.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für Anleger, die einen expliziten Beitrag über die reine Kapitalallokation hinaus leisten möchten und akzeptieren, dass Wirkung Zeit braucht und selten linear verläuft.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Zugang zu Zukunftsthemen wie erneuerbare Energien, nachhaltige Infrastruktur oder Bildungsangebote. In vielen Bereichen bestehen langfristige gesellschaftliche und regulatorische Rückenwinde.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Einige Impact-Anlagen sind weniger liquide und langfristig gebunden.',
              'Wirkungsmessung ist methodisch anspruchsvoll und nicht immer vergleichbar.',
              'Ergebnisorientierte Themen können projekt- oder länderspezifischen Risiken unterliegen.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Impact-Investments werden häufig als thematische Ergänzung eingesetzt, ohne den Diversifikationsgedanken aufzugeben. Sie ersetzen nicht die Portfoliostruktur, sondern schärfen sie inhaltlich.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf die konkrete Wirkungsmessung, Laufzeiten, Liquidität, Anbieterqualität sowie darauf, dass die Anlage Teil eines Gesamtplans bleibt.',
          },
        ],
        [
          {
            q: 'Ist Impact-Investing dasselbe wie Spende?',
            a: 'Nein. Impact-Investing verfolgt weiterhin eine finanzielle Rendite, verbindet sie aber mit einer klaren, messbaren Wirkungsabsicht.',
          },
        ],
        { description: 'Impact Investing erklärt: klare Wirkungsabsicht, Messkonzepte, Chancen und Risiken.' },
      ),
    ],
  },
  // ─────────────────────────── 3) Schutz & Steuerung ───────────────────
  {
    slug: 'schutz-steuerung',
    title: 'Schutz & Steuerung',
    eyebrow: 'Schutz & Steuerung',
    icon: 'shield',
    lede: 'Kernstrategien, um Vermögen zu erhalten, gegen Kaufkraftverluste zu wappnen und strukturiert aufzubauen.',
    intro:
      'Die drei Bausteine dieser Kategorie greifen ineinander: Vermögensschutz sichert das Erreichte, Inflationsschutz erhält die Kaufkraft, Vermögensaufbau setzt neuen Boden.',
    topics: [
      S(
        'vermoegensschutz',
        'Vermögensschutz',
        'Vermögensschutz zielt darauf, bereits Erreichtes zu bewahren — vor Marktrisiken, unerwarteten Ereignissen und rechtlichen Risiken. Es ist die Basisdisziplin einer langfristigen Vermögensplanung.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Vermögensschutz ist mehr als eine einzelne Anlagestrategie. Er umfasst Portfoliostreuung, Auswahl geeigneter Rechtsformen, Absicherung bestimmter Lebensrisiken und die klare Trennung von privatem und betrieblichem Vermögen.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Bestandsaufnahme aller Vermögenswerte — inklusive Immobilien, Depots, Beteiligungen und Verbindlichkeiten.',
              'Identifikation von Klumpen- und Konzentrationsrisiken.',
              'Diversifikation über Anlageklassen, Regionen, Währungen und Zugriffsrechte.',
              'Abstimmung mit steuerlichen und rechtlichen Rahmenbedingungen.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für alle, die bereits Vermögen aufgebaut haben oder auf einen wichtigen Lebensabschnitt (z. B. Ruhestand, Übertragung) zusteuern und Stabilität stärker gewichten als maximales Wachstum.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Reduzierung großer Verlustrisiken, Erhalt handlungsfähiger Reserven in Krisen und Sicherung des Erreichten für die nächste Lebensphase.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Übertriebener Fokus auf Sicherheit kann Renditepotenziale mindern.',
              'Manche Absicherungslösungen (z. B. Versicherungsmäntel) sind komplex und kostenintensiv.',
              'Reine Cash-Lösungen bergen ihrerseits Kaufkraftrisiken.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Vermögensschutz ist selten eine einzelne Position, sondern eine übergeordnete Denkweise: Diversifikation, Liquiditätsreserve und rechtlich saubere Strukturen greifen ineinander.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf Gesamtsicht statt Einzelprodukt, auf Kosten, auf steuerliche Wirkung und darauf, dass Absicherung und Rendite in einem sinnvollen Verhältnis stehen.',
          },
        ],
      ),
      S(
        'inflationsschutz',
        'Inflationsschutz',
        'Inflation entwertet Guthaben, deren Verzinsung dauerhaft unter der Teuerung liegt. Ein Inflationsschutz-Ansatz zielt darauf, Kaufkraft über die Zeit zu erhalten.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Inflationsschutz ist kein einzelnes Produkt, sondern eine Mischung aus realwerten Anlagen und geeigneten Zinsstrukturen. Ziel ist es, dass die Anlage im Idealfall mit der Teuerung mitläuft oder darüber liegt.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Anteil an Sachwerten wie Aktien, Immobilien oder Rohstoffen prüfen.',
              'Inflationsindexierte Anleihen (z. B. Bundes-Linker) einordnen.',
              'Zinsniveau der Cash-Reserven prüfen und flexibel reagieren.',
              'Regelmäßig gegen die tatsächliche Inflationsrate spiegeln.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für Sparer und Investoren, die längerfristig planen und die Erosion der Kaufkraft aktiv adressieren wollen — insbesondere in Phasen erhöhter Inflation.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Kaufkrafterhalt, potenzielle Zusatzerträge über den Nominalzinsen, und stabiler Realwert der Anlage.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Sachwerte können erheblich schwanken.',
              'Inflationsindexierte Anleihen haben eigene Kursrisiken und Deflationsrisiken.',
              'Kein Baustein garantiert Kaufkrafterhalt in jeder Marktlage.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Ein Inflationsschutz-Baustein wirkt ergänzend zu einem gestreuten Kernportfolio und richtet sich am Zeithorizont sowie an der eigenen Ausgabenstruktur aus.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf den realen Zinsanteil, auf Kosten und Steuern der eingesetzten Vehikel und darauf, dass Cash-Reserven nicht zu groß werden.',
          },
        ],
      ),
      S(
        'vermoegensaufbau',
        'Vermögensaufbau',
        'Vermögensaufbau ist die schrittweise, langfristige Vermehrung von Kapital — meist über Sparraten in einem gut diversifizierten Portfolio. Zinseszinseffekte und Disziplin sind wesentliche Hebel.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Vermögensaufbau steht am Anfang jeder Vermögensplanung. Er verbindet konkrete Sparraten mit einer Struktur, die zum eigenen Zeithorizont, zur Risikotragfähigkeit und zu den Zielen passt.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Ziele klären: Zeitraum, Wunschsumme, spätere Verwendung.',
              'Sparrate festlegen und automatisieren.',
              'Anlagemix wählen (z. B. ETF-Kern, ergänzende Bausteine).',
              'Regelmäßig prüfen und schrittweise anpassen.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Grundsätzlich für alle, die planen und mit realistischen Erwartungen langfristig sparen möchten — vom Berufseinstieg bis zur Familienphase und darüber hinaus.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Zinseszinseffekt über die Zeit, Glättung von Marktschwankungen durch regelmäßige Käufe und ein bewusstes Kostenmanagement.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Marktschwankungen können zwischenzeitlich zu Buchverlusten führen.',
              'Zu enge Timing-Versuche führen häufig zu ungünstigen Kauf-/Verkaufsentscheidungen.',
              'Zu geringe Sparraten oder unregelmäßiges Sparen verringern die Zieltreue.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Vermögensaufbau ist meist der Kern einer Vermögensplanung: er stellt die Basis, auf der spätere Schutz- und Übertragungsstrategien aufsetzen.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf Kosten, Streuung, Steuerthemen und die Fähigkeit, in Krisen bei der Strategie zu bleiben.',
          },
        ],
      ),
    ],
  },
  // ─────────────────────────── 4) Altersvorsorge ───────────────────────
  {
    slug: 'altersvorsorge',
    title: 'Altersvorsorge',
    eyebrow: 'Altersvorsorge',
    icon: 'clock',
    lede: 'Bausteine, um die spätere Einkommenslücke im Ruhestand zu schließen — gesetzlich, privat und betrieblich.',
    intro:
      'Die Altersvorsorge stützt sich in Deutschland auf drei Säulen. Wir betrachten sie hier aus Anlegersicht — mit Fokus auf Planung, Flexibilität und die tatsächliche Ausgestaltung.',
    topics: [
      S(
        'altersvorsorge',
        'Altersvorsorge',
        'Altersvorsorge beschreibt alle Maßnahmen, mit denen im späteren Leben ein tragfähiges Einkommen sichergestellt wird — von der gesetzlichen Rente über private Sparpläne bis zu betrieblichen Zusagen.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Zur Altersvorsorge gehören staatliche Leistungen, privat aufgebaute Vermögen, betriebliche Zusatzversorgungen und in vielen Fällen Immobilien oder Beteiligungen. Ziel ist ein tragfähiger Mix aus laufendem Einkommen und Vermögensbestand.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Analyse der voraussichtlichen Einkommenslücke.',
              'Prüfung der drei Säulen (gesetzlich, privat, betrieblich).',
              'Wahl geeigneter Sparformen (Depots, Versicherungslösungen, bAV).',
              'Regelmäßige Anpassung an Lebensphasen und steuerliche Änderungen.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für alle. Wer früh startet, profitiert von Zeit; wer später einsteigt, kann mit gezielter Strukturierung viel erreichen.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Klar geplantes Einkommen im Ruhestand, steuerliche Effekte (z. B. bei bAV), Flexibilität in der Verwendung und die Möglichkeit, Kapital gestaffelt zu entnehmen.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Zu geringes Sparen erhöht die Einkommenslücke.',
              'Falsche Produktauswahl kann teuer und wenig flexibel sein.',
              'Politische und regulatorische Änderungen wirken auf staatliche und betriebliche Elemente.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Altersvorsorge ist ein eigener Zweck im Vermögensplan. Sie steht neben freien Vermögenswerten und sollte nicht mit kurzfristiger Liquidität vermischt werden.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf Kosten, Flexibilität, steuerliche Wirkung und die passende Verzahnung mit anderen Bausteinen des Vermögens.',
          },
        ],
      ),
      S(
        'private-rentenvorsorge',
        'Private Rentenvorsorge',
        'Die private Rentenvorsorge ergänzt gesetzliche und betriebliche Ansprüche mit eigenem Kapital — häufig über Fondssparpläne, ETF-Depots oder Rentenversicherungen.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Privat baut jede und jeder Vermögen für den Ruhestand auf. Die Palette reicht vom flexiblen Wertpapierdepot bis zur klassischen Rentenversicherung mit lebenslangen Zahlungen.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Ziele definieren: Zeitpunkt, Höhe, Verwendung.',
              'Sparform wählen (Depot vs. Versicherungsmantel).',
              'Kostenstruktur der Lösung prüfen.',
              'Regelmäßig Sparrate und Portfoliostruktur überprüfen.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für alle, die ergänzend zur gesetzlichen Rente Kapital aufbauen möchten und Flexibilität sowie Kosten aktiv steuern wollen.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Freie Wahl zwischen Kapital- und Rentenlösung, breite Produktvielfalt und die Möglichkeit, Sparraten dynamisch anzupassen.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Manche Versicherungslösungen sind schwer vergleichbar und mit langen Bindungen versehen.',
              'Wertpapierbasierte Lösungen unterliegen Kursschwankungen.',
              'Zu späte Beitragsanpassungen können Ziele verfehlen lassen.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Private Rentenvorsorge sollte in ein Gesamtbild eingebettet werden, das Liquidität, Vermögensaufbau und Absicherung enthält.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf Gesamtkosten, Flexibilität in Beitragspausen/Entnahmen, steuerliche Behandlung und den Anlage-Kern der Lösung.',
          },
        ],
      ),
      S(
        'betriebliche-altersvorsorge',
        'Betriebliche Altersvorsorge',
        'Die betriebliche Altersvorsorge (bAV) ergänzt die private Vorsorge über den Arbeitgeber. Sie ist häufig steuerlich gefördert und kann tarifliche oder betriebliche Zuschüsse enthalten.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Bei der bAV zahlen Beschäftigte einen Teil ihres Bruttogehalts in eine Versorgungslösung ein. Fünf Durchführungswege existieren, u. a. Direktversicherung, Pensionskasse oder Unterstützungskasse.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Prüfen, welche Durchführungswege der Arbeitgeber anbietet.',
              'Höhe und Steuerwirkung ermitteln (Entgeltumwandlung, Zuschüsse).',
              'Anlageform innerhalb der Lösung wählen, sofern möglich.',
              'Bei Wechsel des Arbeitgebers Portabilität prüfen.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für sozialversicherungspflichtig Beschäftigte, insbesondere wenn der Arbeitgeber Zuschüsse leistet oder tarifliche Modelle bestehen.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Steuer- und sozialversicherungsrechtliche Effekte, Arbeitgeberzuschüsse und ein organisierter, ratensparender Aufbau von Alterskapital.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'In der Auszahlungsphase fallen häufig Sozialabgaben an.',
              'Wechsel des Arbeitgebers erfordern eine sorgfältige Übernahme oder Beitragsfreistellung.',
              'Manche Modelle sind wenig transparent oder starr.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Die bAV ist ein steuerlich geprägter Baustein und ergänzt die private Vorsorge. Sie sollte im Zusammenspiel mit freien Anlagen und der gesetzlichen Rente betrachtet werden.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf Kosten, Zuschüsse, Portabilität, spätere Sozialabgaben und die Anlagepolitik der Lösung.',
          },
        ],
      ),
    ],
  },
  // ─────────────────────────── 5) Generationen ─────────────────────────
  {
    slug: 'generationen',
    title: 'Generationen',
    eyebrow: 'Generationen',
    icon: 'users',
    lede: 'Vermögen über Lebensphasen hinweg denken — für Kinder aufbauen, an die nächste Generation übergeben.',
    intro:
      'Vermögen entsteht selten in einer einzigen Lebensphase. Wer über Generationen plant, denkt Vermögensaufbau und Übertragung gemeinsam — steuerlich, rechtlich und persönlich.',
    topics: [
      S(
        'vermoegensaufbau-fuer-kinder',
        'Vermögensaufbau für Kinder',
        'Ein früh gestarteter, langfristiger Kapitalaufbau für Kinder profitiert besonders vom Zeithorizont. Selbst kleinere Sparraten können sich über zwei Jahrzehnte spürbar entfalten.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Vermögensaufbau für Kinder ist ein zweckgebundener Sparprozess: Ausbildung, Führerschein, erste Wohnung — die Ziele variieren, die Struktur bleibt ähnlich.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Zielhorizont festlegen (typischerweise 10–20 Jahre).',
              'Depotform wählen (Kinderdepot auf Namen des Kindes vs. Depot der Eltern).',
              'Sparrate automatisieren und breit streuen.',
              'Steuerliche Freibeträge und rechtliche Aspekte prüfen.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für Eltern, Großeltern oder Paten, die für Kinder langfristig sparen und Zeit gezielt als Hebel nutzen möchten.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Langer Anlagehorizont, Zinseszinseffekt, Nutzung steuerlicher Freibeträge und ein solider Grundstock für den Start ins Erwachsenenleben.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Ein Depot auf den Namen des Kindes gehört rechtlich dem Kind — Rückgriff ist eingeschränkt.',
              'Marktschwankungen sind über lange Zeiträume üblich; Panikreaktionen können Ziele gefährden.',
              'Zu geringe Sparraten reichen bei hohen Zielsummen nicht.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Ein eigenständiger Baustein für ein klar definiertes Ziel — bewusst getrennt vom allgemeinen Vermögensaufbau der Eltern.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf Kosten, Streuung, Zugriffsrecht, steuerliche Freibeträge und darauf, dass der Anlagehorizont zum Ziel passt.',
          },
        ],
      ),
      S(
        'vermoegensuebertragung',
        'Vermögensübertragung',
        'Die geordnete Übertragung von Vermögen — zu Lebzeiten oder im Erbfall — schafft Klarheit für die nächste Generation und vermeidet vermeidbare Kosten oder Konflikte.',
        [
          {
            heading: 'Was bedeutet das?',
            body:
              'Vermögensübertragung umfasst Schenkungen, Erbschaften, Nießbrauch, Familienstiftungen und andere Instrumente. Ziel ist ein Übergang, der zu Familien- und Steuersituation passt.',
          },
          {
            heading: 'Wie funktioniert die Strategie?',
            body: [
              'Bestandsaufnahme des Vermögens.',
              'Klärung der Wünsche innerhalb der Familie.',
              'Prüfung von Freibeträgen, Bewertungsmethoden und Steuerklassen.',
              'Rechtliche Gestaltung mit Notar/Steuerberater — inklusive Testament oder Erbvertrag.',
            ],
          },
          {
            heading: 'Für wen kann sie interessant sein?',
            body:
              'Für alle, die ihre spätere Nachfolge aktiv gestalten möchten — insbesondere bei größerem Vermögen, Familienunternehmen oder Patchwork-Konstellationen.',
          },
          {
            heading: 'Welche Chancen bestehen?',
            body:
              'Steuerliche Freibeträge lassen sich oft alle 10 Jahre erneut nutzen; frühzeitige Übertragungen schaffen Klarheit und können Kosten senken.',
          },
          {
            heading: 'Welche Risiken und Nachteile gibt es?',
            body: [
              'Unklare Regelungen führen häufig zu Konflikten.',
              'Falsche Bewertungen oder Fristversäumnisse verursachen unnötige Steuerlast.',
              'Nießbrauch- oder Rückforderungsklauseln sind komplex und müssen sorgfältig gestaltet werden.',
            ],
          },
          {
            heading: 'Rolle in einem diversifizierten Portfolio',
            body:
              'Vermögensübertragung ist keine reine Anlagestrategie, sondern eine übergreifende Planungsaufgabe — sie steht neben der eigentlichen Portfoliostruktur.',
          },
          {
            heading: 'Worauf sollte man achten?',
            body:
              'Auf frühzeitige Planung, saubere rechtliche Gestaltung, Einbindung aller Beteiligten und den Blick auf die eigenen finanziellen Bedürfnisse zu Lebzeiten.',
          },
        ],
      ),
    ],
  },
];

export const findCategory = (slug) => strategieCategories.find((c) => c.slug === slug) || null;

export const findTopic = (categorySlug, topicSlug) => {
  const cat = findCategory(categorySlug);
  if (!cat) return null;
  const topic = cat.topics.find((t) => t.slug === topicSlug);
  return topic ? { category: cat, topic } : null;
};

export const allStrategiePaths = () => {
  const paths = ['/strategie'];
  strategieCategories.forEach((c) => {
    paths.push(`/strategie/${c.slug}`);
    c.topics.forEach((t) => paths.push(`/strategie/${c.slug}/${t.slug}`));
  });
  return paths;
};
