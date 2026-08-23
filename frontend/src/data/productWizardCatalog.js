/**
 * Zentraler Katalog für die 6 Produkt-Wizards.
 * Wird sowohl von HomeProductWizardSection (Inline-Homepage-Section) als auch
 * vom ProductInquiryStickyCta-Popup verwendet — keine parallele Datenhaltung.
 */
import { productInquiryCards } from '@/data/productInquiryQuestions';

export const PRODUCT_KEYS = /** @type {const} */ ([
  'aktien', 'anleihen', 'fonds', 'tagesgeld', 'festgeld', 'flexgeld',
]);

/** Nutzenzeile pro Produkt — kurz, produkt-neutral, keine Bonusversprechen. */
export const PRODUCT_BENEFIT_COPY = {
  aktien:    'Langfristige Chancen für Ihren Vermögensaufbau.',
  anleihen:  'Planbare Erträge und Stabilität für Ihr Depot.',
  fonds:     'Breit gestreut und flexibel investieren.',
  tagesgeld: 'Flexibel sparen mit täglicher Verfügbarkeit.',
  festgeld:  'Planbare Laufzeit und attraktive Verzinsung.',
  flexgeld:  'Zinsen und Flexibilität sinnvoll kombiniert.',
};

/** Sekundäre Nutzenpunkte für Header/Trust-Zeile. */
export const WIZARD_TRUST_POINTS = [
  { title: 'Passende Empfehlung',       body: 'Anlage passend zu Zielen und Horizont.' },
  { title: 'Mögliche Vorteile',         body: 'Passende Konditionen und Aktionen entdecken.' },
  { title: 'Kostenlos & unverbindlich', body: 'Keine Verpflichtung, keine versteckten Kosten.' },
  { title: 'In wenigen Minuten',        body: 'Wenige Fragen, sofortige Orientierung.' },
];

/**
 * Mapping Produkt → aktuelle Beispielaktion einer Partnerbank.
 * Nur Produkte mit tatsächlich aktiver Aktion sind hier gesetzt; für alle
 * anderen Produkte wird KEIN Badge angezeigt.
 * Bonus-Copy stammt aus bankBonusTexts.js (bestehende Quelle) — hier wird nur
 * der Slug gemappt, der eigentliche Text ist dort gepflegt.
 */
export const PRODUCT_BONUS_SOURCE = {
  tagesgeld: { bankSlug: 'bbva-bank-deutschland', label: 'Aktueller Vorteil' },
  festgeld:  { bankSlug: 'j-p-morgan-sachsen',    label: 'Mögliche Aktion'  },
  flexgeld:  { bankSlug: 'bbva-bank-deutschland', label: 'Mögliche Aktion'  },
  // aktien, anleihen, fonds: keine garantierte Aktion → kein Badge
};

/** Enrichte Card-Metadaten mit kicker/title/benefit. */
export function getProductCatalog() {
  return PRODUCT_KEYS.map((key) => {
    const meta = productInquiryCards[key];
    return {
      key,
      kicker: meta.kicker,
      title: meta.title,
      benefit: PRODUCT_BENEFIT_COPY[key],
      bonusSource: PRODUCT_BONUS_SOURCE[key] || null,
    };
  });
}
