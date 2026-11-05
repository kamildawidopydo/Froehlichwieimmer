/** @typedef {{ value: string, label: string }} ProductInquiryOption */
/** @typedef {{ id: string, prompt: string, options: ProductInquiryOption[] }} ProductInquiryQuestion */
/** @typedef {'aktien'|'anleihen'|'fonds'|'tagesgeld'|'festgeld'|'flexgeld'} ProductInquiryKey */

const VOLUME = {
  id: 'volume',
  prompt: 'Wie hoch ist Ihr geplantes Anlagevolumen?',
  options: [
    { value: 'lt10k', label: 'Unter 10.000 €' },
    { value: '10k50k', label: '10.000 – 50.000 €' },
    { value: '50k100k', label: '50.000 – 100.000 €' },
    { value: 'gt100k', label: 'Über 100.000 €' },
  ],
};

/** @type {Record<ProductInquiryKey, ProductInquiryQuestion[]>} */
export const productInquiryQuestions = {
  aktien: [
    VOLUME,
    { id: 'horizon', prompt: 'Welcher Anlagehorizont passt am ehesten?', options: [
      { value: 'lt1y', label: 'Unter 1 Jahr' },
      { value: '1y3y', label: '1 – 3 Jahre' },
      { value: '3y7y', label: '3 – 7 Jahre' },
      { value: 'gt7y', label: 'Über 7 Jahre' },
    ] },
    { id: 'experience', prompt: 'Wie schätzen Sie Ihre Erfahrung mit Aktien und dem Aktienmarkt ein?', options: [
      { value: 'none', label: 'Keine Erfahrung' },
      { value: 'low', label: 'Gering' },
      { value: 'mid', label: 'Mittel' },
      { value: 'high', label: 'Sehr erfahren' },
    ] },
    { id: 'volatility', prompt: 'Wie viel Kursschwankung am Aktienmarkt sind Sie bereit zu akzeptieren?', options: [
      { value: 'very_low', label: 'Sehr wenig' },
      { value: 'moderate', label: 'Moderat' },
      { value: 'high', label: 'Hoch' },
      { value: 'very_high', label: 'Sehr hoch' },
    ] },
    { id: 'liquidity', prompt: 'Wie wichtig ist Ihnen die kurzfristige Verfügbarkeit Ihres Aktien-Depotvermögens?', options: [
      { value: 'immediate', label: 'Sehr wichtig (täglich)' },
      { value: 'within12m', label: 'Innerhalb von 12 Monaten' },
      { value: 'long_term', label: 'Erst ab 3+ Jahren relevant' },
    ] },
    { id: 'goal', prompt: 'Was ist Ihr Hauptziel mit Aktien?', options: [
      { value: 'growth', label: 'Vermögensaufbau' },
      { value: 'income', label: 'Einkommen / Dividenden' },
      { value: 'spec', label: 'Kurzfristige Chancen' },
      { value: 'esg', label: 'Nachhaltigkeit (ESG) wichtig' },
    ] },
  ],
  anleihen: [
    VOLUME,
    { id: 'duration', prompt: 'Welche Laufzeit bevorzugen Sie typischerweise?', options: [
      { value: 'lt1y', label: 'Bis 1 Jahr' },
      { value: '1y3y', label: '1 – 3 Jahre' },
      { value: '3y7y', label: '3 – 7 Jahre' },
      { value: 'gt7y', label: 'Über 7 Jahre / unsicher' },
    ] },
    { id: 'credit', prompt: 'Welches Emittenten-Risiko (Bonität) kommt für Sie in Frage?', options: [
      { value: 'gov_ig', label: 'Staatsanleihen / Investment Grade' },
      { value: 'corp_ig', label: 'Unternehmensanleihen Investment Grade' },
      { value: 'hy_ok', label: 'High Yield grundsätzlich akzeptabel' },
      { value: 'unsure', label: 'Unsicher – Beratung erwünscht' },
    ] },
    { id: 'price_risk', prompt: 'Wie wichtig ist Ihnen Stabilität des Kurses vor Fälligkeit?', options: [
      { value: 'very_important', label: 'Sehr wichtig (Kapitalerhalt)' },
      { value: 'tradeoff', label: 'Akzeptabel bei höherer Rendite' },
      { value: 'hold_maturity', label: 'Halten bis Fälligkeit – Kurs schwankt weniger' },
    ] },
    { id: 'diversification', prompt: 'Wie möchten Sie streuen?', options: [
      { value: 'broad', label: 'Breit über viele Namen / Laufzeiten' },
      { value: 'concentrated', label: 'Bewusst wenige Positionen' },
      { value: 'unsure', label: 'Noch unklar' },
    ] },
    { id: 'goal', prompt: 'Was ist Ihr Hauptziel mit Anleihen?', options: [
      { value: 'coupon', label: 'Regelmäßige Zinsen' },
      { value: 'preserve', label: 'Kapitalerhalt' },
      { value: 'return', label: 'Rendite bei kontrolliertem Risiko' },
      { value: 'retirement', label: 'Vorsorge / ruhestandsnahe Allokation' },
    ] },
  ],
  fonds: [
    { id: 'goal', prompt: 'Was ist Ihr Hauptziel mit Fonds oder ETFs?', options: [
      { value: 'growth', label: 'Langfristiger Vermögensaufbau' },
      { value: 'retirement', label: 'Altersvorsorge' },
      { value: 'income', label: 'Regelmäßige Ausschüttungen' },
      { value: 'balanced', label: 'Ausgewogene Vermögensstruktur' },
    ] },
    { id: 'horizon', prompt: 'Welcher Anlagehorizont passt am ehesten?', options: [
      { value: 'lt3y', label: 'Unter 3 Jahre' },
      { value: '3y5y', label: '3 – 5 Jahre' },
      { value: '5y10y', label: '5 – 10 Jahre' },
      { value: 'gt10y', label: 'Über 10 Jahre' },
    ] },
    VOLUME,
    { id: 'investment_mode', prompt: 'Wie möchten Sie investieren?', options: [
      { value: 'lump_sum', label: 'Einmalanlage' },
      { value: 'savings_plan', label: 'Sparplan (monatlich)' },
      { value: 'both', label: 'Einmalanlage und Sparplan' },
      { value: 'unsure', label: 'Noch offen – Beratung erwünscht' },
    ] },
    { id: 'risk_tolerance', prompt: 'Welche Schwankungen akzeptieren Sie orientierend?', options: [
      { value: 'very_low', label: 'Sehr wenig – Stabilität steht im Vordergrund' },
      { value: 'moderate', label: 'Moderate Schwankungen sind in Ordnung' },
      { value: 'high', label: 'Auch stärkere Schwankungen für langfristige Chancen' },
      { value: 'unsure', label: 'Noch nicht sicher' },
    ] },
    { id: 'experience', prompt: 'Welche Erfahrung haben Sie mit Fonds oder ETFs?', options: [
      { value: 'none', label: 'Keine Erfahrung' },
      { value: 'low', label: 'Erste Erfahrungen' },
      { value: 'mid', label: 'Erfahren' },
      { value: 'high', label: 'Sehr erfahren' },
    ] },
  ],
  tagesgeld: [
    VOLUME,
    { id: 'purpose', prompt: 'Welcher Zweck steht beim Tagesgeld im Vordergrund?', options: [
      { value: 'reserve', label: 'Notgroschen / Reserve' },
      { value: 'park', label: 'Kurzfristige Parkposition' },
      { value: 'planned', label: 'Geplante größere Ausgabe in absehbarer Zeit' },
      { value: 'stable', label: 'Sichere Verzinsung ohne Kursschwankungen' },
    ] },
    { id: 'existing_customer', prompt: 'Handelt es sich um eine neue oder bestehende Anlage?', options: [
      { value: 'new', label: 'Neuanlage / Neukunde' },
      { value: 'existing', label: 'Bestehende Kundenbeziehung ausbauen' },
      { value: 'switch', label: 'Wechsel von einer anderen Bank' },
    ] },
    { id: 'bank_switch', prompt: 'Sind Sie offen für wechselnde Bank-Angebote, um Top-Zinsen zu nutzen?', options: [
      { value: 'yes', label: 'Ja, für bessere Konditionen' },
      { value: 'house', label: 'Bevorzugt Hausbank / bestehende Beziehung' },
      { value: 'neutral', label: 'Neutral' },
    ] },
    { id: 'priority', prompt: 'Was ist Ihnen bei einem Tagesgeld besonders wichtig?', options: [
      { value: 'rate', label: 'Möglichst hoher Zins' },
      { value: 'bonus', label: 'Attraktiver Neukundenbonus' },
      { value: 'safety', label: 'Einlagensicherung im EU-Raum' },
      { value: 'service', label: 'Einfache Kontoführung' },
    ] },
    { id: 'time_horizon', prompt: 'Wie lange möchten Sie das Geld voraussichtlich parken?', options: [
      { value: 'lt3m', label: 'Bis 3 Monate' },
      { value: '3m12m', label: '3 – 12 Monate' },
      { value: 'gt12m', label: 'Über 12 Monate' },
      { value: 'unsure', label: 'Noch unklar' },
    ] },
  ],
  festgeld: [
    VOLUME,
    { id: 'duration', prompt: 'Welche Laufzeit käme für Sie in Frage?', options: [
      { value: '3to12m', label: '3 – 12 Monate' },
      { value: '1to3y', label: '1 – 3 Jahre' },
      { value: '3to5y', label: '3 – 5 Jahre' },
      { value: 'gt5y', label: 'Über 5 Jahre' },
    ] },
    { id: 'purpose', prompt: 'Welcher Zweck steht beim Festgeld im Vordergrund?', options: [
      { value: 'stable', label: 'Planbare Verzinsung ohne Schwankungen' },
      { value: 'ladder', label: 'Laufzeitenleiter aufbauen' },
      { value: 'preserve', label: 'Kapitalerhalt' },
      { value: 'retirement', label: 'Ruhestandsnahe Anlage' },
    ] },
    { id: 'rate_vs_flex', prompt: 'Was wiegt beim Festgeld schwerer?', options: [
      { value: 'rate', label: 'Möglichst hoher Zins, auch mit längerer Bindung' },
      { value: 'flex', label: 'Kürzere Bindung ist mir wichtig' },
      { value: 'balanced', label: 'Ausgewogene Mischung' },
    ] },
    { id: 'bank_switch', prompt: 'Sind Sie offen für europäische Banken mit attraktiven Konditionen?', options: [
      { value: 'yes', label: 'Ja, im EU-Einlagensicherungsraum' },
      { value: 'de_only', label: 'Bevorzugt deutsche Banken' },
      { value: 'neutral', label: 'Neutral – Beratung erwünscht' },
    ] },
    { id: 'existing_customer', prompt: 'Handelt es sich um eine neue oder bestehende Anlage?', options: [
      { value: 'new', label: 'Neuanlage / Neukunde' },
      { value: 'rollover', label: 'Ablaufendes Festgeld verlängern' },
      { value: 'switch', label: 'Wechsel von einer anderen Bank' },
    ] },
  ],
  flexgeld: [
    VOLUME,
    { id: 'priority', prompt: 'Was ist Ihnen bei einem Flexgeld besonders wichtig?', options: [
      { value: 'balance', label: 'Ausgewogene Mischung aus Zins und Verfügbarkeit' },
      { value: 'access', label: 'Möglichst schnelle Verfügbarkeit' },
      { value: 'rate', label: 'Möglichst hoher Zins bei etwas Bindung' },
      { value: 'bonus', label: 'Attraktiver Neukundenbonus' },
    ] },
    { id: 'time_horizon', prompt: 'Wie lange möchten Sie das Geld voraussichtlich parken?', options: [
      { value: 'lt3m', label: 'Bis 3 Monate' },
      { value: '3m12m', label: '3 – 12 Monate' },
      { value: '1y3y', label: '1 – 3 Jahre' },
      { value: 'unsure', label: 'Noch unklar' },
    ] },
    { id: 'purpose', prompt: 'Welcher Zweck steht im Vordergrund?', options: [
      { value: 'reserve', label: 'Rücklage mit Zinsvorteil' },
      { value: 'planned', label: 'Geplante Ausgabe in absehbarer Zeit' },
      { value: 'park', label: 'Zwischenparken größerer Beträge' },
      { value: 'stable', label: 'Planbare Verzinsung mit Flexibilität' },
    ] },
    { id: 'existing_customer', prompt: 'Handelt es sich um eine neue oder bestehende Anlage?', options: [
      { value: 'new', label: 'Neuanlage / Neukunde' },
      { value: 'existing', label: 'Bestehende Beziehung ausbauen' },
      { value: 'switch', label: 'Wechsel von einer anderen Bank' },
    ] },
    { id: 'bank_switch', prompt: 'Sind Sie offen für wechselnde Bank-Angebote?', options: [
      { value: 'yes', label: 'Ja, für bessere Konditionen' },
      { value: 'house', label: 'Bevorzugt Hausbank / bestehende Beziehung' },
      { value: 'neutral', label: 'Neutral' },
    ] },
  ],
};

