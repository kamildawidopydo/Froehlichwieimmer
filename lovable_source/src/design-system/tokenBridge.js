/**
 * Session 80.47 — Design-System Token Bridge for Chart Libraries.
 *
 * Recharts erwartet konkrete Farbwerte (string), keine Tailwind-Klassen.
 * Statt Hex-Duplikate in Chart-Komponenten zu pflegen, LESEN wir die
 * `--bank-*` CSS-Variablen aus dem Root und reichen sie als `rgb(r,g,b)`-
 * Strings durch. Damit fließt jede Token-Änderung in `index.css` (Light/Dark
 * getrennt gepflegt) OHNE Chart-Anpassung durch.
 *
 * Nutzung:
 *   import { rgbVar } from '@/design-system/tokenBridge';
 *   <Area stroke={rgbVar('--bank-gold')} ... />
 *
 * SSR/no-window-Fallback: gibt den mitgelieferten Fallback-Hex zurück,
 * damit Charts in Test-/Prerender-Kontexten nicht crashen.
 */

/**
 * @param {string} varName z.B. '--bank-gold' oder '--bank-gold-strong'
 * @param {string} [fallback] Hex-Fallback (nur für SSR / fehlende Var)
 * @returns {string} `rgb(r,g,b)`-String
 */
export function rgbVar(varName, fallback = '#000000') {
  if (typeof window === 'undefined' || !document?.documentElement) {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  // index.css definiert Slots als Raw-Triplet („200 154 61") — wir wrappen zu rgb(...).
  if (!raw) return fallback;
  const parts = raw.split(/\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    return `rgb(${parts.join(',')})`;
  }
  // Bereits als rgb/hex definiert → durchreichen.
  return raw || fallback;
}

/**
 * Häufig genutzte semantische Rollen für Data-Viz. Kein neuer Namespace —
 * nur eine kleine Convenience-Hülle über den zentralen Tokens.
 */
export const DATAVIZ = {
  wealth: () => rgbVar('--bank-gold', '#C89A3D'),
  wealthDeep: () => rgbVar('--bank-gold-strong', '#8F641A'),
  esg: () => rgbVar('--bank-sage', '#8FA89A'),
  esgDeep: () => rgbVar('--bank-sage-strong', '#566F60'),
};
