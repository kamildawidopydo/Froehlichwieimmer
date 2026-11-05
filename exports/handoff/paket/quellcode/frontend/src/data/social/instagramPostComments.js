/** Synthetic Instagram post comments — unique German accounts per post, own avatar each. */
const IG = '/assets/social/instagram';
const IG_V = '?v=32';
const PROFILE_AVATAR = '/assets/logo/frohlich-mark.png?v=4';

// ---------------------------------------------------------------------------
// Realistic avatar mixer — bewusst KEIN Portrait-Grid, sondern glaubwürdige
// Handy-Foto-Ästhetik: unterschiedliche Winkel, teils Personen, teils Motive
// (Auto, Motorrad, Hund, Landschaft, Urlaub), teils Initialen-Avatar.
// Alle Bilder werden über Unsplash mit `?w=160&h=160&fit=crop&crop=faces,edges`
// als quadratische 160-px-Kacheln geladen — der Renderer schneidet rund.
// Deterministisch per Slug-Hash: gleicher Slug → immer gleiches Bild.
// ---------------------------------------------------------------------------
const UP = 'https://images.unsplash.com/';
const IMG = (id, crop = 'faces,edges') =>
  `${UP}${id}?w=200&h=200&fit=crop&crop=${crop}&auto=format&q=70`;

const AVATAR_POOLS = {
  // Personen — bewusst gemischte Winkel/Entfernung, keine Studio-Portraits.
  person: [
    IMG('photo-1531123897727-8f129e1688ce'),     // Frau Selfie draußen
    IMG('photo-1546456073-6712f79251bb'),        // Mann Sonnenbrille Straße
    IMG('photo-1517841905240-472988babdf9'),     // Frau seitlich Sonne
    IMG('photo-1524504388940-b1c1722653e1'),     // Mann Sonnenbrille Freizeit
    IMG('photo-1500648767791-00dcc994a43e'),     // Mann angeschnitten Café
    IMG('photo-1573496359142-b8d87734a5a2'),     // Frau Terrasse
    IMG('photo-1500648767791-00dcc994a43e'),     // Mann Bart casual
    IMG('photo-1489424731084-a5d8b219a5bb'),     // Frau Wanderung
    IMG('photo-1502823403499-6ccfcf4fb453'),     // Mann Café angeschnitten
    IMG('photo-1508214751196-bcfd4ca60f91'),     // Frau Wald von der Seite
    IMG('photo-1502378735452-bc7d86632805'),     // Frau von hinten Strand
    IMG('photo-1517070208541-6ddc4d3efbcb'),     // Mann Skateboard
  ],
  // Fahrzeuge, Hobbys, Pets, Landschaft — persönliche Motive statt Gesicht.
  lifestyle: [
    IMG('photo-1552519507-da3b142c6e3d', 'edges'),     // roter Sportwagen
    IMG('photo-1558981285-6f0c94958bb6', 'edges'),     // Motorrad seitlich
    IMG('photo-1552053831-71594a27632d', 'edges'),     // Hund Golden Retriever
    IMG('photo-1583337130417-3346a1be7dee', 'edges'),  // Katze schaut
    IMG('photo-1470071459604-3b5ec3a7fe05', 'edges'),  // Bergsee Landschaft
    IMG('photo-1500534314209-a25ddb2bd429', 'edges'),  // Küstenbucht Urlaub
    IMG('photo-1502680390469-be75c86b636f', 'edges'),  // Snowboard Berge
    IMG('photo-1444492696363-332accfd4d5c', 'edges'),  // Wald von oben
    IMG('photo-1493246507139-91e8fad9978e', 'edges'),  // See mit Boot
    IMG('photo-1476820865390-c52aeebb9891', 'edges'),  // Rennrad Straße
    IMG('photo-1519641471654-76ce0107ad1b', 'edges'),  // Espresso-Kaffee
    IMG('photo-1518791841217-8f162f1e1131', 'edges'),  // Katze aus der Nähe
    IMG('photo-1449824913935-59a10b8d2000', 'edges'),  // Skyline Nacht
    IMG('photo-1519861531473-9200262188bf', 'edges'),  // Berg-Sonnenaufgang
  ],
};

// FNV-1a-ähnlicher Slug-Hash → stabil, plattformunabhängig.
const _hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < (s || '').length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
};

