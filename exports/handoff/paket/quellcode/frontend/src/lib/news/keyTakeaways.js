/**
 * Session 80.30 — „Das Wichtigste in Kürze".
 *
 * Erzeugt 2–4 möglichst diverse Bullets aus vorhandenem Summary/Excerpt-Text.
 * Ziel: unterschiedliche Fragen beantworten (Was ist passiert? Warum
 * relevant? Wer betroffen? Was folgt?). Keine neuen Fakten erfinden — es
 * werden ausschließlich Sätze aus dem Originaltext gezogen.
 *
 * Vorgehen:
 *   1. Sätze aus summary + excerpt zusammenführen (excerpt hat oft
 *      andere Perspektive als summary).
 *   2. Deduplizieren via 2-Token-Overlap-Heuristik — zwei Bullets teilen sich
 *      keinen Slot, wenn ihre wichtigsten Nomen sich zu >50 % überlappen.
 *   3. Klassifizieren nach Frage-Typ (WAS / WARUM / WER / FOLGE) via
 *      Signalwörter, dann pro Typ höchstens 1 Bullet.
 *   4. Rückgabe: mindestens 2, maximal 4 Bullets. Sonst null (→ Block wird
 *      nicht gerendert; „lieber zwei gute Punkte statt vier schwache").
 */

const MIN_LEN = 30;
const MAX_LEN = 220;

const SIGNALS = {
  // WARUM ist es wichtig?
  why: [/deshalb/i, /weil\b/i, /daher\b/i, /bedeutet/i, /hintergrund/i, /grund\b/i, /aufgrund/i, /wegen\b/i],
  // WER ist betroffen?
  who: [/anleger/i, /sparer/i, /verbraucher/i, /unternehmen/i, /haushalt/i, /rentner/i, /mieter/i, /eigent[uü]mer/i,
        /kunden/i, /aktion[aä]re/i, /banken/i, /versicherer/i],
  // FOLGE / Ausblick
  outcome: [/k[oö]nnte\b/i, /d[uü]rfte\b/i, /erwart/i, /prognose/i, /rechnen mit/i, /folge\b/i, /auswirkung/i,
            /reagier/i, /zukünftig/i, /nächst/i, /künftig/i],
};

const STOPWORDS = new Set([
  'der','die','das','den','dem','des','ein','eine','einer','eines','einem','einen',
  'und','oder','aber','doch','nicht','ist','sind','war','waren','wird','werden',
  'für','mit','von','vom','zum','zur','bei','beim','auf','aus','nach','über','im','in','an','am','als',
  'wie','so','auch','sich','sein','seine','ihr','ihre','zu','dass','wenn','dann','noch','mehr',
  'diese','dieser','dieses','diesen','diesem','dies','jene','jener','jetzt','heute','gestern',
]);

const tokens = (s) =>
  new Set(
    (s || '')
      .toLowerCase()
      .replace(/[^a-zäöüß0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !STOPWORDS.has(t)),
  );

const overlapRatio = (a, b) => {
  if (!a.size || !b.size) return 0;
  let common = 0;
  a.forEach((t) => { if (b.has(t)) common += 1; });
  return common / Math.min(a.size, b.size);
};

const classify = (sentence) => {
  for (const [type, list] of Object.entries(SIGNALS)) {
    if (list.some((rx) => rx.test(sentence))) return type;
  }
  return 'what'; // Fallback: reine Fakt-Aussage = WAS
};

const splitSentences = (text) =>
  (text || '')
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_LEN && s.length <= MAX_LEN);

/**
 * Erzeugt Takeaways für einen Artikel — oder `null`, wenn die Datenbasis zu
 * dünn ist.
 */
export const buildKeyTakeaways = (article) => {
  if (!article) return null;
  const merged = `${(article.summary || '').trim()} ${(article.excerpt || '').trim()}`.trim();
  if (merged.length < 140) return null;

  const sentences = splitSentences(merged);
  if (sentences.length < 2) return null;

  // Wir erlauben pro Frage-Typ maximal 1 Bullet, mit Ausnahme des
  // Fallback-Typs 'what' (dort maximal 2, weil viele Artikel mehrere
  // Fakt-Aussagen liefern).
  const byType = { what: [], why: [], who: [], outcome: [] };
  const acceptedTokens = [];

  for (const s of sentences) {
    const t = tokens(s);
    // Sofortiger Duplikat-Filter: >55% Overlap mit einem bereits gepickten
    // Satz → skip.
    if (acceptedTokens.some((prev) => overlapRatio(t, prev) > 0.55)) continue;
    const type = classify(s);
    const cap = type === 'what' ? 2 : 1;
    if (byType[type].length >= cap) continue;
    byType[type].push(s);
    acceptedTokens.push(t);
    if (Object.values(byType).flat().length >= 4) break;
  }

  // Reihenfolge: WAS → WARUM → WER → FOLGE (Storyfluss).
  const ordered = [...byType.what, ...byType.why, ...byType.who, ...byType.outcome].slice(0, 4);
  if (ordered.length < 2) return null;
  return ordered;
};
