/**
 * Wissens-Graph — statisch kuratiertes Mapping.
 *
 * Regel: Auf jeder Seite maximal 3 hochwertige nächste Wissensschritte.
 * Keine automatische Keyword-Verlinkung, kein Recommendation-Algorithmus.
 * Jede Empfehlung hat:
 *   - type      → kleine Kategoriebezeichnung ('Grundlagen' | 'Thema' | 'Hub')
 *   - title     → klare Headline
 *   - description → 1 Satz Kontext
 *   - href      → echte, existierende Route
 *   - cta       → einheitliche Bezeichnung ("Grundlagen ansehen →" / "Thema verstehen →" / "Zum Wissenshub →")
 */

const CTA_BY_TYPE = {
  Hub: 'Zum Wissenshub',
  Grundlagen: 'Grundlagen ansehen',
  Thema: 'Thema verstehen',
};

const item = (type, title, description, href) => ({
  type,
  title,
  description,
  href,
  cta: CTA_BY_TYPE[type] || 'Mehr erfahren',
});

// Basisbausteine — mehrfach wiederverwendet.
const HUB = item(
  'Hub',
  'Investment & Börse',
  'Grundlagen, Orderarten und ein Börsen-ABC mit über 50 Begriffen — kompakt an einem Ort.',
  '/handeln',
);
const AKTIEN = item(
  'Thema',
  'Aktien verstehen',
  'Chancen, Risiken und Rolle von Aktien in einer langfristigen Vermögensstrategie.',
  '/themen/aktien',
);
const ANLEIHEN = item(
  'Thema',
  'Anleihen verstehen',
  'Wie festverzinsliche Papiere funktionieren — Kupon, Laufzeit, Bonität.',
  '/themen/anleihen',
);
const DIVIDENDEN = item(
  'Thema',
  'Dividenden verstehen',
  'Ausschüttungsqualität statt reine Renditejagd — Dividenden im Aktienkontext.',
  '/themen/dividenden',
);
const FONDS = item(
  'Grundlagen',
  'Fonds & ETFs verstehen',
  'Funktionsweise, Kosten und Unterschiede zwischen aktiven Fonds und Indexprodukten.',
  '/fonds-grundlagen',
);

/**
 * Empfehlungen pro Seiten-Schlüssel.
 * Reihenfolge = Priorität (kontextnah zuerst).
 */
export const KNOWLEDGE_GRAPH = {
  // Ebene 1: Investment-Wissenshub → zurück in die Themen und in die Fonds-Grundlagen.
  handeln: [AKTIEN, FONDS, ANLEIHEN],

  // Ebene 2: Fonds-Grundlagen → zurück in den Hub und in die passenden Themen.
  'fonds-grundlagen': [HUB, AKTIEN, ANLEIHEN],

  // Ebene 3: Themen — jeweils zurück in den Hub + verwandtes Thema (max 2).
  'themen/aktien': [HUB, DIVIDENDEN],
  'themen/anleihen': [HUB, FONDS],
  'themen/dividenden': [AKTIEN, HUB],
};

export const getRelatedKnowledge = (key) => KNOWLEDGE_GRAPH[key] || [];
