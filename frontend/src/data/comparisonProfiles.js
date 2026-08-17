import { isBbvaOffer, getOfferRatingValue } from '@/lib/offerRating';
import { roundToQuarter } from '@/lib/starRating';
import {
  getReviewTemplatePoolSize,
  renderReviewFromTemplate,
  reviewTextFingerprint,
  buildReviewTextContext,
} from '@/data/offerReviewTexts';
import {
  humanizeReviewText,
  PROBLEM_REVIEW_TEMPLATES,
  pickKapitalmitteReply,
} from '@/lib/humanizeReviewText';

export const MEDIATOR_BRAND = 'Kapitalmitte';

const COUNTRY_DE = {
  Germany: 'Deutschland',
  France: 'Frankreich',
  Italy: 'Italien',
  Spain: 'Spanien',
  Netherlands: 'Niederlande',
  Austria: 'Österreich',
  Belgium: 'Belgien',
  Sweden: 'Schweden',
  Portugal: 'Portugal',
  Poland: 'Polen',
  Finland: 'Finnland',
  Denmark: 'Dänemark',
  Ireland: 'Irland',
  Luxembourg: 'Luxemburg',
  Greece: 'Griechenland',
  Estonia: 'Estland',
  Norway: 'Norwegen',
  Latvia: 'Lettland',
  Lithuania: 'Litauen',
  'Czech Republic': 'Tschechien',
  Switzerland: 'Schweiz',
};

