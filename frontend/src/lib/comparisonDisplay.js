/** Einheitliche Mindestanlage — /comparison und alle daran angebundenen Oberflächen.
 *
 * Session „Zinsstaffel" (02.09.2026): Die Mindestanlage ist jetzt dynamisch vom
 * angebotenen Zinssatz abhängig — zentrale Single Source of Truth.
 *
 * Zinsstaffel:
 *   bis 3.00 % p.a.        → 10.000 €
 *   3.01 – 3.90 % p.a.     → 15.000 €
 *   3.91 – 4.30 % p.a.     → 20.000 €
 *   4.31 – 4.60 % p.a.     → 25.000 €
 *   über 4.60 % p.a.       → 30.000 €
 *
 * Legacy: `COMPARISON_MIN_DEPOSIT_EUR = 10_000` (untere Staffelstufe) und die
 * `formatComparisonMinDeposit*`-Helper werden als „ab 10.000 €"-Fallback beibehalten
 * (Marketing-Kontexte ohne konkreten Zinssatz).
 */

export const COMPARISON_MIN_DEPOSIT_EUR = 10_000;

/** Range-Label für allgemeine Bereiche (Marketing, Guides). */
export const COMPARISON_MIN_DEPOSIT_RANGE_LABEL = '10.000 € – 30.000 €';
export const COMPARISON_MIN_DEPOSIT_RANGE_MARKETING = 'Mindestanlage abhängig vom Zinssatz: ab 10.000 €.';

const LADDER = [
  { maxRatePct: 3.00, minDeposit: 10_000 },
  { maxRatePct: 3.90, minDeposit: 15_000 },
  { maxRatePct: 4.30, minDeposit: 20_000 },
  { maxRatePct: 4.60, minDeposit: 25_000 },
  { maxRatePct: Infinity, minDeposit: 30_000 },
];

/**
 * Normalisiert einen Zinssatz-Rohwert auf einen Prozentwert (z. B. 3.5).
 * Akzeptiert: number, "3", "3.0", "3,00", "3.00", "0.03" (Dezimalanteil),
 *             null/undefined/NaN → NaN.
 * Werte 0 < v < 1 werden als Dezimalanteil interpretiert (z. B. 0.035 = 3,5 %).
 * Werte v ≥ 1 werden als Prozentwert interpretiert.
 */
export function normalizeRatePct(raw) {
  if (raw === null || raw === undefined) return NaN;
  let s = typeof raw === 'string' ? raw.trim().replace(',', '.') : raw;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  // 0.0 < n < 1 → Dezimalanteil (0.035 → 3.5 %)
  if (n > 0 && n < 1) return n * 100;
  return n;
}

/**
 * Zentrale Business-Rule: gibt die Mindestanlage in EUR für den gegebenen
 * Zinssatz-Rohwert zurück. Bei ungültigem Zinssatz → null.
 *
 * Grenzen sind inklusiv-unten-exklusiv-oben-normalisiert auf 2 Nachkommastellen
 * (kein Float-Fehler an 3.00/3.90/4.30/4.60):
 *   3.00 → 10k, 3.01 → 15k, 3.90 → 15k, 3.91 → 20k, 4.30 → 20k, 4.31 → 25k,
 *   4.60 → 25k, 4.61 → 30k.
 */
export function getMinimumDepositForRate(rawRate) {
  const pct = normalizeRatePct(rawRate);
  if (!Number.isFinite(pct)) return null;
  const rounded = Math.round(pct * 100) / 100; // 2 Nachkommastellen
  for (const step of LADDER) {
    if (rounded <= step.maxRatePct + 1e-9) return step.minDeposit;
  }
  return 30_000;
}

/**
 * Effektive Mindestanlage: max(zinssatzbasiert, produktspezifisch).
 * Produktspezifische Werte < 10k oder null werden ignoriert.
 */
export function getEffectiveMinDeposit(rawRate, offerMinDeposit) {
  const ladder = getMinimumDepositForRate(rawRate);
  const product = Number(offerMinDeposit);
  const productValid = Number.isFinite(product) && product > 0;
  if (ladder === null && !productValid) return null;
  if (ladder === null) return product;
  if (!productValid) return ladder;
  return Math.max(ladder, product);
}

const fmtEuro = (n) => (Number.isFinite(n) ? n.toLocaleString('de-DE') : '');

export function formatComparisonMinDeposit() {
  return COMPARISON_MIN_DEPOSIT_EUR.toLocaleString('de-DE');
}
export function formatComparisonMinDepositWithCurrency() {
  return `${formatComparisonMinDeposit()} €`;
}
export function formatComparisonMinDepositLabel() {
  return `ab ${formatComparisonMinDeposit()} €`;
}

/** Formatierung für konkrete Angebotskarten/Tabellen (dynamisch nach Zinssatz). */
export function formatOfferMinDeposit(offer) {
  const eff = getEffectiveMinDeposit(offer?.interest_rate, offer?.min_deposit);
  if (eff === null) return COMPARISON_MIN_DEPOSIT_RANGE_LABEL;
  return `${fmtEuro(eff)} €`;
}

/** True, wenn `amount` die effektive Mindestanlage des Angebots erfüllt. */
export function offerMeetsAmount(offer, amount) {
  const eff = getEffectiveMinDeposit(offer?.interest_rate, offer?.min_deposit);
  if (eff === null) return true; // kein Zinssatz bekannt → nicht ausschließen
  const a = Number(amount);
  if (!Number.isFinite(a) || a <= 0) return true;
  return a >= eff;
}
