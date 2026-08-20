import siteContact from '@/data/siteContact';
import { socialCopy } from '@/data/siteCopyPhase5';
import { POST_IMG, NEUTRAL_FALLBACK } from '@/data/social/postArtwork';

const SITE_LOGO = '/assets/logo/frohlich-logo.png?v=3';
const TEAM_AVATAR = '/assets/social/team/team-neutral.svg';
const SERVICE_AVATAR = '/assets/social/team/service-neutral.svg';
const NEUTRAL_PAGE = '/assets/social/pages/neutral-page.svg';

/** Statische LinkedIn-Unternehmensseiten-Vorschau — Fröhlich Vermögensberatung GmbH.
 *  Bilder werden zentral aus /data/social/postArtwork geteilt — kein FV-Platzhalter. */
export const linkedinProfile = {
  platform: 'linkedin',
  companyName: 'Fröhlich Vermögensberatung GmbH',
  tagline: socialCopy.tagline,
  // TODO(Fröhlich Vermögensberatung): echten LinkedIn-Vanity-Slug bestätigen.
  vanityUrl: 'froehlich-vermoegensberatung',
  verified: false,
  industry: 'Finanzdienstleistungen',
  companyType: 'Vermögensberatung',
  companySize: '2–10 Beschäftigte',
  location: 'Bad Kreuznach, Deutschland',
  stats: { followers: 640, pageViews: 312, employees: '2–10', founded: 2020 },
  specialties: [
    'Vermögensaufbau',
    'Sparen & Einlagen',
    'Anlageplanung',
    'Diversifikation',
    'Langfristige Beratung',
  ],
  intro:
    'Fröhlich Vermögensberatung GmbH — langfristige Vermögensberatung mit Fokus auf Diversifikation, Risikobewusstsein und einer nachvollziehbaren Kommunikation. Keine Anlageberatung über Social Media.',
  about: {
    overview: {
      intro: [
        'Die Fröhlich Vermögensberatung GmbH wurde 2020 gegründet und begleitet Kunden bei finanziellen Entscheidungen mit einer langfristigen Perspektive.',
        'Unser Anspruch ist es, langfristige Beziehungen aufzubauen — nicht kurzfristige Abschlüsse.',
      ],
      focus: {
        title: 'Unser Fokus liegt auf:',
        items: [
          'langfristigem Vermögensaufbau',
          'strukturierter Anlageplanung',
          'Diversifikation und Risikobewusstsein',
          'nachvollziehbaren Entscheidungen',
          'ruhiger, persönlicher Beratung',
        ],
      },
      bridge:
        'Wir informieren allgemeinverständlich und helfen dabei, Ordnung in die eigenen Finanzen zu bringen — Schritt für Schritt.',
      services: {
        title: 'Unsere Themen umfassen unter anderem:',
        items: ['Vermögensaufbau', 'Spar- und Einlagenlösungen', 'Anlageplanung', 'Diversifikation', 'Persönliche Betreuung'],
      },
      closing: [
        'Sicherheit, Transparenz und Verlässlichkeit stehen im Mittelpunkt unserer Arbeit.',
        'Wir kommunizieren ohne Fachchinesisch und begleiten Sie mit Geduld und Struktur.',
      ],
      tags: ['📍 Bad Kreuznach', '🔗 Vermögensaufbau · Sparen · Diversifikation'],
    },
    products: [
      { label: 'Über uns', href: '/about' },
      { label: 'Sicherheit', href: '/security' },
      { label: 'Kontakt', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
    ],
    regulation: 'Fröhlich Vermögensberatung GmbH · Keine Anlageberatung über Social Media.',
  },
  contact: {
    email: siteContact.email,
    phone: siteContact.phoneDisplay,
    phoneTel: siteContact.phoneTel,
    // Marketing-Domain
    website: 'kapital-direkt24.de',
    websiteHref: 'https://kapital-direkt24.de/',
    street: siteContact.street,
    city: siteContact.postalCity,
    hours: siteContact.businessHoursLine,
  },
  locations: [
    { id: 'hq', label: 'Hauptsitz', address: `${siteContact.street}, ${siteContact.postalCity}` },
  ],

  /** Cover: thematisches Motiv statt FV-Platzhalter. */
  assets: {
    cover: POST_IMG.vermoegensaufbau,
    logo: SITE_LOGO,
    fallback: NEUTRAL_FALLBACK,
  },

  /** Pinned = Philosophie-Beitrag. */
  pinnedPostId: 'li-beratung',

  /** Mitarbeiter — neutrale Team-Icons, KEINE erfundenen Portraits. */
  employees: [
    { id: 'e1', name: 'Team Fröhlich Vermögensberatung', role: 'Beratung', avatar: TEAM_AVATAR },
    { id: 'e2', name: 'Kundenservice', role: 'Betreuung', avatar: SERVICE_AVATAR },
  ],

  /** Produkte — jedes mit eigenem thematischem Bild. */
  products: [
    {
      id: 'prod-1',
      title: 'Vermögensaufbau',
      description: 'Langfristig strukturierter Aufbau — ruhig, transparent und nachvollziehbar geplant.',
      href: '/about',
      image: POST_IMG.vermoegensaufbau,
    },
    {
      id: 'prod-2',
      title: 'Spar- und Einlagenlösungen',
      description: 'Tagesgeld, Festgeld und Sparlösungen als Baustein einer übergeordneten Vermögensplanung.',
      href: '/faq',
      image: POST_IMG.festgeld,
    },
    {
      id: 'prod-3',
      title: 'Diversifikation',
      description: 'Chancen und Risiken bewusst kombinieren — statt alles auf eine Karte zu setzen.',
      href: '/about',
      image: POST_IMG.diversifikation,
    },
  ],

  /** Mediengalerie — 8 unterschiedliche Motive, alle über die Lightbox aufrufbar. */
  media: [
    { id: 'm1', src: POST_IMG.tagesgeld,         alt: 'Tagesgeld — flexibel sparen',                    type: 'image', postId: 'li-tagesgeld' },
    { id: 'm2', src: POST_IMG.festgeld,          alt: 'Festgeld — planbar anlegen',                     type: 'image', postId: 'li-festgeld' },
    { id: 'm3', src: POST_IMG.einlagensicherung, alt: 'Einlagensicherung — Sicherheit für Ersparnisse', type: 'image', postId: 'li-einlagensicherung' },
    { id: 'm4', src: POST_IMG.vermoegensaufbau,  alt: 'Vermögensaufbau — Schritt für Schritt',          type: 'image', postId: 'li-vermoegensaufbau' },
    { id: 'm5', src: POST_IMG.diversifikation,   alt: 'Diversifikation — Nicht alles auf eine Karte',   type: 'image', postId: 'li-diversifikation' },
    { id: 'm6', src: POST_IMG.beratung,          alt: 'Beratung — langfristige Zusammenarbeit',         type: 'image', postId: 'li-beratung' },
    { id: 'm7', src: POST_IMG.zinsen,            alt: 'Zinsen im Blick behalten',                       type: 'image' },
    { id: 'm8', src: POST_IMG.zinswissen,        alt: 'Zinswissen — Grundlagen kompakt',                type: 'image' },
  ],

  /** Ähnliche Seiten — als DEMO-Einträge klar gekennzeichnet (kein realer Partnerbezug). */
  similarPages: [
    { id: 'sp1', name: 'Vorsorge Kompakt · Demo',       tagline: 'Vorschau-Eintrag · kein Partnerbezug', followers: 1240, logo: NEUTRAL_PAGE },
    { id: 'sp2', name: 'Finanzplan Deutschland · Demo', tagline: 'Vorschau-Eintrag · kein Partnerbezug', followers: 3200, logo: NEUTRAL_PAGE },
    { id: 'sp3', name: 'Vermögens-Journal · Demo',      tagline: 'Vorschau-Eintrag · kein Partnerbezug', followers: 1810, logo: NEUTRAL_PAGE },
  ],

  /* ────────────────────────── FEED ──────────────────────────
     6 thematisch unterschiedliche Beiträge — jeweils eigenes Motiv, eigene
     Headline, eigener Text und thema-passende Kommentare. Antworten des
     Unternehmens tragen den vollen Namen „Fröhlich Vermögensberatung GmbH". */
  posts: [
    {
      id: 'li-beratung',
      publishedAt: 'vor 1 Woche',
      headline: 'Langfristige Zusammenarbeit beginnt mit Vertrauen',
      text:
        'Unser Ziel ist nicht der einzelne Abschluss. Wir möchten unsere Kunden über viele Jahre begleiten — als Ansprechpartner, wenn sich Lebenssituationen, finanzielle Ziele oder wirtschaftliche Rahmenbedingungen verändern. Vertrauen entsteht dabei nicht über Nacht, sondern über regelmäßige Gespräche, Erreichbarkeit und nachvollziehbare Kommunikation.',
      image: POST_IMG.beratung,
      imageAlt: 'Beratung — langfristige Zusammenarbeit',
      reactions: 84, commentsCount: 4, reposts: 6,
      comments: [
        {
          id: 'c-be-1', author: 'Petra Lindemann', avatar: TEAM_AVATAR, publishedAt: 'vor 5 Tagen',
          text: 'Sehr sympathischer Ansatz — genau so wünsche ich mir Beratung.',
        },
        {
          id: 'c-be-2', author: 'Henrik Vogel', avatar: TEAM_AVATAR, publishedAt: 'vor 4 Tagen',
          text: 'Wie sieht der typische Ablauf eines Erstgesprächs bei Ihnen aus?',
          replies: [
            {
              id: 'c-be-2r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO,
              publishedAt: 'vor 4 Tagen', isCompany: true,
              text: 'Wir beginnen mit einem unverbindlichen Kennenlerngespräch — ohne Produktdruck, ohne Zeitdruck. Danach klären wir gemeinsam, ob und in welcher Form eine Zusammenarbeit sinnvoll ist.',
            },
          ],
        },
      ],
    },
    {
      id: 'li-tagesgeld',
      publishedAt: 'vor 3 Wochen',
      headline: 'Liquidität flexibel halten',
      text:
        'Kurzfristig verfügbare Liquidität ist ein wichtiger Baustein einer strukturierten Vermögensplanung. Sie schafft Handlungsspielraum — für geplante Ausgaben ebenso wie für unerwartete Situationen. Tagesgeldkonten bieten diese Flexibilität, ohne dass eine feste Laufzeit vereinbart wird.',
      image: POST_IMG.tagesgeld,
      imageAlt: 'Tagesgeld — flexibel sparen',
      reactions: 62, commentsCount: 3, reposts: 4,
      comments: [
        {
          id: 'c-tg-1', author: 'Sandra Weiß', avatar: TEAM_AVATAR, publishedAt: 'vor 2 Wochen',
          text: 'Wie viel Liquidität ist als Reserve grundsätzlich sinnvoll?',
          replies: [
            {
              id: 'c-tg-1r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO,
              publishedAt: 'vor 2 Wochen', isCompany: true,
              text: 'Eine pauschale Zahl gibt es nicht — das hängt von Einkommen, Fixkosten und Lebenssituation ab. Wir betrachten Liquidität immer im Gesamtkontext.',
            },
          ],
        },
        {
          id: 'c-tg-2', author: 'Patrick Albrecht', avatar: TEAM_AVATAR, publishedAt: 'vor 2 Wochen',
          text: 'Sind Tagesgeld-Zinsen variabel oder für einen Zeitraum fix?',
        },
      ],
    },
    {
      id: 'li-festgeld',
      publishedAt: 'vor 5 Wochen',
      headline: 'Planbarkeit als Bestandteil der Vermögensstruktur',
      text:
        'Feste Laufzeiten sind kein Selbstzweck — sie schaffen aber Planbarkeit. Wer weiß, wann ein bestimmter Betrag wieder verfügbar wird, kann Ausgaben, Rücklagen und weiterführende Anlageentscheidungen strukturierter kalkulieren. Zwischen kurz- und langfristigen Bausteinen bewusst zu unterscheiden gehört für uns zur Grundstruktur einer Vermögensplanung.',
      image: POST_IMG.festgeld,
      imageAlt: 'Festgeld — planbar anlegen',
      reactions: 71, commentsCount: 3, reposts: 3,
      comments: [
        {
          id: 'c-fg-1', author: 'Jörg Eisenhauer', avatar: TEAM_AVATAR, publishedAt: 'vor 4 Wochen',
          text: 'Wo würden Sie die Grenze zwischen Tagesgeld und Festgeld ziehen?',
          replies: [
            {
              id: 'c-fg-1r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO,
              publishedAt: 'vor 4 Wochen', isCompany: true,
              text: 'Das hängt vom Zeithorizont ab: alles, was in den nächsten Monaten verfügbar sein muss, gehört eher aufs Tagesgeld. Mittel- bis längerfristig Nichtbenötigtes lässt sich strukturierter planen.',
            },
          ],
        },
        {
          id: 'c-fg-2', author: 'Nicole Brandt', avatar: TEAM_AVATAR, publishedAt: 'vor 4 Wochen',
          text: 'Gibt es auch gestaffelte Laufzeiten in einer Struktur (Laufzeit-Treppe)?',
        },
      ],
    },
    {
      id: 'li-einlagensicherung',
      publishedAt: 'vor 7 Wochen',
      headline: 'Sicherheit bewusst betrachten',
      text:
        'Die gesetzliche Einlagensicherung im europäischen Wirtschaftsraum schützt Einlagen grundsätzlich bis zu einem Betrag von 100.000 € pro Kunde und Bank. Sie ist ein wichtiger Baustein — aber kein Freibrief, alle Anlageentscheidungen ohne weitere Risikobetrachtung zu treffen. Für uns gehört Einlagensicherung deshalb in eine umfassendere Risiko- und Diversifikationsbetrachtung.',
      image: POST_IMG.einlagensicherung,
      imageAlt: 'Einlagensicherung — Sicherheit für Ihr Erspartes',
      reactions: 112, commentsCount: 3, reposts: 8,
      comments: [
        {
          id: 'c-si-1', author: 'Christian Ade', avatar: TEAM_AVATAR, publishedAt: 'vor 6 Wochen',
          text: 'Gilt der Schutz auch bei Banken aus anderen EU-Ländern?',
          replies: [
            {
              id: 'c-si-1r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO,
              publishedAt: 'vor 6 Wochen', isCompany: true,
              text: 'Ja — jede EU-Mitgliedsbank ist in ihrem Heimatland zur gesetzlichen Einlagensicherung bis 100.000 € pro Kunde verpflichtet.',
            },
          ],
        },
        {
          id: 'c-si-2', author: 'Ines Pollak', avatar: TEAM_AVATAR, publishedAt: 'vor 6 Wochen',
          text: 'Sachlich und ohne Panik erklärt — genau so sollte über Sicherheit gesprochen werden.',
        },
      ],
    },
    {
      id: 'li-vermoegensaufbau',
      publishedAt: 'vor 10 Wochen',
      headline: 'Vermögen entsteht selten über Nacht',
      text:
        'Langfristiger Vermögensaufbau lebt von drei Grundgedanken: einer klaren Strategie, konsequenter Diversifikation und einer regelmäßigen Überprüfung. Was heute sinnvoll erscheint, muss nicht automatisch in einigen Jahren noch zur Situation passen — deshalb betrachten wir bestehende Entscheidungen regelmäßig neu.',
      image: POST_IMG.vermoegensaufbau,
      imageAlt: 'Vermögensaufbau — Schritt für Schritt',
      reactions: 96, commentsCount: 3, reposts: 5,
      comments: [
        {
          id: 'c-va-1', author: 'Monika Drechsler', avatar: TEAM_AVATAR, publishedAt: 'vor 9 Wochen',
          text: 'In welchem Rhythmus sollte man die eigene Strategie überprüfen?',
          replies: [
            {
              id: 'c-va-1r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO,
              publishedAt: 'vor 9 Wochen', isCompany: true,
              text: 'Ein bis zwei Mal im Jahr strukturiert — und zusätzlich immer dann, wenn sich Lebenssituation, Ziele oder Rahmenbedingungen deutlich verändern.',
            },
          ],
        },
        {
          id: 'c-va-2', author: 'Ralf Schubert', avatar: TEAM_AVATAR, publishedAt: 'vor 9 Wochen',
          text: 'Der ruhige Ton in Ihren Beiträgen ist angenehm — ohne Zeitdruck-Marketing.',
        },
      ],
    },
    {
      id: 'li-diversifikation',
      publishedAt: 'vor 14 Wochen',
      headline: 'Nicht alles auf eine Karte setzen',
      text:
        'Diversifikation bedeutet, unterschiedliche Anlageklassen und Risiken bewusst zu kombinieren — soweit dies zur individuellen Situation und Eignung passt. Liquidität, Sparkonten, Aktien, Anleihen und weitere geeignete Bausteine können sich sinnvoll ergänzen. Die konkrete Zusammensetzung ist immer individuell und ersetzt keine persönliche Beratung.',
      image: POST_IMG.diversifikation,
      imageAlt: 'Diversifikation — Anlageklassen im Überblick',
      reactions: 88, commentsCount: 3, reposts: 7,
      comments: [
        {
          id: 'c-di-1', author: 'Melanie Cramer', avatar: TEAM_AVATAR, publishedAt: 'vor 13 Wochen',
          text: 'Ist die dargestellte Aufteilung eine Empfehlung?',
          replies: [
            {
              id: 'c-di-1r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO,
              publishedAt: 'vor 13 Wochen', isCompany: true,
              text: 'Nein — die Darstellung ist rein illustrativ. Die tatsächliche Zusammensetzung hängt von individueller Situation, Eignung und Zielen ab und wird im persönlichen Gespräch erarbeitet.',
            },
          ],
        },
        {
          id: 'c-di-2', author: 'Ines Pollak', avatar: TEAM_AVATAR, publishedAt: 'vor 13 Wochen',
          text: 'Guter Reminder — Diversifikation wird oft nur bei Aktien gedacht, nicht über Anlageklassen hinweg.',
        },
      ],
    },
  ],
};

export default linkedinProfile;