const COUNTRY_FACTS = {
  Germany: {
    euSince: 'seit 1958 (EWG / EU)',
    currency: 'EUR',
    sovereignRating: 'AAA',
    economyBlurb:
      'Deutschland ist die größte Volkswirtschaft der Eurozone mit starker Industriebasis, hoher Exportquote und stabiler Institutionenqualität.',
  },
  France: {
    euSince: 'seit 1958 (EWG / EU)',
    currency: 'EUR',
    sovereignRating: 'AA',
    economyBlurb:
      'Frankreich verfügt über eine diversifizierte Wirtschaft mit Schwerpunkten in Industrie, Dienstleistungen und Landwirtschaft sowie eine etablierte Rolle in der EU.',
  },
  Italy: {
    euSince: 'seit 1958 (EWG / EU)',
    currency: 'EUR',
    sovereignRating: 'BBB',
    economyBlurb:
      'Italien ist eine große Volkswirtschaft der Eurozone mit bedeutendem Mittelstand; die öffentliche Verschuldung bleibt ein strukturelles Thema für Anleger.',
  },
  Spain: {
    euSince: 'seit 1986',
    currency: 'EUR',
    sovereignRating: 'A-',
    economyBlurb:
      'Spanien hat sich nach der Finanzkrise konsolidiert; Tourismus, Dienstleistungen und ein wachsender Technologiesektor prägen das Wachstum.',
  },
  Netherlands: {
    euSince: 'seit 1958 (EWG / EU)',
    currency: 'EUR',
    sovereignRating: 'AAA',
    economyBlurb:
      'Die Niederlande gelten als offene, exportorientierte Volkswirtschaft mit hoher institutioneller Stabilität und guter Infrastruktur.',
  },
  Austria: {
    euSince: 'seit 1995',
    currency: 'EUR',
    sovereignRating: 'AA+',
    economyBlurb:
      'Österreich verbindet eine stabile Finanzwirtschaft mit starker Nähe zum deutschen Wirtschaftsraum und solider Industrie.',
  },
  Belgium: {
    euSince: 'seit 1958 (EWG / EU)',
    currency: 'EUR',
    sovereignRating: 'AA-',
    economyBlurb:
      'Belgien ist Standort internationaler Organisationen und eines diversifizierten Dienstleistungssektors in der Eurozone.',
  },
  Sweden: {
    euSince: 'seit 1995',
    currency: 'SEK',
    sovereignRating: 'AAA',
    economyBlurb:
      'Schweden gilt als innovativ und fiskal konsolidiert; außerhalb der Eurozone bleibt die schwedische Krone ein Wechselkursthema für Rückzahlungen.',
  },
  Portugal: {
    euSince: 'seit 1986',
    currency: 'EUR',
    sovereignRating: 'BBB+',
    economyBlurb:
      'Portugal profitiert von Tourismus und europäischer Konvergenz; die Bonität liegt unter den Top-Ländern der Eurozone.',
  },
  Poland: {
    euSince: 'seit 2004',
    currency: 'PLN',
    sovereignRating: 'A-',
    economyBlurb:
      'Polen ist eine große Schwellenmarkt-Wirtschaft innerhalb der EU mit PLN als Landeswährung – Wechselkursrisiken sind zu beachten.',
  },
  Finland: {
    euSince: 'seit 1995',
    currency: 'EUR',
    sovereignRating: 'AA+',
    economyBlurb:
      'Finnland bietet hohe institutionelle Qualität und technologieorientierte Wirtschaftsstrukturen in der Eurozone.',
  },
  Denmark: {
    euSince: 'seit 1973',
    currency: 'DKK',
    sovereignRating: 'AAA',
    economyBlurb:
      'Dänemark gilt als sehr stabil; die Krone ist eng an den Euro gekoppelt, dennoch besteht kein Euro-Mitgliedschaftsstatus.',
  },
  Ireland: {
    euSince: 'seit 1973',
    currency: 'EUR',
    sovereignRating: 'AA',
    economyBlurb:
      'Irland ist ein internationaler Finanz- und Technologiestandort mit hoher EU-Integration und attraktiver Unternehmenslandschaft.',
  },
  Luxembourg: {
    euSince: 'seit 1958 (EWG / EU)',
    currency: 'EUR',
    sovereignRating: 'AAA',
    economyBlurb:
      'Luxemburg ist ein Finanzplatz mit sehr hoher Kaufkraft und AAA-Bonität innerhalb der Eurozone.',
  },
  Greece: {
    euSince: 'seit 1981',
    currency: 'EUR',
    sovereignRating: 'BBB',
    economyBlurb:
      'Griechenland hat sich nach der Schuldenkrise erholt; die Bonität liegt unter den führenden EU-Staaten.',
  },
  Estonia: {
    euSince: 'seit 2004',
    currency: 'EUR',
    sovereignRating: 'A',
    economyBlurb:
      'Estland gilt als digital fortgeschrittene Volkswirtschaft mit stabiler Finanzaufsicht und Euro-Mitgliedschaft.',
  },
  Norway: {
    euSince: 'EFTA (kein EU-Mitglied)',
    currency: 'NOK',
    sovereignRating: 'AAA',
    economyBlurb:
      'Norwegen verfügt über hohe Fiskalreserven und AAA-Bonität; NOK-Wechselkursrisiken sind bei Rückzahlungen zu beachten.',
  },
  Latvia: {
    euSince: 'seit 2004',
    currency: 'EUR',
    sovereignRating: 'A-',
    economyBlurb:
      'Lettland ist seit 2014 Euro-Mitglied mit wachsender Finanzdienstleistungsbranche und EU-Einlagensicherung.',
  },
  Lithuania: {
    euSince: 'seit 2004',
    currency: 'EUR',
    sovereignRating: 'A',
    economyBlurb:
      'Litauen bietet EU-regulierte Bankenprodukte mit Euro-Einlagensicherung und wachsendem Fintech-Sektor.',
  },
  'Czech Republic': {
    euSince: 'seit 2004',
    currency: 'CZK',
    sovereignRating: 'AA-',
    economyBlurb:
      'Tschechien ist EU-Mitglied mit eigener Währung (CZK); Wechselkursrisiken bei Rückzahlungen beachten.',
  },
  Switzerland: {
    euSince: 'kein EU-Mitglied (EFTA)',
    currency: 'CHF',
    sovereignRating: 'AAA',
    economyBlurb:
      'Die Schweiz bietet hohe Stabilität und FINMA-Aufsicht; Einlagensicherung erfolgt über esisuisse in CHF.',
  },
};

