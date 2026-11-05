/**
 * Session 80.30 — Editorial Relevance Boosting + Event-Deduplizierung.
 *
 * Reine Client-Utilities auf bereits geladenen News-Items — kein neuer
 * Backend-Endpoint. Nutzt ausschließlich vorhandene Felder:
 *   is_top_news, relevance_score, published_at, category,
 *   investment_topic_slug, title, excerpt/summary.
 */

// Themen mit hohem Bedeutungsgewicht für deutsche Privatanleger.
// Ein Match dieses Sets hebt den Relevance-Score selektiv an.
const HIGH_IMPACT_KEYWORDS = [
  // Zinsen / EZB / Fed
  /\bezb\b/i, /leitzins/i, /\bzinsentscheid/i, /notenbank/i, /bundesbank/i,
  /\bfed\b/i, /federal reserve/i,
  // Inflation / Kaufkraft
  /inflation/i, /verbraucherpreis/i, /teuerung/i,
  // Große Marktbewegungen
  /crash\b/i, /rekordhoch/i, /allzeithoch/i, /talfahrt/i, /kursrutsch/i,
  /b[oö]rsenbeben/i, /massiver? kursverlust/i,
  // Altersvorsorge / Rente
  /rente\b/i, /altersvorsorge/i, /pension/i, /vorsorge/i,
  // Steuern mit Anlegerbezug
  /abgeltungsteuer/i, /kapitalertragsteuer/i, /erbschaftsteuer/i,
  /verm[oö]genssteuer/i, /steuerreform/i,
  // Wichtige Wirtschaftsentscheidungen
  /koalitionsvertrag/i, /haushaltsplan/i, /schuldenbremse/i, /konjunkturpaket/i,
  // Regulierung Anleger
  /baf[iï]n/i, /esm[a]/i, /basel iii/i, /basel iv/i, /finanzaufsicht/i,
];

// Themen, die typischerweise NICHT weit oben stehen sollten,
// wenn sie ohne breiten Marktbezug daherkommen.
const LOW_IMPACT_KEYWORDS = [
  // Personalien
  /personalie/i, /wechselt zu\b/i, /neuer\s+(vorstand|ceo)\b/i, /r[uü]cktritt/i,
  // Promi / Lifestyle-Wirtschaft
  /promi/i, /star-\b/i, /prominent/i, /millionen-villa/i, /luxus-yacht/i,
  // Repetitive Einzel-Meldungen
  /quartalszahlen[^\n]{0,40}$/i, /gewinnwarnung ohne/i,
];

const isHighImpact = (article) => {
  const text = `${article.title || ''} ${article.excerpt || article.summary || ''}`;
  return HIGH_IMPACT_KEYWORDS.some((rx) => rx.test(text));
};

const isLowImpact = (article) => {
  const text = `${article.title || ''} ${article.excerpt || article.summary || ''}`;
  return LOW_IMPACT_KEYWORDS.some((rx) => rx.test(text));
};

// Editorial-Score kombiniert Basis-Relevance + Themen-Boost + kleiner
// Freshness-Faktor. Der Boost ist bewusst konservativ (±15), damit die
// Basis-Metriken (is_top_news, relevance_score) weiterhin dominieren.
export const editorialScore = (article) => {
  const base = Number(article?.relevance_score || 0);
  const topBonus = article?.is_top_news ? 20 : 0;
  const impactBonus = isHighImpact(article) ? 15 : 0;
  const lowPenalty = isLowImpact(article) ? -12 : 0;

  // sanftes Freshness-Bonus: <6 h = +5, <24 h = +2, sonst 0.
  let freshness = 0;
  const t = new Date(article?.published_at || 0).getTime();
  if (t) {
    const ageH = (Date.now() - t) / 3.6e6;
    if (ageH < 6) freshness = 5;
    else if (ageH < 24) freshness = 2;
  }

  return base + topBonus + impactBonus + lowPenalty + freshness;
};

// --- Event-Deduplizierung -----------------------------------------------
//
// Zwei Artikel dürfen nicht gleichzeitig in „Heute wichtig" landen, wenn sie
// dasselbe Ereignis behandeln — auch dann nicht, wenn ihre Kategorien
// unterschiedlich sind.
//
// Signal-Priorität (leichtgewichtig, keine NLP-Pipeline):
//   1. gleicher `investment_topic_slug`
//   2. identischer normalisierter Ereignis-Key (aus Titel-Signaturwörtern)
//
// Der Ereignis-Key extrahiert die relevanten Nomen aus dem Titel und ignoriert
// Füllwörter. So werden „EZB senkt Leitzins" und „Lagarde verkündet
// Zinssenkung" beide auf `{ezb|lagarde, leitzins|zinssenkung}` reduziert und
// die Schnittmenge erkannt.

