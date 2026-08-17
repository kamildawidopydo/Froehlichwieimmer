import { formatComparisonMinDepositLabel } from '@/lib/comparisonDisplay';
import siteCopy from '@/data/siteCopy';

/** @typedef {'festgeld' | 'flexgeld' | 'tagesgeld'} SavingsProductSlug */

export const SAVINGS_PRODUCT_SLUGS = /** @type {const} */ (['festgeld', 'flexgeld', 'tagesgeld']);

const COMPARISON_MIN_DEPOSIT_FACT = formatComparisonMinDepositLabel();

const SHARED_DEPOSIT = siteCopy.savings.sharedDeposit;
const SHARED_TAX = siteCopy.savings.sharedTax;
const GUIDE_COPY = siteCopy.savings.guides;

/** @type {Record<SavingsProductSlug, { id: string, label: string }[]>} */
export const GUIDE_TOC_BY_SLUG = {
  festgeld: [
    { id: 'kurz-erklaert', label: 'Kurz erklärt' },
    { id: 'auf-einen-blick', label: 'Auf einen Blick' },
    { id: 'vorteile-ablauf', label: 'Vorteile & Ablauf' },
    { id: 'einlagensicherung', label: 'Einlagensicherung' },
    { id: 'steuern', label: 'Steuern' },
    { id: 'vergleich-produkte', label: 'Produktvergleich' },
    { id: 'nachteile', label: 'Nachteile & Risiken' },
    { id: 'beispiel', label: 'Beispielrechnung' },
    { id: 'checkliste', label: 'Checkliste' },
    { id: 'laufzeiten', label: 'Laufzeiten' },
    { id: 'faq', label: 'Häufige Fragen' },
  ],
  flexgeld: [
    { id: 'kurz-erklaert', label: 'Kurz erklärt' },
    { id: 'auf-einen-blick', label: 'Auf einen Blick' },
    { id: 'vorteile-ablauf', label: 'Vorteile & Ablauf' },
    { id: 'einlagensicherung', label: 'Einlagensicherung' },
    { id: 'steuern', label: 'Steuern' },
    { id: 'vergleich-produkte', label: 'Produktvergleich' },
    { id: 'nachteile', label: 'Nachteile & Risiken' },
    { id: 'beispiel', label: 'Beispielrechnung' },
    { id: 'checkliste', label: 'Checkliste' },
    { id: 'laufzeiten', label: 'Konditionen' },
    { id: 'faq', label: 'Häufige Fragen' },
  ],
  tagesgeld: [
    { id: 'kurz-erklaert', label: 'Kurz erklärt' },
    { id: 'auf-einen-blick', label: 'Auf einen Blick' },
    { id: 'vorteile-ablauf', label: 'Vorteile & Ablauf' },
    { id: 'einlagensicherung', label: 'Einlagensicherung' },
    { id: 'steuern', label: 'Steuern' },
    { id: 'vergleich-produkte', label: 'Produktvergleich' },
    { id: 'nachteile', label: 'Nachteile & Risiken' },
    { id: 'beispiel', label: 'Beispielrechnung' },
    { id: 'checkliste', label: 'Checkliste' },
    { id: 'laufzeiten', label: 'Verfügbarkeit' },
    { id: 'faq', label: 'Häufige Fragen' },
  ],
};

