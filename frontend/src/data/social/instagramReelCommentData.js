import { countPostComments } from '@/data/social/formatCount';

const IG = '/assets/social/instagram';
const IG_V = '?v=25';
const REEL_AVATAR = (_slug) => '/assets/social/placeholder.svg';

const sparvergleichThread = [
  {
    id: 'rs1',
    author: 'Greta Hoffmann',
    avatar: REEL_AVATAR('greta-hoffmann'),
    publishedAt: 'vor 4 Tagen',
    text: 'Genau der Überblick, den ich für Festgeld gesucht hab.',
  },
  {
    id: 'rs2',
    author: 'Lennart Berger',
    avatar: REEL_AVATAR('lennart-berger'),
    publishedAt: 'vor 4 Tagen',
    text: 'Link in Bio führt direkt zum Vergleich — top.',
  },
  {
    id: 'rs3',
    author: 'Carina Ebert',
    avatar: REEL_AVATAR('carina-ebert'),
    publishedAt: 'vor 3 Tagen',
    text: 'Kurz und verständlich, danke!',
    replies: [
      {
        id: 'rs3r1',
        author: 'Fröhlich Vermögensberatung',
        avatar: '/assets/logo/frohlich-mark.png?v=2',
        publishedAt: 'vor 3 Tagen',
        text: 'Freut uns — bei Fragen steht das FAQ in den Highlights bereit. 🙌',
        isCompany: true,
      },
    ],
  },
  {
    id: 'rs4',
    author: 'Moritz Franke',
    avatar: REEL_AVATAR('moritz-franke'),
    publishedAt: 'vor 3 Tagen',
    text: 'Übersicht nach Laufzeit spart mir jedes Mal Zeit.',
  },
  {
    id: 'rs5',
    author: 'Ulrike Dietrich',
    avatar: REEL_AVATAR('ulrike-dietrich'),
    publishedAt: 'vor 2 Tagen',
    text: 'Endlich ohne Newsletter-Spam vergleichen können.',
  },
];

const zinsenThread = [
  {
    id: 'rz1',
    author: 'Stefanie Krämer',
    avatar: REEL_AVATAR('stefanie-kraemer'),
    publishedAt: 'vor 1 Woche',
    text: 'Zinsfilter hat mir zwei Minuten gespart — danke.',
  },
  {
    id: 'rz2',
    author: 'Hendrik Lohmann',
    avatar: REEL_AVATAR('hendrik-lohmann'),
    publishedAt: 'vor 1 Woche',
    text: 'Endlich ohne Excel-Tabelle vergleichen.',
    replies: [
      {
        id: 'rz2r1',
        author: 'Fröhlich Vermögensberatung',
        avatar: '/assets/logo/frohlich-mark.png?v=2',
        publishedAt: 'vor 6 Tagen',
        text: 'So ist der Vergleich gedacht — viel Erfolg beim Sparen. 📊',
        isCompany: true,
      },
    ],
  },
  {
    id: 'rz3',
    author: 'Matthias Unger',
    avatar: REEL_AVATAR('matthias-unger'),
    publishedAt: 'vor 5 Tagen',
    text: 'Reel kurz, Inhalt klar — mehr davon.',
  },
  {
    id: 'rz4',
    author: 'Renate Holz',
    avatar: REEL_AVATAR('renate-holz'),
    publishedAt: 'vor 4 Tagen',
    text: 'Zinsen auf einen Blick — genau richtig.',
  },
];

const sicherheitThread = [
  {
    id: 'rf1',
    author: 'Annette Busch',
    avatar: REEL_AVATAR('annette-busch'),
    publishedAt: 'vor 2 Wochen',
    text: 'Einlagensicherung endlich ohne Fachchinesisch erklärt.',
  },
  {
    id: 'rf2',
    author: 'Philipp Ritter',
    avatar: REEL_AVATAR('philipp-ritter'),
    publishedAt: 'vor 2 Wochen',
    text: 'Hab das meinen Eltern weitergeleitet — super verständlich.',
    replies: [
      {
        id: 'rf2r1',
        author: 'Fröhlich Vermögensberatung',
        avatar: '/assets/logo/frohlich-mark.png?v=2',
        publishedAt: 'vor 12 Tagen',
        text: 'Danke fürs Teilen — Story-Highlight „Sicherheit“ hat noch mehr Details. 🛡️',
        isCompany: true,
      },
    ],
  },
  {
    id: 'rf3',
    author: 'Kirsten Adam',
    avatar: REEL_AVATAR('kirsten-adam'),
    publishedAt: 'vor 11 Tagen',
    text: 'Genau die Infos, die ich vor der ersten Anlage brauchte.',
  },
  {
    id: 'rf4',
    author: 'Werner Scholz',
    avatar: REEL_AVATAR('werner-scholz'),
    publishedAt: 'vor 10 Tagen',
    text: 'Kurz erklärt, trotzdem vollständig — stark.',
  },
  {
    id: 'rf5',
    author: 'Bettina Graf',
    avatar: REEL_AVATAR('bettina-graf'),
    publishedAt: 'vor 9 Tagen',
    text: 'So soll Finanzcontent auf Social Media sein.',
  },
];

export const instagramReelThreads = {
  sparvergleich: sparvergleichThread,
  zinsen: zinsenThread,
  sicherheit: sicherheitThread,
};

export const reelCommentCount = (thread) => countPostComments(thread);

export default instagramReelThreads;
