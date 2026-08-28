/**
 * Session 80.43 — Central Accent Token API (Governance)
 * ==================================================================
 * Single source of truth für semantische Akzentfarben in Layout-Props.
 *
 * Warum:
 *   Vor 80.43 wurde `accent`/`editorialAccent` als freier String übergeben.
 *   Beliebige (Tipp-)Fehler wie `accent="petrolic"` führten stumm zum
 *   Petrol-Fallback und maskierten Design-Fehler. Zusätzlich waren die
 *   erlaubten Werte an mehreren Stellen als lokale Maps dupliziert.
 *
 * Regel:
 *   Alle Layout-Komponenten mit farblichen Prop-Werten IMPORTIEREN diese
 *   Konstanten. Neue Farben werden hier ergänzt — nirgends dupliziert.
 */

/** Kanonische Namen aller semantischen Akzent-Slots. */
export const ACCENT_NAMES = Object.freeze([
  'petrol',    // Vertrauen, Beratung, Zinsen (funktional positiv)
  'coral',     // Marke, menschliche CTAs, negative Market-Moves
  'amber',     // Ruhestand, Vorsorge, langfristige Planung
  'violet',    // Wissen, komplexe Themen, Finanzierung
  'info',      // Marktdaten, analytische Information
  'rose',      // Editorial-Marker, Takeaways, Testimonials
  'navy',      // Autorität, Headlines
  // Session 80.42 — erweiterte Palette
  'gold',      // Vermögen, Investment, Premium-Kennzahlen
  'champagne', // Editorial-Flächen, Wissen, Section-Breaks
  'sage',      // Nachhaltigkeit, Stabilität, langfristig
]);

/**
 * Vollständige Klassenzuordnung pro Slot. Alle Utility-Klassen sind so
 * ausgeschrieben, dass Tailwind sie beim JIT-Scan als String-Literale
 * findet — auch wenn der Slot dynamisch gewählt wird.
 */
export const ACCENT_TOKENS = Object.freeze({
  petrol: {
    text:   'text-bank-petrol-strong',
    ink:    'text-bank-petrol-ink',
    top:    'card-accent-top-petrol',
    border: 'border-bank-petrol-strong',
    tint:   'bg-bank-petrol-tint',
    ring:   'focus-visible:ring-bank-petrol',
    icon:   'icon-badge-petrol',
    kpi:    'kpi-petrol',
    tag:    'tag-petrol',
  },
  coral: {
    text: 'text-bank-coral-strong', ink: 'text-bank-coral-ink',
    top: 'card-accent-top-coral', border: 'border-bank-coral-strong',
    tint: 'bg-bank-coral-tint', ring: 'focus-visible:ring-bank-coral',
    icon: 'icon-badge-coral', kpi: 'kpi-coral', tag: 'tag-coral',
  },
  amber: {
    text: 'text-bank-amber-strong', ink: 'text-bank-amber-ink',
    top: 'card-accent-top-amber', border: 'border-bank-amber-strong',
    tint: 'bg-bank-amber-tint', ring: 'focus-visible:ring-bank-amber',
    icon: 'icon-badge-amber', kpi: 'kpi-amber', tag: 'tag-amber',
  },
  violet: {
    text: 'text-bank-violet-strong', ink: 'text-bank-violet-ink',
    top: 'card-accent-top-violet', border: 'border-bank-violet-strong',
    tint: 'bg-bank-violet-tint', ring: 'focus-visible:ring-bank-violet',
    icon: 'icon-badge-violet', kpi: 'kpi-violet', tag: 'tag-violet',
  },
  info: {
    text: 'text-bank-info-strong', ink: 'text-bank-info-ink',
    top: 'card-accent-top-info', border: 'border-bank-info-strong',
    tint: 'bg-bank-info-tint', ring: 'focus-visible:ring-bank-info',
    icon: 'icon-badge-info', kpi: 'kpi-info', tag: 'tag-info',
  },
  rose: {
    text: 'text-bank-rose-strong', ink: 'text-bank-rose-ink',
    top: 'card-accent-top-rose', border: 'border-bank-rose-strong',
    tint: 'bg-bank-rose-tint', ring: 'focus-visible:ring-bank-rose',
    icon: 'icon-badge-rose', kpi: 'kpi-rose', tag: 'tag-rose',
  },
  navy: {
    text: 'text-bank-ink', ink: 'text-bank-ink',
    top: 'card-accent-top-navy', border: 'border-bank-ink',
    tint: 'bg-bank-ink/[0.06]', ring: 'focus-visible:ring-bank-ink',
    icon: 'icon-badge-navy', kpi: 'kpi-petrol', tag: 'tag-navy',
  },
  gold: {
    text: 'text-bank-gold-strong', ink: 'text-bank-gold-ink',
    top: 'card-accent-top-gold', border: 'border-bank-gold-strong',
    tint: 'bg-bank-gold-tint', ring: 'focus-visible:ring-bank-gold',
    icon: 'icon-badge-gold', kpi: 'kpi-gold', tag: 'tag-gold',
  },
  champagne: {
    text: 'text-bank-champagne-strong', ink: 'text-bank-champagne-ink',
    top: 'card-accent-top-champagne', border: 'border-bank-champagne-strong',
    tint: 'bg-bank-champagne-tint', ring: 'focus-visible:ring-bank-champagne',
    icon: 'icon-badge-champagne', kpi: 'kpi-champagne', tag: 'tag-champagne',
  },
  sage: {
    text: 'text-bank-sage-strong', ink: 'text-bank-sage-ink',
    top: 'card-accent-top-sage', border: 'border-bank-sage-strong',
    tint: 'bg-bank-sage-tint', ring: 'focus-visible:ring-bank-sage',
    icon: 'icon-badge-sage', kpi: 'kpi-sage', tag: 'tag-sage',
  },
});