const BANK_BLURBS = {
  bbva: {
    founded: '1857',
    hq: 'Bilbao / Madrid',
    blurb:
      'Die BBVA (Banco Bilbao Vizcaya Argentaria) gehört zu den größten Bankengruppen Spaniens mit langer Geschichte und internationaler Retail- sowie Firmenkundenpräsenz. In Deutschland tritt die BBVA über ihre Zweigniederlassung als Direktbank auf und bietet unter anderem Tages- und Festgeld für Privatkunden.',
  },
  santander: {
    founded: '1857',
    hq: 'Santander (Spanien)',
    blurb:
      'Die Banco Santander ist eine der größten Banken Europas mit Schwerpunkt Spanien, Lateinamerika und dem Vereinigten Königreich. Das Institut ist börsennotiert und unterliegt der europäischen Bankenaufsicht; Sparprodukte werden über Zweigniederlassungen und Partner angeboten.',
  },
  ing: {
    founded: '1991 (ING-DiBa / ING Groep)',
    hq: 'Amsterdam',
    blurb:
      'Die ING ist eine niederländische Großbank mit starker Digitalpräsenz in Deutschland. Bekannt für Direktbanking, bietet sie Tages- und Festgeldkonten mit transparenter Kostenstruktur und EU-Einlagensicherung.',
  },
  knab: {
    founded: '2002',
    hq: 'Leeuwarden (Niederlande)',
    blurb:
      'Bunq ist eine niederländische Direktbank mit Fokus auf digitales Banking für Privatkunden. Produkte werden aus den Niederlanden erbracht; es gelten niederländische Einlagensicherung und EU-Richtlinien.',
  },
  bnp: {
    founded: '2000 (Gruppe BNP Paribas)',
    hq: 'Paris',
    blurb:
      'BNP Paribas ist eine führende europäische Universalbank mit Schwerpunkt Frankreich und globalem Corporate- und Investmentgeschäft. Sparangebote erfolgen über regulierte Einheiten mit französischer Einlagensicherung.',
  },
  deutsche: {
    founded: '1870',
    hq: 'Frankfurt am Main',
    blurb:
      'Die Deutsche Bank ist Deutschlands größtes Kreditinstitut mit globaler Investment- und Firmenkundenexpertise. Privatkundensparprodukte werden über die deutsche Einheit angeboten; die gesetzliche Einlagensicherung greift bis 100.000 € pro Kunde.',
  },
  unicredit: {
    founded: '1998',
    hq: 'Mailand',
    blurb:
      'UniCredit ist eine paneuropäische Bankengruppe mit Schwerpunkt Italien, Deutschland und Mitteleuropa. Sparprodukte werden über Tochtergesellschaften mit jeweiligem Landesschutz angeboten.',
  },
  rabobank: {
    founded: '1898',
    hq: 'Utrecht',
    blurb:
      'Die Rabobank ist eine niederländische Genossenschaftsbank mit Fokus auf Agrarfinanzierung und nachhaltige Finanzierung. Privatkundenangebote unterliegen der niederländischen Einlagensicherung.',
  },
  commerzbank: {
    founded: '1870',
    hq: 'Frankfurt am Main',
    blurb:
      'Die Commerzbank ist eine etablierte deutsche Geschäftsbank mit Digitalangeboten für Privatkunden. Einlagen profitieren von der deutschen gesetzlichen Einlagensicherung.',
  },
  tf: {
    founded: '1987',
    hq: 'Stockholm',
    blurb:
      'TF Bank ist eine schwedische Spezialbank mit Fokus auf Konsumentenfinanzierung und Einlagenprodukte in mehreren Märkten. Der Sitz in Schweden bedeutet schwedische Aufsicht und schwedische Einlagensicherung für entsprechende Konten.',
  },
  bigbank: {
    founded: '2009',
    hq: 'Tallinn',
    blurb:
      'Bigbank ist eine estnische Spezialbank für Konsumentenkredite und Einlagen mit starker digitaler Ausrichtung. Produkte unterliegen der estnischen Finantsinspektsioon und der EU-Einlagensicherung.',
  },
  nordax: {
    founded: '1910',
    hq: 'Stockholm',
    blurb:
      'Nordax Bank (Nordax Group) ist eine schwedische Bank mit langjähriger Historie und Fokus auf Einlagen und Konsumentenfinanzierung in Nordeuropa.',
  },
  klarna: {
    founded: '2005',
    hq: 'Stockholm',
    blurb:
      'Klarna Bank ist Teil des schwedischen Fintech-Konzerns Klarna und bietet unter Banklizenz regulierte Sparprodukte mit schwedischer Einlagensicherung.',
  },
  consors: {
    founded: '1994',
    hq: 'Nürnberg',
    blurb:
      'Die Consorsbank ist eine etablierte deutsche Direktbank der BNP Paribas Gruppe mit Tages- und Festgeldangeboten für Privatkunden.',
  },
  trade_republic: {
    founded: '2019',
    hq: 'Berlin',
    blurb:
      'Trade Republic ist eine deutsche Neobank mit BaFin-Lizenz, bekannt für Brokerage — ergänzt durch Tagesgeldprodukte mit deutscher Einlagensicherung.',
  },
  openbank: {
    founded: '1995',
    hq: 'Madrid',
    blurb:
      'Openbank ist die Digitalbank der spanischen Santander Gruppe und bietet Tagesgeld unter spanischer Aufsicht und Einlagensicherung.',
  },
  postfinance: {
    founded: '1906',
    hq: 'Bern',
    blurb:
      'PostFinance ist das Finanzinstitut der Schweizer Post, beaufsichtigt durch FINMA mit Schweizer Einlagensicherung (esisuisse).',
  },
};

