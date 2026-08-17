/** @typedef {{ value: string, label: string }} ProductInquiryOption */
/** @typedef {{ id: string, prompt: string, options: ProductInquiryOption[] }} ProductInquiryQuestion */

/** @type {Record<'aktien' | 'anleihen' | 'spargeld', ProductInquiryQuestion[]>} */
export const productInquiryQuestions = {
  aktien: [
    {
      id: 'volume',
      prompt: 'Wie hoch ist Ihr geplantes Anlagevolumen?',
      options: [
        { value: 'lt10k', label: 'Unter 10.000 €' },
        { value: '10k50k', label: '10.000 – 50.000 €' },
        { value: '50k100k', label: '50.000 – 100.000 €' },
        { value: 'gt100k', label: 'Über 100.000 €' },
      ],
    },
    {
      id: 'horizon',
      prompt: 'Welcher Anlagehorizont passt am ehesten?',
      options: [
        { value: 'lt1y', label: 'Unter 1 Jahr' },
        { value: '1y3y', label: '1 – 3 Jahre' },
        { value: '3y7y', label: '3 – 7 Jahre' },
        { value: 'gt7y', label: 'Über 7 Jahre' },
      ],
    },
    {
      id: 'experience',
      prompt: 'Wie schätzen Sie Ihre Erfahrung mit Aktien und dem Aktienmarkt ein?',
      options: [
        { value: 'none', label: 'Keine Erfahrung' },
        { value: 'low', label: 'Gering' },
        { value: 'mid', label: 'Mittel' },
        { value: 'high', label: 'Sehr erfahren' },
      ],
    },
    {
      id: 'volatility',
      prompt: 'Wie viel Kursschwankung am Aktienmarkt sind Sie bereit zu akzeptieren?',
      options: [
        { value: 'very_low', label: 'Sehr wenig' },
        { value: 'moderate', label: 'Moderat' },
        { value: 'high', label: 'Hoch' },
        { value: 'very_high', label: 'Sehr hoch' },
      ],
    },
    {
      id: 'liquidity',
      prompt: 'Wie wichtig ist Ihnen die kurzfristige Verfügbarkeit Ihres Aktien-Depotvermögens?',
      options: [
        { value: 'immediate', label: 'Sehr wichtig (täglich)' },
        { value: 'within12m', label: 'Innerhalb von 12 Monaten' },
        { value: 'long_term', label: 'Erst ab 3+ Jahren relevant' },
      ],
    },
    {
      id: 'goal',
      prompt: 'Was ist Ihr Hauptziel mit Aktien?',
      options: [
        { value: 'growth', label: 'Vermögensaufbau' },
        { value: 'income', label: 'Einkommen / Dividenden' },
        { value: 'spec', label: 'Kurzfristige Chancen' },
        { value: 'esg', label: 'Nachhaltigkeit (ESG) wichtig' },
      ],
    },
  ],
  anleihen: [
    {
      id: 'volume',
      prompt: 'Wie hoch ist Ihr geplantes Anlagevolumen?',
      options: [
        { value: 'lt10k', label: 'Unter 10.000 €' },
        { value: '10k50k', label: '10.000 – 50.000 €' },
        { value: '50k100k', label: '50.000 – 100.000 €' },
        { value: 'gt100k', label: 'Über 100.000 €' },
      ],
    },
    {
      id: 'duration',
      prompt: 'Welche Laufzeit bevorzugen Sie typischerweise?',
      options: [
        { value: 'lt1y', label: 'Bis 1 Jahr' },
        { value: '1y3y', label: '1 – 3 Jahre' },
        { value: '3y7y', label: '3 – 7 Jahre' },
        { value: 'gt7y', label: 'Über 7 Jahre / unsicher' },
      ],
    },
    {
      id: 'credit',
      prompt: 'Welches Emittenten-Risiko (Bonität) kommt für Sie in Frage?',
      options: [
        { value: 'gov_ig', label: 'Staatsanleihen / Investment Grade' },
        { value: 'corp_ig', label: 'Unternehmensanleihen Investment Grade' },
        { value: 'hy_ok', label: 'High Yield grundsätzlich akzeptabel' },
        { value: 'unsure', label: 'Unsicher – Beratung erwünscht' },
      ],
    },
    {
      id: 'price_risk',
      prompt: 'Wie wichtig ist Ihnen Stabilität des Kurses vor Fälligkeit?',
      options: [
        { value: 'very_important', label: 'Sehr wichtig (Kapitalerhalt)' },
        { value: 'tradeoff', label: 'Akzeptabel bei höherer Rendite' },
        { value: 'hold_maturity', label: 'Halten bis Fälligkeit – Kurs schwankt weniger' },
      ],
    },
    {
      id: 'diversification',
      prompt: 'Wie möchten Sie streuen?',
      options: [
        { value: 'broad', label: 'Breit über viele Namen / Laufzeiten' },
        { value: 'concentrated', label: 'Bewusst wenige Positionen' },
        { value: 'unsure', label: 'Noch unklar' },
      ],
    },
    {
      id: 'goal',
      prompt: 'Was ist Ihr Hauptziel mit Anleihen?',
      options: [
        { value: 'coupon', label: 'Regelmäßige Zinsen' },
        { value: 'preserve', label: 'Kapitalerhalt' },
        { value: 'return', label: 'Rendite bei kontrolliertem Risiko' },
        { value: 'retirement', label: 'Vorsorge / ruhestandsnahe Allokation' },
      ],
    },
  ],
  spargeld: [
    {
      id: 'volume',
      prompt: 'Wie hoch ist Ihr geplantes Volumen?',
      options: [
        { value: 'lt10k', label: 'Unter 10.000 €' },
        { value: '10k50k', label: '10.000 – 50.000 €' },
        { value: '50k100k', label: '50.000 – 100.000 €' },
        { value: 'gt100k', label: 'Über 100.000 €' },
      ],
    },
    {
      id: 'product_mix',
      prompt: 'Welche Verfügbarkeit bevorzugen Sie?',
      options: [
        { value: 'tagesgeld', label: 'Täglich verfügbar (Tagesgeld)' },
        { value: 'festgeld', label: 'Fest verzinst mit Laufzeit (Festgeld)' },
        { value: 'flex', label: 'Flexgeld / Mischform' },
        { value: 'unsure', label: 'Noch unsicher – Beratung erwünscht' },
      ],
    },
    {
      id: 'fest_duration',
      prompt: 'Falls Festgeld: welche Bindung käme infrage?',
      options: [
        { value: 'na', label: 'Nicht relevant / primär Tagesgeld' },
        { value: '3to12m', label: '3 – 12 Monate' },
        { value: '1to3y', label: '1 – 3 Jahre' },
        { value: 'gt3y', label: 'Über 3 Jahre' },
      ],
    },
    {
      id: 'purpose',
      prompt: 'Welcher Zweck steht im Vordergrund?',
      options: [
        { value: 'reserve', label: 'Notgroschen / Reserve' },
        { value: 'park', label: 'Kurzfristige Parkposition' },
        { value: 'planned', label: 'Geplante größere Ausgabe in absehbarer Zeit' },
        { value: 'stable', label: 'Planbare Verzinsung ohne Kursschwankungen' },
      ],
    },
    {
      id: 'rate_vs_flex',
      prompt: 'Was wiegt schwerer?',
      options: [
        { value: 'rate', label: 'Möglichst hoher Zins, auch mit Bindung' },
        { value: 'flex', label: 'Flexibilität wichtiger als Spitzenzins' },
        { value: 'balanced', label: 'Ausgewogene Mischung' },
      ],
    },
    {
      id: 'bank_switch',
      prompt: 'Sind Sie grundsätzlich offen für wechselnde Bank-Angebote?',
      options: [
        { value: 'yes', label: 'Ja, für bessere Konditionen' },
        { value: 'house', label: 'Bevorzugt Hausbank / bestehende Beziehung' },
        { value: 'neutral', label: 'Neutral' },
      ],
    },
  ],
};