const STOPWORDS = new Set([
  'der','die','das','den','dem','des','ein','eine','einer','eines','einem','einen',
  'und','oder','aber','doch','nicht','kein','keine','keinen','keinem',
  'ist','sind','war','waren','wird','werden','wurde','wurden','hat','hatte',
  'für','mit','von','vom','zum','zur','bei','beim','auf','aus','nach','über',
  'im','in','an','am','als','wie','so','auch','sich','sein','seine','ihr','ihre',
  'zu','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn',
  'neue','neuer','neues','neuen','alte','alter','neu',
]);

// Themen-Synonyme: wichtige Cluster, die als EIN Signal zählen.
const SYNONYM_CLUSTERS = [
  ['ezb', 'lagarde', 'notenbank', 'bundesbank'],
  ['fed', 'powell', 'us-notenbank'],
  ['leitzins', 'zinsschritt', 'zinssenkung', 'zinserhöhung', 'zinsentscheid'],
  ['inflation', 'teuerung', 'verbraucherpreise'],
  ['dax', 'aktienindex', 'leitindex'],
  ['ölpreis', 'brent', 'ölmarkt'],
  ['bitcoin', 'krypto', 'kryptowährung'],
];

const clusterOf = (token) => {
  for (const cluster of SYNONYM_CLUSTERS) {
    if (cluster.includes(token)) return cluster[0];
  }
  return token;
};

export const eventKey = (article) => {
  const raw = (article?.title || '').toLowerCase();
  const tokens = raw
    .replace(/[^a-zäöüß0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
    .map(clusterOf);
  // Für Robustheit: zwei stärkste Tokens = 2 häufigste + 1 längster.
  const freq = new Map();
  tokens.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  const key = sorted.slice(0, 3).map(([t]) => t).sort().join('|');
  return key;
};

// Prüft, ob zwei Artikel als „gleiches Ereignis" gelten.
export const isSameEvent = (a, b) => {
  if (!a || !b) return false;
  if (a.slug === b.slug) return true;
  if (a.investment_topic_slug && a.investment_topic_slug === b.investment_topic_slug) {
    // gleiche Topic-Zuordnung + überlappender Event-Key → wahrscheinlich gleich
    const ak = eventKey(a);
    const bk = eventKey(b);
    if (!ak || !bk) return false;
    const ai = new Set(ak.split('|'));
    const bi = new Set(bk.split('|'));
    const overlap = [...ai].filter((t) => bi.has(t)).length;
    return overlap >= 2;
  }
  return false;
};

/**
 * Session 80.30 — kuratierte Top-3.
 *
 * 1. Sortierung nach `editorialScore` DESC.
 * 2. Event-Deduplizierung: keine zwei Artikel zum gleichen Ereignis.
 * 3. Kategorien-Diversity: bevorzuge (aber erzwinge nicht) unterschiedliche
 *    Kategorien — Diversity darf Relevanz nicht schlagen.
 */
export const pickTopThree = (items) => {
  if (!items || items.length === 0) return [];
  const scored = [...items]
    .filter((it) => it && it.slug)
    .sort((a, b) => editorialScore(b) - editorialScore(a));

  const picked = [];
  const seenCats = new Set();

  // Pass 1 — Diversity: unterschiedliche Kategorien, Event-Dedup.
  for (const it of scored) {
    if (picked.length >= 3) break;
    if (seenCats.has(it.category)) continue;
    if (picked.some((p) => isSameEvent(p, it))) continue;
    picked.push(it);
    seenCats.add(it.category);
  }

  // Pass 2 — Auffüllen: falls <3, restliche High-Score-Artikel ohne Event-
  // Duplikate, auch bei gleicher Kategorie zulassen.
  if (picked.length < 3) {
    for (const it of scored) {
      if (picked.length >= 3) break;
      if (picked.includes(it)) continue;
      if (picked.some((p) => isSameEvent(p, it))) continue;
      picked.push(it);
    }
  }
  return picked;
};
