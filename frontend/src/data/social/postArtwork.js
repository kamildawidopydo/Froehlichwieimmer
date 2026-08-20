/**
 * Shared social-post artwork registry.
 * Instagram + Facebook (+ any future LinkedIn image posts) all read from here,
 * so we never duplicate SVG assets or drift on captions.
 */

export const POST_IMG = {
  tagesgeld:         '/assets/social/posts/1-tagesgeld.svg',
  festgeld:          '/assets/social/posts/2-festgeld.svg',
  zinsen:            '/assets/social/posts/3-zinsen.svg',
  einlagensicherung: '/assets/social/posts/4-einlagensicherung.svg',
  vermoegensaufbau:  '/assets/social/posts/5-vermoegensaufbau.svg',
  europa:            '/assets/social/posts/6-europa.svg',
};

export const POST_TOPICS = [
  { key: 'tagesgeld',         title: 'Tagesgeld',         subtitle: 'flexibel sparen' },
  { key: 'festgeld',          title: 'Festgeld',          subtitle: 'planbar anlegen' },
  { key: 'zinsen',            title: 'Zinsen im Blick',   subtitle: 'Konditionen im Vergleich' },
  { key: 'einlagensicherung', title: 'Einlagensicherung', subtitle: 'Sicherheit für Ihr Erspartes' },
  { key: 'vermoegensaufbau',  title: 'Vermögensaufbau',   subtitle: 'Schritt für Schritt' },
  { key: 'europa',            title: 'Sparen in Europa',  subtitle: 'grenzüberschreitend' },
];