// Initialen-SVG (data URL) — dezenter Bank-Ton, keine bunte Kachel.
const _initialsSvg = (name) => {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  const ini = ((parts[0] || '?')[0] + (parts[1] || '')[0] || '').toUpperCase();
  const palette = [
    { bg: '#0f2540', fg: '#f7f2e7' }, // Fröhlich-Blau
    { bg: '#c8a24b', fg: '#0f2540' }, // Gold
    { bg: '#1f3b5c', fg: '#f7f2e7' },
    { bg: '#e6dfd0', fg: '#0f2540' },
    { bg: '#334e6d', fg: '#f7f2e7' },
  ];
  const p = palette[_hash(name) % palette.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'>
    <rect width='40' height='40' fill='${p.bg}'/>
    <text x='50%' y='53%' text-anchor='middle' dominant-baseline='middle'
      font-family='Georgia, serif' font-size='16' fill='${p.fg}'>${ini}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Deterministische Avatar-Wahl je Kommentar-Slug.
 * Verteilung ~ 45 % Personen, 40 % Lifestyle-Motive, 15 % Initialen.
 * Reihenfolge/Verteilung wirkt zufällig, ist aber pro Slug stabil.
 */
const av = (slug, authorName = '') => {
  const h = _hash(slug || authorName);
  const bucket = h % 100;
  if (bucket < 15) {
    // 15 % Initialen — falls Name fehlt, doch Personenpool nutzen.
    if (authorName) return _initialsSvg(authorName);
  }
  if (bucket < 55) {
    // 40 % Lifestyle (Bucket 15–54)
    const pool = AVATAR_POOLS.lifestyle;
    return pool[Math.floor(h / 100) % pool.length];
  }
  // 45 % Personen (Bucket 55–99)
  const pool = AVATAR_POOLS.person;
  return pool[Math.floor(h / 100) % pool.length];
};

// Fallback bleibt erhalten — der Modal-Renderer versucht bei Fehler den SVG-Slug.
export const instagramCommentAvatarFallback = (slug) => _initialsSvg(slug || 'FV');

const companyReply = (id, text, when = 'vor 2 Wochen') => ({
  id,
  author: 'Fröhlich Vermögensberatung',
  avatar: PROFILE_AVATAR,
  publishedAt: when,
  text,
  isCompany: true,
});

export const instagramPostCommentsById = _enrichAvatars({
  'ig-1': [
    { id: 'ic1', author: 'Lena Hartmann', avatar: av('p01-lena-hartmann', undefined), publishedAt: 'vor 2 Wochen', text: 'Die Grid-Übersicht ist mega — hab direkt zwei Banken rausgepickt.' },
    { id: 'ic1b', author: 'Markus Schneider', avatar: av('p01-markus-schneider', undefined), publishedAt: 'vor 2 Wochen', text: 'Filter nach Laufzeit spart mir echt Zeit 👍' },
    { id: 'ic1c', author: 'Sophie Krämer', avatar: av('p01-sophie-kraemer', undefined), publishedAt: 'vor 2 Wochen', text: 'Endlich ein Vergleich ohne Werbebanner in jedem Feld.' },
    { id: 'ic2', author: 'Dominik Haas', avatar: av('p01-dominik-haas', undefined), publishedAt: 'vor 2 Wochen', text: 'Endlich ohne Newsletter-Spam vergleichen können.', replies: [companyReply('ic2r1', 'Danke — genau so soll der Vergleich funktionieren. 🙌')] },
    { id: 'ic1d', author: 'Nadine Schreiber', avatar: av('p01-nadine-schreiber', undefined), publishedAt: 'vor 2 Wochen', text: 'Hab den Screenshot an meine Schwester geschickt — versteht es sofort.' },
    { id: 'ic1e', author: 'Felix Brandt', avatar: av('p01-felix-brandt', undefined), publishedAt: 'vor 3 Wochen', text: 'Welche Banken sind gerade bei Tagesgeld vorn? Link reicht.' },
    { id: 'ic1f', author: 'Elena Voigt', avatar: av('p01-elena-voigt', undefined), publishedAt: 'vor 3 Wochen', text: 'Übersichtlich — genau was ich für mein Festgeld-Rücklagenkonto brauchte.' },
    { id: 'ic1g', author: 'Hannah Lorenz', avatar: av('p01-hannah-lorenz', undefined), publishedAt: 'vor 3 Wochen', text: 'Bitte mehr Posts zu EU-Einlagensicherung 🙏' },
    { id: 'ic1h', author: 'Timo Lehmann', avatar: av('p01-timo-lehmann', undefined), publishedAt: 'vor 3 Wochen', text: 'Nutze die Seite seit Monaten — dieser Post fasst es perfekt zusammen.' },
    { id: 'ic1i', author: 'Jürgen Hoffmann', avatar: av('p01-juergen-hoffmann', undefined), publishedAt: 'vor 3 Wochen', text: 'Klar strukturiert. Mehr davon!' },
  ],
  'ig-2': [
    { id: 'ic3', author: 'Kristin Neumann', avatar: av('p02-kristin-neumann', undefined), publishedAt: 'vor 4 Wochen', text: 'Story zu Sicherheit war super verständlich — danke!' },
    { id: 'ic4', author: 'Florian Keßler', avatar: av('p02-florian-kessler', undefined), publishedAt: 'vor 4 Wochen', text: 'Hätte ich vor meiner ersten Anlage lesen sollen.' },
    { id: 'ic2b', author: 'Jens Bartholomä', avatar: av('p02-jens-bartholomae', undefined), publishedAt: 'vor 4 Wochen', text: 'Einlagensicherung kurz erklärt — perfekt für Einsteiger.' },
    { id: 'ic2c', author: 'Corinna Weiß', avatar: av('p02-corinna-weiss', undefined), publishedAt: 'vor 4 Wochen', text: 'Highlight „Sicherheit“ ist jetzt Pflicht bei mir 📌' },
    { id: 'ic2d', author: 'Henrik Vogel', avatar: av('p02-henrik-vogel', undefined), publishedAt: 'vor 5 Wochen', text: 'Transparenz top — so soll Finanzcontent sein.' },
    { id: 'ic2e', author: 'Melanie Brandt', avatar: av('p02-melanie-brandt', undefined), publishedAt: 'vor 5 Wochen', text: 'Kurz und ohne Fachchinesisch — danke!' },
    { id: 'ic2f', author: 'Stefan Meyer', avatar: av('p02-stefan-meyer', undefined), publishedAt: 'vor 5 Wochen', text: 'Hab das meinen Eltern weitergeleitet — endlich verstanden 😊' },
    { id: 'ic2g', author: 'Katrin Scholz', avatar: av('p02-katrin-scholz', undefined), publishedAt: 'vor 5 Wochen', text: 'Gesetzlicher Schutz vs. freiwillig — bitte mal vertiefen?' },
    { id: 'ic2h', author: 'Oliver Franke', avatar: av('p02-oliver-franke', undefined), publishedAt: 'vor 5 Wochen', text: 'Sehr beruhigend vor der ersten Überweisung.' },
  ],
  'ig-3': [
    { id: 'ic5', author: 'Mira Soldan', avatar: av('p03-mira-soldan', undefined), publishedAt: 'vor 7 Wochen', text: 'Bonus kam nach 18 Tagen — stand vorher transparent im Angebot.' },
    { id: 'ic6', author: 'Tobias Jenisch', avatar: av('p03-tobias-jenisch', undefined), publishedAt: 'vor 7 Wochen', text: 'Gut, dass ihr die Bedingungen nicht im Kleingedruckten versteckt.' },
    { id: 'ic7', author: 'Sabine Wolff', avatar: av('p03-sabine-wolff', undefined), publishedAt: 'vor 6 Wochen', text: 'DM wäre nice — aber Website-FAQ hat auch gereicht 😄' },
    { id: 'ic3b', author: 'Annika Braun', avatar: av('p03-annika-braun', undefined), publishedAt: 'vor 7 Wochen', text: '300 € Neukunden-Bonus — hab die Checkliste in Bio genutzt.' },
    { id: 'ic3c', author: 'Rainer König', avatar: av('p03-rainer-koenig', undefined), publishedAt: 'vor 7 Wochen', text: 'Welche Bank zahlt gerade den höchsten Willkommensbonus?' },
    { id: 'ic3d', author: 'Claudia Hartmann', avatar: av('p03-claudia-hartmann', undefined), publishedAt: 'vor 7 Wochen', text: 'Endlich mal klare Zahlen statt „bis zu“ ohne Kontext.' },
    { id: 'ic3e', author: 'Sebastian Albrecht', avatar: av('p03-sebastian-albrecht', undefined), publishedAt: 'vor 8 Wochen', text: 'Hab zwei Angebote verglichen — Bonus war entscheidend.' },
    { id: 'ic3f', author: 'Ute Schmidt', avatar: av('p03-ute-schmidt', undefined), publishedAt: 'vor 8 Wochen', text: 'Bitte Update wenn sich Konditionen ändern 🔔' },
    { id: 'ic3g', author: 'Martin Behrens', avatar: av('p03-martin-behrens', undefined), publishedAt: 'vor 8 Wochen', text: 'Fair kommuniziert — kein Clickbait.' },
    { id: 'ic3h', author: 'Lisa Wagner', avatar: av('p03-lisa-wagner', undefined), publishedAt: 'vor 8 Wochen', text: 'Mein Partner hat auch direkt mitgemacht — Doppelbonus möglich?' },
  ],
  'ig-4': [
    { id: 'ic8', author: 'Viktor Pohl', avatar: av('p04-viktor-pohl', undefined), publishedAt: 'vor 10 Wochen', text: 'Screenshot für meine Eltern geschickt — die verstehen das Layout sofort.' },
    { id: 'ic4b', author: 'Heike Zimmermann', avatar: av('p04-heike-zimmermann', undefined), publishedAt: 'vor 10 Wochen', text: 'Zinsrechner in Bio ist Gold wert 📊' },
    { id: 'ic4c', author: 'Thomas Krüger', avatar: av('p04-thomas-krueger', undefined), publishedAt: 'vor 10 Wochen', text: 'Filter nach Mindestanlage — endlich!' },
    { id: 'ic4d', author: 'Sandra Becker', avatar: av('p04-sandra-becker', undefined), publishedAt: 'vor 11 Wochen', text: '12 Monate vs. 24 — Unterschied gut erklärt im Post.' },
    { id: 'ic4e', author: 'Patrick Albrecht', avatar: av('p04-patrick-albrecht', undefined), publishedAt: 'vor 11 Wochen', text: 'Aktuelle Top-Zinsen bitte monatlich posten 🙏' },
    { id: 'ic4f', author: 'Monika Drechsler', avatar: av('p04-monika-drechsler', undefined), publishedAt: 'vor 11 Wochen', text: 'Link in Bio funktioniert einwandfrei.' },
    { id: 'ic4g', author: 'Timo Engel', avatar: av('p04-timo-engel', undefined), publishedAt: 'vor 11 Wochen', text: 'Übersichtlicher als jede Bank-App einzeln.' },
    { id: 'ic4h', author: 'Frank Ostermann', avatar: av('p04-frank-ostermann', undefined), publishedAt: 'vor 11 Wochen', text: 'Hab direkt zwei Festgeld-Angebote rausgepickt.' },
    { id: 'ic4i', author: 'Simone Bauer', avatar: av('p04-simone-bauer', undefined), publishedAt: 'vor 12 Wochen', text: 'Klarer Call-to-Action — ohne Druck.' },
  ],
  'ig-5': [
    { id: 'ic9', author: 'Andrea Fuchs', avatar: av('p05-andrea-fuchs', undefined), publishedAt: 'vor 13 Wochen', text: 'Genau was ich für mein Notgroschen gesucht hab.' },
    { id: 'ic5b', author: 'Jonas Werth', avatar: av('p05-jonas-werth', undefined), publishedAt: 'vor 13 Wochen', text: 'Täglich verfügbar + Zins im Blick — perfekte Kombi.' },
    { id: 'ic5c', author: 'Kerstin Möller', avatar: av('p05-kerstin-moeller', undefined), publishedAt: 'vor 13 Wochen', text: 'Hab drei Tagesgeld-Konten verglichen — spart Nerven.' },
    { id: 'ic5d', author: 'Bernd Falk', avatar: av('p05-bernd-falk', undefined), publishedAt: 'vor 14 Wochen', text: 'Liquidität war mir wichtiger als 0,1 % mehr Zins — Post trifft’s.' },
    { id: 'ic5e', author: 'Ines Pollak', avatar: av('p05-ines-pollak', undefined), publishedAt: 'vor 14 Wochen', text: 'Notgroschen-Strategie in den Stories? Wäre super.' },
    { id: 'ic5f', author: 'Christian Ade', avatar: av('p05-christian-ade', undefined), publishedAt: 'vor 14 Wochen', text: 'EU-Banken auf einen Blick — genial.' },
    { id: 'ic5g', author: 'Stefanie Roth', avatar: av('p05-stefanie-roth', undefined), publishedAt: 'vor 14 Wochen', text: 'Kurz, klar, ohne Werbesprech.' },
    { id: 'ic5h', author: 'Jörg Eisenhauer', avatar: av('p05-joerg-eisenhauer', undefined), publishedAt: 'vor 15 Wochen', text: 'Mein Konto ist eröffnet — danke für den Tipp!' },
    { id: 'ic5i', author: 'Nicole Brandt', avatar: av('p05-nicole-brandt', undefined), publishedAt: 'vor 15 Wochen', text: 'Zinsalarm wäre noch ein nice Feature.' },
  ],
  'ig-6': [
    { id: 'ic10', author: 'Jana Kirsch', avatar: av('p06-jana-kirsch', undefined), publishedAt: 'vor 15 Wochen', text: 'Unterschied zu Festgeld endlich verstanden — danke für den Post.' },
    { id: 'ic6b', author: 'Lars Heinrich', avatar: av('p06-lars-heinrich', undefined), publishedAt: 'vor 15 Wochen', text: 'Flexgeld = sweet spot zwischen Zins und Flex — stimmt.' },
    { id: 'ic6c', author: 'Birgit Schulz', avatar: av('p06-birgit-schulz', undefined), publishedAt: 'vor 16 Wochen', text: 'Kündigungsfristen waren mir unklar — Website hat geholfen.' },
    { id: 'ic6d', author: 'Dirk Hoffmeister', avatar: av('p06-dirk-hoffmeister', undefined), publishedAt: 'vor 16 Wochen', text: 'Hab 50/50 Festgeld + Flexgeld aufgeteilt — Post als Inspiration.' },
    { id: 'ic6e', author: 'Greta Hoffmann', avatar: av('p06-greta-hoffmann', undefined), publishedAt: 'vor 16 Wochen', text: 'Mehr Infos zu vorzeitiger Auszahlung?' },
    { id: 'ic6f', author: 'Werner Scholz', avatar: av('p06-werner-scholz', undefined), publishedAt: 'vor 16 Wochen', text: 'Vergleichstabelle in Bio ist 🔥' },
    { id: 'ic6g', author: 'Carina Ebert', avatar: av('p06-carina-ebert', undefined), publishedAt: 'vor 17 Wochen', text: 'Endlich verständlich erklärt — teile ich im Familienchat.' },
    { id: 'ic6h', author: 'Moritz Franke', avatar: av('p06-moritz-franke', undefined), publishedAt: 'vor 17 Wochen', text: 'Flexgeld für Hausumbau-Rücklage — passt perfekt.' },
  ],
  'ig-7': [
    { id: 'ic7a', author: 'Ralf Schubert', avatar: av('p07-ralf-schubert', undefined), publishedAt: 'vor 19 Wochen', text: 'Schönes Büro-Foto — wirkt professionell und nahbar.' },
    { id: 'ic7b', author: 'Daniela Krämer', avatar: av('p07-daniela-kraemer', undefined), publishedAt: 'vor 19 Wochen', text: 'Termin online gebucht — lief reibungslos.' },
    { id: 'ic7c', author: 'Holger Winkler', avatar: av('p07-holger-winkler', undefined), publishedAt: 'vor 20 Wochen', text: 'Frankfurt Standort ist für mich perfekt erreichbar.' },
    { id: 'ic7d', author: 'Angelika Renner', avatar: av('p07-angelika-renner', undefined), publishedAt: 'vor 20 Wochen', text: 'Persönliche Beratung ohne Verkaufsdruck — selten!' },
    { id: 'ic7e', author: 'Fabian Lorenz', avatar: av('p07-fabian-lorenz', undefined), publishedAt: 'vor 20 Wochen', text: 'Adresse gespeichert — vielleicht mal vorbeischauen.' },
    { id: 'ic7f', author: 'Heike Sturm', avatar: av('p07-heike-sturm', undefined), publishedAt: 'vor 21 Wochen', text: 'Team wirkt kompetent 👏' },
    { id: 'ic7g', author: 'Günter Bach', avatar: av('p07-guenter-bach', undefined), publishedAt: 'vor 21 Wochen', text: 'Gute Mischung aus digital + vor Ort.' },
  ],
  'ig-8': [
    { id: 'ic8a', author: 'Petra Lindemann', avatar: av('p08-petra-lindemann', undefined), publishedAt: 'vor 21 Wochen', text: 'Menschen hinter der Plattform — das überzeugt mich mehr als Ads.' },
    { id: 'ic8b', author: 'Henrik Vogel', avatar: av('p08-henrik-vogel', undefined), publishedAt: 'vor 22 Wochen', text: 'Story „Team“ angeschaut — sympathisch!' },
    { id: 'ic8c', author: 'Susanne Keller', avatar: av('p08-susanne-keller', undefined), publishedAt: 'vor 22 Wochen', text: 'Vertrauen entsteht durch Gesichter — gut gemacht.' },
    { id: 'ic8d', author: 'Marcel Dietrich', avatar: av('p08-marcel-dietrich', undefined), publishedAt: 'vor 22 Wochen', text: 'Algorithmus + Menschen — beste Kombi.' },
    { id: 'ic8e', author: 'Sonja Peters', avatar: av('p08-sonja-peters', undefined), publishedAt: 'vor 23 Wochen', text: 'Mehr BTS-Content bitte 🎬' },
    { id: 'ic8f', author: 'Ulrich Brenner', avatar: av('p08-ulrich-brenner', undefined), publishedAt: 'vor 23 Wochen', text: 'Authentisch — nicht gestellt.' },
    { id: 'ic8g', author: 'Julia Stein', avatar: av('p08-julia-stein', undefined), publishedAt: 'vor 23 Wochen', text: 'Folge euch seit dem Post — spannend!' },
    { id: 'ic8h', author: 'Axel Schäfer', avatar: av('p08-axel-schaefer', undefined), publishedAt: 'vor 23 Wochen', text: 'Team-Post hat mich überzeugt.' },
  ],
  'ig-9': [
    { id: 'ic9a', author: 'Corinna Weiß', avatar: av('p09-corinna-weiss', undefined), publishedAt: 'vor 25 Wochen', text: 'EU-Netzwerk klingt seriös — genau mein Thema.' },
    { id: 'ic9b', author: 'Michael Brenner', avatar: av('p09-michael-brenner', undefined), publishedAt: 'vor 25 Wochen', text: 'Partnerbanken in NL & DE — hab beides genutzt.' },
    { id: 'ic9c', author: 'Sabine Krüger', avatar: av('p09-sabine-krueger', undefined), publishedAt: 'vor 26 Wochen', text: 'Transparenz bei Vermittlung — wichtig!' },
    { id: 'ic9d', author: 'Jonas Meier', avatar: av('p09-jonas-meier', undefined), publishedAt: 'vor 26 Wochen', text: '🇪🇺 Flagge im Post — nice Detail.' },
    { id: 'ic9e', author: 'Anna Hoffmann', avatar: av('p09-anna-hoffmann', undefined), publishedAt: 'vor 26 Wochen', text: 'Strukturiert statt wilder Bankenliste — danke.' },
    { id: 'ic9f', author: 'Felix Brandt', avatar: av('p09-felix-brandt', undefined), publishedAt: 'vor 27 Wochen', text: 'Hab zwei EU-Banken über euch gefunden — läuft.' },
    { id: 'ic9g', author: 'Kirsten Adam', avatar: av('p09-kirsten-adam', undefined), publishedAt: 'vor 27 Wochen', text: 'Mehr Karten zu einzelnen Ländern?' },
    { id: 'ic9h', author: 'Bettina Graf', avatar: av('p09-bettina-graf', undefined), publishedAt: 'vor 27 Wochen', text: 'Seriös vermittelt — keine versteckten Fees im Post.' },
  ],
});

/**
 * Ersetzt für ~15 % der Kommentare den Personen-/Lifestyle-Avatar durch
 * einen Initialen-Avatar auf Basis des jeweiligen `author`. Deterministisch
 * pro `id`, damit die Verteilung stabil bleibt.
 */
function _enrichAvatars(byId) {
  Object.values(byId).forEach((list) => {
    list.forEach((c) => {
      if (c.isCompany) return;
      const bucket = _hash(c.id || c.author) % 100;
      if (bucket < 15) {
        c.avatar = _initialsSvg(c.author);
      }
    });
  });
  return byId;
}

export default instagramPostCommentsById;
