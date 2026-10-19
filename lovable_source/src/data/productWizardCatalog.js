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
 * WICHTIG: Nur setzen, wenn eine echte Aktion für DIESEN Produkttyp
 * verifiziert existiert (nicht nur ein Bank-Slug irgendeines Produkts).
 * BBVA-Bonus bezieht sich auf Festgeld — daher kein Mapping auf
 * Tagesgeld/Flexgeld (würde produktfremde Kopie rendern).
 * Neue Slugs erst hinzufügen, wenn eine echte produktkonforme Aktion
 * existiert UND ein passender, kurzer Badge-Text in bankBonusTexts.js
 * gepflegt ist.
 */
export const PRODUCT_BONUS_SOURCE = {
  // aktien, anleihen, fonds, tagesgeld, festgeld, flexgeld: keine
  // verifizierte produktspezifische Aktion → kein Badge (Session 73)
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
