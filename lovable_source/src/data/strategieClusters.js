/**
 * Session 80.26e — Strategy Cluster Color Mapping
 *
 * Editorial-Signatur pro Ziel-Cluster: eine dezente Farbe = eine Kategorie.
 * Nicht Dekoration, sondern Orientierungshilfe.
 *
 * Anwendung ausschließlich als:
 *   - `card-accent-top card-accent-top-*` (feine 2px-Linie)
 *   - `icon-badge icon-badge-*` (Cluster-Icon)
 *   - optional kleiner `text-bank-*-strong` Kicker
 * NIE als vollflächige Card-Fill oder Section-Background.
 *
 * Konsistenz: Detail-Seiten leiten die Farbe über den category-Slug aus
 * `resolveClusterColorFromCategory` ab, sodass ein Topic überall dieselbe
 * Cluster-Signatur zeigt (Farbe = Kategorie).
 */

// Goal-Slug → semantische Cluster-Farbe (matched user mapping).
const CLUSTER_COLOR_BY_GOAL = {
  'vermoegen-aufbauen':          'petrol',
  'vermoegen-schuetzen':         'info',
  'ruhestand':                   'amber',
  'kinder-familie':              'coral',
  'nachhaltig':                  'petrol',
  'anlagestrategien-verstehen':  'violet',
};

// Category-Slug → semantische Cluster-Farbe (kanonisch, für Detail-Seiten).
// Wenn eine Kategorie von mehreren Clustern geteilt wird, gewinnt der dominante Cluster.
const CLUSTER_COLOR_BY_CATEGORY = {
  'schutz-steuerung': 'petrol',   // dominiert von "Vermögen aufbauen"
  'altersvorsorge':   'amber',    // Ruhestand
  'generationen':     'coral',    // Kinder & Familie
  'nachhaltigkeit':   'petrol',   // Nachhaltig
  'anlagestile':      'violet',   // Anlagestrategien verstehen
};

export const clusterColorForGoal     = (slug) => CLUSTER_COLOR_BY_GOAL[slug]     || 'petrol';
export const clusterColorForCategory = (slug) => CLUSTER_COLOR_BY_CATEGORY[slug] || 'petrol';

/**
 * Wichtig: Tailwind's JIT scannt Quellcode nach literalen Klassennamen.
 * Diese Lookup-Map erzwingt, dass alle sechs Cluster-Klassen als Strings
 * im Bundle erscheinen und damit garantiert emittiert werden — auch wenn
 * die Cluster-Farbe dynamisch gewählt wird.
 */
export const CLUSTER_CLASSES = {
  petrol: {
    accentTop:   'card-accent-top card-accent-top-petrol',
    iconBadge:   'icon-badge icon-badge-lg icon-badge-petrol',
    textStrong:  'text-bank-petrol-strong',
    textInk:     'text-bank-petrol-ink',
    borderSoft:  'border-bank-petrol-border',
    ring:        'focus-visible:ring-bank-petrol',
  },
  info: {
    accentTop:   'card-accent-top card-accent-top-info',
    iconBadge:   'icon-badge icon-badge-lg icon-badge-info',
    textStrong:  'text-bank-info-strong',
    textInk:     'text-bank-info-ink',
    borderSoft:  'border-bank-info-border',
    ring:        'focus-visible:ring-bank-info',
  },
  amber: {
    accentTop:   'card-accent-top card-accent-top-amber',
    iconBadge:   'icon-badge icon-badge-lg icon-badge-amber',
    textStrong:  'text-bank-amber-strong',
    textInk:     'text-bank-amber-ink',
    borderSoft:  'border-bank-amber-border',
    ring:        'focus-visible:ring-bank-amber',
  },
  coral: {
    accentTop:   'card-accent-top card-accent-top-coral',
    iconBadge:   'icon-badge icon-badge-lg icon-badge-coral',
    textStrong:  'text-bank-coral-strong',
    textInk:     'text-bank-coral-ink',
    borderSoft:  'border-bank-coral-border',
    ring:        'focus-visible:ring-bank-coral',
  },
  violet: {
    accentTop:   'card-accent-top card-accent-top-violet',
    iconBadge:   'icon-badge icon-badge-lg icon-badge-violet',
    textStrong:  'text-bank-violet-strong',
    textInk:     'text-bank-violet-ink',
    borderSoft:  'border-bank-violet-border',
    ring:        'focus-visible:ring-bank-violet',
  },
};

export const clusterClassesForGoal     = (slug) => CLUSTER_CLASSES[clusterColorForGoal(slug)];
export const clusterClassesForCategory = (slug) => CLUSTER_CLASSES[clusterColorForCategory(slug)];