/** @type {Record<ProductInquiryKey, { title: string; kicker: string; description: string; descriptionExtra?: string }>} */
export const productInquiryCards = {
  aktien: {
    kicker: 'Aktien',
    title: 'Aktienanlage',
    description: 'Langfristiger Vermögensaufbau mit Einzelaktien und kontrolliertem Risiko — unverbindliche Erstinformation.',
    descriptionExtra:
      'Bei Beantwortung unserer Fragen und im Rahmen der Erstprüfung können wir je nach Anlagevolumen und Angebot einen Abschlag von bis zu 4 % anbieten.',
  },
  anleihen: {
    kicker: 'Anleihen',
    title: 'Festverzinsliche Wertpapiere',
    description: 'Zins und Laufzeit im Fokus — Bonität und Streuung sauber einordnen.',
    descriptionExtra:
      'Je nach Emission und Anlagevolumen bieten wir ausgewählte Anleihen mit reduzierten Erwerbskosten, attraktiven Konditionen oder institutionellen Zugängen an.',
  },
  fonds: {
    kicker: 'Fonds & ETFs',
    title: 'Fonds- und ETF-Anlage',
    description: 'Breite Streuung über viele Titel — Einmalanlage oder Sparplan, aktive Fonds oder ETFs.',
    descriptionExtra:
      'Zugang zu ausgewählten Fonds und ETFs mit reduziertem Ausgabeaufschlag sowie persönlicher Unterstützung bei Auswahl und Portfoliostruktur.',
  },
  tagesgeld: {
    kicker: 'Tagesgeld',
    title: 'Tagesgeld — täglich verfügbar',
    description: 'Sichere Verzinsung ohne Bindung — flexibler Zugriff auf Ihr Guthaben.',
    descriptionExtra:
      'Je nach Bank profitieren Neukunden von attraktiven Sonderzinsen und Bonusaktionen von bis zu 300 €.',
  },
  festgeld: {
    kicker: 'Festgeld',
    title: 'Festgeld — planbar verzinst',
    description: 'Fester Zins über die gesamte Laufzeit — Konditionen und Bonität einordnen.',
    descriptionExtra:
      'Je nach Bank und Laufzeit bieten wir Zugang zu ausgewählten Festgeld-Angeboten aus dem EU-Einlagensicherungsraum.',
  },
  flexgeld: {
    kicker: 'Flexgeld',
    title: 'Flexgeld — Zins und Flexibilität',
    description: 'Mischform aus Tages- und Festgeld — Zinsvorteil mit gewisser Flexibilität.',
    descriptionExtra:
      'Je nach Anbieter erhalten Neukunden attraktive Konditionen und Bonusaktionen von bis zu 300 €.',
  },
};

