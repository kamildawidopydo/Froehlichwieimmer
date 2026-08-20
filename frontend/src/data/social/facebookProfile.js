import siteContact from '@/data/siteContact';
import { POST_IMG } from '@/data/social/postArtwork';

const PLACEHOLDER = '/assets/social/placeholder.svg';
const SITE_LOGO = '/assets/logo/frohlich-logo.png?v=2';

/** Statische Facebook-Vorschau — Fröhlich Vermögensberatung GmbH (kein echtes FB-Profil).
 *  Bilder werden zentral aus /data/social/postArtwork geteilt (auch Instagram nutzt sie). */
export const facebookProfile = {
  platform: 'facebook',
  pageName: 'Fröhlich Vermögensberatung GmbH',
  // TODO(Fröhlich Vermögensberatung): echten Facebook-Handle bestätigen.
  handle: 'froehlich_vermoegensberatung',
  verified: false,
  category: 'Finanzdienstleistungen',
  stats: { followers: 980, likes: 902, activeSince: 2020 },
  specialties: ['Tagesgeld', 'Festgeld', 'Zinsen', 'Einlagensicherung', 'Vermögensaufbau', 'Sparen in Europa'],
  intro:
    'Fröhlich Vermögensberatung GmbH — Informationen rund um Tagesgeld, Festgeld, Zinsen, Einlagensicherung und Vermögensaufbau. Keine Anlageberatung über Social Media.',
  about: {
    mission:
      'Wir informieren zu Themen rund um Sparen, Zinsen und Vorsorge — verständlich, ruhig und ohne Fachchinesisch.',
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
  assets: { cover: POST_IMG.zinsen, avatar: SITE_LOGO },
  pinnedPostId: 'fb-tagesgeld',
  suggestedPages: [
    { id: 'sg1', name: 'Finanzwissen kompakt', tagline: 'Basiswissen für Sparer', followers: 1820, logo: PLACEHOLDER },
    { id: 'sg2', name: 'VorsorgeMagazin',      tagline: 'Vorsorge einfach erklärt', followers: 1240, logo: PLACEHOLDER },
    { id: 'sg3', name: 'Verbraucher & Finanzen', tagline: 'Aktuelles für Anleger', followers: 2410, logo: PLACEHOLDER },
  ],

  /* Sechs thematisch unterschiedliche Beiträge — jeder mit eigenem Motiv, eigenem
     Text, eigenen Reaktionszahlen und thema-passenden Kommentaren. */
  posts: [
    {
      id: 'fb-tagesgeld', publishedAt: 'vor 2 Wochen',
      text: 'Tagesgeld – flexibel sparen. Ihr Geld bleibt jederzeit verfügbar, ohne feste Laufzeit. Aktuell bis 3,50 % auf Tagesgeld möglich.',
      image: POST_IMG.tagesgeld, imageAlt: 'Tagesgeld — flexibel sparen',
      reactions: 96, commentsCount: 4, shares: 6,
      comments: [
        { id: 'c-tg-1', author: 'Sandra Weiß', avatar: PLACEHOLDER, publishedAt: 'vor 12 Tagen',
          text: 'Genau das habe ich gesucht — Konditionen ohne Bindung.' },
        { id: 'c-tg-2', author: 'Patrick Albrecht', avatar: PLACEHOLDER, publishedAt: 'vor 11 Tagen',
          text: 'Sind die 3,50 % variabel oder bis wann garantiert?',
          replies: [
            { id: 'c-tg-2r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO, publishedAt: 'vor 11 Tagen',
              text: 'Tagesgeld-Zinsen sind grundsätzlich variabel — wir zeigen bei jedem Angebot die genauen Konditionen.', isCompany: true },
          ] },
      ],
    },
    {
      id: 'fb-festgeld', publishedAt: 'vor 4 Wochen',
      text: 'Festgeld – planbar anlegen. Feste Laufzeit, feste Konditionen, ruhig kalkulierbar. 12 Monate Laufzeit im Fokus.',
      image: POST_IMG.festgeld, imageAlt: 'Festgeld — planbar anlegen',
      reactions: 118, commentsCount: 5, shares: 9,
      comments: [
        { id: 'c-fg-1', author: 'Jörg Eisenhauer', avatar: PLACEHOLDER, publishedAt: 'vor 3 Wochen',
          text: 'Für den Notgroschen weniger geeignet, aber für mittelfristige Rücklagen top.' },
        { id: 'c-fg-2', author: 'Nicole Brandt', avatar: PLACEHOLDER, publishedAt: 'vor 3 Wochen',
          text: 'Sind auch Laufzeiten über 24 Monate im Angebot?',
          replies: [
            { id: 'c-fg-2r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO, publishedAt: 'vor 3 Wochen',
              text: 'Ja — je nach Anbieter zwischen 6 und 60 Monaten. Details finden Sie in der jeweiligen Konditionsübersicht.', isCompany: true },
          ] },
      ],
    },
    {
      id: 'fb-zinsen', publishedAt: 'vor 6 Wochen',
      text: 'Zinsen im Blick behalten. Wir vergleichen Konditionen quartalsweise — verständlich aufbereitet für Sparer.',
      image: POST_IMG.zinsen, imageAlt: 'Zinsen im Blick behalten',
      reactions: 74, commentsCount: 3, shares: 4,
      comments: [
        { id: 'c-zi-1', author: 'Melanie Cramer', avatar: PLACEHOLDER, publishedAt: 'vor 5 Wochen',
          text: 'Ich schaue quartalsweise vorbei — sehr hilfreiche Übersicht.' },
        { id: 'c-zi-2', author: 'Ralf Schubert', avatar: PLACEHOLDER, publishedAt: 'vor 5 Wochen',
          text: 'Gibt es auch eine Benachrichtigung bei Zins-Änderungen?' },
      ],
    },
    {
      id: 'fb-einlagensicherung', publishedAt: 'vor 8 Wochen',
      text: 'Sicherheit für Ihr Erspartes. Einlagen bis 100.000 € pro Kunde und Bank sind über die gesetzliche Einlagensicherung im europäischen Wirtschaftsraum geschützt.',
      image: POST_IMG.einlagensicherung, imageAlt: 'Einlagensicherung — Sicherheit für Ihr Erspartes',
      reactions: 142, commentsCount: 6, shares: 12,
      comments: [
        { id: 'c-si-1', author: 'Christian Ade', avatar: PLACEHOLDER, publishedAt: 'vor 7 Wochen',
          text: 'Gilt der Schutz auch bei Banken aus anderen EU-Ländern?',
          replies: [
            { id: 'c-si-1r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO, publishedAt: 'vor 7 Wochen',
              text: 'Ja — jede EU-Mitgliedsbank ist in ihrem Heimatland zur gesetzlichen Einlagensicherung bis 100.000 € verpflichtet.', isCompany: true },
          ] },
        { id: 'c-si-2', author: 'Ines Pollak', avatar: PLACEHOLDER, publishedAt: 'vor 7 Wochen',
          text: 'Sachlich und ohne Panik erklärt — vielen Dank.' },
      ],
    },
    {
      id: 'fb-vermoegensaufbau', publishedAt: 'vor 10 Wochen',
      text: 'Vermögen Schritt für Schritt aufbauen. Kleine Etappen, langfristiges Ziel, ruhiger Weg — ganz ohne Zeitdruck.',
      image: POST_IMG.vermoegensaufbau, imageAlt: 'Vermögensaufbau — Schritt für Schritt',
      reactions: 88, commentsCount: 4, shares: 5,
      comments: [
        { id: 'c-va-1', author: 'Henrik Vogel', avatar: PLACEHOLDER, publishedAt: 'vor 9 Wochen',
          text: 'Der langfristige Ansatz ist genau das, was ich suche.' },
        { id: 'c-va-2', author: 'Monika Drechsler', avatar: PLACEHOLDER, publishedAt: 'vor 9 Wochen',
          text: 'Wie viel sollte man idealerweise pro Monat zurücklegen?' },
      ],
    },
    {
      id: 'fb-europa', publishedAt: 'vor 12 Wochen',
      text: 'Sparen in Europa – grenzüberschreitende Konditionen im Überblick. Attraktive Angebote sind nicht immer aus Deutschland.',
      image: POST_IMG.europa, imageAlt: 'Sparen in Europa',
      reactions: 63, commentsCount: 3, shares: 4,
      comments: [
        { id: 'c-eu-1', author: 'Petra Lindemann', avatar: PLACEHOLDER, publishedAt: 'vor 11 Wochen',
          text: 'Ist der administrative Aufwand höher bei ausländischen Banken?',
          replies: [
            { id: 'c-eu-1r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO, publishedAt: 'vor 11 Wochen',
              text: 'In der Regel nein — der Vertragsschluss läuft standardisiert. Beim Steuer­thema hilft die jeweilige Anlage-KAP.', isCompany: true },
          ] },
      ],
    },
  ],

  /* Foto-Galerie: 6 unterschiedliche Motive — Vorschau zeigt die ersten 3,
     „Alle ansehen" öffnet die volle Galerie mit Lightbox. */
  photos: [
    { id: 'ph-tagesgeld',         src: POST_IMG.tagesgeld,         alt: 'Tagesgeld — flexibel sparen' },
    { id: 'ph-festgeld',          src: POST_IMG.festgeld,          alt: 'Festgeld — planbar anlegen' },
    { id: 'ph-zinsen',            src: POST_IMG.zinsen,            alt: 'Zinsen im Blick behalten' },
    { id: 'ph-einlagensicherung', src: POST_IMG.einlagensicherung, alt: 'Einlagensicherung — Sicherheit für Ihr Erspartes' },
    { id: 'ph-vermoegensaufbau',  src: POST_IMG.vermoegensaufbau,  alt: 'Vermögensaufbau — Schritt für Schritt' },
    { id: 'ph-europa',            src: POST_IMG.europa,            alt: 'Sparen in Europa' },
  ],
};

export { formatCount } from '@/data/social/formatCount';
export default facebookProfile;
