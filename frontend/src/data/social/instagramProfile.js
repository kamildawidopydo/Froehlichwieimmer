import siteContact from '@/data/siteContact';
import { instagramReelThreads, reelCommentCount } from '@/data/social/instagramReelCommentData';
import { instagramPostCommentsById } from '@/data/social/instagramPostComments';
import { POST_IMG } from '@/data/social/postArtwork';

const PLACEHOLDER = '/assets/social/placeholder.svg';
const SITE_LOGO = '/assets/logo/frohlich-logo.png?v=2';
const PROFILE_AVATAR = '/assets/logo/frohlich-mark.png?v=2';

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
    // TODO(Fröhlich Vermögensberatung): finale Website-URL eintragen.
    label: 'Website folgt',
    href: '#',
  },
  assets: {
    avatar: PROFILE_AVATAR,
    logo: SITE_LOGO,
  },
  highlights: [
    { id: 'vermoegen', title: 'Vermögen', cover: PLACEHOLDER, slides: [{ image: PLACEHOLDER, headline: 'Aufbau' }] },
    { id: 'sparen', title: 'Sparen', cover: PLACEHOLDER, slides: [{ image: PLACEHOLDER, headline: 'Sparen' }] },
    { id: 'vorsorge', title: 'Vorsorge', cover: PLACEHOLDER, slides: [{ image: PLACEHOLDER, headline: 'Vorsorge' }] },
    { id: 'team', title: 'Team', cover: PLACEHOLDER, slides: [{ image: PLACEHOLDER, headline: 'Team' }] },
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
