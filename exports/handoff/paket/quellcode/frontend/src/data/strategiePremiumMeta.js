/**
 * Session 80.22 — Strategy Knowledge Center Meta.
 *
 * Ergänzt die 12 Premium-Topics um Knowledge-Center-Felder:
 *   keyTakeaways · newsKeywords · terms · deepLearn · conversationQuestions
 *
 * Additiv zu strategiePremiumContent.js + strategiePremiumContentExtra.js.
 * Wird in strategiePremiumContent.js in `findPremium` gemerged.
 */

/**
 * @typedef {Object} PremiumMeta
 * @property {string[]} keyTakeaways
 * @property {string[]} newsKeywords
 * @property {{term: string, body: string}[]} terms
 * @property {{q: string, a: string}[]} deepLearn
 * @property {string[]} conversationQuestions
 */

/** @type {Record<string, PremiumMeta>} */
export const premiumMeta = {
  // ─── Value Investing ───
  'value-investing': {
    keyTakeaways: [
      'Der Kurs an der Börse und der wirtschaftliche Wert eines Unternehmens sind nicht immer dasselbe.',
      'Fundamentaldaten wie Cashflow, Verschuldung und Marktposition liefern harte Anhaltspunkte.',
      'Eine günstige Bewertung allein ist kein gutes Investment — die Qualität muss stimmen.',
      'Value braucht Geduld: Bewertungslücken schließen sich oft erst über Jahre.',
      'Value ist meist ein Baustein neben anderen Stilen — nicht der einzige Weg.',
    ],
    newsKeywords: ['bewertung', 'aktien', 'kgv', 'gewinne', 'unternehmen', 'fundamentaldaten', 'value', 'dividenden'],
    terms: [
      { term: 'Innerer Wert', body: 'Geschätzter „wahrer" Wert eines Unternehmens auf Basis seiner wirtschaftlichen Kennzahlen — unabhängig vom aktuellen Börsenkurs.' },
      { term: 'Sicherheitsmarge', body: 'Puffer zwischen berechnetem inneren Wert und Kaufkurs. Soll Bewertungsfehler und Überraschungen abfedern.' },
      { term: 'KGV', body: 'Kurs-Gewinn-Verhältnis. Setzt den Aktienkurs ins Verhältnis zum Gewinn je Aktie — eine der ältesten Bewertungskennzahlen.' },
      { term: 'Free Cashflow', body: 'Der Betrag, der nach Investitionen tatsächlich frei verfügbar ist. Robuster Indikator für die Ertragsqualität eines Unternehmens.' },
      { term: 'Value-Falle', body: 'Ein niedrig bewertetes Unternehmen, dessen Kurs aus strukturellen Gründen zu Recht gefallen ist — die Bewertung setzt sich nicht durch.' },
    ],
    deepLearn: [
      { q: 'Was bedeutet innerer Wert konkret?', a: 'Ein aus Bilanzdaten, Cashflows und Ertragsaussichten geschätzter Wert des Unternehmens. Je nach Methodik (DCF, Kennzahlenvergleiche) fällt er unterschiedlich aus — aber immer nachvollziehbar begründet.' },
      { q: 'Welche Kennzahlen sind für die Auswahl zentral?', a: 'KGV, Kurs-Buchwert-Verhältnis, Free-Cashflow-Rendite, Eigenkapitalrendite und Verschuldungsgrad. Kein einzelner Wert reicht — Value bewertet das Gesamtbild.' },
      { q: 'Wann sollte man verkaufen?', a: 'Wenn der Markt den inneren Wert einpreist oder die zugrundeliegende These durch neue Fakten bricht. Reine Kursschwäche ohne fundamentale Verschlechterung ist kein Verkaufsgrund.' },
      { q: 'Value oder Dividendenstrategie?', a: 'Beide fokussieren auf Substanz statt Momentum, aber unterschiedlich: Value auf die Bewertung, Dividenden auf verlässliche Ausschüttungen. Beides lässt sich kombinieren.' },
    ],
    conversationQuestions: [
      'Welche Rolle könnte Value Investing in meiner aktuellen Portfolio-Struktur spielen?',
      'Wie sollte ich Value gegenüber Wachstumsstilen gewichten?',
      'Über welche Fonds/ETFs oder Einzelwerte lässt sich der Ansatz für mich umsetzen?',
      'Welche typischen Value-Fallen sind aktuell besonders zu beobachten?',
    ],
  },

  // ─── Dividendenstrategien ───
  dividendenstrategien: {
    keyTakeaways: [
      'Dividenden sind ein Teil der Gesamtrendite — nicht die ganze Rendite.',
      'Eine hohe Dividendenrendite ist nicht automatisch attraktiv.',
      'Ausschüttungsquote und Bilanzqualität sagen mehr aus als die absolute Ausschüttung.',
      'Kontinuierlich steigende Dividenden gelten häufig als Qualitätssignal.',
      'Sektorkonzentration passiert bei Dividendenstrategien schneller, als viele erwarten.',
    ],
    newsKeywords: ['dividenden', 'ausschüttung', 'aktien', 'unternehmensgewinne', 'quartalsbericht', 'dax', 'sektor'],
    terms: [
      { term: 'Dividendenrendite', body: 'Verhältnis von jährlicher Ausschüttung zum aktuellen Kurs. Erste Orientierung — allein selten aussagekräftig.' },
      { term: 'Ausschüttungsquote', body: 'Anteil des Gewinns, der als Dividende ausgezahlt wird. Sehr hohe Werte deuten auf begrenzten Spielraum in schwachen Jahren hin.' },
      { term: 'Dividendenwachstum', body: 'Kontinuierliche Steigerung der Ausschüttungen über Jahre — häufig ein Zeichen robuster Geschäftsmodelle.' },
      { term: 'Total Return', body: 'Kursveränderung plus wiederangelegte Ausschüttungen. Der Maßstab, an dem Dividendenstrategien tatsächlich zu messen sind.' },
      { term: 'Dividendenfalle', body: 'Eine hohe Rendite, die durch Kursverfall oder eine nicht tragfähige Ausschüttung entstanden ist.' },
    ],
    deepLearn: [
      { q: 'Was ist eine gesunde Ausschüttungsquote?', a: 'Faustregel: nachhaltig meist unter 70–80 % des Gewinns. Bei stabilen Geschäftsmodellen wie Versorgern sind höhere Quoten möglich — sollten aber begründet sein.' },
      { q: 'Ist ein Dividenden-ETF besser als Einzelaktien?', a: 'Ein ETF diversifiziert automatisch, bindet Sie aber an das Indexkonzept. Einzelwerte erlauben mehr Kontrolle — verlangen aber Zeit und Wissen.' },
      { q: 'Wie steuerpflichtig sind Dividenden?', a: 'In Deutschland gilt die Abgeltungsteuer plus Solidaritätszuschlag. Ausländische Quellensteuern können anteilig angerechnet werden. Die konkrete Wirkung hängt vom Depot und Wohnsitz ab.' },
    ],
    conversationQuestions: [
      'Passt eine Dividendenstrategie zu meiner aktuellen Lebensphase?',
      'Wie diversifiziere ich Sektor- und Länderrisiken sinnvoll?',
      'Sollte ich Ausschüttungen wiederanlegen oder für laufende Ausgaben nutzen?',
      'Welche ETFs oder Einzelwerte kämen für mich in Betracht?',
    ],
  },

  // ─── ESG ───
  'nachhaltige-investments-esg': {
    keyTakeaways: [
      'ESG ist kein einzelner Ansatz — es umfasst Ausschluss, Best-in-Class, Integration und Impact.',
      'Nicht das Label eines Fonds entscheidet, sondern die zugrundeliegende Methodik.',
      'ESG-Ratings unterschiedlicher Anbieter kommen zu abweichenden Einschätzungen.',
      'SFDR-Kategorien geben Orientierung, ersetzen aber keine eigene Prüfung.',
      'Nachhaltigkeit ersetzt keine Diversifikation — Konzentrationsrisiken bleiben real.',
    ],
    newsKeywords: ['esg', 'nachhaltigkeit', 'klima', 'energiewende', 'sfdr', 'greenwashing', 'regulierung', 'grün'],
    terms: [
      { term: 'Ausschlusskriterien', body: 'Definierte Branchen oder Praktiken werden aus dem Anlageuniversum entfernt — etwa Waffen oder fossile Rohstoffe.' },
      { term: 'Best-in-Class', body: 'Investition in die aus ESG-Sicht führenden Unternehmen einer Branche — auch dann, wenn die Branche insgesamt umstritten ist.' },
      { term: 'ESG-Integration', body: 'Nachhaltigkeitskennzahlen fließen in die reguläre Fundamentalanalyse ein, ohne strikte Auswahlgrenzen.' },
      { term: 'SFDR', body: 'EU-Verordnung zur Offenlegung von Nachhaltigkeitsansätzen. Ordnet Fonds in Art. 6, 8 oder 9 ein.' },
      { term: 'Greenwashing', body: 'Nachhaltige Etiketten ohne substanzielle Grundlage. Prospekt, Methodik und Portfolio-Zusammensetzung entscheiden.' },
    ],
    deepLearn: [
      { q: 'Was unterscheidet Art. 8 von Art. 9?', a: 'Art. 8 berücksichtigt ESG-Aspekte in der Auswahl. Art. 9 verfolgt ein nachhaltiges Anlageziel als Kern. Beides sind Kategorien, keine Qualitätsgarantie.' },
      { q: 'Warum weichen ESG-Ratings voneinander ab?', a: 'Anbieter gewichten Kennzahlen unterschiedlich und nutzen verschiedene Datenquellen. Ein Blick in die Methodikdokumente ist aufschlussreich.' },
      { q: 'Ist ESG teurer als klassisches Investieren?', a: 'ESG-ETFs kosten häufig geringfügig mehr als breite Standard-ETFs. Der Unterschied liegt meist im niedrigen einstelligen Basispunkte-Bereich.' },
    ],
    conversationQuestions: [
      'Welche Nachhaltigkeitsprioritäten sind für mich wichtig — Klima, Soziales, Governance?',
      'Soll ESG in meinem Depot Kern oder Ergänzung sein?',
      'Wie prüfe ich, ob ein Fonds seine Nachhaltigkeitsansprüche wirklich einlöst?',
      'Wie viel Diversifikation kann ich zugunsten von ESG opfern?',
    ],
  },

  // ─── Impact Investing ───
  'impact-investing': {
    keyTakeaways: [
      'Impact Investing verlangt eine dokumentierte Wirkungsabsicht — nicht nur ESG-Kennzahlen.',
      'Additionalität ist der zentrale Maßstab: Entsteht Wirkung, die es ohne dieses Kapital nicht gäbe?',
      'Wirkung braucht Kennzahlen — Marketing-Sprache reicht nicht.',
      'Liquidität variiert stark: Green Bonds handelbar, Direktbeteiligungen häufig gebunden.',
      'Zielkonflikte zwischen Rendite und Wirkung sind möglich — Transparenz entscheidet.',
    ],
    newsKeywords: ['impact', 'nachhaltigkeit', 'green bonds', 'klima', 'sozial', 'wirkung', 'sdg', 'infrastruktur'],
    terms: [
      { term: 'Intentionalität', body: 'Die dokumentierte Absicht, mit einem Investment gezielt Wirkung zu erzeugen — nicht als Nebenprodukt der Rendite.' },
      { term: 'Additionalität', body: 'Wirkung entsteht durch dieses Kapital, die ohne dieses Investment nicht möglich gewesen wäre.' },
      { term: 'IRIS+', body: 'Etabliertes Rahmenwerk zur strukturierten Wirkungsmessung im Impact Investing.' },
      { term: 'SDG', body: 'Sustainable Development Goals der Vereinten Nationen — häufige Referenz für Wirkungsthemen.' },
      { term: 'Green Bond', body: 'Anleihe, deren Emissionsmittel gezielt in klimarelevante Vorhaben fließen — mit externer Prüfung.' },
    ],
    deepLearn: [
      { q: 'Wie erkenne ich seriöses Impact Investing?', a: 'Anhaltspunkte: dokumentierte Wirkungsabsicht, definierte Kennzahlen, externe Prüfstellen, transparente Berichterstattung, klarer Bezug zu Rahmenwerken wie IRIS+ oder SDGs.' },
      { q: 'Ist Impact wie eine Spende?', a: 'Nein. Kapital wird angelegt, nicht abgegeben. Die Rendite bleibt Teil des Investments — sie tritt neben eine definierte Wirkung.' },
      { q: 'Was ist Impact-Washing?', a: 'Der Begriff Impact wird verwendet, ohne dass eine dokumentierte Wirkungsabsicht oder ernsthafte Messung besteht. Prospekte und Prüfstellen zeigen den Unterschied.' },
    ],
    conversationQuestions: [
      'Welches Wirkungsthema ist für mich persönlich zentral?',
      'Über welche Vehikel möchte ich einsteigen — Green Bonds, Themenfonds, direkt?',
      'Welche Liquidität ist für mich akzeptabel?',
      'Wie prüfe ich Additionalität und Berichte des Anbieters?',
    ],
  },

  // ─── Vermögensschutz ───
  vermoegensschutz: {
    keyTakeaways: [
      'Vermögensschutz ist keine Anlageklasse, sondern eine strukturelle Perspektive.',
      'Diversifikation über Anlageklassen, Regionen und Währungen ist der wirksamste Hebel.',
      'Liquidität schützt vor Zwangsverkäufen in Krisen — und schafft Handlungsspielraum.',
      'Konzentrationsrisiken entstehen häufig ungewollt und wachsen still im Hintergrund.',
      'Auch vermeintlich sichere Anlagen tragen Risiken — nur andere als Aktien.',
    ],
    newsKeywords: ['risiko', 'krise', 'diversifikation', 'liquidität', 'anleihen', 'schutz', 'zentralbank', 'gold'],
    terms: [
      { term: 'Diversifikation', body: 'Streuung über Anlageklassen, Regionen und Sektoren, um die Wirkung einzelner Fehlentwicklungen zu begrenzen.' },
      { term: 'Klumpenrisiko', body: 'Übermäßige Konzentration eines Vermögens auf eine Position, Branche oder Region.' },
      { term: 'Liquiditätsreserve', body: 'Kurzfristig verfügbare Mittel — meist 3–12 Monatsausgaben — die vom eigentlichen Anlagevermögen getrennt sind.' },
      { term: 'Gegenparteirisiko', body: 'Risiko, dass der Vertragspartner (Bank, Emittent) seinen Verpflichtungen nicht nachkommt.' },
      { term: 'Sondervermögen', body: 'Kunden-Wertpapiere im Depot gehören rechtlich dem Anleger, nicht der Bank — auch im Insolvenzfall.' },
    ],
    deepLearn: [
      { q: 'Was ist eine sinnvolle Liquiditätsreserve?', a: 'Häufig 3–12 Monatsausgaben, abhängig von Einkommensstabilität, Verpflichtungen und Lebenssituation. Zu viel Cash verliert real durch Inflation.' },
      { q: 'Sind Immobilien automatisch Vermögensschutz?', a: 'Sie können Teil davon sein. Zugleich tragen sie Konzentrations-, Kosten- und Liquiditätsrisiken. Als einzige Säule sind sie riskant.' },
      { q: 'Wie schütze ich mich vor Bankinsolvenz?', a: 'Wertpapiere im Depot sind Sondervermögen. Bargeld auf Konten ist EU-weit bis 100.000 Euro pro Bank und Kunde geschützt — größere Beträge sinnvoll verteilen.' },
    ],
    conversationQuestions: [
      'Wo sehen Sie in meinem Vermögen aktuell Klumpenrisiken?',
      'Wie sollte meine Liquiditätsreserve dimensioniert sein?',
      'Welche Anlagen erscheinen sicher, tragen aber tatsächlich Risiken?',
      'Wie stelle ich sicher, dass Angehörige im Ernstfall handlungsfähig sind?',
    ],
  },

  // ─── Inflationsschutz ───
  inflationsschutz: {
    keyTakeaways: [
      'Reale Rendite ist entscheidend — nicht der Nominalzins allein.',
      'Es gibt kein einzelnes Produkt, das Inflation zuverlässig ausgleicht.',
      'Übergroße Cash-Bestände verlieren in Inflationsphasen deutlich an Kaufkraft.',
      'Sehr lange Anleihen reagieren stärker auf Zinsänderungen als kurze Laufzeiten.',
      'Sachwerte reagieren zeitlich versetzt — nicht automatisch schützend.',
    ],
    newsKeywords: ['inflation', 'ezb', 'zinsen', 'kaufkraft', 'preise', 'rohstoffe', 'anleihen', 'geldpolitik'],
    terms: [
      { term: 'Nominale Rendite', body: 'Ausgewiesene Rendite ohne Inflationsbereinigung — der reine Zahlenwert.' },
      { term: 'Reale Rendite', body: 'Nominalrendite abzüglich Inflation. Der eigentliche Zuwachs an Kaufkraft.' },
      { term: 'Inflationsindexierte Anleihe', body: 'Anleihe, deren Nennwert und Kupons an die Inflation gekoppelt sind — ein Baustein, kein Allheilmittel.' },
      { term: 'Laufzeitrisiko', body: 'Kursempfindlichkeit einer Anleihe gegenüber Zinsänderungen. Sehr lange Laufzeiten sind besonders sensibel.' },
      { term: 'Kaufkraft', body: 'Wie viel man mit einem Geldbetrag tatsächlich kaufen kann — schrumpft durch Inflation kontinuierlich.' },
    ],
    deepLearn: [
      { q: 'Sind Aktien ein Inflationsschutz?', a: 'Langfristig haben breit gestreute Aktienindizes historisch reale Renditen geliefert. Kurzfristig können sie in Inflationsphasen stark schwanken — Garantien gibt es nicht.' },
      { q: 'Ist Gold ein Inflationsschutz?', a: 'Gold reagiert historisch uneinheitlich auf Inflation. In manchen Phasen wirkt es stabilisierend, in anderen nicht. Als kleiner Baustein möglich — nicht als tragende Säule.' },
      { q: 'Sollte ich mein Bargeld reduzieren?', a: 'Nicht pauschal. Eine Liquiditätsreserve bleibt sinnvoll. Übergroße Bestände verlieren jedoch real — die Frage ist die Höhe, nicht das Ob.' },
    ],
    conversationQuestions: [
      'Wie hoch ist meine reale Rendite aktuell?',
      'Wie sollte meine Notreserve dimensioniert sein?',
      'Welche Bausteine könnten Kaufkraftverluste in meinem Depot dämpfen?',
      'Wie sind meine Anleihen im Laufzeitprofil aufgestellt?',
    ],
  },

  // ─── Vermögensaufbau ───
  vermoegensaufbau: {
    keyTakeaways: [
      'Zeit im Markt schlägt Timing des Marktes — regelmäßiges Investieren wirkt stark.',
      'Sparrate, Kosten und Anlagemix sind die drei zentralen Hebel.',
      '1 % Kostenunterschied pro Jahr kann über 30 Jahre ein Viertel des Endwerts kosten.',
      'Cost-Average wirkt am stärksten, wenn man in schwachen Phasen dabeibleibt.',
      'Ohne Liquiditätsreserve besteht das Risiko, in Krisen aus Zwang verkaufen zu müssen.',
    ],
    newsKeywords: ['etf', 'sparplan', 'weltindex', 'aktienmarkt', 'sparen', 'zinseszins', 'anlage', 'depot'],
    terms: [
      { term: 'Zinseszinseffekt', body: 'Zinsen und Erträge werden reinvestiert und generieren wiederum Erträge — der wichtigste Hebel langfristigen Aufbaus.' },
      { term: 'Cost-Average-Effekt', body: 'Regelmäßige Käufe glätten Einstiegsentscheidungen: In schwachen Phasen kauft man mehr Anteile, in starken weniger.' },
      { term: 'Rebalancing', body: 'Rückführen der Anlagequoten zur ursprünglichen Struktur, wenn einzelne Bausteine stark gestiegen sind.' },
      { term: 'Welt-ETF', body: 'Breit gestreuter Aktien-ETF über mehrere hundert bis tausende Unternehmen — häufige Basis eines Aufbaus.' },
      { term: 'TER', body: 'Total Expense Ratio: die jährlichen laufenden Kosten eines Fonds. Wirkt linear und dauerhaft auf die Nettorendite.' },
    ],
    deepLearn: [
      { q: 'Wie viel sollte ich monatlich sparen?', a: 'Häufige Orientierung: 10–20 % des Nettoeinkommens, kombiniert mit einer soliden Liquiditätsreserve. Die konkrete Höhe hängt vom Ziel und Lebensstandard ab.' },
      { q: 'Sparplan oder Einmalanlage?', a: 'Statistisch schneidet die Einmalanlage bei langem Horizont häufig besser ab. Verhaltenspsychologisch ist der Sparplan robuster — man bleibt eher dabei.' },
      { q: 'Wie oft sollte ich mein Depot prüfen?', a: 'Ein bis zweimal jährlich reicht meist aus. Häufigeres Prüfen führt oft zu emotionalen Entscheidungen — nicht zu besseren Ergebnissen.' },
    ],
    conversationQuestions: [
      'Passt meine aktuelle Sparrate zu meinem Ziel und Zeithorizont?',
      'Welche Kostenquote hat mein aktuelles Depot — real, nach allen Positionen?',
      'Wie sinnvoll ist mein aktueller Anlagemix?',
      'Wann sollte ich Rebalancing durchführen?',
    ],
  },

  // ─── Altersvorsorge ───
  altersvorsorge: {
    keyTakeaways: [
      'Kein Baustein trägt allein — gesetzlich, betrieblich und privat gehören zusammengedacht.',
      'Die Versorgungslücke ist der Startpunkt jeder ernsthaften Ruhestandsplanung.',
      'Frühe Planung eröffnet Handlungsspielräume, die später schwer wiederherstellbar sind.',
      'Die Auszahlungsphase ist strategisch anspruchsvoller als das Sparen — sie braucht eigene Regeln.',
      'Langlebigkeitsrisiko lässt sich durch lebenslange Rentenbausteine abdecken.',
    ],
    newsKeywords: ['rente', 'altersvorsorge', 'rentenversicherung', 'ruhestand', 'demografie', 'bav', 'inflation'],
    terms: [
      { term: 'Versorgungslücke', body: 'Differenz zwischen gewünschtem und erwartetem monatlichen Einkommen im Ruhestand.' },
      { term: 'Drei-Säulen-Modell', body: 'Gesetzliche Rente, betriebliche Altersvorsorge und private Vorsorge — gemeinsam betrachtet.' },
      { term: 'Langlebigkeitsrisiko', body: 'Das Risiko, länger zu leben als geplant — und länger Einkommen zu benötigen.' },
      { term: 'Nachgelagerte Besteuerung', body: 'Beiträge werden in der Ansparphase steuerlich entlastet, die Rente später besteuert.' },
      { term: 'Entnahmephase', body: 'Phase, in der aus dem Vorsorgekapital laufende Zahlungen entnommen werden — mit eigener Logik.' },
    ],
    deepLearn: [
      { q: 'Wie zuverlässig ist die Renteninformation?', a: 'Sie ist eine Prognose auf Basis heutiger Regeln und Beitragsjahre. Sie zeigt eine belastbare Größenordnung, keine exakte spätere Zahl.' },
      { q: 'Wie plant man die Entnahmephase?', a: 'Kern: Liquiditätsreserve für schwache Marktphasen, strukturierte Entnahmereihenfolge, Wahl zwischen Kapital und lebenslanger Rente, Steuern und Sozialabgaben.' },
      { q: 'Ab welchem Alter sollte man starten?', a: 'So früh wie möglich. Je länger die Ansparphase, desto wirksamer der Zinseszins — jedes Jahr zählt spürbar.' },
    ],
    conversationQuestions: [
      'Wie groß ist meine reale Versorgungslücke?',
      'Wie kombiniere ich gesetzliche, betriebliche und private Vorsorge sinnvoll?',
      'Welche Rolle spielt Langlebigkeitsschutz für mich?',
      'Wie strukturiere ich später die Entnahmephase?',
    ],
  },

  // ─── Private Rentenvorsorge ───
  'private-rentenvorsorge': {
    keyTakeaways: [
      'Private Rentenvorsorge ergänzt gesetzliche und betriebliche Ansprüche — sie ersetzt sie nicht.',
      'Depot oder Rentenversicherung: beide Wege haben klare Vor- und Nachteile.',
      'Effektivkosten sind bei Versicherungslösungen häufig wichtiger als die Bruttorendite.',
      'Kapitalauszahlung ist flexibel, lebenslange Rente adressiert das Langlebigkeitsrisiko.',
      'Sparraten sollten regelmäßig überprüft und an Lebenssituation angepasst werden.',
    ],
    newsKeywords: ['rente', 'private vorsorge', 'etf', 'rentenversicherung', 'sparplan', 'ruhestand'],
    terms: [
      { term: 'Effektivkostenquote', body: 'Kennzahl, die alle laufenden Kosten einer Versicherungslösung in eine vergleichbare Prozentzahl übersetzt.' },
      { term: 'Kapitalwahlrecht', body: 'Recht des Versicherten, bei Rentenbeginn zwischen Einmalzahlung und lebenslanger Rente zu wählen.' },
      { term: 'Fondsgebundene Rentenversicherung', body: 'Rentenversicherung, deren Anlagekern in Fonds investiert wird — Marktchancen mit Versicherungsmantel.' },
      { term: 'Halbeinkünfteverfahren', body: 'Steuerliche Sonderregel für bestimmte Versicherungslösungen bei sehr langer Laufzeit und Auszahlung ab Alter 62.' },
      { term: 'Aufschubdauer', body: 'Zeitraum zwischen Vertragsbeginn und tatsächlichem Rentenbeginn — beeinflusst Steuer und Rentenhöhe.' },
    ],
    deepLearn: [
      { q: 'Ist eine Rentenversicherung teurer als ein ETF-Sparplan?', a: 'In vielen Fällen ja. Zugleich enthält die Versicherung Zusatzleistungen wie lebenslange Rente. Die Frage ist, welchen Wert diese Zusätze für Sie haben.' },
      { q: 'Was ist besser: Einmalauszahlung oder Rente?', a: 'Beides hat seinen Platz. Einmalzahlungen sind flexibel und vererbbar; Renten decken das Langlebigkeitsrisiko. Häufig wird eine Kombination gewählt.' },
      { q: 'Ab welchem Alter lohnt sich private Vorsorge?', a: 'Grundsätzlich früh — je länger die Ansparphase, desto stärker der Zinseszins. Späterer Start erhöht die notwendige Sparrate.' },
    ],
    conversationQuestions: [
      'Passt Depot, Rentenversicherung oder eine Kombination besser zu mir?',
      'Wie hoch sind die realen Kosten meiner aktuellen Vorsorgeprodukte?',
      'Wie kombiniere ich Flexibilität und Langlebigkeitsschutz?',
      'Welche steuerlichen Effekte kann ich in meiner Situation nutzen?',
    ],
  },

  // ─── Betriebliche Altersvorsorge ───
  'betriebliche-altersvorsorge': {
    keyTakeaways: [
      'bAV ist steuerlich in der Ansparphase attraktiv — kann aber in der Rente teurer werden.',
      'Der Arbeitgeberzuschuss ist häufig der zentrale Hebel für die Wirtschaftlichkeit.',
      'Fünf Durchführungswege bestehen — sie folgen unterschiedlichen Regeln.',
      'Portabilität ist ein zentrales Thema — bei Arbeitgeberwechseln unbedingt prüfen.',
      'bAV ist eine sinnvolle Ergänzung, kein Ersatz für private Vorsorge.',
    ],
    newsKeywords: ['bav', 'betriebsrente', 'entgeltumwandlung', 'arbeitgeber', 'rente', 'pensionskasse'],
    terms: [
      { term: 'Entgeltumwandlung', body: 'Umwandlung eines Teils des Bruttogehalts in Beiträge zur bAV — steuer- und teils sozialabgabenfrei.' },
      { term: 'Direktversicherung', body: 'Klassischer Durchführungsweg der bAV: Der Arbeitgeber schließt eine Lebensversicherung zugunsten des Arbeitnehmers ab.' },
      { term: 'Pensionskasse', body: 'Von Arbeitgebern getragene Einrichtung, die betriebliche Renten leistet.' },
      { term: 'Unverfallbarkeit', body: 'Sicherung erworbener Anwartschaften auch bei Arbeitgeberwechsel — nach gesetzlichen Fristen.' },
      { term: 'Portabilität', body: 'Möglichkeit, eine bAV bei Arbeitgeberwechsel mitzunehmen oder beitragsfrei zu stellen.' },
    ],
    deepLearn: [
      { q: 'Lohnt sich bAV auch ohne Arbeitgeberzuschuss?', a: 'Meist eingeschränkt. Steuerliche Vorteile in der Ansparphase werden durch Sozialabgaben in der Rentenphase häufig relativiert. Ein Vergleich mit privater Alternative lohnt sich.' },
      { q: 'Was passiert beim Jobwechsel?', a: 'Je nach Durchführungsweg wird der Vertrag mitgenommen, fortgeführt oder beitragsfrei gestellt. Vor dem Wechsel prüfen — nicht danach.' },
      { q: 'Warum fallen auf Betriebsrenten Sozialabgaben an?', a: 'Weil sie sozialversicherungsrechtlich wie Erwerbseinkommen behandelt werden. Kranken- und Pflegeversicherungsbeiträge mindern das Netto — mit Freibeträgen.' },
    ],
    conversationQuestions: [
      'Lohnt sich der aktuelle bAV-Vertrag im Vergleich zur privaten Alternative?',
      'Welche Zuschüsse gewährt mein Arbeitgeber tatsächlich?',
      'Wie sicher ist die Portabilität meines Vertrags?',
      'Welche Wirkung hat die spätere Sozialabgabenpflicht auf meine Rente?',
    ],
  },

  // ─── Kinder ───
  'vermoegensaufbau-fuer-kinder': {
    keyTakeaways: [
      'Der Zeithorizont ist der größte Vorteil — er ist schwer nachzuholen.',
      'Depot auf Kind oder Eltern: beide Wege haben unterschiedliche rechtliche Konsequenzen.',
      'Ab Volljährigkeit verfügt das Kind frei über sein Depot.',
      'Kinderdepots sind bei vielen Anbietern besonders kostengünstig.',
      'Die letzten Jahre vor Auszahlung defensiver ausrichten — 100 % Aktien passt selten zum Ziel.',
    ],
    newsKeywords: ['kinder', 'sparen', 'kinderdepot', 'ausbildung', 'sparplan', 'etf', 'schenkung'],
    terms: [
      { term: 'Kinderdepot', body: 'Wertpapierdepot auf den Namen des Kindes — rechtlich Eigentum des Kindes, verwaltet durch die Eltern.' },
      { term: 'Freibetrag Kind', body: 'Kinder haben eigene Sparerpauschbeträge und Grundfreibeträge, die Erträge steuerlich entlasten können.' },
      { term: 'Volljährigkeit', body: 'Ab 18 Jahren volle Verfügungsgewalt des Kindes über sein Depot.' },
      { term: 'Zweckbindung', body: 'Wunsch, dass Kapital nur für bestimmte Zwecke (z. B. Ausbildung) genutzt wird — rechtlich schwer durchsetzbar.' },
      { term: 'Zeithorizont', body: 'Der größte Vorteil im Vermögensaufbau für Kinder — je länger, desto wirksamer der Zinseszins.' },
    ],
    deepLearn: [
      { q: 'Depot auf Kind oder Eltern?', a: 'Kind: nutzt Freibeträge, gehört rechtlich dem Kind — ab 18 vollständig. Eltern: bleibt in deren Verfügungsgewalt, kann jedoch steuerlich unattraktiver sein.' },
      { q: 'Was passiert, wenn ich viel einzahle?', a: 'Regelmäßige Beträge in üblicher Höhe sind meist unkritisch. Größere Übertragungen können schenkungsteuerlich relevant sein — mit qualifizierter Beratung klären.' },
      { q: 'Wie bereite ich mein Kind auf die Übergabe vor?', a: 'Frühzeitige Gespräche, gemeinsames Sichten des Depots, altersgerechte Bildung zu Sparen und Investieren. Die Übergabe wird zum letzten Schritt eines langen Prozesses.' },
    ],
    conversationQuestions: [
      'Ist ein Depot auf mein Kind oder auf mich in meiner Situation sinnvoller?',
      'Wie hoch könnte eine angemessene monatliche Sparrate sein?',
      'Wann sollte ich das Depot defensiver ausrichten?',
      'Wie bereite ich die Übergabe bei Volljährigkeit vor?',
    ],
  },

  // ─── Vermögensübertragung ───
  vermoegensuebertragung: {
    keyTakeaways: [
      'Übertragung ist mehr als Erbschaft — Schenkung, Nachfolge und Struktur zu Lebzeiten gehören dazu.',
      'Freibeträge lassen sich alle zehn Jahre erneut nutzen — frühe Planung schafft Optionen.',
      'Illiquide Vermögen wie Immobilien lassen sich nicht per Kontoauszug teilen.',
      'Familiäre Kommunikation ist häufig entscheidender als jede rechtliche Konstruktion.',
      'Testament, Vollmachten und Verwahrstellen müssen aktuell und auffindbar sein.',
    ],
    newsKeywords: ['erbschaft', 'schenkung', 'nachfolge', 'generationen', 'immobilie', 'testament', 'vermögen'],
    terms: [
      { term: 'Schenkung', body: 'Übertragung von Vermögen zu Lebzeiten — mit Freibeträgen alle zehn Jahre und klaren steuerlichen Regeln.' },
      { term: 'Pflichtteil', body: 'Gesetzlicher Mindestanspruch bestimmter Angehöriger — auch bei anderslautendem Testament.' },
      { term: 'Vorsorgevollmacht', body: 'Rechtliches Instrument, das eine Vertretung im Fall eingeschränkter Handlungsfähigkeit ermöglicht.' },
      { term: 'Berliner Testament', body: 'Häufige Testamentsform für Ehepaare, bei der der überlebende Partner zunächst Alleinerbe wird.' },
      { term: 'Nachfolgeplanung', body: 'Systematische Vorbereitung der Vermögensübergabe an die nächste Generation.' },
    ],
    deepLearn: [
      { q: 'Schenkung oder Erbschaft?', a: 'Beides hat seinen Platz. Schenkungen zu Lebzeiten nutzen Freibeträge über Zeit. Erbschaft regelt, was zu Lebzeiten nicht übertragen wurde. Die Kombination ist der Regelfall.' },
      { q: 'Ab wann sollte man planen?', a: 'So früh wie möglich, mindestens wenn Immobilien oder Unternehmensanteile im Vermögen sind. Frühe Planung schafft die meisten Handlungsspielräume.' },
      { q: 'Welche Rolle spielt Liquidität?', a: 'Eine große. Steuern und Ausgleichszahlungen sind häufig kurzfristig fällig, während Immobilien nicht sofort verkäuflich sind. Liquiditätsplanung gehört zur Struktur.' },
    ],
    conversationQuestions: [
      'Wo sehen Sie in meiner aktuellen Struktur die größten Reibungspunkte für eine Übertragung?',
      'Welche Bausteine sollten zuerst geregelt werden — Testament, Vollmachten, Dokumentation?',
      'Wie viel Liquidität sollte für den Übertragungsfall vorgehalten werden?',
      'Welche Fachleute (Anwalt, Steuerberater) sollten wir einbeziehen?',
    ],
  },
};

export const findPremiumMeta = (topicSlug) => premiumMeta[topicSlug] || null;
