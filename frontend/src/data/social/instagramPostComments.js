/** Synthetic Instagram post comments — unique German accounts per post, own avatar each. */
const IG = '/assets/social/instagram';
const IG_V = '?v=32';
const PROFILE_AVATAR = '/assets/logo/frohlich-mark.png?v=3';

/** AI-generated PNG per synthetic account; SVG fallback on load error. */
const av = (_slug) => '/assets/social/placeholder.svg';
export const instagramCommentAvatarFallback = (slug) => `${IG}/avatars/generated/${slug}.svg${IG_V}`;

const companyReply = (id, text, when = 'vor 2 Wochen') => ({
  id,
  author: 'Fröhlich Vermögensberatung',
  avatar: PROFILE_AVATAR,
  publishedAt: when,
  text,
  isCompany: true,
});

export const instagramPostCommentsById = {
  'ig-1': [
    { id: 'ic1', author: 'Lena Hartmann', avatar: av('p01-lena-hartmann'), publishedAt: 'vor 2 Wochen', text: 'Die Grid-Übersicht ist mega — hab direkt zwei Banken rausgepickt.' },
    { id: 'ic1b', author: 'Markus Schneider', avatar: av('p01-markus-schneider'), publishedAt: 'vor 2 Wochen', text: 'Filter nach Laufzeit spart mir echt Zeit 👍' },
    { id: 'ic1c', author: 'Sophie Krämer', avatar: av('p01-sophie-kraemer'), publishedAt: 'vor 2 Wochen', text: 'Endlich ein Vergleich ohne Werbebanner in jedem Feld.' },
    { id: 'ic2', author: 'Dominik Haas', avatar: av('p01-dominik-haas'), publishedAt: 'vor 2 Wochen', text: 'Endlich ohne Newsletter-Spam vergleichen können.', replies: [companyReply('ic2r1', 'Danke — genau so soll der Vergleich funktionieren. 🙌')] },
    { id: 'ic1d', author: 'Nadine Schreiber', avatar: av('p01-nadine-schreiber'), publishedAt: 'vor 2 Wochen', text: 'Hab den Screenshot an meine Schwester geschickt — versteht es sofort.' },
    { id: 'ic1e', author: 'Felix Brandt', avatar: av('p01-felix-brandt'), publishedAt: 'vor 3 Wochen', text: 'Welche Banken sind gerade bei Tagesgeld vorn? Link reicht.' },
    { id: 'ic1f', author: 'Elena Voigt', avatar: av('p01-elena-voigt'), publishedAt: 'vor 3 Wochen', text: 'Übersichtlich — genau was ich für mein Festgeld-Rücklagenkonto brauchte.' },
    { id: 'ic1g', author: 'Hannah Lorenz', avatar: av('p01-hannah-lorenz'), publishedAt: 'vor 3 Wochen', text: 'Bitte mehr Posts zu EU-Einlagensicherung 🙏' },
    { id: 'ic1h', author: 'Timo Lehmann', avatar: av('p01-timo-lehmann'), publishedAt: 'vor 3 Wochen', text: 'Nutze die Seite seit Monaten — dieser Post fasst es perfekt zusammen.' },
    { id: 'ic1i', author: 'Jürgen Hoffmann', avatar: av('p01-juergen-hoffmann'), publishedAt: 'vor 3 Wochen', text: 'Klar strukturiert. Mehr davon!' },
  ],
  'ig-2': [
    { id: 'ic3', author: 'Kristin Neumann', avatar: av('p02-kristin-neumann'), publishedAt: 'vor 4 Wochen', text: 'Story zu Sicherheit war super verständlich — danke!' },
    { id: 'ic4', author: 'Florian Keßler', avatar: av('p02-florian-kessler'), publishedAt: 'vor 4 Wochen', text: 'Hätte ich vor meiner ersten Anlage lesen sollen.' },
    { id: 'ic2b', author: 'Jens Bartholomä', avatar: av('p02-jens-bartholomae'), publishedAt: 'vor 4 Wochen', text: 'Einlagensicherung kurz erklärt — perfekt für Einsteiger.' },
    { id: 'ic2c', author: 'Corinna Weiß', avatar: av('p02-corinna-weiss'), publishedAt: 'vor 4 Wochen', text: 'Highlight „Sicherheit“ ist jetzt Pflicht bei mir 📌' },
    { id: 'ic2d', author: 'Henrik Vogel', avatar: av('p02-henrik-vogel'), publishedAt: 'vor 5 Wochen', text: 'Transparenz top — so soll Finanzcontent sein.' },
    { id: 'ic2e', author: 'Melanie Brandt', avatar: av('p02-melanie-brandt'), publishedAt: 'vor 5 Wochen', text: 'Kurz und ohne Fachchinesisch — danke!' },
    { id: 'ic2f', author: 'Stefan Meyer', avatar: av('p02-stefan-meyer'), publishedAt: 'vor 5 Wochen', text: 'Hab das meinen Eltern weitergeleitet — endlich verstanden 😊' },
    { id: 'ic2g', author: 'Katrin Scholz', avatar: av('p02-katrin-scholz'), publishedAt: 'vor 5 Wochen', text: 'Gesetzlicher Schutz vs. freiwillig — bitte mal vertiefen?' },
    { id: 'ic2h', author: 'Oliver Franke', avatar: av('p02-oliver-franke'), publishedAt: 'vor 5 Wochen', text: 'Sehr beruhigend vor der ersten Überweisung.' },
  ],
  'ig-3': [
    { id: 'ic5', author: 'Mira Soldan', avatar: av('p03-mira-soldan'), publishedAt: 'vor 7 Wochen', text: 'Bonus kam nach 18 Tagen — stand vorher transparent im Angebot.' },
    { id: 'ic6', author: 'Tobias Jenisch', avatar: av('p03-tobias-jenisch'), publishedAt: 'vor 7 Wochen', text: 'Gut, dass ihr die Bedingungen nicht im Kleingedruckten versteckt.' },
    { id: 'ic7', author: 'Sabine Wolff', avatar: av('p03-sabine-wolff'), publishedAt: 'vor 6 Wochen', text: 'DM wäre nice — aber Website-FAQ hat auch gereicht 😄' },
    { id: 'ic3b', author: 'Annika Braun', avatar: av('p03-annika-braun'), publishedAt: 'vor 7 Wochen', text: '300 € Neukunden-Bonus — hab die Checkliste in Bio genutzt.' },
    { id: 'ic3c', author: 'Rainer König', avatar: av('p03-rainer-koenig'), publishedAt: 'vor 7 Wochen', text: 'Welche Bank zahlt gerade den höchsten Willkommensbonus?' },
    { id: 'ic3d', author: 'Claudia Hartmann', avatar: av('p03-claudia-hartmann'), publishedAt: 'vor 7 Wochen', text: 'Endlich mal klare Zahlen statt „bis zu“ ohne Kontext.' },
    { id: 'ic3e', author: 'Sebastian Albrecht', avatar: av('p03-sebastian-albrecht'), publishedAt: 'vor 8 Wochen', text: 'Hab zwei Angebote verglichen — Bonus war entscheidend.' },
    { id: 'ic3f', author: 'Ute Schmidt', avatar: av('p03-ute-schmidt'), publishedAt: 'vor 8 Wochen', text: 'Bitte Update wenn sich Konditionen ändern 🔔' },
    { id: 'ic3g', author: 'Martin Behrens', avatar: av('p03-martin-behrens'), publishedAt: 'vor 8 Wochen', text: 'Fair kommuniziert — kein Clickbait.' },
    { id: 'ic3h', author: 'Lisa Wagner', avatar: av('p03-lisa-wagner'), publishedAt: 'vor 8 Wochen', text: 'Mein Partner hat auch direkt mitgemacht — Doppelbonus möglich?' },
  ],
  'ig-4': [
    { id: 'ic8', author: 'Viktor Pohl', avatar: av('p04-viktor-pohl'), publishedAt: 'vor 10 Wochen', text: 'Screenshot für meine Eltern geschickt — die verstehen das Layout sofort.' },
    { id: 'ic4b', author: 'Heike Zimmermann', avatar: av('p04-heike-zimmermann'), publishedAt: 'vor 10 Wochen', text: 'Zinsrechner in Bio ist Gold wert 📊' },
    { id: 'ic4c', author: 'Thomas Krüger', avatar: av('p04-thomas-krueger'), publishedAt: 'vor 10 Wochen', text: 'Filter nach Mindestanlage — endlich!' },
    { id: 'ic4d', author: 'Sandra Becker', avatar: av('p04-sandra-becker'), publishedAt: 'vor 11 Wochen', text: '12 Monate vs. 24 — Unterschied gut erklärt im Post.' },
    { id: 'ic4e', author: 'Patrick Albrecht', avatar: av('p04-patrick-albrecht'), publishedAt: 'vor 11 Wochen', text: 'Aktuelle Top-Zinsen bitte monatlich posten 🙏' },
    { id: 'ic4f', author: 'Monika Drechsler', avatar: av('p04-monika-drechsler'), publishedAt: 'vor 11 Wochen', text: 'Link in Bio funktioniert einwandfrei.' },
    { id: 'ic4g', author: 'Timo Engel', avatar: av('p04-timo-engel'), publishedAt: 'vor 11 Wochen', text: 'Übersichtlicher als jede Bank-App einzeln.' },
    { id: 'ic4h', author: 'Frank Ostermann', avatar: av('p04-frank-ostermann'), publishedAt: 'vor 11 Wochen', text: 'Hab direkt zwei Festgeld-Angebote rausgepickt.' },
    { id: 'ic4i', author: 'Simone Bauer', avatar: av('p04-simone-bauer'), publishedAt: 'vor 12 Wochen', text: 'Klarer Call-to-Action — ohne Druck.' },
  ],
  'ig-5': [
    { id: 'ic9', author: 'Andrea Fuchs', avatar: av('p05-andrea-fuchs'), publishedAt: 'vor 13 Wochen', text: 'Genau was ich für mein Notgroschen gesucht hab.' },
    { id: 'ic5b', author: 'Jonas Werth', avatar: av('p05-jonas-werth'), publishedAt: 'vor 13 Wochen', text: 'Täglich verfügbar + Zins im Blick — perfekte Kombi.' },
    { id: 'ic5c', author: 'Kerstin Möller', avatar: av('p05-kerstin-moeller'), publishedAt: 'vor 13 Wochen', text: 'Hab drei Tagesgeld-Konten verglichen — spart Nerven.' },
    { id: 'ic5d', author: 'Bernd Falk', avatar: av('p05-bernd-falk'), publishedAt: 'vor 14 Wochen', text: 'Liquidität war mir wichtiger als 0,1 % mehr Zins — Post trifft’s.' },
    { id: 'ic5e', author: 'Ines Pollak', avatar: av('p05-ines-pollak'), publishedAt: 'vor 14 Wochen', text: 'Notgroschen-Strategie in den Stories? Wäre super.' },
    { id: 'ic5f', author: 'Christian Ade', avatar: av('p05-christian-ade'), publishedAt: 'vor 14 Wochen', text: 'EU-Banken auf einen Blick — genial.' },
    { id: 'ic5g', author: 'Stefanie Roth', avatar: av('p05-stefanie-roth'), publishedAt: 'vor 14 Wochen', text: 'Kurz, klar, ohne Werbesprech.' },
    { id: 'ic5h', author: 'Jörg Eisenhauer', avatar: av('p05-joerg-eisenhauer'), publishedAt: 'vor 15 Wochen', text: 'Mein Konto ist eröffnet — danke für den Tipp!' },
    { id: 'ic5i', author: 'Nicole Brandt', avatar: av('p05-nicole-brandt'), publishedAt: 'vor 15 Wochen', text: 'Zinsalarm wäre noch ein nice Feature.' },
  ],
  'ig-6': [
    { id: 'ic10', author: 'Jana Kirsch', avatar: av('p06-jana-kirsch'), publishedAt: 'vor 15 Wochen', text: 'Unterschied zu Festgeld endlich verstanden — danke für den Post.' },
    { id: 'ic6b', author: 'Lars Heinrich', avatar: av('p06-lars-heinrich'), publishedAt: 'vor 15 Wochen', text: 'Flexgeld = sweet spot zwischen Zins und Flex — stimmt.' },
    { id: 'ic6c', author: 'Birgit Schulz', avatar: av('p06-birgit-schulz'), publishedAt: 'vor 16 Wochen', text: 'Kündigungsfristen waren mir unklar — Website hat geholfen.' },
    { id: 'ic6d', author: 'Dirk Hoffmeister', avatar: av('p06-dirk-hoffmeister'), publishedAt: 'vor 16 Wochen', text: 'Hab 50/50 Festgeld + Flexgeld aufgeteilt — Post als Inspiration.' },
    { id: 'ic6e', author: 'Greta Hoffmann', avatar: av('p06-greta-hoffmann'), publishedAt: 'vor 16 Wochen', text: 'Mehr Infos zu vorzeitiger Auszahlung?' },
    { id: 'ic6f', author: 'Werner Scholz', avatar: av('p06-werner-scholz'), publishedAt: 'vor 16 Wochen', text: 'Vergleichstabelle in Bio ist 🔥' },
    { id: 'ic6g', author: 'Carina Ebert', avatar: av('p06-carina-ebert'), publishedAt: 'vor 17 Wochen', text: 'Endlich verständlich erklärt — teile ich im Familienchat.' },
    { id: 'ic6h', author: 'Moritz Franke', avatar: av('p06-moritz-franke'), publishedAt: 'vor 17 Wochen', text: 'Flexgeld für Hausumbau-Rücklage — passt perfekt.' },
  ],
  'ig-7': [
    { id: 'ic7a', author: 'Ralf Schubert', avatar: av('p07-ralf-schubert'), publishedAt: 'vor 19 Wochen', text: 'Schönes Büro-Foto — wirkt professionell und nahbar.' },
    { id: 'ic7b', author: 'Daniela Krämer', avatar: av('p07-daniela-kraemer'), publishedAt: 'vor 19 Wochen', text: 'Termin online gebucht — lief reibungslos.' },
    { id: 'ic7c', author: 'Holger Winkler', avatar: av('p07-holger-winkler'), publishedAt: 'vor 20 Wochen', text: 'Frankfurt Standort ist für mich perfekt erreichbar.' },
    { id: 'ic7d', author: 'Angelika Renner', avatar: av('p07-angelika-renner'), publishedAt: 'vor 20 Wochen', text: 'Persönliche Beratung ohne Verkaufsdruck — selten!' },
    { id: 'ic7e', author: 'Fabian Lorenz', avatar: av('p07-fabian-lorenz'), publishedAt: 'vor 20 Wochen', text: 'Adresse gespeichert — vielleicht mal vorbeischauen.' },
    { id: 'ic7f', author: 'Heike Sturm', avatar: av('p07-heike-sturm'), publishedAt: 'vor 21 Wochen', text: 'Team wirkt kompetent 👏' },
    { id: 'ic7g', author: 'Günter Bach', avatar: av('p07-guenter-bach'), publishedAt: 'vor 21 Wochen', text: 'Gute Mischung aus digital + vor Ort.' },
  ],
  'ig-8': [
    { id: 'ic8a', author: 'Petra Lindemann', avatar: av('p08-petra-lindemann'), publishedAt: 'vor 21 Wochen', text: 'Menschen hinter der Plattform — das überzeugt mich mehr als Ads.' },
    { id: 'ic8b', author: 'Henrik Vogel', avatar: av('p08-henrik-vogel'), publishedAt: 'vor 22 Wochen', text: 'Story „Team“ angeschaut — sympathisch!' },
    { id: 'ic8c', author: 'Susanne Keller', avatar: av('p08-susanne-keller'), publishedAt: 'vor 22 Wochen', text: 'Vertrauen entsteht durch Gesichter — gut gemacht.' },
    { id: 'ic8d', author: 'Marcel Dietrich', avatar: av('p08-marcel-dietrich'), publishedAt: 'vor 22 Wochen', text: 'Algorithmus + Menschen — beste Kombi.' },
    { id: 'ic8e', author: 'Sonja Peters', avatar: av('p08-sonja-peters'), publishedAt: 'vor 23 Wochen', text: 'Mehr BTS-Content bitte 🎬' },
    { id: 'ic8f', author: 'Ulrich Brenner', avatar: av('p08-ulrich-brenner'), publishedAt: 'vor 23 Wochen', text: 'Authentisch — nicht gestellt.' },
    { id: 'ic8g', author: 'Julia Stein', avatar: av('p08-julia-stein'), publishedAt: 'vor 23 Wochen', text: 'Folge euch seit dem Post — spannend!' },
    { id: 'ic8h', author: 'Axel Schäfer', avatar: av('p08-axel-schaefer'), publishedAt: 'vor 23 Wochen', text: 'Team-Post hat mich überzeugt.' },
  ],
  'ig-9': [
    { id: 'ic9a', author: 'Corinna Weiß', avatar: av('p09-corinna-weiss'), publishedAt: 'vor 25 Wochen', text: 'EU-Netzwerk klingt seriös — genau mein Thema.' },
    { id: 'ic9b', author: 'Michael Brenner', avatar: av('p09-michael-brenner'), publishedAt: 'vor 25 Wochen', text: 'Partnerbanken in NL & DE — hab beides genutzt.' },
    { id: 'ic9c', author: 'Sabine Krüger', avatar: av('p09-sabine-krueger'), publishedAt: 'vor 26 Wochen', text: 'Transparenz bei Vermittlung — wichtig!' },
    { id: 'ic9d', author: 'Jonas Meier', avatar: av('p09-jonas-meier'), publishedAt: 'vor 26 Wochen', text: '🇪🇺 Flagge im Post — nice Detail.' },
    { id: 'ic9e', author: 'Anna Hoffmann', avatar: av('p09-anna-hoffmann'), publishedAt: 'vor 26 Wochen', text: 'Strukturiert statt wilder Bankenliste — danke.' },
    { id: 'ic9f', author: 'Felix Brandt', avatar: av('p09-felix-brandt'), publishedAt: 'vor 27 Wochen', text: 'Hab zwei EU-Banken über euch gefunden — läuft.' },
    { id: 'ic9g', author: 'Kirsten Adam', avatar: av('p09-kirsten-adam'), publishedAt: 'vor 27 Wochen', text: 'Mehr Karten zu einzelnen Ländern?' },
    { id: 'ic9h', author: 'Bettina Graf', avatar: av('p09-bettina-graf'), publishedAt: 'vor 27 Wochen', text: 'Seriös vermittelt — keine versteckten Fees im Post.' },
  ],
};

export default instagramPostCommentsById;
