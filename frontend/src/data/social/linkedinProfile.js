import siteContact from '@/data/siteContact';
import { socialCopy } from '@/data/siteCopyPhase5';

const LI = '/assets/social/linkedin';
const SITE_LOGO = '/assets/logo/frohlich-logo.png?v=1';

/** Statische LinkedIn-Unternehmensseiten-Vorschau — Kapitalmitte. */
export const linkedinProfile = {
  platform: 'linkedin',
  companyName: 'Kapitalmitte',
  tagline: socialCopy.tagline,
  vanityUrl: 'kapitalmitte',
  verified: true,
  industry: 'Finanzdienstleistungen',
  companyType: 'Kapitalverwaltungsgesellschaft',
  companySize: '11–50 Beschäftigte',
  location: 'Frankfurt am Main, Hessen',
  stats: {
    followers: 2140,
    pageViews: 892,
    employees: '11–50',
    founded: 2019,
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
    'Kapitalmitte vermittelt ausgewählte Tagesgeld-, Flexgeld- und Festgeldangebote europäischer Partnerbanken — mit persönlicher Betreuung aus Frankfurt am Main.',
  about: {
    overview: {
      intro: [
        'Kapitalmitte verbindet institutionelle Investmentstrukturen mit modernen digitalen Finanz- und Sparlösungen.',
        'Mit Sitz im Zentrum Frankfurts verfolgen wir einen langfristigen, nachhaltigen und verantwortungsvollen Ansatz für anspruchsvolle Anleger, Investoren und Kapitalinteressenten.',
      ],
      focus: {
        title: 'Unser Fokus liegt auf:',
        items: [
          'langfristigem Vermögensaufbau',
          'professionellem Risikomanagement',
          'transparenten Investmentprozessen',
          'Diversifikation und Stabilität',
          'modernen digitalen Investmentlösungen',
        ],
      },
      bridge:
        'Als strukturiertes Unternehmen mit eigenen Lösungen sowie als Vermittlungsplattform verbinden wir unsere Kunden mit etablierten, regulierten und beaufsichtigten Banken sowie ausgewählten Finanzpartnern.',
      services: {
        title: 'Unsere Leistungen umfassen unter anderem:',
        items: [
          'Spezial-AIF-Strukturen',
          'Tagesgeld & Festgeldlösungen',
          'Flexgeld-Angebote',
          'Anleihen & Kapitalmarktstrategien',
          'Aktien- und Sachwertlösungen',
          'Vergleichs- & Analyseprozesse',
          'digitale Anleger- und Depotlösungen',
        ],
      },
      closing: [
        'Sicherheit, Transparenz und verantwortungsvolle Entscheidungen stehen im Mittelpunkt unserer Philosophie.',
        'Unsere Plattform kombiniert institutionelle Expertise mit modernen technologischen Standards und schafft damit einen professionellen, transparenten und langfristig orientierten Zugang zu Kapitalmärkten und Finanzlösungen.',
      ],
      tags: [
        '📍 Frankfurt am Main',
        '🌍 Kapitalmitte',
        '🔗 Institutionelle Expertise • Transparenz • Digitale Investmentlösungen',
      ],
    },
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
    cover: `${LI}/cover.png`,
    logo: SITE_LOGO,
  },
  pinnedPostId: 'li-1',
  employees: [
    { id: 'e1', name: 'Dr. Stefan Weber', role: 'Geschäftsführung', avatar: `${LI}/employees/stefan-weber.png` },
    { id: 'e2', name: 'Claudia Hartmann', role: 'Leitung Kundenservice', avatar: `${LI}/employees/claudia-hartmann.png` },
    { id: 'e3', name: 'Michael Brenner', role: 'Partnerbanken & Konditionen', avatar: `${LI}/employees/michael-brenner.png` },
    { id: 'e4', name: 'Sabine Krüger', role: 'Compliance & Regulierung', avatar: `${LI}/employees/sabine-krueger.png` },
    { id: 'e5', name: 'Jonas Meier', role: 'Produktmanagement', avatar: `${LI}/employees/jonas-meier.png` },
    { id: 'e6', name: 'Anna Hoffmann', role: 'Kundenberatung', avatar: `${LI}/employees/anna-hoffmann.png` },
    { id: 'e7', name: 'Felix Brandt', role: 'Digitale Plattform', avatar: `${LI}/employees/felix-brandt.png` },
    { id: 'e8', name: 'Julia Stein', role: 'Marketing & Kommunikation', avatar: `${LI}/employees/julia-stein.png` },
  ],
  products: [
    {
      id: 'prod-1',
      title: 'EU-Sparvergleich',
      description: 'Tagesgeld, Flexgeld und Festgeld von über 50 Partnerbanken — kostenlos und unabhängig vergleichen.',
      href: '/comparison',
      image: `${LI}/products/sparvergleich.png`,
    },
    {
      id: 'prod-2',
      title: 'Zinsrechner',
      description: 'Szenarien für Laufzeit und Anlagebetrag berechnen — ohne Registrierung auf der Plattform.',
      href: '/calculator',
      image: `${LI}/products/zinsrechner.png`,
    },
    {
      id: 'prod-3',
      title: 'Partnerbanken-Übersicht',
      description: 'Regulierte Institute in der EU mit transparenten Konditionen und Einlagensicherung.',
      href: '/partner-banks',
      image: `${LI}/products/partnerbanken.png`,
    },
    {
      id: 'prod-4',
      title: 'Spezial-AIF',
      description: 'Geschlossener Spezial-Alternativ-Investmentfonds für qualifizierte Anleger.',
      href: '/spezial-aif',
      image: `${LI}/products/spezial-aif.png`,
    },
  ],
  media: [
    { id: 'm1', src: `${LI}/media/media-1.png`, alt: 'Kapitalmitte Markenvisual', type: 'image' },
    { id: 'm2', src: `${LI}/media/media-2.png`, alt: 'EU Partnernetzwerk', type: 'video' },
    { id: 'm3', src: `${LI}/media/media-3.png`, alt: 'Sicherheit und Vertrauen', type: 'image' },
    { id: 'm4', src: `${LI}/media/media-4.png`, alt: 'Zinsen und Konditionen', type: 'image' },
    { id: 'm5', src: `${LI}/media/media-5.png`, alt: 'Frankfurt Finanzplatz', type: 'video' },
    { id: 'm6', src: `${LI}/media/media-6.png`, alt: 'Sparanlage Promotion', type: 'image' },
  ],
  similarPages: [
    {
      id: 'sp1',
      name: 'EU Deposit Guide',
      tagline: 'Einlagenwissen für Anleger',
      followers: 1240,
      logo: `${LI}/logos/similar/eu-deposit-guide.png`,
    },
    {
      id: 'sp2',
      name: 'Frankfurt Finance Hub',
      tagline: 'Finanzstandort Frankfurt',
      followers: 8900,
      logo: `${LI}/logos/similar/frankfurt-finance-hub.png`,
    },
    {
      id: 'sp3',
      name: 'RegTech Europe',
      tagline: 'Compliance in Finanzdienstleistungen',
      followers: 4520,
      logo: `${LI}/logos/similar/regtech-europe.png`,
    },
  ],
  posts: [
    {
      id: 'li-1',
      publishedAt: 'vor 3 Monaten',
      text:
        'Über 50 regulierte Partnerbanken in der EU — Tagesgeld, Flexgeld und Festgeld auf einen Blick vergleichen. Kostenlos, unabhängig, ohne versteckte Gebühren.\n\n#Sparvergleich #Tagesgeld #EU',
      image: `${LI}/posts/sparvergleich.png`,
      imageAlt: 'EU-Sparvergleich Kapitalmitte',
      reactions: 87,
      commentsCount: 11,
      reposts: 5,
      comments: [
        {
          id: 'lc1',
          author: 'Petra Lindemann',
          avatar: `${LI}/comments/petra-lindemann.png`,
          publishedAt: 'vor 10 Wochen',
          text: 'Die Übersicht nach Laufzeit und Mindestanlage spart viel Recherchezeit. Klar strukturiert.',
        },
        {
          id: 'lc2',
          author: 'Henrik Vogel',
          avatar: `${LI}/comments/henrik-vogel.png`,
          publishedAt: 'vor 9 Wochen',
          text: 'Gerade für Festgeld-Vergleiche sehr hilfreich — ohne dass man sich gleich festlegen muss.',
          replies: [
            {
              id: 'lc2r1',
              author: 'Kapitalmitte',
              avatar: SITE_LOGO,
              publishedAt: 'vor 9 Wochen',
              text: 'Vielen Dank für Ihr Feedback — so wünschen wir uns den Vergleich für alle Anleger.',
              isCompany: true,
            },
          ],
        },
      ],
    },
    {
      id: 'li-2',
      publishedAt: 'vor 5 Monaten',
      text:
        'Einlagensicherung in der EU: Was für Anleger gilt, erläutern wir verständlich auf unserer Plattform — bevor Sie eine Entscheidung treffen.',
      image: `${LI}/posts/einlagensicherung.png`,
      imageAlt: 'Einlagensicherung in der EU',
      reactions: 102,
      commentsCount: 14,
      reposts: 8,
      comments: [
        {
          id: 'lc3',
          author: 'Ralf Schubert',
          avatar: `${LI}/comments/ralf-schubert.png`,
          publishedAt: 'vor 4 Monaten',
          text: 'Kurz und präzise — besonders die unterschiedlichen Landesgrenzen waren mir vorher nicht bewusst.',
        },
        {
          id: 'lc4',
          author: 'Monika Drechsler',
          avatar: `${LI}/comments/monika-drechsler.png`,
          publishedAt: 'vor 4 Monaten',
          text: 'Solche Inhalte sollten mehr Finanzseiten so aufbereiten. Danke für die Transparenz.',
        },
        {
          id: 'lc5hidden',
          author: 'Timo Engel',
          avatar: `${LI}/comments/timo-engel.png`,
          publishedAt: 'vor 4 Monaten',
          text: 'Gerade für Neukunden ein wichtiger Überblick.',
        },
      ],
    },
    {
      id: 'li-3',
      publishedAt: 'vor 7 Monaten',
      text:
        'Neukunden-Bonus bei teilnehmenden Partnerbanken: bis zu 300 € zusätzlich zu den regulären Zinsen — abhängig von Anlagebetrag und Bank.',
      image: `${LI}/posts/bonus.png`,
      imageAlt: 'Willkommensbonus bis 300 Euro',
      reactions: 134,
      commentsCount: 18,
      reposts: 12,
      comments: [
        {
          id: 'lc5',
          author: 'Corinna Weiss',
          avatar: `${LI}/comments/corinna-weiss.png`,
          publishedAt: 'vor 6 Monaten',
          text: 'Bonus kam wie angekündigt — Bedingungen waren vorab im Angebot ersichtlich.',
        },
        {
          id: 'lc6',
          author: 'Daniela Krämer',
          avatar: `${LI}/comments/daniela-kraemer.png`,
          publishedAt: 'vor 6 Monaten',
          text: 'Gute Vorab-Transparenz bei den Konditionen. Keine bösen Überraschungen.',
        },
      ],
    },
    {
      id: 'li-4',
      publishedAt: 'vor 9 Monaten',
      text:
        'Unser Zinsrechner zeigt, wie Laufzeit und Anlagebetrag Ihre erwartete Verzinsung beeinflussen — direkt auf kapitalmitte.com.',
      linkPreview: {
        url: 'https://www.kapitalmitte.com/calculator',
        title: 'Zinsrechner — Kapitalmitte',
        description: 'Szenarien für Tagesgeld, Flexgeld und Festgeld berechnen.',
        image: `${LI}/posts/zinsrechner.png`,
      },
      reactions: 61,
      commentsCount: 7,
      reposts: 4,
      comments: [
        {
          id: 'lc7',
          author: 'Frank Ostermann',
          avatar: `${LI}/comments/frank-ostermann.png`,
          publishedAt: 'vor 8 Monaten',
          text: 'Zwei Szenarien durchgerechnet — sofort klar, wo sich Festgeld für mich lohnt.',
        },
        {
          id: 'lc8',
          author: 'Simone Bauer',
          avatar: `${LI}/comments/simone-bauer.png`,
          publishedAt: 'vor 8 Monaten',
          text: 'Ohne Registrierung testen können — das schätze ich bei Vergleichstools.',
        },
      ],
    },
  ],
};

export default linkedinProfile;