export const SAVINGS_PRODUCT_GUIDES = {
  festgeld: {
    slug: 'festgeld',
    pageLayout: 'classic',
    title: 'Festgeld',
    heroTitle: GUIDE_COPY.festgeld.heroTitle,
    heroLede: GUIDE_COPY.festgeld.heroLede,
    definition: GUIDE_COPY.festgeld.definition,
    cardLede: GUIDE_COPY.festgeld.cardLede,
    heroImage: '/assets/products/festgeld-hero.png',
    heroAlt: 'Paar am Alpenbahnhof — geplante Auszeit mit Festgeld',
    accent: 'primary',
    comparisonFilter: 'Festgeld',
    lifestyleImage: '/assets/products/festgeld-lifestyle.png',
    lifestyleAlt: 'Klassische europäische Bankfassade — Vertrauen und Stabilität',
    inlineImage: '/assets/products/festgeld-cta.png',
    inlineAlt: 'Tresorfach — sichere Festgeldanlage',
    keyFacts: [
      { label: 'Zinsart', value: 'Fest über Laufzeit' },
      { label: 'Verfügbarkeit', value: 'Am Laufzeitende' },
      { label: 'Einlagensicherung', value: 'bis 100.000 €', numeric: true },
      { label: 'Mindestanlage', value: COMPARISON_MIN_DEPOSIT_FACT, numeric: true },
    ],
    advantages: [
      { icon: 'percent', text: 'Fester Zinssatz über die gesamte Laufzeit — unabhängig von Marktschwankungen' },
      { icon: 'calendar', text: 'Laufzeiten oft von 3 Monaten bis 10 Jahre wählbar' },
      { icon: 'shield', text: 'EU-Einlagensicherung bis 100.000 € je Anleger und Bank' },
      { icon: 'chart', text: 'Kalkulierbare Planung für Auto, Renovierung oder Rücklagen' },
    ],
    howItWorks: [
      { step: 1, title: 'Angebot vergleichen', text: 'Zins, Laufzeit, Land der Einlagensicherung und Mindestanlage prüfen.' },
      { step: 2, title: 'Konto eröffnen', text: 'Digital mit Identifikation — Konditionen werden dokumentiert.' },
      { step: 3, title: 'Einzahlen & Zins sichern', text: 'Betrag überweisen; der vereinbarte Zinssatz gilt für die gewählte Laufzeit.' },
      { step: 4, title: 'Laufzeitende', text: 'Kapital und Zinsen werden auf das Referenzkonto zurücküberwiesen — Prolongation beachten.' },
    ],
    audience: [
      'Anleger mit klarem Zeithorizont (z. B. 12–36 Monate)',
      'Sparer, die Planbarkeit vor kurzfristiger Verfügbarkeit stellen',
      'Menschen mit mittelfristigen Zielen: Auto, Urlaub, Eigenkapital-Rücklage',
      'Konservative Anleger mit geringer Risikobereitschaft',
    ],
    drawbacks: [
      'Keine tägliche Verfügbarkeit — vorzeitige Kündigung meist ausgeschlossen oder mit Zinsverlust',
      'Zinsen bei mehrjährigen Laufzeiten oft erst am Ende fällig (Sparerpauschbetrag beachten)',
      'Automatische Verlängung kann zu niedrigeren Zinsen führen, wenn nicht rechtzeitig gekündigt',
      'Inflation kann die reale Kaufkraft der Erträge mindern',
    ],
    depositProtection: SHARED_DEPOSIT,
    taxSection: SHARED_TAX,
    prolongationNote:
      'Viele Banken verlängern Festgeld automatisch, wenn Sie nicht rechtzeitig widersprechen — oft zu dann gültigen (niedrigeren) Konditionen. Notieren Sie das Laufzeitende und prüfen Sie Verlängerungs- oder Auszahlungsoptionen frühzeitig.',
    exampleCalculation: {
      deposit: 25000,
      rate: 3.19,
      years: 1,
      label: 'Festgeld 12 Monate',
    },
    checklist: [
      'Laufzeit passt zu Ihrem finanziellen Bedarf (Geld währenddessen entbehren)',
      'Mindestanlage und Höchstbetrag der Bank geprüft',
      'Land der Einlagensicherung und Bonität der Bank verstanden',
      'Zinsgutschrift (monatlich vs. am Laufzeitende) und Steuerfolgen geklärt',
      'Prolongation / automatische Verlängerung vor Ablauf geregelt',
    ],
    notice:
      'Während der Laufzeit ist das Kapital in der Regel nicht täglich verfügbar. Konditionen und Mindestanlagen unterscheiden sich je Partnerbank.',
    termTable: [
      { term: '6 Monate', guarantee: 'gesamte Laufzeit', availability: 'am Laufzeitende' },
      { term: '12 Monate', guarantee: 'gesamte Laufzeit', availability: 'am Laufzeitende' },
      { term: '24 Monate', guarantee: 'gesamte Laufzeit', availability: 'am Laufzeitende' },
      { term: '36 Monate', guarantee: 'gesamte Laufzeit', availability: 'am Laufzeitende' },
    ],
    faq: [
      {
        q: 'Was ist Festgeld?',
        a: 'Festgeld ist eine Termineinlage: Sie legen einen Betrag für eine feste Laufzeit zu einem garantierten Zinssatz an. Im Gegensatz zum Tagesgeld ist das Geld während der Laufzeit gebunden.',
      },
      {
        q: 'Wie sicher ist Festgeld?',
        a: 'Bei EU-/EWR-Banken gilt die gesetzliche Einlagensicherung bis 100.000 € pro Person und Institut. Das Insolvenzrisiko der Bank wird dadurch für typische Anlagebeträge abgefedert — politische Risiken außerhalb der EU sollten Sie separat bewerten.',
      },
      {
        q: 'Kann ich Festgeld vorzeitig kündigen?',
        a: 'In der Regel nicht oder nur aus Kulanz mit erheblichem Zinsverlust. Planen Sie deshalb nur Geld an, das Sie bis zum Laufzeitende nicht benötigen.',
      },
      {
        q: 'Was passiert am Laufzeitende?',
        a: 'Kapital und vereinbarte Zinsen werden auf Ihr Referenzkonto überwiesen. Ohne Kündigung kann die Bank die Anlage verlängern — prüfen Sie die Bedingungen vorab.',
      },
      {
        q: 'Festgeld oder Tagesgeld — was ist besser?',
        a: 'Festgeld eignet sich für planbare mittelfristige Ziele mit höherem Zins. Tagesgeld ist für Notgroschen und kurzfristige Liquidität besser — viele Anleger kombinieren beides.',
      },
      {
        q: 'Wie werden Zinsen versteuert?',
        a: 'Zinserträge sind steuerpflichtig. Nutzen Sie den Freistellungsauftrag und prüfen Sie, ob die Bank die Abgeltungssteuer einbehält.',
      },
    ],
    bullets: [
      'Fester Zinssatz über die gesamte Laufzeit',
      'Verschiedene Laufzeiten wählbar',
      'Planbare Erträge und maximale Sicherheit',
      'Ideal für Ihre mittelfristige Planung',
    ],
    metaDescription: GUIDE_COPY.festgeld.metaDescription,
  },
  flexgeld: {
    slug: 'flexgeld',
    pageLayout: 'split',
    title: 'Flexgeld',
    heroTitle: GUIDE_COPY.flexgeld.heroTitle,
    heroLede: GUIDE_COPY.flexgeld.heroLede,
    definition: GUIDE_COPY.flexgeld.definition,
    cardLede: GUIDE_COPY.flexgeld.cardLede,
    heroImage: '/assets/products/flexgeld-hero.png',
    heroAlt: 'Großvater und Enkelin auf dem Fahrrad im Park — Flexibilität über Generationen',
    accent: 'emerald',
    comparisonFilter: 'Flexgeld',
    lifestyleImage: '/assets/products/flexgeld-lifestyle.png',
    lifestyleAlt: 'Stiller See im Norden — Ruhe und flexible Entscheidungen',
    inlineImage: '/assets/products/flexgeld-cta.png',
    inlineAlt: 'Frau am See — ruhige Momente und flexible Freiheit',
    keyFacts: [
      { label: 'Zinsart', value: 'Oft fest oder variabel' },
      { label: 'Verfügbarkeit', value: 'Nach Kündigungsfrist' },
      { label: 'Einlagensicherung', value: 'bis 100.000 €', numeric: true },
      { label: 'Mindestanlage', value: COMPARISON_MIN_DEPOSIT_FACT, numeric: true },
    ],
    advantages: [
      { icon: 'calendar', text: 'Keine feste Laufzeit wie beim klassischen Festgeld' },
      { icon: 'wallet', text: 'Ein- und Auszahlungen nach Produktbedingungen möglich' },
      { icon: 'percent', text: 'Häufig attraktivere Zinsen als reines Tagesgeld' },
      { icon: 'shield', text: 'EU-Einlagensicherung bis 100.000 € je Anleger und Bank' },
    ],
    howItWorks: [
      { step: 1, title: 'Angebote vergleichen', text: 'Zins, Kündigungsfrist, Zinsgarantie-Dauer und Mindestanlage vergleichen.' },
      { step: 2, title: 'Konto eröffnen', text: 'Online-Antrag mit Identifikation bei der Partnerbank.' },
      { step: 3, title: 'Einzahlen', text: 'Betrag anlegen — Konditionen und Fristen schriftlich bestätigen lassen.' },
      { step: 4, title: 'Verwalten', text: 'Bei Bedarf Kündigung einreichen und Frist abwarten, dann Auszahlung.' },
    ],
    audience: [
      'Anleger zwischen Liquidität und Rendite',
      'Sparer mit variablem Kapitalbedarf in den nächsten Monaten',
      'Alle, die höhere Zinsen ohne volle Festlegung suchen',
      'Personen mit größeren Rücklagen über dem reinen Notgroschen',
    ],
    drawbacks: [
      'Kündigungsfristen (z. B. 30–90 Tage) — nicht für sofortigen Zugriff geeignet',
      'Zinsen können nach Aktionphasen sinken',
      'Produktbedingungen unterscheiden sich stark zwischen Banken',
      'Nicht jede Bank bietet echtes Flexgeld an — Konditionen genau lesen',
    ],
    depositProtection: SHARED_DEPOSIT,
    taxSection: SHARED_TAX,
    prolongationNote: null,
    exampleCalculation: {
      deposit: 30000,
      rate: 3.5,
      years: 1,
      label: 'Flexgeld (Beispiel)',
    },
    checklist: [
      'Kündigungsfrist und Mindesthaltefrist verstanden',
      'Zinsgarantie-Dauer (z. B. 3 oder 12 Monate) geprüft',
      'Unterschied zu Festgeld und Tagesgeld bewusst gewählt',
      'Referenzkonto für Ein- und Auszahlungen eingerichtet',
    ],
    notice:
      'Kündigungsfristen und Zinsanpassungen sind produktabhängig. Lesen Sie die Bedingungen der jeweiligen Bank vor Abschluss.',
    termTable: [
      { term: 'Variabel', guarantee: 'laut Produktinfo', availability: 'nach Kündigungsfrist' },
      { term: '3–12 Monate', guarantee: 'oft garantiert', availability: 'mit Frist' },
      { term: '12–24 Monate', guarantee: 'oft garantiert', availability: 'mit Frist' },
      { term: '24+ Monate', guarantee: 'laut Angebot', availability: 'mit Frist' },
    ],
    faq: [
      {
        q: 'Was ist Flexgeld?',
        a: 'Flexgeld ist eine hybride Sparform: höhere Zinsen als Tagesgeld, aber mit Kündigungsfrist statt täglicher Verfügbarkeit — Details sind bankenspezifisch.',
      },
      {
        q: 'Flexgeld oder Festgeld?',
        a: 'Festgeld bietet maximale Zinsplanung für feste Laufzeiten. Flexgeld eignet sich, wenn Sie höhere Zinsen wollen, aber mit Kündigungsfrist wieder auf das Geld zugreifen möchten.',
      },
      {
        q: 'Wie lange dauert eine Auszahlung?',
        a: 'Nach Einreichung der Kündigung gilt die vertragliche Frist (häufig 30–90 Tage). Erst danach wird auf das Referenzkonto überwiesen.',
      },
      {
        q: 'Ist Flexgeld sicher?',
        a: 'Wie andere Einlagen bei EU-Banken bis 100.000 € gesetzlich abgesichert — prüfen Sie Land und Institut im Angebot.',
      },
      {
        q: 'Kann der Zinssatz sinken?',
        a: 'Ja, wenn der Zins variabel ist oder nach einer garantierten Phase keine Festschreibung mehr gilt. Achten Sie auf die Laufzeit der Zinsgarantie.',
      },
    ],
    bullets: [
      'Keine feste Laufzeit',
      'Geld flexibel ein- und auszahlen',
      'Attraktive Zinsen nutzen',
      'Ideal für flexible Pläne und Rücklagen',
    ],
    metaDescription: GUIDE_COPY.flexgeld.metaDescription,
  },
  tagesgeld: {
    slug: 'tagesgeld',
    pageLayout: 'magazine',
    title: 'Tagesgeld',
    heroTitle: GUIDE_COPY.tagesgeld.heroTitle,
    heroLede: GUIDE_COPY.tagesgeld.heroLede,
    definition: GUIDE_COPY.tagesgeld.definition,
    cardLede: GUIDE_COPY.tagesgeld.cardLede,
    heroImage: '/assets/products/tagesgeld-home-card.png',
    accent: 'sky',
    comparisonFilter: 'Tagesgeld',
    lifestyleImage: '/assets/products/tagesgeld-lifestyle.png',
    lifestyleAlt: 'Amsterdamer Grachten nach Regen — Alltag und Verfügbarkeit',
    inlineImage: '/assets/products/tagesgeld-cta.png',
    inlineAlt: 'Frau kommt mit Einkauf nach Hause — tägliche Verfügbarkeit im Alltag',
    keyFacts: [
      { label: 'Zinsart', value: 'Variabel' },
      { label: 'Verfügbarkeit', value: 'Täglich' },
      { label: 'Einlagensicherung', value: 'bis 100.000 €', numeric: true },
      { label: 'Mindestanlage', value: COMPARISON_MIN_DEPOSIT_FACT, numeric: true },
    ],
    advantages: [
      { icon: 'clock', text: 'Tägliche Verfügbarkeit — ideal für Notgroschen' },
      { icon: 'percent', text: 'Variable Zinsen, oft über Girokonto-Niveau' },
      { icon: 'wallet', text: 'Ein- und Auszahlungen jederzeit (über Referenzkonto)' },
      { icon: 'shield', text: 'EU-Einlagensicherung bis 100.000 € je Bank' },
    ],
    howItWorks: [
      { step: 1, title: 'Bank vergleichen', text: 'Effektivzins, Neukundenaktionen, Land der Einlagensicherung.' },
      { step: 2, title: 'Konto eröffnen', text: 'Online mit Identifikation — Referenzkonto (Giro) verknüpfen.' },
      { step: 3, title: 'Einzahlen', text: 'Guthaben wird laufend verzinst; Zinssatz kann sich ändern.' },
      { step: 4, title: 'Verfügen', text: 'Überweisung auf Referenzkonto — meist innerhalb von 1–2 Werktagen.' },
    ],
    audience: [
      'Notgroschen (oft 3–6 Nettomonatsgehälter empfohlen)',
      'Kurzfristige Rücklagen für geplante Ausgaben',
      'Parken von Geldern zwischen zwei Investitionen',
      'Sparer, die keine Laufzeitbindung wünschen',
    ],
    drawbacks: [
      'Zinssätze können jederzeit gesenkt werden',
      'Neukundenaktionen laufen oft nach wenigen Monaten aus',
      'Kein Zahlungsverkehr — nur über Referenzkonto',
      'Langfristig oft keine ausreichende Rendite für Vermögensaufbau allein',
    ],
    depositProtection: SHARED_DEPOSIT,
    taxSection: SHARED_TAX,
    prolongationNote: null,
    exampleCalculation: {
      deposit: 15000,
      rate: 2.78,
      years: 1,
      label: 'Tagesgeld (Beispiel)',
    },
    checklist: [
      'Effektivzins nach Aktionphase geprüft (nicht nur Neukundenzins)',
      'Referenzkonto für schnelle Überweisungen hinterlegt',
      'Freistellungsauftrag gestellt',
      'Höchstbetrag der Einlagensicherung pro Bank beachtet (max. 100.000 €)',
    ],
    notice:
      'Zinssätze können sich ändern. Prüfen Sie Neukundenaktionen, Mindestanlagen und ob Zinsen monatlich oder vierteljährlich gutgeschrieben werden.',
    termTable: [
      { term: 'Täglich', guarantee: 'variabel', availability: 'jederzeit' },
      { term: 'Ohne Laufzeit', guarantee: 'variabel', availability: 'jederzeit' },
      { term: 'Neukundenaktion', guarantee: 'befristet', availability: 'jederzeit' },
      { term: 'EU-Partnerbank', guarantee: 'variabel', availability: 'jederzeit' },
    ],
    faq: [
      {
        q: 'Was ist Tagesgeld?',
        a: 'Tagesgeld ist ein verzinstes Sparkonto ohne feste Laufzeit. Sie können täglich über das Guthaben verfügen, der Zinssatz ist variabel.',
      },
      {
        q: 'Tagesgeld oder Girokonto?',
        a: 'Das Girokonto dient dem Zahlungsverkehr (oft 0 % Zins). Tagesgeld ist zum Anlegen gedacht und meist besser verzinst — Überweisungen laufen über ein verknüpftes Girokonto.',
      },
      {
        q: 'Wie viel Notgroschen auf Tagesgeld?',
        a: 'Finanztip und viele Experten empfehlen 3–6 Nettomonatsgehälter als liquide Reserve — auf einem gut verzinsten Tagesgeldkonto statt auf dem Girokonto.',
      },
      {
        q: 'Kann die Bank den Zins senken?',
        a: 'Ja, Tagesgeldzinsen sind variabel. Achten Sie auf den Effektivzins nach Neukundenaktionen und vergleichen Sie regelmäßig.',
      },
      {
        q: 'Wie schnell ist mein Geld verfügbar?',
        a: 'Die Kündigung ist täglich möglich; die Auszahlung erfolgt in der Regel per Überweisung auf das Referenzkonto innerhalb weniger Werktage.',
      },
      {
        q: 'Ist Tagesgeld sicher?',
        a: 'Bei regulierten EU-Banken bis 100.000 € pro Person und Institut gesetzlich abgesichert.',
      },
    ],
    bullets: [
      'Täglich verfügbar',
      'Variable, attraktive Zinsen',
      'Ein- und Auszahlungen jederzeit möglich',
      'Ideal für Notgroschen und kurzfristige Ziele',
    ],
    metaDescription: GUIDE_COPY.tagesgeld.metaDescription,
  },
};

/** @param {string} slug */
export function getSavingsProductGuide(slug) {
  return SAVINGS_PRODUCT_GUIDES[slug] ?? null;
}

export const SAVINGS_PRODUCT_CARDS = SAVINGS_PRODUCT_SLUGS.map((slug) => SAVINGS_PRODUCT_GUIDES[slug]);

export function calcExampleYield({ deposit, rate, years }) {
  const raw = deposit * (rate / 100) * years;
  return Math.round(raw);
}
