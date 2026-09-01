import siteContact from '@/data/siteContact';
import { instagramReelThreads, reelCommentCount } from '@/data/social/instagramReelCommentData';
import { instagramPostCommentsById } from '@/data/social/instagramPostComments';
import { POST_IMG } from '@/data/social/postArtwork';

const PLACEHOLDER = '/assets/social/placeholder.svg';
const SITE_LOGO = '/assets/logo/frohlich-logo.png?v=4';
const PROFILE_AVATAR = '/assets/logo/frohlich-mark.png?v=4';

/** Highlight-Assets — jedes Highlight hat eigene Cover und 4 unterschiedliche Story-Slides. */
const HL = {
  covers: {
    vermoegen: '/assets/social/highlights/covers/vermoegen.svg',
    sparen:    '/assets/social/highlights/covers/sparen.svg',
    vorsorge:  '/assets/social/highlights/covers/vorsorge.svg',
    team:      '/assets/social/highlights/covers/team.svg',
    faq:       '/assets/social/highlights/covers/faq.svg',
  },
  vermoegen: {
    aufbau:         POST_IMG.vermoegensaufbau,
    diversifikation: POST_IMG.diversifikation,
    aktienAnleihen: '/assets/social/highlights/vermoegen/03-aktien-anleihen.svg',
    beratung:       POST_IMG.beratung,
  },
  sparen: {
    tagesgeld:  POST_IMG.tagesgeld,
    festgeld:   POST_IMG.festgeld,
    liquiditaet:'/assets/social/highlights/sparen/03-liquiditaet.svg',
    zinsen:     POST_IMG.zinsen,
  },
  vorsorge: {
    langfristig: '/assets/social/highlights/vorsorge/01-langfristig.svg',
    reserven:    '/assets/social/highlights/vorsorge/02-reserven.svg',
    ziele:       '/assets/social/highlights/vorsorge/03-ziele.svg',
    ueberpruefen:'/assets/social/highlights/vorsorge/04-ueberpruefen.svg',
  },
  team: {
    unternehmen:   '/assets/social/highlights/team/01-unternehmen.svg',
    gespraech:     '/assets/social/highlights/team/02-gespraech.svg',
    weiterbildung: '/assets/social/highlights/team/03-weiterbildung.svg',
    service:       '/assets/social/highlights/team/04-service.svg',
  },
  faq: {
    tagesgeld:      '/assets/social/highlights/faq/01-tagesgeld.svg',
    festgeld:       '/assets/social/highlights/faq/02-festgeld.svg',
    diversifikation:'/assets/social/highlights/faq/03-diversifikation.svg',
    gespraech:      '/assets/social/highlights/faq/04-gespraech.svg',
  },
};