/**
 * Erlaubte semantische PAARE (Primär + Editorial-Sekundär). Verhindert
 * dass eine Seite gleichzeitig zwei dominante Farben führt (Rainbow-Risk).
 * Prüfung ist SOFT (dev-only warn), damit sie im Prod nichts blockiert.
 */
export const ALLOWED_ACCENT_PAIRS = Object.freeze({
  petrol:    ['champagne', 'sage', 'info'],
  amber:     ['gold', 'champagne'],
  gold:      ['champagne', 'navy'],
  champagne: ['navy', 'gold', 'violet'],
  sage:      ['petrol', 'champagne'],
  coral:     ['rose', 'champagne'],
  violet:    ['champagne', 'gold'],
  info:      ['petrol', 'navy'],
  rose:      ['coral', 'champagne'],
  navy:      ['gold', 'champagne', 'petrol'],
});

export const isValidAccent = (v) => typeof v === 'string' && ACCENT_NAMES.includes(v);

/**
 * Validiert eine Kombination und gibt einen tokenized Klassen-Bundle zurück.
 * Bei ungültigen Werten wird in DEV per console.warn geloggt und der
 * Fallback-Slot (default: petrol) genutzt — nie geworfen.
 */
export const resolveAccent = (accent, fallback = 'petrol') => {
  const key = isValidAccent(accent) ? accent : fallback;
  if (accent && !isValidAccent(accent) && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[accents] Unbekannter Accent "${accent}" — fallback auf "${fallback}".`);
  }
  return { name: key, ...ACCENT_TOKENS[key] };
};

export const resolveAccentPair = (primary, secondary) => {
  const p = resolveAccent(primary, 'petrol');
  if (!secondary) return { primary: p, secondary: null };
  const s = resolveAccent(secondary, 'champagne');
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    const allowed = ALLOWED_ACCENT_PAIRS[p.name] || [];
    if (!allowed.includes(s.name)) {
      // eslint-disable-next-line no-console
      console.warn(`[accents] Kombination ${p.name} + ${s.name} steht nicht in ALLOWED_ACCENT_PAIRS. Rainbow-Risk?`);
    }
  }
  return { primary: p, secondary: s };
};
