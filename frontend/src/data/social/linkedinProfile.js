import siteContact from '@/data/siteContact';
import { socialCopy } from '@/data/siteCopyPhase5';

const PLACEHOLDER = '/assets/social/placeholder.svg';
const SITE_LOGO = '/assets/logo/frohlich-logo.png?v=1';

/** Statische LinkedIn-Unternehmensseiten-Vorschau — Fröhlich Vermögensberatung GmbH. */
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
  location: 'Deutschland',
  stats: { followers: 640, pageViews: 312, employees: '2–10', founded: 2020 },
  specialties: ['Vermögensaufbau', 'Sparen', 'Vorsorge', 'Anlageplanung', 'Persönliche Beratung'],
  intro:
    'Fröhlich Vermögensberatung GmbH — Informationen rund um Vermögensaufbau, Sparen und Vorsorge. Keine Anlageberatung über Social Media.',
  about: {
    overview: {
      intro: [
        'Fröhlich Vermögensberatung GmbH begleitet Menschen bei den grundlegenden Fragen zu Vermögensaufbau, Sparen und Vorsorge.',
        'Wir verfolgen einen ruhigen, langfristigen und verantwortungsvollen Ansatz für Anleger, die ihre Finanzen strukturiert angehen möchten.',
      ],
      focus: {
        title: 'Unser Fokus liegt auf:',
        items: ['langfristigem Vermögensaufbau', 'strukturierter Anlageplanung', 'transparenten Prozessen', 'ruhiger persönlicher Beratung', 'nachvollziehbaren Entscheidungen'],
      },
      bridge:
        'Wir informieren allgemeinverständlich und helfen dabei, Ordnung in die eigenen Finanzen zu bringen — Schritt für Schritt.',
      services: {
        title: 'Unsere Themen umfassen unter anderem:',
        items: ['Vermögensaufbau', 'Spar- und Vorsorgethemen', 'Anlageplanung', 'Finanzielle Ordnung', 'Persönliche Betreuung'],
      },
      closing: [
        'Sicherheit, Transparenz und Verlässlichkeit stehen im Mittelpunkt unserer Arbeit.',
        'Wir kommunizieren ohne Fachchinesisch und begleiten Sie mit Geduld und Struktur.',
      ],
      tags: ['📍 Deutschland', '🔗 Vermögensaufbau · Sparen · Vorsorge'],
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
    // TODO(Fröhlich Vermögensberatung): finale Website-URL bestätigen.
    website: 'Website folgt',
    websiteHref: '#',
    street: siteContact.street,
    city: siteContact.postalCity,
    hours: siteContact.businessHoursLine,
  },
  locations: [{ id: 'hq', label: 'Hauptsitz', address: `${siteContact.street}, ${siteContact.postalCity}` }],
  assets: { cover: PLACEHOLDER, logo: SITE_LOGO },
  pinnedPostId: 'li-1',
  employees: [
    { id: 'e1', name: 'Team Fröhlich Vermögensberatung', role: 'Beratung', avatar: PLACEHOLDER },
    { id: 'e2', name: 'Kundenservice', role: 'Betreuung', avatar: PLACEHOLDER },
  ],
  products: [
    { id: 'prod-1', title: 'Vermögensaufbau', description: 'Langfristig strukturierter Aufbau — ruhig, transparent und nachvollziehbar geplant.', href: '/about', image: PLACEHOLDER },
    { id: 'prod-2', title: 'Sparen mit Struktur', description: 'Rücklagen aufbauen, Ziele erreichen — mit einem Plan, der zum eigenen Leben passt.', href: '/faq', image: PLACEHOLDER },
    { id: 'prod-3', title: 'Vorsorge einfach erklärt', description: 'Ordnung im Vorsorge-Thema — Schritt für Schritt, ohne Fachchinesisch.', href: '/security', image: PLACEHOLDER },
  ],
  media: [
    { id: 'm1', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Markenvisual', type: 'image' },
    { id: 'm2', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Team', type: 'image' },
    { id: 'm3', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Sicherheit', type: 'image' },
    { id: 'm4', src: PLACEHOLDER, alt: 'Fröhlich Vermögensberatung — Konditionen', type: 'image' },
  ],
  similarPages: [
    { id: 'sp1', name: 'Vorsorge Kompakt', tagline: 'Vorsorgewissen für Anleger', followers: 1240, logo: PLACEHOLDER },
    { id: 'sp2', name: 'Finanzplan Deutschland', tagline: 'Anlage- und Sparplanung', followers: 3200, logo: PLACEHOLDER },
    { id: 'sp3', name: 'Vermögens-Journal', tagline: 'Ruhige Finanzthemen', followers: 1810, logo: PLACEHOLDER },
  ],
  posts: [
    {
      id: 'li-1', publishedAt: 'vor 3 Monaten',
      text: 'Vermögensaufbau mit Struktur — langfristig, transparent und ruhig geplant. Gute Finanzentscheidungen brauchen keinen Zeitdruck, sondern einen Plan.',
      image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Vermögensaufbau',
      reactions: 54, commentsCount: 7, reposts: 3,
      comments: [
        { id: 'lc1', author: 'Petra Lindemann', avatar: PLACEHOLDER, publishedAt: 'vor 10 Wochen',
          text: 'Sehr sachlich formuliert — angenehm zu lesen.' },
        { id: 'lc2', author: 'Henrik Vogel', avatar: PLACEHOLDER, publishedAt: 'vor 9 Wochen',
          text: 'Die ruhige Herangehensweise wirkt vertrauenswürdig.',
          replies: [
            { id: 'lc2r1', author: 'Fröhlich Vermögensberatung GmbH', avatar: SITE_LOGO, publishedAt: 'vor 9 Wochen',
              text: 'Vielen Dank für Ihre Rückmeldung — genau das ist unser Anspruch.', isCompany: true },
          ] },
      ],
    },
    {
      id: 'li-2', publishedAt: 'vor 5 Monaten',
      text: 'Sparen mit Weitblick: Rücklagen aufbauen, Ziele erreichen, entspannt bleiben.',
      image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Sparen',
      reactions: 71, commentsCount: 9, reposts: 4,
      comments: [
        { id: 'lc3', author: 'Ralf Schubert', avatar: PLACEHOLDER, publishedAt: 'vor 4 Monaten',
          text: 'Kurz und verständlich — genau richtig.' },
        { id: 'lc4', author: 'Monika Drechsler', avatar: PLACEHOLDER, publishedAt: 'vor 4 Monaten',
          text: 'Solche Inhalte fehlen auf vielen Finanzseiten.' },
      ],
    },
  ],
};

export default linkedinProfile;