/** Statische Instagram-Vorschau — Fröhlich Vermögensberatung GmbH (kein echtes IG-Profil). */
export const instagramProfile = {
  platform: 'instagram',
  // TODO(Fröhlich Vermögensberatung): echten Instagram-Benutzernamen bestätigen.
  username: 'froehlich_vermoegensberatung',
  displayName: 'Fröhlich Vermögensberatung GmbH',
  verified: false,
  category: 'Finanzdienstleistungen',
  stats: {
    posts: 6,
    followers: 1240,
    following: 32,
  },
  bio: [
    'Fröhlich Vermögensberatung GmbH',
    'Informationen rund um Vermögensaufbau, Sparen und Vorsorge.',
    '📍 Deutschland',
    'Keine Anlageberatung über Social Media.',
  ].join('\n'),
  linkInBio: {
    label: 'kapital-direkt24.de',
    href: 'https://kapital-direkt24.de/',
  },
  assets: {
    avatar: PROFILE_AVATAR,
    logo: SITE_LOGO,
  },
  highlights: [
    {
      id: 'vermoegen', title: 'Vermögen', cover: HL.covers.vermoegen,
      slides: [
        { image: HL.vermoegen.aufbau,          headline: 'Langfristiger Vermögensaufbau' },
        { image: HL.vermoegen.diversifikation, headline: 'Diversifikation' },
        { image: HL.vermoegen.aktienAnleihen,  headline: 'Aktien & Anleihen' },
        { image: HL.vermoegen.beratung,        headline: 'Persönliche Planung' },
      ],
    },
    {
      id: 'sparen', title: 'Sparen', cover: HL.covers.sparen,
      slides: [
        { image: HL.sparen.tagesgeld,   headline: 'Tagesgeld' },
        { image: HL.sparen.festgeld,    headline: 'Festgeld' },
        { image: HL.sparen.liquiditaet, headline: 'Liquidität' },
        { image: HL.sparen.zinsen,      headline: 'Zinsen verstehen' },
      ],
    },
    {
      id: 'vorsorge', title: 'Vorsorge', cover: HL.covers.vorsorge,
      slides: [
        { image: HL.vorsorge.langfristig,  headline: 'Langfristig planen' },
        { image: HL.vorsorge.reserven,     headline: 'Finanzielle Reserven' },
        { image: HL.vorsorge.ziele,        headline: 'Ziele definieren' },
        { image: HL.vorsorge.ueberpruefen, headline: 'Regelmäßig überprüfen' },
      ],
    },
    {
      id: 'team', title: 'Team', cover: HL.covers.team,
      slides: [
        { image: HL.team.unternehmen,   headline: 'Fröhlich Vermögensberatung' },
        { image: HL.team.gespraech,     headline: 'Persönliche Betreuung' },
        { image: HL.team.weiterbildung, headline: 'Weiterbildung' },
        { image: HL.team.service,       headline: 'Kundenservice' },
      ],
    },
    {
      id: 'faq', title: 'FAQ', cover: HL.covers.faq,
      slides: [
        { image: HL.faq.tagesgeld,       headline: 'Was ist Tagesgeld?' },
        { image: HL.faq.festgeld,        headline: 'Was ist Festgeld?' },
        { image: HL.faq.diversifikation, headline: 'Warum Diversifikation?' },
        { image: HL.faq.gespraech,       headline: 'Wie vereinbare ich ein Gespräch?' },
      ],
    },
  ],
  reels: [
    {
      id: 'reel-vermoegen',
      video: null,
      poster: PLACEHOLDER,
      views: 820,
      likes: 64,
      comments: reelCommentCount(instagramReelThreads.sparvergleich),
      caption: 'Strukturierter Vermögensaufbau — Grundlagen einfach erklärt.',
      commentThread: instagramReelThreads.sparvergleich,
    },
    {
      id: 'reel-sparen',
      video: null,
      poster: PLACEHOLDER,
      views: 640,
      likes: 51,
      comments: reelCommentCount(instagramReelThreads.zinsen),
      caption: 'Sparen mit Übersicht — Laufzeit, Zinsen, Sicherheit.',
      commentThread: instagramReelThreads.zinsen,
    },
    {
      id: 'reel-vorsorge',
      video: null,
      poster: PLACEHOLDER,
      views: 910,
      likes: 78,
      comments: reelCommentCount(instagramReelThreads.sicherheit),
      caption: 'Vorsorge im Fokus — was Sparer heute wissen sollten.',
      commentThread: instagramReelThreads.sicherheit,
    },
  ],
  posts: [
    { id: 'ig-1', image: POST_IMG.tagesgeld,         imageAlt: 'Tagesgeld — flexibel sparen',
      caption: 'Tagesgeld – flexibel sparen mit tagesaktuellen Zinsen. Ihr Geld bleibt jederzeit verfügbar, ohne feste Laufzeit. #Tagesgeld #Sparen',
      likes: 148, publishedAt: 'vor 3 Wochen', comments: instagramPostCommentsById['ig-1'] },
    { id: 'ig-2', image: POST_IMG.festgeld,          imageAlt: 'Festgeld — planbar anlegen',
      caption: 'Festgeld – planbar anlegen. Feste Laufzeit, feste Konditionen, ruhig kalkulierbar. #Festgeld #Vermögensplanung',
      likes: 132, publishedAt: 'vor 5 Wochen', comments: instagramPostCommentsById['ig-2'] },
    { id: 'ig-3', image: POST_IMG.zinsen,            imageAlt: 'Zinsen im Blick behalten',
      caption: 'Zinsen im Blick behalten. Wir vergleichen Konditionen quartalsweise – verständlich aufbereitet. #Zinsen #Konditionen',
      likes: 176, publishedAt: 'vor 8 Wochen', comments: instagramPostCommentsById['ig-3'] },
    { id: 'ig-4', image: POST_IMG.einlagensicherung, imageAlt: 'Einlagensicherung — Sicherheit für Ihr Erspartes',
      caption: 'Einlagensicherung – Sicherheit für Ihr Erspartes im europäischen Sicherungssystem. #Einlagensicherung #Sicherheit',
      likes: 98,  publishedAt: 'vor 11 Wochen', comments: instagramPostCommentsById['ig-4'] },
    { id: 'ig-5', image: POST_IMG.vermoegensaufbau,  imageAlt: 'Vermögensaufbau — Schritt für Schritt',
      caption: 'Vermögen Schritt für Schritt aufbauen. Kleine Etappen, langfristiges Ziel, ruhiger Weg. #Vermögensaufbau #Sparplan',
      likes: 84,  publishedAt: 'vor 14 Wochen', comments: instagramPostCommentsById['ig-5'] },
    { id: 'ig-6', image: POST_IMG.europa,            imageAlt: 'Sparmöglichkeiten in Europa',
      caption: 'Sparmöglichkeiten in Europa – grenzüberschreitende Konditionen im Überblick. #Europa #Sparen',
      likes: 71,  publishedAt: 'vor 16 Wochen', comments: instagramPostCommentsById['ig-6'] },
  ],
};

export { formatCount } from '@/data/social/formatCount';
export default instagramProfile;
