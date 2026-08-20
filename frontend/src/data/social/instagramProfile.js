import siteContact from '@/data/siteContact';
import { instagramReelThreads, reelCommentCount } from '@/data/social/instagramReelCommentData';
import { instagramPostCommentsById } from '@/data/social/instagramPostComments';

const PLACEHOLDER = '/assets/social/placeholder.svg';
const SITE_LOGO = '/assets/logo/frohlich-logo.png?v=1';
const PROFILE_AVATAR = '/assets/logo/frohlich-mark.png?v=1';

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
    { id: 'ig-1', image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Vermögensaufbau',
      caption: 'Vermögensaufbau mit Struktur — langfristig, transparent und ruhig geplant.',
      likes: 148, publishedAt: 'vor 3 Wochen', comments: instagramPostCommentsById['ig-1'] },
    { id: 'ig-2', image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Sparen',
      caption: 'Sparen mit Weitblick: Rücklagen aufbauen, Ziele erreichen, entspannt bleiben.',
      likes: 132, publishedAt: 'vor 5 Wochen', comments: instagramPostCommentsById['ig-2'] },
    { id: 'ig-3', image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Vorsorge',
      caption: 'Vorsorge sollte nicht kompliziert sein. Wir bringen Ordnung ins Thema.',
      likes: 176, publishedAt: 'vor 8 Wochen', comments: instagramPostCommentsById['ig-3'] },
    { id: 'ig-4', image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Konditionen',
      caption: 'Konditionen im Überblick — nur was zu Ihrem Vermögen passt.',
      likes: 98, publishedAt: 'vor 11 Wochen', comments: instagramPostCommentsById['ig-4'] },
    { id: 'ig-5', image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Team',
      caption: 'Menschen hinter der Beratung — persönlich, greifbar, verlässlich.',
      likes: 84, publishedAt: 'vor 14 Wochen', comments: instagramPostCommentsById['ig-5'] },
    { id: 'ig-6', image: PLACEHOLDER, imageAlt: 'Fröhlich Vermögensberatung — Wissen',
      caption: 'Wissen, das trägt — kompakt und ohne Fachchinesisch.',
      likes: 71, publishedAt: 'vor 16 Wochen', comments: instagramPostCommentsById['ig-6'] },
  ],
};

export { formatCount } from '@/data/social/formatCount';
export default instagramProfile;