/** @type {Record<'aktien' | 'anleihen' | 'spargeld', { title: string; kicker: string; description: string; descriptionExtra?: string }>} */
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
  spargeld: {
    kicker: 'Einlagen',
    title: 'Tagesgeld, Festgeld & Flexgeld',
    description: 'Einlagensicherheit und planbare Zinsen — passende Verfügbarkeit finden.',
    descriptionExtra:
      'Je nach Bank, Laufzeit und Anlagevolumen profitieren Neukunden von attraktiven Sonderkonditionen und Bonusaktionen von bis zu 300 €.',
  },
};

export const productInquiryLabels = {
  aktien: 'Aktien',
  anleihen: 'Anleihen',
  spargeld: 'Tagesgeld / Festgeld / Flexgeld',
};

/** Erfolgsansicht nach Absenden des Kurzfragebogens */
export const productInquirySuccessCopy = {
  aktien: {
    title: 'Ihre Aktien-Anfrage ist bei uns',
    body:
      'Wir haben Ihre Antworten erhalten und prüfen persönlich, welche Aktienstrategie und Konditionen zu Ihrem Profil passen.',
    followUp:
      'Unser Beratungsteam meldet sich werktags in der Regel innerhalb von 1–2 Werktagen — mit einer unverbindlichen Ersteinschätzung zu Ihren Möglichkeiten.',
  },
  anleihen: {
    title: 'Ihre Anleihen-Anfrage ist bei uns',
    body:
      'Wir haben Ihre Angaben erhalten und schauen gezielt, welche festverzinslichen Wertpapiere zu Laufzeit, Bonität und Anlagevolumen passen.',
    followUp:
      'Persönlich und unverbindlich melden wir uns werktags in der Regel innerhalb von 1–2 Werktagen bei Ihnen.',
  },
  spargeld: {
    title: 'Ihre Einlagen-Anfrage ist bei uns',
    body:
      'Wir haben Ihre Wünsche zu Verfügbarkeit, Laufzeit und Anlagebetrag erhalten und suchen passende Tages-, Fest- oder Flexgeld-Angebote für Sie heraus.',
    followUp:
      'Unser Team meldet sich werktags in der Regel innerhalb von 1–2 Werktagen — mit konkreten Konditionen und den nächsten Schritten.',
  },
};
