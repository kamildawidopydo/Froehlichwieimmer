import siteContact from '@/data/siteContact';

const FB = '/assets/social/facebook';
const FB_V = '?v=2';
const SITE_LOGO = '/assets/logo/kapitalmitte-logo.png?v=19';
const fbAvatar = (slug) => `${FB}/avatars/comments/${slug}.png${FB_V}`;

/** Statische Facebook-Vorschau — Kapitalmitte (kein echtes FB-Profil). */
export const facebookProfile = {
  platform: 'facebook',
  pageName: 'Kapitalmitte',
  handle: 'kapitalmitte',
  verified: true,
  category: 'Finanzdienstleistungen · Sparvergleich',
  stats: {
    followers: 3868,
    likes: 3621,
    activeSince: 2019,
  },
  specialties: [
    'Vermittlung',
    'Tagesgeld',
    'Festgeld',
    'Flexgeld',
    'EU-Partnerbanken',
    'Einlagensicherung',
    'Zinsvergleich',
  ],
  intro:
    'Kapitalmitte vermittelt ausgewählte Tagesgeld-, Flexgeld- und Festgeldangebote europäischer Partnerbanken — strukturiert, transparent und mit persönlicher Betreuung aus Frankfurt am Main.',
  about: {
    mission:
      'Wir sind eine unabhängige Vergleichs- und Vermittlungsplattform für europäische Sparangebote. Kapitalmitte hält kein Kundengeld — die Einlagen liegen ausschließlich bei den jeweiligen Partnerbanken unter gesetzlicher Einlagensicherung.',
    products: [
      { label: 'Sparvergleich', href: '/comparison' },
      { label: 'Partnerbanken', href: '/partner-banks' },
      { label: 'Zinsrechner', href: '/calculator' },
      { label: 'Spezial-AIF', href: '/spezial-aif' },
    ],
    regulation:
      'Fröhlich Vermögensberatung GmbH · Registrierte AIF-KVG gemäß § 44 KAGB. Keine Anlageberatung über Social Media.',
  },
  contact: {
    email: siteContact.email,
    phone: siteContact.phoneDisplay,
    phoneTel: siteContact.phoneTel,
    website: 'www.kapitalmitte.com',
    websiteHref: 'https://www.kapitalmitte.com',
    street: siteContact.street,
    city: siteContact.postalCity,
    hours: siteContact.businessHoursLine,
  },
  locations: [
    {
      id: 'hq',
      label: 'Hauptsitz',
      address: `${siteContact.street}, ${siteContact.postalCity}`,
    },
  ],
  assets: {
    cover: `${FB}/cover.png`,
    avatar: SITE_LOGO,
  },
  pinnedPostId: 'fb-1',
  suggestedPages: [
    {
      id: 'sg1',
      name: 'Zins-Aktuell',
      tagline: 'Zinsnews für Sparer',
      followers: 2180,
      logo: `${FB}/logos/suggested/zins-aktuell.png`,
    },
    {
      id: 'sg2',
      name: 'VerbraucherFinanz HE',
      tagline: 'Verbraucherfinanz aus Hessen',
      followers: 1540,
      logo: `${FB}/logos/suggested/verbraucherfinanz.png`,
    },
    {
      id: 'sg3',
      name: 'DepositWise EU',
      tagline: 'Einlagen- und Sparwissen',
      followers: 3210,
      logo: `${FB}/logos/suggested/depositwise.png`,
    },
  ],
  posts: [
    {
      id: 'fb-1',
      publishedAt: 'vor 3 Monaten',
      text:
        'Über 50 regulierte Partnerbanken in der EU — vergleichen Sie Tagesgeld, Flexgeld und Festgeld auf einen Blick. Kostenlos, unabhängig und ohne versteckte Gebühren.\n\n#Sparvergleich #Tagesgeld #EU',
      image: `${FB}/posts/sparvergleich.png`,
      imageAlt: 'EU-Sparvergleich Kapitalmitte',
      reactions: 94,
      commentsCount: 14,
      shares: 7,
      comments: [
        {
          id: 'c1',
          author: 'Sandra Voigt',
          avatar: fbAvatar('sandra-voigt'),
          publishedAt: 'vor 10 Wochen',
          text: 'Hab mir gestern Abend nochmal die Zinsen angeschaut — bei 12 Monaten Laufzeit tut sich gerade einiges. Übersichtlich aufgebaut.',
        },
        {
          id: 'c2',
          author: 'Patrick Albrecht',
          avatar: fbAvatar('patrick-albrecht'),
          publishedAt: 'vor 9 Wochen',
          text: 'Filter nach Mindestanlage war für mich der Knackpunkt. Musste nicht jede Bank einzeln durchklicken.',
          replies: [
            {
              id: 'c2r1',
              author: 'Kapitalmitte',
              avatar: SITE_LOGO,
              publishedAt: 'vor 9 Wochen',
              text: 'Danke für Ihr Feedback — genau dafür ist der Vergleich gedacht.',
              isCompany: true,
            },
          ],
        },
        {
          id: 'c3',
          author: 'Melanie Cramer',
          avatar: fbAvatar('melanie-cramer'),
          publishedAt: 'vor 8 Wochen',
          text: 'Klingt seriös, ohne dass man sich gleich irgendwo festlegen muss. Genau richtig zum Reinschnuppern.',
        },
      ],
    },
    {
      id: 'fb-2',
      publishedAt: 'vor 5 Monaten',
      text:
        'Ihre Einlagen bei Partnerbanken genießen den Schutz der gesetzlichen Einlagensicherung — wir erklären auf der Plattform, was das für Sie konkret bedeutet.',
      image: `${FB}/posts/einlagensicherung.png`,
      imageAlt: 'Einlagensicherung in der EU',
      reactions: 118,
      commentsCount: 19,
      shares: 11,
      comments: [
        {
          id: 'c4',
          author: 'Jörg Eisenhauer',
          avatar: fbAvatar('joerg-eisenhauer'),
          publishedAt: 'vor 4 Monaten',
          text: 'War mir vorher nicht klar, dass die Grenzen je nach Land unterschiedlich sind. Kurz und verständlich erklärt — danke.',
        },
        {
          id: 'c5',
          author: 'Nicole Brandt',
          avatar: fbAvatar('nicole-brandt'),
          publishedAt: 'vor 4 Monaten',
          text: 'Gerade als Erstanleger hilft so ein Post enorm. Hätte ich früher lesen sollen.',
        },
        {
          id: 'c5hidden',
          author: 'Stefanie Roth',
          avatar: fbAvatar('stefanie-roth'),
          publishedAt: 'vor 4 Monaten',
          text: 'Wichtiger Überblick für Neukunden.',
        },
      ],
    },
    {
      id: 'fb-3',
      publishedAt: 'vor 7 Monaten',
      text:
        'Neukunden-Bonus bei teilnehmenden Partnerbanken: bis zu 300 € zusätzlich zu den regulären Zinsen — abhängig von Anlagebetrag und Bank. Details im jeweiligen Angebot.',
      image: `${FB}/posts/bonus.png`,
      imageAlt: 'Willkommensbonus bis 300 Euro',
      reactions: 156,
      commentsCount: 22,
      shares: 18,
      comments: [
        {
          id: 'c6',
          author: 'Christian Ade',
          avatar: fbAvatar('christian-ade'),
          publishedAt: 'vor 6 Monaten',
          text: 'Bei mir kam der Bonus nach knapp drei Wochen — stand vorher schon im Angebot, also keine böse Überraschung.',
        },
        {
          id: 'c7',
          author: 'Ines Pollak',
          avatar: fbAvatar('ines-pollak'),
          publishedAt: 'vor 6 Monaten',
          text: 'Gut, dass man die Bedingungen vorher sieht. Hätte fast eine Bank genommen, die gar keinen Bonus mehr hatte.',
        },
        {
          id: 'c8',
          author: 'Bernd Falk',
          avatar: fbAvatar('bernd-falk'),
          publishedAt: 'vor 5 Monaten',
          text: 'Support hat auf meine Mail zum Bonus am nächsten Werktag geantwortet. Lief unkompliziert.',
        },
      ],
    },
    {
      id: 'fb-4',
      publishedAt: 'vor 9 Monaten',
      text:
        'Mit unserem Zinsrechner sehen Sie auf einen Blick, wie sich Laufzeit und Anlagebetrag auf Ihre erwartete Verzinsung auswirken — direkt auf kapitalmitte.com.',
      linkPreview: {
        url: 'https://www.kapitalmitte.com/calculator',
        title: 'Zinsrechner — Kapitalmitte',
        description: 'Szenarien für Tagesgeld, Flexgeld und Festgeld berechnen.',
        image: `${FB}/posts/zinsrechner.png`,
      },
      reactions: 72,
      commentsCount: 9,
      shares: 5,
      comments: [
        {
          id: 'c9',
          author: 'Kerstin Möller',
          avatar: fbAvatar('kerstin-moeller'),
          publishedAt: 'vor 8 Monaten',
          text: 'Hab zwei Szenarien durchgerechnet und direkt gesehen, wo sich Festgeld für mich lohnt. Praktisch.',
        },
        {
          id: 'c10',
          author: 'Patrick Albrecht',
          avatar: fbAvatar('patrick-albrecht'),
          publishedAt: 'vor 8 Monaten',
          text: 'Ohne Account erstmal testen können — find ich gut.',
        },
      ],
    },
  ],
  photos: [
    { id: 'p1', src: `${FB}/photos/photo-1.png`, alt: 'Abstrakte Markengrafik Blau Gold' },
    { id: 'p2', src: `${FB}/photos/photo-2.png`, alt: 'Sparanlage Promotion Euro' },
    { id: 'p3', src: `${FB}/photos/photo-3.png`, alt: 'Sicherheit und Vertrauen' },
    { id: 'p4', src: `${FB}/photos/photo-4.png`, alt: 'Anlageallokation Diagramm' },
    { id: 'p5', src: `${FB}/photos/photo-5.png`, alt: 'Zinsen Marketing' },
    { id: 'p6', src: `${FB}/photos/photo-6.png`, alt: 'EU Partnernetzwerk' },
    { id: 'p7', src: `${FB}/photos/photo-7.png`, alt: 'Kapitalmitte Markenvisual' },
    { id: 'p8', src: `${FB}/photos/photo-8.png`, alt: 'Finanzvergleich Visual' },
    { id: 'p9', src: `${FB}/photos/photo-9.png`, alt: 'Konditionen Übersicht' },
  ],
};

export { formatCount } from '@/data/social/formatCount';

export default facebookProfile;
