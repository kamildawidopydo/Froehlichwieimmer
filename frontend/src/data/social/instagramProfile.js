import siteContact from '@/data/siteContact';
import { instagramReelThreads, reelCommentCount } from '@/data/social/instagramReelCommentData';
import { instagramPostCommentsById } from '@/data/social/instagramPostComments';

const IG = '/assets/social/instagram';
const IG_V = '?v=25';
const SITE_LOGO = '/assets/logo/kapitalmitte-logo.png?v=19';
/** Circular avatar — mark crop, not wide lockup. */
const PROFILE_AVATAR = '/assets/logo/kapitalmitte-mark.png?v=19';

/** Statische Instagram-Vorschau — Kapitalmitte (kein echtes IG-Profil). */
export const instagramProfile = {
  platform: 'instagram',
  username: 'kapitalmitte',
  displayName: 'Kapitalmitte',
  verified: true,
  category: 'Finanzdienstleistungen',
  stats: {
    posts: 9,
    followers: 4127,
    following: 48,
  },
  bio: [
    'Vergleichsplattform für Tagesgeld, Flexgeld & Festgeld',
    '🇪🇺 EU-Partnerbanken · Einlagensicherung',
    '📍 Frankfurt am Main',
    'Keine Anlageberatung über Social Media.',
  ].join('\n'),
  linkInBio: {
    label: 'kapitalmitte.com',
    href: 'https://www.kapitalmitte.com',
  },
  assets: {
    avatar: PROFILE_AVATAR,
    logo: SITE_LOGO,
  },
  highlights: [
    {
      id: 'sparvergleich',
      title: 'Sparvergleich',
      cover: `${IG}/highlights/sparvergleich.png${IG_V}`,
      slides: [
        { image: `${IG}/stories/sparvergleich-1.png${IG_V}`, headline: 'Vergleich' },
        { image: `${IG}/stories/sparvergleich-2.png${IG_V}`, headline: 'Filter' },
      ],
    },
    {
      id: 'zinsen',
      title: 'Zinsen',
      cover: `${IG}/highlights/zinsen.png${IG_V}`,
      slides: [
        { image: `${IG}/stories/zinsen-1.png${IG_V}`, headline: 'Zinsen' },
        { image: `${IG}/stories/zinsen-2.png${IG_V}`, headline: 'Rechner' },
      ],
    },
    {
      id: 'sicherheit',
      title: 'Sicherheit',
      cover: `${IG}/highlights/sicherheit.png${IG_V}`,
      slides: [
        { image: `${IG}/stories/sicherheit-1.png${IG_V}`, headline: 'Einlage' },
        { image: `${IG}/stories/sicherheit-2.png${IG_V}`, headline: 'Transparenz' },
      ],
    },
    {
      id: 'team',
      title: 'Team',
      cover: `${IG}/highlights/team.png${IG_V}`,
      slides: [
        { image: `${IG}/stories/team-1.png${IG_V}`, headline: 'Frankfurt' },
        { image: `${IG}/stories/team-2.png${IG_V}`, headline: 'Kontakt' },
      ],
    },
    {
      id: 'faq',
      title: 'FAQ',
      cover: `${IG}/highlights/faq.png${IG_V}`,
      slides: [
        { image: `${IG}/stories/faq-1.png${IG_V}`, headline: 'FAQ' },
        { image: `${IG}/stories/faq-2.png${IG_V}`, headline: 'Bonus' },
      ],
    },
  ],
  reels: [
    {
      id: 'reel-sparvergleich',
      video: `${IG}/reels/reel-sparvergleich.mp4${IG_V}`,
      poster: `${IG}/reels/reel-sparvergleich.png${IG_V}`,
      views: 2840,
      likes: 186,
      comments: reelCommentCount(instagramReelThreads.sparvergleich),
      caption: 'Tagesgeld, Flexgeld & Festgeld — EU-Partnerbanken auf einen Blick. 🔍',
      commentThread: instagramReelThreads.sparvergleich,
    },
    {
      id: 'reel-zinsen',
      video: `${IG}/reels/reel-zinsen.mp4${IG_V}`,
      poster: `${IG}/reels/reel-zinsen.png${IG_V}`,
      views: 1920,
      likes: 142,
      comments: reelCommentCount(instagramReelThreads.zinsen),
      caption: 'Aktuelle Zinsen im Vergleich — Link in Bio. 📊',
      commentThread: instagramReelThreads.zinsen,
    },
    {
      id: 'reel-sicherheit',
      video: `${IG}/reels/reel-sicherheit.mp4${IG_V}`,
      poster: `${IG}/reels/reel-sicherheit.png${IG_V}`,
      views: 3150,
      likes: 203,
      comments: reelCommentCount(instagramReelThreads.sicherheit),
      caption: 'Einlagensicherung in der EU — kurz erklärt. 🛡️',
      commentThread: instagramReelThreads.sicherheit,
    },
  ],
  posts: [
    {
      id: 'ig-1',
      image: `${IG}/posts/post-sparvergleich.png${IG_V}`,
      imageAlt: 'EU-Sparvergleich — Instagram',
      caption:
        'Über 50 regulierte Partnerbanken in der EU — Tagesgeld, Flexgeld und Festgeld auf einen Blick. ✨\n\n#Sparvergleich #Tagesgeld #Kapitalmitte #EU',
      likes: 312,
      publishedAt: 'vor 3 Wochen',
      comments: instagramPostCommentsById['ig-1'],
    },
    {
      id: 'ig-2',
      image: `${IG}/posts/post-einlage.png${IG_V}`,
      imageAlt: 'Einlagensicherung EU',
      caption:
        'Einlagen bei Partnerbanken: gesetzlicher Schutz in der EU — kurz erklärt in unserem Story-Highlight „Sicherheit“. 🔒\n\n#Einlagensicherung #Sparer',
      likes: 428,
      publishedAt: 'vor 5 Wochen',
      comments: instagramPostCommentsById['ig-2'],
    },
    {
      id: 'ig-3',
      image: `${IG}/posts/post-bonus.png${IG_V}`,
      imageAlt: 'Willkommensbonus',
      caption:
        'Neukunden-Bonus bei teilnehmenden Partnerbanken — bis zu 300 € zusätzlich. Details im jeweiligen Angebot auf der Website. 💶\n\n#Bonus #Festgeld',
      likes: 521,
      publishedAt: 'vor 8 Wochen',
      comments: instagramPostCommentsById['ig-3'],
    },
    {
      id: 'ig-4',
      image: `${IG}/posts/post-zinsen.png${IG_V}`,
      imageAlt: 'Zinsvergleich',
      caption:
        'Aktuelle Zinsen im Vergleich — Filter nach Laufzeit und Mindestanlage. Link in Bio. 📊\n\n#Zinsen #Sparzinsen',
      likes: 267,
      publishedAt: 'vor 11 Wochen',
      comments: instagramPostCommentsById['ig-4'],
    },
    {
      id: 'ig-5',
      image: `${IG}/posts/post-tagesgeld.png${IG_V}`,
      imageAlt: 'Tagesgeld',
      caption: 'Tagesgeld: täglich verfügbar, Zinsen im Blick — ideal für Rücklagen. #Tagesgeld',
      likes: 198,
      publishedAt: 'vor 14 Wochen',
      comments: instagramPostCommentsById['ig-5'],
    },
    {
      id: 'ig-6',
      image: `${IG}/posts/post-flexgeld.png${IG_V}`,
      imageAlt: 'Flexgeld',
      caption: 'Flexgeld kombiniert Flexibilität mit höheren Zinsen — im Vergleich erklärt. #Flexgeld',
      likes: 174,
      publishedAt: 'vor 16 Wochen',
      comments: instagramPostCommentsById['ig-6'],
    },
    {
      id: 'ig-7',
      image: `${IG}/posts/post-frankfurt.png${IG_V}`,
      imageAlt: 'Frankfurt Büro',
      caption: `Unser Team in Frankfurt — ${siteContact.street}. Persönliche Beratung nach Termin. #Frankfurt #Kapitalmitte`,
      likes: 243,
      publishedAt: 'vor 20 Wochen',
      comments: instagramPostCommentsById['ig-7'],
    },
    {
      id: 'ig-8',
      image: `${IG}/posts/post-team.png${IG_V}`,
      imageAlt: 'Team Kapitalmitte',
      caption: 'Menschen hinter dem Vergleich — nicht nur Algorithmen. Story „Team“ zeigt mehr. 👋',
      likes: 189,
      publishedAt: 'vor 22 Wochen',
      comments: instagramPostCommentsById['ig-8'],
    },
    {
      id: 'ig-9',
      image: `${IG}/posts/post-europa.png${IG_V}`,
      imageAlt: 'EU Partnernetzwerk',
      caption: 'Partnerbanken in ganz Europa — strukturiert und transparent vermittelt. 🇪🇺 #EU #Partnerbanken',
      likes: 356,
      publishedAt: 'vor 26 Wochen',
      comments: instagramPostCommentsById['ig-9'],
    },
  ],
};

export { formatCount } from '@/data/social/formatCount';

export default instagramProfile;
