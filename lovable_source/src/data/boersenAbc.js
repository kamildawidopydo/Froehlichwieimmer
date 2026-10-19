/**
 * Börsen-ABC — 55 Grundbegriffe, verständlich erklärt.
 * Reine Wissensdaten für die öffentliche /handeln-Seite.
 * Keine Empfehlungen, keine Renditeversprechen.
 *
 * Felder:
 *   term        — angezeigter Begriff
 *   letter      — großer Anfangsbuchstabe (A-Z)
 *   category    — thematische Zuordnung (für Filter/Kontext)
 *   short       — 1-Satz-Kurzdefinition (Suchtreffer-Snippet)
 *   long        — ausführlichere Erklärung im Accordion
 *   example     — optionales Beispiel oder Merkhilfe
 */

export const BOERSEN_ABC_CATEGORIES = {
  grundlagen: 'Grundlagen',
  anlageklassen: 'Anlageklassen',
  orderarten: 'Orderarten',
  kennzahlen: 'Kennzahlen',
  kosten: 'Kosten & Steuern',
  risiko: 'Risiko & Rendite',
  markt: 'Markt & Handel',
};

export const BOERSEN_ABC = [
  // A
  {
    term: 'Aktie',
    letter: 'A',
    category: 'anlageklassen',
    short: 'Anteilsschein am Eigenkapital einer Aktiengesellschaft.',
    long: 'Eine Aktie verbrieft einen Anteil am Grundkapital einer Aktiengesellschaft. Aktionäre sind Miteigentümer des Unternehmens und tragen Chancen (Kursgewinne, Dividende) und Risiken (Kursverlust bis Totalverlust) mit.',
    example: 'Wer eine Aktie hält, ist anteilig am Unternehmenserfolg beteiligt — nicht am laufenden Umsatz.',
  },
  {
    term: 'Anleihe',
    letter: 'A',
    category: 'anlageklassen',
    short: 'Verzinstes Schuldpapier eines Staates oder Unternehmens.',
    long: 'Bei einer Anleihe leiht der Anleger dem Emittenten (z. B. Staat, Unternehmen) Geld auf feste Laufzeit gegen einen Zinskupon. Bei Endfälligkeit wird der Nennwert zurückgezahlt — vorausgesetzt, der Emittent ist zahlungsfähig.',
    example: 'Bundesanleihen gelten in der Regel als bonitätsstark, Hochzinsanleihen tragen höheres Ausfallrisiko.',
  },
  {
    term: 'Ask (Briefkurs)',
    letter: 'A',
    category: 'markt',
    short: 'Preis, zu dem Verkäufer bereit sind, ein Wertpapier abzugeben.',
    long: 'Der Briefkurs ist der niedrigste Preis, zu dem im Orderbuch verkauft wird. Zusammen mit dem Bid-Kurs (Geldkurs) ergibt sich der Spread — die Handelsspanne.',
  },
  {
    term: 'ATH — Allzeithoch',
    letter: 'A',
    category: 'markt',
    short: 'Höchster jemals erreichter Kurs eines Wertpapiers.',
    long: 'Das Allzeithoch (All-Time High) ist der bisher höchste Schlusskurs. Ein neuer ATH bedeutet weder automatisch weiteren Kursanstieg noch bevorstehenden Rückgang — er ist eine reine historische Marke.',
  },

  // B
  {
    term: 'Bid (Geldkurs)',
    letter: 'B',
    category: 'markt',
    short: 'Preis, zu dem Käufer im Markt bereit sind, ein Wertpapier zu übernehmen.',
    long: 'Der Geldkurs ist der höchste Preis, den ein Käufer im Orderbuch aktuell zu zahlen bereit ist. Die Differenz zum Briefkurs (Ask) heißt Spread und ist Teil der impliziten Handelskosten.',
  },
  {
    term: 'Blue Chip',
    letter: 'B',
    category: 'anlageklassen',
    short: 'Aktie eines großen, etablierten Unternehmens mit hoher Marktkapitalisierung.',
    long: 'Als Blue Chips werden umsatzstarke, meist in Leitindizes vertretene Unternehmen bezeichnet. Sie gelten als vergleichsweise liquide, unterliegen aber weiterhin dem allgemeinen Marktrisiko.',
    example: 'Werte im DAX oder Dow Jones werden häufig als Blue Chips klassifiziert.',
  },
  {
    term: 'Broker',
    letter: 'B',
    category: 'markt',
    short: 'Finanzintermediär, der Wertpapier­aufträge an eine Börse oder einen Handelsplatz weiterleitet.',
    long: 'Ein Broker führt Kundenorders an einem Handelsplatz aus. Zu unterscheiden sind Discount-Broker (Fokus auf günstige Ausführung) und beratungsorientierte Häuser.',
  },
  {
    term: 'Bulle & Bär',
    letter: 'B',
    category: 'markt',
    short: 'Sinnbild für steigende (Bulle) und fallende (Bär) Märkte.',
    long: 'Ein Bullenmarkt beschreibt eine anhaltend steigende Marktphase, ein Bärenmarkt eine anhaltend fallende. Definiert wird ein Bärenmarkt üblicherweise ab einem Rückgang von 20 % vom letzten Hoch.',
  },

  // C
  {
    term: 'Cost-Average-Effekt',
    letter: 'C',
    category: 'grundlagen',
    short: 'Durchschnittseffekt bei regelmäßigem Kauf zu unterschiedlichen Kursen.',
    long: 'Wer regelmäßig gleiche Beträge investiert (z. B. per Sparplan), erwirbt bei hohen Kursen weniger und bei niedrigen Kursen mehr Anteile. Das kann Einstiegs­risiken glätten, garantiert aber keine bessere Rendite.',
  },
  {
    term: 'Clearing',
    letter: 'C',
    category: 'markt',
    short: 'Abwicklung und Verrechnung eines Wertpapiergeschäfts nach dem Handel.',
    long: 'Clearing bezeichnet die technische und rechtliche Nachbearbeitung eines Trades zwischen Käufer, Verkäufer und Zentralem Kontrahenten — bis das Wertpapier eingebucht und die Zahlung geflossen ist.',
  },

  // D
  {
    term: 'DAX',
    letter: 'D',
    category: 'markt',
    short: 'Deutscher Leitindex der 40 größten börsennotierten Unternehmen.',
    long: 'Der DAX bildet die Wertentwicklung der 40 wichtigsten börsennotierten deutschen Unternehmen ab. Er ist ein Performanceindex, das heißt Dividenden werden rechnerisch reinvestiert.',
  },
  {
    term: 'Dividende',
    letter: 'D',
    category: 'anlageklassen',
    short: 'Gewinnbeteiligung, die eine Aktiengesellschaft an ihre Aktionäre ausschüttet.',
    long: 'Über die Höhe entscheidet die Hauptversammlung auf Vorschlag von Vorstand und Aufsichtsrat. Dividenden sind nicht garantiert, sie können gekürzt oder ausgesetzt werden.',
    example: 'Die Dividendenrendite setzt die Dividende ins Verhältnis zum aktuellen Aktienkurs.',
  },
  {
    term: 'Diversifikation',
    letter: 'D',
    category: 'risiko',
    short: 'Streuung des Vermögens über verschiedene Wertpapiere, Regionen und Anlageklassen.',
    long: 'Diversifikation reduziert unternehmensspezifische und regionale Risiken. Sie beseitigt jedoch nicht das allgemeine Marktrisiko — bei breiten Marktkorrekturen können nahezu alle Positionen gleichzeitig fallen.',
  },
  {
    term: 'Depot',
    letter: 'D',
    category: 'grundlagen',
    short: 'Konto, auf dem Wertpapiere für den Anleger verwahrt werden.',
    long: 'Das Wertpapierdepot ist rechtlich Sondervermögen: Bei Insolvenz der Depotbank fallen die verwahrten Wertpapiere nicht in die Insolvenzmasse.',
  },

  // E
  {
    term: 'ETF',
    letter: 'E',
    category: 'anlageklassen',
    short: 'Börsengehandelter Indexfonds, der einen Index nachbildet.',
    long: 'Ein ETF (Exchange Traded Fund) folgt regelbasiert einem Index (z. B. MSCI World). Er handelt fortlaufend an der Börse, weist meist niedrige laufende Kosten (TER) aus und ist als Sondervermögen geschützt.',
  },
  {
    term: 'Emittent',
    letter: 'E',
    category: 'anlageklassen',
    short: 'Herausgeber eines Wertpapiers (Unternehmen, Staat, Institution).',
    long: 'Die Bonität des Emittenten bestimmt maßgeblich das Ausfallrisiko einer Anleihe oder eines Zertifikats. Bei Zertifikaten trägt der Anleger stets das Emittentenrisiko.',
  },

  // F
  {
    term: 'Fonds',
    letter: 'F',
    category: 'anlageklassen',
    short: 'Von einer Kapitalverwaltungsgesellschaft verwaltetes Sondervermögen.',
    long: 'Ein Investmentfonds bündelt das Kapital vieler Anleger und investiert es gemäß einer definierten Strategie. Er kann aktiv gemanagt oder regelbasiert (Index) sein.',
  },
  {
    term: 'Freistellungsauftrag',
    letter: 'F',
    category: 'kosten',
    short: 'Auftrag an die Bank, Kapitalerträge bis zum Sparerpauschbetrag steuerfrei zu stellen.',
    long: 'Bis zum jährlichen Sparerpauschbetrag können Kapitalerträge in Deutschland ohne Abzug von Abgeltungssteuer vereinnahmt werden. Der Freistellungsauftrag muss aktiv bei der Depotbank hinterlegt werden. Individuelle Steuerauswirkungen bitte mit einem Steuerberater klären.',
  },

  // G
  {
    term: 'Gebühren (Order- und Depotgebühren)',
    letter: 'G',
    category: 'kosten',
    short: 'Kosten für die Ausführung von Orders und die Verwahrung von Wertpapieren.',
    long: 'Ordergebühren fallen pro Kauf oder Verkauf an, Depotgebühren sind laufende Verwahrentgelte. Auch Spreads, Fremdkosten der Börse und Fondskosten (TER) fließen in die Gesamtbelastung ein.',
  },

  // H
  {
    term: 'Hebel',
    letter: 'H',
    category: 'risiko',
    short: 'Verstärkung von Kursbewegungen bei Derivaten und gehebelten Produkten.',
    long: 'Hebelprodukte (z. B. Optionsscheine, Zertifikate mit Hebel, CFDs) bilden Kursbewegungen überproportional ab. Sie erhöhen sowohl Gewinn- als auch Verlustpotenzial — bis hin zum Totalverlust und darüber hinaus.',
  },
  {
    term: 'Hauptversammlung',
    letter: 'H',
    category: 'anlageklassen',
    short: 'Jährliche Versammlung der Aktionäre eines Unternehmens.',
    long: 'Auf der Hauptversammlung stimmen Aktionäre über zentrale Themen ab: Gewinnverwendung, Entlastung von Vorstand und Aufsichtsrat, Kapitalmaßnahmen. Je Aktie besteht in der Regel eine Stimme.',
  },

  // I
  {
    term: 'Index',
    letter: 'I',
    category: 'markt',
    short: 'Kennzahl, die die Wertentwicklung einer definierten Gruppe von Wertpapieren abbildet.',
    long: 'Indizes wie DAX, S&P 500 oder MSCI World fassen die Kurse ihrer Mitglieder nach einer festen Methodik zusammen. Sie sind selbst nicht investierbar — dafür braucht es ein Produkt wie einen ETF.',
  },
  {
    term: 'Inflation',
    letter: 'I',
    category: 'grundlagen',
    short: 'Anhaltender Anstieg des allgemeinen Preisniveaus.',
    long: 'Inflation reduziert die Kaufkraft von Geld. Für Anleger relevant ist die reale Rendite — also die nominale Rendite abzüglich der Inflationsrate.',
  },
  {
    term: 'IPO — Börsengang',
    letter: 'I',
    category: 'markt',
    short: 'Erstmaliges öffentliches Angebot von Aktien eines Unternehmens.',
    long: 'Beim Initial Public Offering wird eine Aktie erstmals an einer Börse gehandelt. IPOs bieten Chancen, gehen aber mit besonderen Preisbildungs- und Zuteilungsrisiken einher.',
  },
  {
    term: 'ISIN',
    letter: 'I',
    category: 'markt',
    short: 'Internationale, 12-stellige Kennnummer eines Wertpapiers.',
    long: 'Die ISIN (International Securities Identification Number) identifiziert Wertpapiere eindeutig — z. B. DE0007164600. Sie ist der zuverlässigste Suchbegriff im Depot und beim Broker.',
  },

  // K
  {
    term: 'KGV — Kurs-Gewinn-Verhältnis',
    letter: 'K',
    category: 'kennzahlen',
    short: 'Aktienkurs geteilt durch den Gewinn je Aktie.',
    long: 'Das KGV zeigt, wie viele Jahresgewinne der Aktienkurs beträgt. Es dient als grobe Bewertungskennzahl — vergleichbar wird es aber erst innerhalb derselben Branche und über Zeit.',
    example: 'KGV 15 bedeutet: Bei gleichem Gewinn wäre der Kaufpreis in 15 Jahren „verdient".',
  },
  {
    term: 'Kupon',
    letter: 'K',
    category: 'anlageklassen',
    short: 'Regelmäßige Zinszahlung einer Anleihe.',
    long: 'Der Nominalzins (Kupon) wird auf den Nennwert einer Anleihe berechnet und meist jährlich oder halbjährlich ausgezahlt. Die tatsächliche Rendite hängt zusätzlich vom Kaufkurs ab.',
  },

  // L
  {
    term: 'Limit-Order',
    letter: 'L',
    category: 'orderarten',
    short: 'Kauf- oder Verkaufsauftrag mit Preisobergrenze bzw. -untergrenze.',
    long: 'Eine Limit-Order wird nur ausgeführt, wenn der Marktpreis das gesetzte Limit erreicht oder besser ist. Vorteil: Preiskontrolle. Nachteil: Sie kann teilweise oder gar nicht ausgeführt werden.',
    example: 'Kauf-Limit 50 € bedeutet: Es wird höchstens zu 50 € pro Stück gekauft.',
  },
  {
    term: 'Liquidität',
    letter: 'L',
    category: 'markt',
    short: 'Maß dafür, wie schnell ein Wertpapier ohne größere Preisabschläge gehandelt werden kann.',
    long: 'Hohe Liquidität bedeutet enger Spread und großes Handelsvolumen. Illiquide Titel können zu ungünstigen Kursen führen — vor allem in Stressphasen.',
  },
  {
    term: 'Leerverkauf',
    letter: 'L',
    category: 'risiko',
    short: 'Verkauf eines geliehenen Wertpapiers in der Erwartung fallender Kurse.',
    long: 'Beim Leerverkauf wird ein Papier verkauft, das man nicht besitzt, sondern geliehen hat. Es wird später zu (hoffentlich) niedrigeren Kursen zurückgekauft. Das Verlustpotenzial ist theoretisch unbegrenzt.',
  },

  // M
  {
    term: 'Market-Order',
    letter: 'M',
    category: 'orderarten',
    short: 'Sofortige Ausführung zum nächstverfügbaren Marktpreis.',
    long: 'Eine Market-Order (Bestens/Billigst) wird ohne Preislimit ausgeführt. Vorteil: schnelle Ausführung. Nachteil: Der tatsächliche Ausführungskurs kann in volatilen Phasen deutlich vom Anzeigekurs abweichen.',
  },
  {
    term: 'Marktkapitalisierung',
    letter: 'M',
    category: 'kennzahlen',
    short: 'Börsenwert eines Unternehmens (Aktienkurs × Anzahl Aktien).',
    long: 'Die Marktkapitalisierung ist der Wert, den der Markt einem Unternehmen aktuell zumisst. Sie wird häufig zur Klassifizierung in Small-, Mid- und Large Cap verwendet.',
  },
  {
    term: 'MSCI World',
    letter: 'M',
    category: 'markt',
    short: 'Aktienindex mit rund 1.500 Titeln aus 23 entwickelten Industrieländern.',
    long: 'Der MSCI World gilt als eine der bekanntesten Referenzen für globale Aktienstrategien in Industrieländern. Schwellenländer sind nicht enthalten — dafür gibt es den MSCI Emerging Markets.',
  },

  // N
  {
    term: 'NAV — Nettoinventarwert',
    letter: 'N',
    category: 'kennzahlen',
    short: 'Rechnerischer Wert eines Fondsanteils zum Bewertungsstichtag.',
    long: 'Der NAV (Net Asset Value) ergibt sich aus dem Wert aller Fondsbestände minus Verbindlichkeiten, geteilt durch die Zahl der Anteile. Er ist die Basis für Ausgabe- und Rücknahmepreise.',
  },
  {
    term: 'Nennwert',
    letter: 'N',
    category: 'anlageklassen',
    short: 'Der auf einem Wertpapier ausgewiesene Ausgangswert.',
    long: 'Bei Anleihen ist der Nennwert der Betrag, der bei Fälligkeit zurückgezahlt wird und auf den sich der Zinskupon bezieht. Der Marktkurs kann darüber oder darunter liegen.',
  },

  // O
  {
    term: 'Orderbuch',
    letter: 'O',
    category: 'markt',
    short: 'Übersicht aller offenen Kauf- und Verkaufsaufträge eines Wertpapiers.',
    long: 'Im Orderbuch werden alle limitierten Order nach Preis und Zeit sortiert. Es zeigt die tatsächliche Marktbreite und den aktuellen Spread.',
  },
  {
    term: 'OTC — Over the Counter',
    letter: 'O',
    category: 'markt',
    short: 'Außerbörslicher Handel direkt zwischen zwei Vertragspartnern.',
    long: 'OTC-Handel findet außerhalb geregelter Börsen statt, häufig mit einem Market Maker. Die Preisqualität kann sich vom Börsenkurs unterscheiden — deshalb Referenzkurs vergleichen.',
  },

  // P
  {
    term: 'Portfolio',
    letter: 'P',
    category: 'grundlagen',
    short: 'Gesamtheit aller Vermögensanlagen eines Anlegers.',
    long: 'Ein Portfolio umfasst z. B. Aktien, Anleihen, Fonds, Immobilien und Bankguthaben. Zusammensetzung und Gewichtung folgen idealerweise Anlageziel, Anlagehorizont und Risikotragfähigkeit.',
  },
  {
    term: 'Prospekt',
    letter: 'P',
    category: 'grundlagen',
    short: 'Rechtlich vorgeschriebenes Informationsdokument zu einem Wertpapier oder Fonds.',
    long: 'Der Verkaufsprospekt enthält Anlagestrategie, Kosten, Chancen und Risiken. Vor jedem Erstkauf sollte er — zusammen mit den wesentlichen Anlegerinformationen (KID/PRIIP) — gelesen werden.',
  },

  // R
  {
    term: 'Rebalancing',
    letter: 'R',
    category: 'risiko',
    short: 'Wiederherstellung der ursprünglich geplanten Portfoliogewichtung.',
    long: 'Wenn Anlageklassen unterschiedlich stark steigen, verschiebt sich die Gewichtung. Beim Rebalancing wird zurück zur Ziel-Allokation gebracht — antizyklisch, das heißt Gewinner werden reduziert, Verlierer erhöht.',
  },
  {
    term: 'Rendite',
    letter: 'R',
    category: 'risiko',
    short: 'Prozentuale Wertentwicklung einer Kapitalanlage pro Zeitraum.',
    long: 'Rendite umfasst Kursveränderungen sowie Ausschüttungen (Dividenden, Zinsen). Sie ist stets im Verhältnis zum eingegangenen Risiko und zur Inflation zu bewerten (Realrendite).',
  },
  {
    term: 'Risiko',
    letter: 'R',
    category: 'risiko',
    short: 'Möglichkeit, dass die tatsächliche Rendite von der erwarteten abweicht.',
    long: 'Zu den relevanten Risiken zählen u. a. Marktrisiko, Kursrisiko, Wechselkursrisiko, Bonitätsrisiko, Liquiditätsrisiko und operatives Risiko. Kein Kapitalmarktprodukt ist frei von Risiko.',
  },

  // S
  {
    term: 'Sondervermögen',
    letter: 'S',
    category: 'anlageklassen',
    short: 'Rechtsstatus, der Anlegervermögen bei Insolvenz der Verwaltung schützt.',
    long: 'Fonds- und Depotwerte sind als Sondervermögen vom Vermögen der verwaltenden Gesellschaft getrennt. Bei einer Insolvenz fallen sie nicht in die Insolvenzmasse.',
  },
  {
    term: 'Sparplan',
    letter: 'S',
    category: 'grundlagen',
    short: 'Regelmäßiger Kauf eines Wertpapiers mit gleichbleibendem Betrag.',
    long: 'Sparpläne sind ein disziplinierter, kostengünstiger Einstieg. Sie folgen dem Cost-Average-Prinzip und funktionieren typischerweise ab kleinen Monatsraten.',
  },
  {
    term: 'Spread',
    letter: 'S',
    category: 'kosten',
    short: 'Differenz zwischen Geld- (Bid) und Briefkurs (Ask).',
    long: 'Der Spread ist ein impliziter Handelskostenblock — je enger, desto günstiger. Er hängt von Liquidität, Handelszeit und Handelsplatz ab.',
  },
  {
    term: 'Stop-Loss-Order',
    letter: 'S',
    category: 'orderarten',
    short: 'Verkaufsauftrag, der bei Erreichen eines Auslösekurses zur Market-Order wird.',
    long: 'Stop-Loss dient der Begrenzung von Verlusten oder der Absicherung von Gewinnen. Achtung: Nach Auslösung wird bestens ausgeführt — der tatsächliche Kurs kann bei Kurslücken (Gaps) deutlich abweichen.',
    example: 'Stop-Loss 90 €: Fällt der Kurs auf 90 €, wird zur nächstverfügbaren Notierung verkauft.',
  },
  {
    term: 'Stop-Limit-Order',
    letter: 'S',
    category: 'orderarten',
    short: 'Kombination aus Stop-Auslöser und anschließendem Preislimit.',
    long: 'Nach Erreichen des Stop-Kurses wird eine Limit-Order aktiv. Vorteil: Schutz vor extremen Ausführungskursen. Nachteil: In Stressphasen kann die Order unausgeführt bleiben.',
  },

  // T
  {
    term: 'TER — Gesamtkostenquote',
    letter: 'T',
    category: 'kosten',
    short: 'Jährliche laufende Kosten eines Fonds in Prozent des Fondsvermögens.',
    long: 'Die Total Expense Ratio umfasst Management-, Verwaltungs- und Vertriebskosten — nicht jedoch Transaktions- und Ausgabeaufschläge. Sie wird im Anteilskurs bereits abgezogen.',
  },
  {
    term: 'Thesaurierend',
    letter: 'T',
    category: 'anlageklassen',
    short: 'Fondsart, bei der Erträge automatisch wieder angelegt werden.',
    long: 'Thesaurierende Fonds legen Zinsen, Dividenden und andere Erträge im Fondsvermögen wieder an — es findet keine laufende Ausschüttung statt. Steuerlich gelten in Deutschland Vorabpauschale und Teilfreistellungen.',
  },
  {
    term: 'Trailing-Stop',
    letter: 'T',
    category: 'orderarten',
    short: 'Stop-Order, deren Auslöser dem Kurs bei Gewinnen automatisch nachgezogen wird.',
    long: 'Ein Trailing-Stop wird in festem Prozent- oder Absolutabstand mitgezogen, sobald der Kurs steigt — und bleibt stehen, wenn der Kurs fällt. So werden Gewinne dynamisch abgesichert.',
  },

  // V
  {
    term: 'Volatilität',
    letter: 'V',
    category: 'risiko',
    short: 'Maß der Kursschwankung eines Wertpapiers.',
    long: 'Volatilität wird meist als annualisierte Standardabweichung angegeben. Höhere Volatilität bedeutet größere Schwankungsbreite — sie ist ein Risikomaß, aber kein Renditegarant.',
  },

  // W
  {
    term: 'Watchlist',
    letter: 'W',
    category: 'markt',
    short: 'Persönliche Beobachtungsliste ausgewählter Wertpapiere.',
    long: 'Auf der Watchlist verfolgen Anleger Kandidaten, ohne investiert zu sein. Sie hilft dabei, Kaufentscheidungen mit Distanz zu treffen und emotionsgesteuerte Reaktionen zu vermeiden.',
  },
  {
    term: 'WKN',
    letter: 'W',
    category: 'markt',
    short: 'Deutsche 6-stellige Wertpapierkennnummer.',
    long: 'Die WKN identifiziert ein Wertpapier im deutschsprachigen Raum eindeutig. International wird die 12-stellige ISIN bevorzugt.',
  },

  // X
  {
    term: 'Xetra',
    letter: 'X',
    category: 'markt',
    short: 'Elektronisches Handelssystem der Deutschen Börse.',
    long: 'Xetra ist der Referenzhandelsplatz für viele deutsche Aktien und ETFs. Die Kursbildung dort dient häufig als Vergleichs­grundlage für andere Handelsplätze.',
  },

  // Y
  {
    term: 'Yield (Rendite auf Anleihen)',
    letter: 'Y',
    category: 'kennzahlen',
    short: 'Effektive Rendite einer Anleihe unter Berücksichtigung von Kurs und Restlaufzeit.',
    long: 'Die Yield to Maturity (YTM) beziffert die Rendite, wenn eine Anleihe bis Fälligkeit gehalten wird — bei konstantem Wiederanlagezins. Sie ist die zentrale Vergleichskennzahl im Zinsmarkt.',
  },

  // Z
  {
    term: 'Zeichnung',
    letter: 'Z',
    category: 'markt',
    short: 'Verbindlicher Kaufantrag für ein neu emittiertes Wertpapier.',
    long: 'Wer bei einem IPO oder einer Anleiheemission zeichnet, gibt einen Kaufauftrag im Rahmen der Emission ab. Zuteilungen können bei Überzeichnung eingeschränkt sein.',
  },
  {
    term: 'Zinsstruktur',
    letter: 'Z',
    category: 'markt',
    short: 'Verlauf der Zinssätze über verschiedene Laufzeiten.',
    long: 'Die Zinsstrukturkurve zeigt, welche Zinsen für kurze bis lange Laufzeiten am Markt gelten. Sie ist ein wichtiges Signal für Anleiheanleger und die konjunkturelle Erwartungshaltung.',
  },
  {
    term: 'Zertifikat',
    letter: 'Z',
    category: 'anlageklassen',
    short: 'Schuldverschreibung einer Bank, die die Wertentwicklung eines Basiswerts abbildet.',
    long: 'Zertifikate sind rechtlich Anleihen — Anleger tragen daher stets das Emittentenrisiko. Die Auszahlungsstruktur wird von der Bank definiert und kann sehr komplex sein.',
  },
];

export const BOERSEN_ABC_LETTERS = Array.from(
  new Set(BOERSEN_ABC.map((t) => t.letter)),
).sort();

export const BOERSEN_ABC_COUNT = BOERSEN_ABC.length;
