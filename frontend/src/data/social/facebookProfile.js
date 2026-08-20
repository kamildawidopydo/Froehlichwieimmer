import siteContact from '@/data/siteContact';

const PLACEHOLDER = '/assets/social/placeholder.svg';
const SITE_LOGO = '/assets/logo/frohlich-logo.png?v=1';

/** Statische Facebook-Vorschau — Fröhlich Vermögensberatung GmbH (kein echtes FB-Profil). */
export const facebookProfile = {
  platform: 'facebook',
  pageName: 'Fröhlich Vermögensberatung GmbH',
  // TODO(Fröhlich Vermögensberatung): echten Facebook-Handle bestätigen.
  handle: 'froehlich_vermoegensberatung',
  verified: false,
  category: 'Finanzdienstleistungen',
  stats: { followers: 980, likes: 902, activeSince: 2020 },
  specialties: ['Vermögensaufbau', 'Sparen', 'Vorsorge', 'Anlageplanung', 'Beratung'],
  intro:
    'Fröhlich Vermögensberatung GmbH — Informationen rund um Vermögensaufbau, Sparen und Vorsorge. Keine Anlageberatung über Social Media.',
  about: {
    mission:
      'Wir informieren zu Themen rund um Vermögensaufbau, Sparen und Vorsorge — verständlich, ruhig und ohne Fachchinesisch.',
    products: [
      { label: 'Über uns', href: '/about' },
      { label: 'Sicherheit', href: '/security' },
      { label: 'Kontakt', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
    ],
    regulation:
      'Fröhlich Vermögensberatung GmbH · Keine Anlageberatung über Social Media.',
  },
  contact: {
    email: siteContact.email,
    phone: siteContact.phoneDisplay,
    phoneTel: siteContact.phoneTel,
    // TODO(Fröhlich Vermögensberatung): finale Website-URL bestätigen.
    website: 'Website folgt',
    websiteHref: '#',
    street: siteContact.street,
    city: siteContact.postalCity,
    hours: siteContact.businessHoursLine,
  },
  locations: [{ id: 'hq', label: 'Hauptsitz', address: `${siteContact.street}, ${siteContact.postalCity}` }],
  assets: { cover: PLACEHOLDER, avatar: SITE_LOGO },
  pinnedPostId: 'fb-1',
  suggestedPages: [
    { id: 'sg1', name: 'Finanzwissen kompakt', tagline: 'Basiswissen für Sparer', followers: 1820, logo: PLACEHOLDER },
    { id: 'sg2', name: 'VorsorgeMagazin', tagline: 'Vorsorge einfach erklärt', followers: 1240, logo: PLACEHOLDER },
    { id: 'sg3', name: 'Verbraucher & Finanzen', tagline: 'Aktuelles für Anleger', followers: 2410, logo: PLACEHOLDER },
  ],
  posts: [
    {
      id: 'fb-1', publishedAt: 'vor 3 Monaten',
      text: 'Vermögensaufbau mit Struktur — langfristig, transparent und ruhig geplant. Wir teilen hier regelmäßig Gedanken zu Sparen, Vorsorge und persönlicher Finanzplanung.',
      image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Vermögensaufbau',
      reactions: 62, commentsCount: 8, shares: 3,
      comments: [
        { id: 'c1', author: 'Sandra Weiß', avatar: PLACEHOLDER, publishedAt: 'vor 10 Wochen',
          text: 'Sehr sachlich formuliert — kein Marketing-Ton, das gefällt mir.' },
        { id: 'c2', author: 'Patrick Albrecht', avatar: PLACEHOLDER, publishedAt: 'vor 9 Wochen',
          text: 'Ich finde die ruhige Herangehensweise angenehm im Vergleich zu vielen Finanzseiten.',
          replies: [
            { id: 'c2r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO, publishedAt: 'vor 9 Wochen',
              text: 'Vielen Dank für Ihr Feedback — genau das ist unser Anspruch.', isCompany: true },
          ] },
        { id: 'c3', author: 'Melanie Cramer', avatar: PLACEHOLDER, publishedAt: 'vor 8 Wochen',
          text: 'Freue mich auf weitere Beiträge zum Thema Vorsorge.' },
      ],
    },
    {
      id: 'fb-2', publishedAt: 'vor 5 Monaten',
      text: 'Sparen mit Weitblick: Rücklagen aufbauen, Ziele erreichen, entspannt bleiben. Was zählt, ist ein Plan, der zum eigenen Leben passt.',
      image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Sparen',
      reactions: 88, commentsCount: 11, shares: 5,
      comments: [
        { id: 'c4', author: 'Jörg Eisenhauer', avatar: PLACEHOLDER, publishedAt: 'vor 4 Monaten',
          text: 'Struktur beim Sparen macht wirklich einen Unterschied — meine Erfahrung.' },
        { id: 'c5', author: 'Nicole Brandt', avatar: PLACEHOLDER, publishedAt: 'vor 4 Monaten',
          text: 'Gerade für Berufseinsteiger ein wichtiges Thema.' },
      ],
    },
    {
      id: 'fb-3', publishedAt: 'vor 7 Monaten',
      text: 'Vorsorge sollte nicht kompliziert sein. Wir bringen Ordnung ins Thema — Schritt für Schritt.',
      image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Vorsorge',
      reactions: 104, commentsCount: 13, shares: 8,
      comments: [
        { id: 'c6', author: 'Christian Ade', avatar: PLACEHOLDER, publishedAt: 'vor 6 Monaten',
          text: 'Ein klar strukturiertes Vorgehen hilft mir sehr, dranzubleiben.' },
        { id: 'c7', author: 'Ines Pollak', avatar: PLACEHOLDER, publishedAt: 'vor 6 Monaten',
          text: 'Ohne Panikmache und trotzdem informativ — bitte mehr davon.' },
      ],
    },
  ],
  photos: [
    { id: 'p1', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Markenvisual' },
    { id: 'p2', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Sparen' },
    { id: 'p3', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Vorsorge' },
    { id: 'p4', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Anlageplanung' },
    { id: 'p5', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Team' },
    { id: 'p6', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Vermögen' },
  ],
};

export { formatCount } from '@/data/social/formatCount';
export default facebookProfile;