export const productInquiryLabels = {
  aktien: 'Aktien',
  anleihen: 'Anleihen',
  fonds: 'Fonds / ETFs',
  tagesgeld: 'Tagesgeld',
  festgeld: 'Festgeld',
  flexgeld: 'Flexgeld',
};

/** Erfolgsansicht nach Absenden des Kurzfragebogens */
export const productInquirySuccessCopy = {
  aktien: {
    title: 'Ihre Aktien-Anfrage ist bei uns',
    body: 'Wir haben Ihre Antworten erhalten und prüfen persönlich, welche Aktienstrategie und Konditionen zu Ihrem Profil passen.',
    followUp: 'Unser Beratungsteam meldet sich werktags in der Regel innerhalb von 1–2 Werktagen — mit einer unverbindlichen Ersteinschätzung zu Ihren Möglichkeiten.',
  },
  anleihen: {
    title: 'Ihre Anleihen-Anfrage ist bei uns',
    body: 'Wir haben Ihre Angaben erhalten und schauen gezielt, welche festverzinslichen Wertpapiere zu Laufzeit, Bonität und Anlagevolumen passen.',
    followUp: 'Persönlich und unverbindlich melden wir uns werktags in der Regel innerhalb von 1–2 Werktagen bei Ihnen.',
  },
  fonds: {
    title: 'Ihre Fonds-/ETF-Anfrage ist bei uns',
    body: 'Wir haben Ihre Wünsche zu Zielen, Horizont und Anlageart erhalten und suchen gezielt passende Fonds- oder ETF-Bausteine für Sie heraus.',
    followUp: 'Unser Beratungsteam meldet sich werktags in der Regel innerhalb von 1–2 Werktagen mit einer unverbindlichen Ersteinschätzung.',
  },
  tagesgeld: {
    title: 'Ihre Tagesgeld-Anfrage ist bei uns',
    body: 'Wir haben Ihre Angaben zu Volumen und Verwendungszweck erhalten und suchen ein passendes Tagesgeld-Angebot mit attraktiven Konditionen.',
    followUp: 'Unser Team meldet sich werktags in der Regel innerhalb von 1–2 Werktagen — mit konkreten Zinssätzen und den nächsten Schritten.',
  },
  festgeld: {
    title: 'Ihre Festgeld-Anfrage ist bei uns',
    body: 'Wir haben Ihre Wünsche zu Laufzeit und Anlagebetrag erhalten und stellen passende Festgeld-Angebote aus dem EU-Einlagensicherungsraum zusammen.',
    followUp: 'Unser Team meldet sich werktags in der Regel innerhalb von 1–2 Werktagen — mit konkreten Konditionen und den nächsten Schritten.',
  },
  flexgeld: {
    title: 'Ihre Flexgeld-Anfrage ist bei uns',
    body: 'Wir haben Ihre Angaben erhalten und suchen ein passendes Flexgeld-Angebot mit ausgewogenem Zins-/Verfügbarkeits-Verhältnis.',
    followUp: 'Unser Team meldet sich werktags in der Regel innerhalb von 1–2 Werktagen — mit konkreten Konditionen und den nächsten Schritten.',
  },
};