function profileKeyFromName(bankName) {
  const n = (bankName || '').toLowerCase();
  if (n.includes('bbva')) return 'bbva';
  if (n.includes('santander')) return 'santander';
  if (n.includes('knab')) return 'knab';
  if (n.includes('ing')) return 'ing';
  if (n.includes('bnp') || n.includes('paribas')) return 'bnp';
  if (n.includes('deutsche bank')) return 'deutsche';
  if (n.includes('unicredit')) return 'unicredit';
  if (n.includes('rabobank')) return 'rabobank';
  if (n.includes('commerzbank')) return 'commerzbank';
  if (n.includes('tf bank') || n === 'tf') return 'tf';
  if (n.includes('bigbank')) return 'bigbank';
  if (n.includes('nordax')) return 'nordax';
  if (n.includes('klarna')) return 'klarna';
  if (n.includes('consors')) return 'consors';
  if (n.includes('trade republic')) return 'trade_republic';
  if (n.includes('openbank')) return 'openbank';
  if (n.includes('postfinance')) return 'postfinance';
  return null;
}

function simpleHash(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function offerReviewSeed(offer, salt = '') {
  return simpleHash(
    `${offer?.bank_name || ''}-${offer?.id || ''}-${offer?.country || ''}-${offer?.interest_rate || ''}${salt}`
  );
}

/** Gesamtzahl der Bewertungen – pro Angebot unterschiedlich, stabil aus Angebotsdaten.
 *  Identisch zur Anzahl der Seed-Einträge in buildAllSeedReviewEntries. */
export function getReviewTotal(offer) {
  const h = offerReviewSeed(offer);
  const h2 = offerReviewSeed(offer, '-total');
  if (isBbvaOffer(offer)) {
    return 1380 + (h % 410) + (h2 % 62);
  }
  return 480 + (h % 620) + (h2 % 95);
}

/** Wie viele Kommentare in der Detailansicht – identisch zur Kartenanzeige. */
export function getListedReviewCount(offer) {
  return getReviewTotal(offer);
}

/** Ziel-Sterneschnitt aus Angebotsbewertung (7,5–9,9 → ca. 3,5–4,65). */
export function getStarAverageFromRating(offerRatingValue) {
  const raw = 3.5 + ((Number(offerRatingValue) - 7.5) / 2.4) * 1.15;
  return roundToQuarter(Math.min(4.65, Math.max(3.5, raw)));
}

/** Gewichteter Sterneschnitt (Viertelsterne) – BBVA ca. 4,75, sonst stabil variabel. */
export function getStarAverageForOffer(offer) {
  if (!offer) return 4;

  if (isBbvaOffer(offer)) {
    const h = offerReviewSeed(offer, '-bbva-star');
    const bbva = 4.75 + ((h % 5) - 2) * 0.05;
    return roundToQuarter(bbva);
  }

  const ratingValue = getOfferRatingValue(offer);
  let target = getStarAverageFromRating(ratingValue);
  const h = offerReviewSeed(offer, '-staravg');
  const jitter = ((h % 33) - 16) / 64;
  target = roundToQuarter(Math.min(4.85, Math.max(3.5, target + jitter)));

  const counts = getStarDistribution(offer, target);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return target;
  const weighted = counts.reduce((sum, count, i) => sum + count * (5 - i), 0);
  return roundToQuarter(weighted / total);
}

/** Reihenfolge: 5★, 4★, 3★, 2★, 1★ */
function distributeStarCounts(total, avgStars) {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const t = clamp((avgStars - 3.2) / 1.8, 0, 1);
  const p5 = 0.26 + t * 0.48;
  const p4 = 0.2 + (1 - t) * 0.14;
  const p3 = 0.14;
  const p2 = 0.07;
  const p1 = Math.max(0.03, 1 - p5 - p4 - p3 - p2);
  const parts = [p5, p4, p3, p2, p1];
  const raw = parts.map((p) => Math.floor(p * total));
  const sum = raw.reduce((a, b) => a + b, 0);
  raw[0] += total - sum;
  return raw;
}

export function getStarDistribution(offer, avgStars) {
  const total = getReviewTotal(offer);
  return distributeStarCounts(total, avgStars);
}

const FIRST_NAMES = [
  'Miriam',
  'Torben',
  'Saskia',
  'Gerrit',
  'Annika',
  'Philipp',
  'Meike',
  'Bastian',
  'Judith',
  'Maik',
  'Franziska',
  'Hendrik',
  'Carolin',
  'Nils',
  'Wiebke',
  'Fabian',
  'Katrin',
  'Steffen',
  'Mareike',
  'Jörn',
  'Lisa',
  'Marcel',
  'Heike',
  'Björn',
  'Nadine',
  'Ralf',
  'Yvonne',
  'Dirk',
  'Tanja',
  'Ole',
  'Britta',
  'Jens',
  'Sabrina',
  'Arne',
  'Melanie',
  'Uwe',
  'Kerstin',
  'Thilo',
  'Anja',
  'Holger',
  'Silke',
  'Mario',
  'Doreen',
  'Sven',
  'Ines',
  'Timo',
  'Petra',
  'Dennis',
  'Sonja',
  'Marc',
  'Claudia',
  'René',
  'Birgit',
  'Kai',
  'Susanne',
  'Volker',
  'Andrea',
  'Frank',
  'Nicole',
  'Stefan',
  'Monika',
  'Bernd',
  'Simone',
  'Matthias',
  'Daniela',
  'Christian',
  'Sabine',
  'Andreas',
  'Martina',
  'Thomas',
  'Angelika',
  'Michael',
  'Gabriele',
  'Peter',
  'Ursula',
  'Wolfgang',
  'Ingrid',
  'Klaus',
  'Renate',
  'Hans',
  'Helga',
  'Jürgen',
  'Elke',
  'Manfred',
  'Gisela',
  'Dieter',
  'Hildegard',
  'Horst',
  'Irmgard',
  'Werner',
  'Edeltraud',
  'Günther',
  'Marlies',
  'Rolf',
  'Christa',
  'Heinz',
  'Brigitte',
  'Karl',
  'Erika',
  'Helmut',
  'Lena',
  'Jonas',
  'Emma',
  'Leon',
  'Mia',
  'Noah',
  'Sophie',
  'Ben',
  'Hannah',
  'Paul',
  'Lara',
  'Finn',
  'Nina',
  'Luca',
  'Emily',
  'Tim',
  'Laura',
  'Jan',
  'Julia',
  'Max',
  'Sarah',
  'Tom',
  'Lea',
  'Felix',
  'Marie',
  'Luis',
  'Anna',
  'Elias',
  'Lina',
  'Niklas',
  'Johanna',
  'Moritz',
  'Clara',
  'Jakob',
  'Ida',
  'Theo',
  'Amelie',
  'Oskar',
  'Marlene',
  'Emil',
  'Greta',
  'Anton',
  'Paula',
  'Henri',
  'Mathilda',
  'Otto',
  'Frieda',
  'Leo',
  'Luisa',
  'Milan',
  'Nele',
  'Vincent',
  'Pia',
  'Julian',
  'Ronja',
  'Simon',
  'Theresa',
  'Erik',
  'Vanessa',
  'Dominik',
  'Isabel',
  'Patrick',
  'Christina',
  'Sebastian',
  'Katharina',
  'Markus',
  'Stefanie',
  'Alexander',
  'Jessica',
  'Tobias',
  'Jennifer',
  'Daniel',
  'Natalie',
  'Martin',
  'Carina',
  'Florian',
  'Ramona',
  'Robin',
  'Verena',
  'Kevin',
  'Alina',
  'Pascal',
  'Michelle',
  'Marco',
  'Jasmin',
  'Chris',
  'Kim',
  'Alex',
  'Sam',
  'Jamie',
  'Toni',
  'Umut',
  'Aylin',
  'Emre',
  'Elif',
  'Can',
  'Deniz',
  'Mehmet',
  'Zeynep',
  'Yusuf',
  'Fatma',
  'Ali',
  'Ayse',
  'Serkan',
  'Hatice',
  'Cem',
  'Merve',
  'Baran',
  'Selin',
];

const LAST_NAMES = [
  'Winkler',
  'Graf',
  'Seidel',
  'Heinrich',
  'Brandt',
  'Schreiber',
  'Winter',
  'Kraus',
  'Schumacher',
  'Vogt',
  'Otto',
  'Sommer',
  'Stein',
  'Jäger',
  'Groß',
  'Seifert',
  'Roth',
  'Sauer',
  'Beck',
  'Lorenz',
  'Baumann',
  'Franke',
  'Albrecht',
  'Ludwig',
  'Busch',
  'Simon',
  'Böhm',
  'Arnold',
  'Bergmann',
  'Pohl',
  'Friedrich',
  'Günther',
  'Keller',
  'Schulte',
  'Dietrich',
  'Ziegler',
  'Kuhn',
  'Kühn',
  'Petersen',
  'Hansen',
  'Jensen',
  'Kruse',
  'Voigt',
  'Engel',
  'Horn',
  'Bock',
  'Ernst',
  'Kraft',
  'Schubert',
  'Pfeiffer',
  'Wolff',
  'Thiel',
  'Berg',
  'Götz',
  'Haas',
  'Ackermann',
  'Barth',
  'Fiedler',
  'Herzog',
  'Kirsch',
  'Link',
  'Marquardt',
  'Nolte',
  'Reuter',
  'Stark',
  'Ulrich',
  'Witt',
  'Böttcher',
  'Conrad',
  'Falk',
  'Geiger',
  'Hesse',
  'Kohl',
  'Lindner',
  'Mann',
  'Nowak',
  'Ott',
  'Reich',
  'Steinbach',
  'Unger',
  'Vollmer',
  'Wendt',
  'Zander',
  'Bayer',
  'Dorn',
  'Frey',
  'Heinemann',
  'Kunze',
  'Lenz',
  'Metzger',
  'Naumann',
  'Riedel',
  'Stahl',
  'Türk',
  'Yilmaz',
  'Kaya',
  'Demir',
  'Celik',
  'Aydin',
  'Öztürk',
  'Sahin',
  'Arslan',
  'Dogan',
  'Koc',
  'Polat',
  'Aslan',
];

/** Ältestes Bewertungsdatum – Rückblick bis Anfang 2018. */
const REVIEW_OLDEST = { year: 2018, month: 1, day: 22 };

/** Festes neuestes Datum – wandert nicht mit dem Kalender. */
const REVIEW_NEWEST = { year: 2026, month: 7, day: 23 };

function getReviewNewestDate() {
  return new Date(REVIEW_NEWEST.year, REVIEW_NEWEST.month - 1, REVIEW_NEWEST.day, 12, 0, 0, 0);
}

function buildReplyDateDe(reviewDateStr, replyDays, capDateStr) {
  const reviewMs = parseReviewDateDe(reviewDateStr);
  const capMs = parseReviewDateDe(capDateStr);
  const replyMs = reviewMs + replyDays * MS_PER_DAY;
  if (replyMs > capMs) {
    return formatReviewDateDe(new Date(Math.max(reviewMs, capMs)));
  }
  return formatReviewDateDe(new Date(replyMs));
}

function seededShuffle(length, seed) {
  const order = Array.from({ length }, (_, i) => i);
  let s = seed || 1;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function parseReviewDateDe(dateStr) {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day).getTime();
}

function formatReviewDateDe(date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

const MS_PER_DAY = 86400000;

/** Absteigend: Index 0 = REVIEW_NEWEST (fest), letzter Index ≈ REVIEW_OLDEST. */
function buildDescendingReviewDates(count, seed) {
  const newest = getReviewNewestDate();
  const oldest = new Date(REVIEW_OLDEST.year, REVIEW_OLDEST.month - 1, REVIEW_OLDEST.day);
  const newestMs = newest.getTime();
  const oldestMs = oldest.getTime();
  const spanDays = Math.max(1, Math.floor((newestMs - oldestMs) / MS_PER_DAY));
  const dates = [];

  for (let i = 0; i < count; i += 1) {
    const ratio = count <= 1 ? 0 : i / (count - 1);
    // Leicht mehr Bewertungen in neueren Jahren (sqrt statt linear).
    const dayOffset = Math.round(Math.sqrt(ratio) * spanDays);
    const jitter = i === 0 ? 0 : (seed + i * 13) % 5;
    let ts = newestMs - (dayOffset + jitter) * MS_PER_DAY;
    if (ts < oldestMs) ts = oldestMs + ((seed + i) % 7) * MS_PER_DAY;
    if (ts > newestMs) ts = newestMs;
    dates.push(formatReviewDateDe(new Date(ts)));
  }

  dates[0] = formatReviewDateDe(newest);

  for (let i = 1; i < dates.length; i += 1) {
    let cur = parseReviewDateDe(dates[i]);
    const prev = parseReviewDateDe(dates[i - 1]);
    if (cur >= prev) {
      cur = Math.max(oldestMs, prev - MS_PER_DAY);
      dates[i] = formatReviewDateDe(new Date(cur));
    }
  }

  return dates;
}

function buildUniqueAuthorList(count, seed) {
  const used = new Set();
  const authors = [];
  let n = 0;
  const cap = FIRST_NAMES.length * LAST_NAMES.length;

  while (authors.length < count && n < count * 30) {
    const fn = FIRST_NAMES[(seed + n * 7) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(seed + n * 11) % LAST_NAMES.length];
    const initial = ln.charAt(0).toUpperCase();
    const tier = Math.floor(n / cap);
    const name = tier === 0 ? `${fn} ${initial}.` : `${fn} ${initial}${tier + 1}.`;
    if (!used.has(name)) {
      used.add(name);
      authors.push(name);
    }
    n += 1;
  }

  while (authors.length < count) {
    authors.push(`Kunde ${authors.length + 1}`);
  }

  return authors;
}

/** Festgeld- und Flexgeld-Rezensenten sind disjunkte Namensmengen. */
function buildDisjointAuthorSets(festCount, flexCount, seed) {
  const all = buildUniqueAuthorList(festCount + flexCount, seed + 401);
  return {
    festAuthors: all.slice(0, festCount),
    flexAuthors: all.slice(festCount, festCount + flexCount),
  };
}

function buildReviewsForProduct(offer, productType, count, authors, dates, seed, isBbva) {
  const poolSize = getReviewTemplatePoolSize(isBbva, productType);
  const slotOrder = seededShuffle(poolSize, seed + (productType === 'Festgeld' ? 11 : 22));
  const seenFingerprints = new Set();
  const entries = [];

  for (let i = 0; i < count; i += 1) {
    const ctx = buildReviewTextContext(offer, productType, i, seed + i * 19, isBbva, 0);
    const isProblem = (seed + i * 17) % 13 === 0;
    let text = '';
    let attempt = 0;

    if (isProblem) {
      const problemIdx = (seed + i * 23) % PROBLEM_REVIEW_TEMPLATES.length;
      text = PROBLEM_REVIEW_TEMPLATES[problemIdx](ctx);
    } else {
      while (attempt < 24) {
        const baseSlot = slotOrder[(i + attempt) % slotOrder.length];
        const templateSlot = baseSlot + i * 3 + attempt * 5;
        text = renderReviewFromTemplate(offer, productType, templateSlot, seed + i * 19, isBbva);
        const fp = reviewTextFingerprint(text);
        if (!seenFingerprints.has(fp)) {
          seenFingerprints.add(fp);
          break;
        }
        attempt += 1;
      }

      if (!text) {
        text = renderReviewFromTemplate(offer, productType, i, seed + i * 19, isBbva);
      }
    }

    text = humanizeReviewText(text, seed + i * 41);

    let stars;
    if (isProblem) {
      stars = roundToQuarter(2.5 + ((seed + i * 7) % 5) * 0.25);
    } else if (isBbva) {
      stars = roundToQuarter(4.5 + ((seed + i * 3) % 3) * 0.25);
    } else {
      stars = roundToQuarter(3.25 + ((seed + i * 5) % 7) * 0.25);
    }

    const entry = {
      author: authors[i],
      date: dates[i],
      stars,
      text,
      productType,
    };

    const withProblemReply = isProblem;
    const withNeutralReply = !isProblem && (seed + i * 29) % 19 === 7;
    if (withProblemReply || withNeutralReply) {
      entry.reply = {
        author: 'Kapitalmitte Kundenservice',
        date: null,
        text: pickKapitalmitteReply(withProblemReply, ctx, seed + i * 53),
        _replyDays: 1 + ((seed + i) % 4),
      };
    }

    entries.push(entry);
  }

  return entries;
}

const seedReviewEntriesCache = new Map();

function buildAllSeedReviewEntries(offer) {
  const seed = offerReviewSeed(offer, '-reviews');
  const isBbva = isBbvaOffer(offer);
  const targetCount = getReviewTotal(offer);
  const reviewDates = buildDescendingReviewDates(targetCount, seed);

  const festCount = Math.ceil(targetCount / 2);
  const flexCount = targetCount - festCount;
  const { festAuthors, flexAuthors } = buildDisjointAuthorSets(festCount, flexCount, seed);

  const festEntries = buildReviewsForProduct(
    offer,
    'Festgeld',
    festCount,
    festAuthors,
    buildDescendingReviewDates(festCount, seed + 3),
    seed,
    isBbva
  );
  const flexEntries = buildReviewsForProduct(
    offer,
    'Flexgeld',
    flexCount,
    flexAuthors,
    buildDescendingReviewDates(flexCount, seed + 5),
    seed + 999,
    isBbva
  );

  const newestCap = reviewDates[0];

  let entries = [...festEntries, ...flexEntries];
  entries.sort((a, b) => parseReviewDateDe(b.date) - parseReviewDateDe(a.date));
  for (let i = 0; i < entries.length; i += 1) {
    entries[i].date = reviewDates[i];
    if (entries[i].reply) {
      const replyDays = entries[i].reply._replyDays ?? 1;
      entries[i].reply = {
        author: entries[i].reply.author,
        date: buildReplyDateDe(reviewDates[i], replyDays, newestCap),
        text: entries[i].reply.text,
      };
    }
  }

  return entries.map((entry, i) => ({
    ...entry,
    id: `${offer.id}-r-${i}`,
  }));
}

/**
 * Vollständige Seed-Liste (so viele Einträge wie „X Bewertungen“ auf der Karte).
 * Gecacht pro Angebot; Festgeld/Flexgeld nur filtern, nicht neu erzeugen.
 */
export function buildReviewEntries(offer, productFilter = 'Alle') {
  const cacheKey = offer?.id ?? String(offerReviewSeed(offer));
  if (!seedReviewEntriesCache.has(cacheKey)) {
    seedReviewEntriesCache.set(cacheKey, buildAllSeedReviewEntries(offer));
  }
  const entries = seedReviewEntriesCache.get(cacheKey);
  if (productFilter && productFilter !== 'Alle') {
    return entries.filter((e) => e.productType === productFilter);
  }
  return entries;
}

export function getComparisonProfile(offer) {
  const key = profileKeyFromName(offer.bank_name);
  const country = offer.country || 'Germany';
  const countryDe = COUNTRY_DE[country] || country;
  const facts = COUNTRY_FACTS[country] || {
    euSince: 'EU-Mitglied',
    currency: offer.currency || 'EUR',
    sovereignRating: '—',
    economyBlurb: `${countryDe} ist ein EU-Mitgliedsstaat; wirtschaftliche und rechtliche Rahmenbedingungen sollten im Detail geprüft werden.`,
  };

  const bankFromCatalog =
    (key && BANK_BLURBS[key]) || {
      founded: offer.founded_year ? String(offer.founded_year) : '—',
      hq: countryDe,
      blurb: `${offer.bank_name} ist ein reguliertes Kreditinstitut mit Sitz bzw. Anknüpfung in ${countryDe}. Bitte prüfen Sie die konkreten Produktbedingungen und die zuständige Einlagensicherung im Vertragswerk.`,
    };

  const bank = {
    ...bankFromCatalog,
    founded: offer.founded_year ? String(offer.founded_year) : bankFromCatalog.founded,
  };

  const withholding =
    country === 'Germany' || country === 'Spain' || country === 'Netherlands' || country === 'France'
      ? 'Keine zusätzliche EU-Quellensteuer auf Zinsen für typische Privatanlagen (Details im Steuerrecht)'
      : 'Je nach Doppelbesteuerungsabkommen – steuerliche Beratung empfohlen';

  const legalAmount = offer.deposit_protection_amount || '100.000 €';
  const currencyNote =
    (offer.currency && offer.currency !== 'EUR') || facts.currency !== 'EUR'
      ? `Rückzahlung durch Einlagensicherungsfonds erfolgt in der Regel in Landeswährung (${facts.currency}) – Wechselkursrisiko für den Anleger.`
      : 'Rückzahlung im Schadensfall in der Regel in Euro bis zur gesetzlichen Grenze.';

  return {
    countryDe,
    bank,
    facts,
    withholding,
    legalAmount,
    currencyNote,
  };
}
