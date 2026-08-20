/**
 * Shared social-post artwork registry.
 * Instagram, Facebook AND LinkedIn all read from here,
 * so we never duplicate SVG assets or drift on captions.
 * NEVER add plain FV-placeholder art here — every key must resolve to a
 * distinct topical motif under /assets/social/posts/.
 */

export const POST_IMG = {
  tagesgeld:         '/assets/social/posts/1-tagesgeld.svg',
  festgeld:          '/assets/social/posts/2-festgeld.svg',
  zinsen:            '/assets/social/posts/3-zinsen.svg',
  einlagensicherung: '/assets/social/posts/4-einlagensicherung.svg',
  vermoegensaufbau:  '/assets/social/posts/5-vermoegensaufbau.svg',
  europa:            '/assets/social/posts/6-europa.svg',
  diversifikation:   '/assets/social/posts/7-diversifikation.svg',
  beratung:          '/assets/social/posts/8-beratung.svg',
  zinswissen:        '/assets/social/posts/9-zinswissen.svg',
};

export const POST_TOPICS = [
  { key: 'tagesgeld',         title: 'Tagesgeld',         subtitle: 'flexibel sparen' },
  { key: 'festgeld',          title: 'Festgeld',          subtitle: 'planbar anlegen' },
  { key: 'zinsen',            title: 'Zinsen im Blick',   subtitle: 'Konditionen im Vergleich' },
  { key: 'einlagensicherung', title: 'Einlagensicherung', subtitle: 'Sicherheit für Ihr Erspartes' },
  { key: 'vermoegensaufbau',  title: 'Vermögensaufbau',   subtitle: 'Schritt für Schritt' },
  { key: 'europa',            title: 'Sparen in Europa',  subtitle: 'grenzüberschreitend' },
  { key: 'diversifikation',   title: 'Diversifikation',   subtitle: 'Nicht alles auf eine Karte setzen' },
  { key: 'beratung',          title: 'Beratung',          subtitle: 'Langfristige Zusammenarbeit' },
  { key: 'zinswissen',        title: 'Zinswissen',        subtitle: 'Grundlagen kompakt' },
];

/** Neutral fallback (kein FV-Platzhalter) für <img onError>. */
export const NEUTRAL_FALLBACK = '/assets/social/fallback-neutral.svg';
