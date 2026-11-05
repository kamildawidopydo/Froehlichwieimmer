/** Auf Viertelsterne runden (0,25-Schritte). */
export function roundToQuarter(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 4) / 4;
}

/** Deutsche Anzeige: 4,75 */
export function formatStarAverageDe(value) {
  return roundToQuarter(value).toFixed(2).replace('.', ',');
}

/**
 * Füllgrad pro Stern (0–1), Index 0 = erster Stern.
 * z. B. 4,75 → [1, 1, 1, 1, 0,75]
 */
export function getStarFillPercents(rating) {
  const v = Math.min(5, Math.max(0, Number(rating) || 0));
  return Array.from({ length: 5 }, (_, i) => Math.min(1, Math.max(0, v - i)));
}
