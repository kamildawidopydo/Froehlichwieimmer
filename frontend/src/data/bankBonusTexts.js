import { getDisplayProductType } from '@/lib/productDisplay';
import { MEDIATOR_BRAND } from '@/data/comparisonProfiles';

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

/** slug → { summary, conditions, benefits, tone? } */
const BANK_BONUS_COPY = {
  'bbva-bank-deutschland': {
    summary:
      'BBVA Bank Deutschland belohnt Neukunden mit einer Willkommensprämie auf das Festgeld — zusätzlich zum garantierten Zinssatz über die gesamte Laufzeit. Der Abschluss erfolgt vollständig digital über Kapitalmitte.',
    conditions:
      'Bonus nur für Neukunden ohne bestehendes BBVA-Konto in Deutschland. Mindestanlage und Identifikation erforderlich. Keine vorzeitige Kündigung während der Laufzeit.',
    benefits: [
      'Willkommensbonus bis zur angegebenen Höchstgrenze',
      'Festgeld mit fixem Zinssatz über die Laufzeit',
      'Deutsche Einlagensicherung bis 100.000 €',
      'Vollständig digitaler Antrag über Kapitalmitte',
    ],
  },
  'ing-diba': {
    summary:
      'ING-DiBa ist eine der etabliertesten Direktbanken Deutschlands. Neukunden profitieren neben dem Neukundenbonus von transparenter Kontoeröffnung und monatlicher Zinsgutschrift.',
    conditions:
      'Gültig für Erstanleger ohne bestehendes ING Festgeld-Konto. Mindestanlage gemäß Angebot. Identifikation erforderlich.',
    benefits: [
      'Neukundenbonus nach erfolgreicher Kontoeröffnung',
      'Bewährtes Direktbank-Produkt mit deutscher Einlagensicherung',
      'Einfache Online-Abwicklung ohne Filialbesuch',
      'Vermittlungsbonus 45 € über Kapitalmitte nach Abschluss',
    ],
  },
  'deutsche-kreditbank--dkb-': {
    summary:
      'Die DKB kombiniert attraktive Festgeldzinsen mit einem modernen Online-Banking-Erlebnis. Neukunden erhalten zusätzlich eine Willkommensprämie bei Eröffnung über Kapitalmitte.',
    conditions:
      'Neukundenaktion für Erstanleger. Bestehende DKB-Konten können ausgeschlossen sein. Mindestanlage und Identifikation erforderlich.',
    benefits: [
      'Willkommensbonus für qualifizierte Neukunden',
      'Jährliche Zinsgutschrift auf das Festgeldkonto',
      'Deutsche Einlagensicherung (EdB) bis 100.000 €',
      'Digitaler Abschluss in wenigen Schritten',
    ],
  },
  bigbank: {
    summary:
      'Bigbank aus Estland bietet eines der höchsten Flexgeld-Zinsniveaus im Vergleich. Der Neukundenbonus macht den Einstieg besonders attraktiv — Abschluss und Verwaltung laufen vollständig online.',
    conditions:
      'Bonus für Neukunden bei Erstabschluss über Kapitalmitte. Mindestanlage 10.000 €. Kündigungsfristen gemäß Produktbedingungen beachten.',
    benefits: [
      'Neukundenbonus bis 300 €',
      'Flexgeld mit überdurchschnittlichem Zinsniveau',
      'Estnische EU-Einlagensicherung bis 100.000 €',
      'Monatliche Zinsgutschrift',
    ],
  },
  'citadele-banka': {
    summary:
      'Citadele Banka (CBL Bank über Raisin) bietet Festgeld mit festem Zinssatz und lettischer EU-Einlagensicherung.',
    conditions:
      'Festgeld mit 12 Monaten Laufzeit. Mindestanlage 10.000 €. Keine vorzeitige Verfügbarkeit während der Laufzeit.',
    benefits: [
      'Festgeld 2,55% p.a. bei 12 Monaten',
      'Lettische EU-Einlagensicherung (FKTK)',
      'Jährliche Zinsgutschrift',
      'Vermittlung über Raisin/Kapitalmitte',
    ],
  },
  'lhv-pank': {
    summary:
      'LHV Pank ist eine etablierte estnische Bank mit Fokus auf digitale Sparprodukte. Neukunden erhalten neben dem Flexgeld-Zins eine attraktive Willkommensprämie.',
    conditions:
      'Bonus nur für Neukunden. Mindestanlage 5.000 €. Auszahlung nach bestätigter Kontoeröffnung und Mindesthaltefrist.',
    benefits: [
      'Neukundenbonus bis 250 €',
      'Flexgeld mit monatlicher Verzinsung',
      'Estnische EU-Einlagensicherung',
      'Reguliert durch Finantsinspektsioon',
    ],
  },
  'morrow-bank': {
    summary:
      'Morrow Bank (ehem. Komplett Bank) ist eine norwegische Digitalbank mit wettbewerbsfähigen Flexgeld-Konditionen. Der Neukundenbonus ergänzt das attraktive Zinsniveau für Erstanleger.',
    conditions:
      'Gültig für Neukunden ohne bestehendes Morrow-Bank-Konto. Mindestanlage 5.000 €. Bonus nach Freigabe durch Partnerbank.',
    benefits: [
      'Neukundenbonus bis 250 €',
      'Flexgeld mit monatlicher Zinsgutschrift',
      'Norwegische Bankenaufsicht (Finanstilsynet)',
      'EU-konforme Vermittlung über Kapitalmitte',
    ],
  },
  'collector-bank': {
    summary:
      'Collector Bank aus Schweden verbindet skandinavische Stabilität mit einem attraktiven Flexgeld-Zins. Neukunden erhalten zusätzlich eine Willkommensprämie bei Erstabschluss.',
    conditions:
      'Neukundenbonus bei qualifiziertem Erstabschluss. Mindestanlage 5.000 €. Kündigungsfristen gemäß Produktbedingungen.',
    benefits: [
      'Neukundenbonus bis 250 €',
      'Flexgeld mit monatlicher Verzinsung',
      'Schwedische Einlagensicherung (Riksgälden)',
      'Digitaler Abschluss ohne Filialbesuch',
    ],
  },
  'artea-ab': {
    summary:
      'Artea AB (ehem. Šiaulių Bankas) ist eine litauische Bank mit Festgeld über Raisin. EU-Einlagensicherung und feste Laufzeiten.',
    conditions:
      'Festgeld mit 12 Monaten Laufzeit. Mindestanlage 10.000 €. Keine vorzeitige Verfügbarkeit.',
    benefits: [
      'Festgeld 2,01% p.a. bei 12 Monaten',
      'Litauische EU-Einlagensicherung',
      'Jährliche Zinsgutschrift',
      'Vermittlung über Raisin/Kapitalmitte',
    ],
  },
  'ayvens-bank': {
    summary:
      'Ayvens Bank (ehem. LeasePlan Bank) ist eine niederländische Direktbank mit Fokus auf Festgeld. Transparente Konditionen und niederländische Einlagensicherung.',
    conditions:
      'Festgeld mit fester Laufzeit. Mindesteinlage 1.000 €. Zinsgutschrift jährlich. Keine vorzeitige Verfügbarkeit.',
    benefits: [
      'Festgeld bis 2,90% p.a. je nach Laufzeit',
      'Niederländische Einlagensicherung (DGS)',
      'Kostenlose Kontoeröffnung',
      'Abschluss über Kapitalmitte',
    ],
  },
  's-pankki': {
    summary:
      'S-Pankki ist Teil der finnischen S-Gruppe und bietet verlässliche Flexgeld-Konditionen. Neukunden profitieren von einer Willkommensprämie und finnischer Bankenaufsicht.',
    conditions:
      'Bonus nur für Neukunden. Mindestanlage 5.000 €. Bonus nach bestätigter Ersteinlage und Identifikation.',
    benefits: [
      'Neukundenbonus bis 200 €',
      'Flexgeld mit monatlicher Verzinsung',
      'Finnische Einlagensicherung (RVV)',
      'Etablierte Genossenschaftsstruktur in Finnland',
    ],
  },
  'illimity-bank': {
    summary:
      'Illimity Bank ist eine italienische Direktbank mit Fokus auf digitale Sparprodukte. Neukunden erhalten neben dem Flexgeld-Zins eine einmalige Willkommensprämie.',
    conditions:
      'Neukundenbonus bei Erstabschluss über Kapitalmitte. Mindestanlage 5.000 €. Italienische FITD-Einlagensicherung greift bis 100.000 €.',
    benefits: [
      'Neukundenbonus bis 200 €',
      'Flexgeld mit monatlicher Zinsgutschrift',
      'Italienische EU-Einlagensicherung',
      'Vollständig digitaler Antrag',
    ],
  },
  'banca-progetto': {
    summary:
      'Banca Progetto bietet italienisches Festgeld mit überdurchschnittlicher Verzinsung. Der Neukundenbonus ergänzt das Angebot für Erstanleger, die planbare Rendite suchen.',
    conditions:
      'Bonus für Neukunden bei Mindestanlage 10.000 €. Laufzeit und Kündigungsmodalitäten gemäß Vertrag. Identifikation erforderlich.',
    benefits: [
      'Neukundenbonus bis 200 €',
      'Festgeld mit fixem Zinssatz',
      'Italienische Einlagensicherung (FITD)',
      'Abschluss über Kapitalmitte',
    ],
  },
  'klarna-bank': {
    summary:
      'Klarna Bank verbindet Fintech-Kompetenz mit regulierten Festgeldprodukten aus Schweden. Neukunden erhalten eine Willkommensprämie zusätzlich zum Festgeld-Zins.',
    conditions:
      'Neukundenbonus bei Erstabschluss. Mindestanlage 10.000 €. Schwedische Einlagensicherung und Finansinspektionen-Aufsicht.',
    benefits: [
      'Neukundenbonus bis 200 €',
      'Festgeld mit planbarer Verzinsung',
      'Schwedische Bankenaufsicht',
      'Digitaler Abschluss in wenigen Minuten',
    ],
  },
  'saxo-privatbank': {
    summary:
      'Saxo Privatbank aus Dänemark bietet Festgeld mit nordischer Stabilität und Neukundenbonus. Geeignet für Anleger, die dänische Bankenqualität schätzen.',
    conditions:
      'Bonus für Erstanleger. Mindestanlage 10.000 €. Bonus nach Erfüllung der Partnerbedingungen und Identifikation.',
    benefits: [
      'Neukundenbonus bis 200 €',
      'Festgeld mit dänischer Einlagensicherung',
      'Reguliert durch Finanstilsynet',
      'Vermittlung über Kapitalmitte',
    ],
  },
  instabank: {
    summary:
      'Instabank aus Norwegen punktet mit digitalem Festgeld und Neukundenbonus. Das Angebot richtet sich an EU-Anleger mit Fokus auf Rendite und norwegischer Aufsicht.',
    conditions:
      'Neukundenbonus bei Erstabschluss. Mindestanlage 10.000 €. Auszahlung nach bestätigter Kontoeröffnung.',
    benefits: [
      'Neukundenbonus bis 200 €',
      'Festgeld mit norwegischer Einlagensicherung',
      'Finanstilsynet-Aufsicht',
      'Online-Abschluss ohne Papierformulare',
    ],
  },
  'resurs-bank': {
    summary:
      'Resurs Bank ist eine schwedische Spezialbank mit langjähriger Erfahrung im Konsumentenbereich. Neukunden erhalten beim Festgeld-Abschluss eine Willkommensprämie.',
    conditions:
      'Bonus nur für Neukunden. Mindestanlage 10.000 €. Schwedische Einlagensicherung bis 1.050.000 SEK (Gegenwert in EUR variabel).',
    benefits: [
      'Neukundenbonus bis 200 €',
      'Festgeld mit planbarer Rendite',
      'Schwedische Bankenaufsicht',
      'Einfache Online-Abwicklung',
    ],
  },
  'lea-bank': {
    summary:
      'Lea Bank aus Norwegen bietet Flexgeld mit attraktivem Zinsniveau und Neukundenbonus. Das Produkt verbindet Rendite mit Kündigungsflexibilität.',
    conditions:
      'Neukundenbonus bei Erstabschluss über Kapitalmitte. Mindestanlage 5.000 €. Kündigungsfristen beachten.',
    benefits: [
      'Neukundenbonus bis 200 €',
      'Flexgeld mit monatlicher Verzinsung',
      'Norwegische Bankenaufsicht',
      'Digitaler Antrag über Kapitalmitte',
    ],
  },
  'medirect-bank': {
    summary:
      'MeDirect Bank aus Belgien bietet Festgeld mit EU-Einlagensicherung und Neukundenbonus. Ideal für Anleger, die belgische Bankenqualität schätzen.',
    conditions:
      'Bonus für Neukunden bei Erstabschluss. Mindestanlage gemäß Angebot. Belgische Garantiefonds-Absicherung.',
    benefits: [
      'Neukundenbonus bis 150 €',
      'Festgeld mit belgischer Einlagensicherung',
      'Tägliche Verfügbarkeit je nach Produkt',
      'Abschluss über Kapitalmitte',
    ],
  },
  inbank: {
    summary:
      'Inbank aus Estland bietet digitales Festgeld mit Neukundenbonus. Die estnische EU-Einlagensicherung schützt Einlagen bis 100.000 €.',
    conditions:
      'Neukundenbonus bei qualifiziertem Erstabschluss. Identifikation erforderlich. Bonus nach Freigabe.',
    benefits: [
      'Neukundenbonus bis 150 €',
      'Festgeld mit estnischer EU-Einlagensicherung',
      'Finantsinspektsioon-Aufsicht',
      'Vollständig digitaler Prozess',
    ],
  },
  'banco-invest': {
    summary:
      'Banco Invest aus Portugal bietet Tagesgeld mit Neukundenbonus — auch bei moderatem Zinsniveau eine attraktive Ergänzung zum laufenden Zins.',
    conditions:
      'Neukundenbonus bei Erstabschluss. Mindestanlage 10.000 €. Portugiesische FGD-Einlagensicherung.',
    benefits: [
      'Neukundenbonus bis 150 €',
      'Tagesgeld mit täglicher Verfügbarkeit',
      'Portugiesische EU-Einlagensicherung',
      'Online-Abschluss über Kapitalmitte',
    ],
  },
  'bff-bank': {
    summary:
      'BFF Bank aus Italien bietet Tagesgeld mit Neukundenbonus und italienischer Einlagensicherung. Geeignet für liquiditätsorientierte Anleger.',
    conditions:
      'Kleiner Neukundenbonus bei Erstabschluss. Tägliche Verfügbarkeit. Identifikation erforderlich.',
    benefits: [
      'Neukundenbonus 45 €',
      'Tagesgeld — jederzeit verfügbar',
      'Italienische FITD-Einlagensicherung',
      'Vermittlungsbonus über Kapitalmitte',
    ],
  },
};

const SLUG_ALIASES = {
  'leaseplan-bank': 'ayvens-bank',
  'siauliu-bankas': 'artea-ab',
  'blueorange-bank': 'bluor-bank-as',
  'coop-bank': 'coop-pank',
  medirect: 'medirect-bank',
  'komplett-bank': 'morrow-bank',
};

function slugFromBankName(bankName) {
  const n = (bankName || '').toLowerCase();
  if (n.includes('bbva')) return 'bbva-bank-deutschland';
  if (n.includes('ing-diba') || n.includes('ing diba')) return 'ing-diba';
  if (n.includes('dkb') || n.includes('deutsche kreditbank')) return 'deutsche-kreditbank--dkb-';
  if (n.includes('bigbank')) return 'bigbank';
  if (n.includes('citadele')) return 'citadele-banka';
  if (n.includes('artea')) return 'artea-ab';
  if (n.includes('lhv')) return 'lhv-pank';
  if (n.includes('morrow')) return 'morrow-bank';
  if (n.includes('komplett')) return 'morrow-bank';
  if (n.includes('collector')) return 'collector-bank';
  if (n.includes('šiauli') || n.includes('siauliu')) return 'artea-ab';
  if (n.includes('ayvens') || n.includes('leaseplan')) return 'ayvens-bank';
  if (n.includes('s-pankki') || n.includes('s pankki')) return 's-pankki';
  if (n.includes('illimity')) return 'illimity-bank';
  if (n.includes('progetto')) return 'banca-progetto';
  if (n.includes('klarna')) return 'klarna-bank';
  if (n.includes('saxo privat')) return 'saxo-privatbank';
  if (n.includes('instabank')) return 'instabank';
  if (n.includes('resurs')) return 'resurs-bank';
  if (n.includes('lea bank')) return 'lea-bank';
  if (n.includes('medirect')) return 'medirect-bank';
  if (n.includes('inbank')) return 'inbank';
  if (n.includes('banco invest')) return 'banco-invest';
  if (n.includes('bff bank')) return 'bff-bank';
  if (n.includes('abn amro')) return 'abn-amro-bank';
  if (n.includes('mediolanum')) return 'banca-mediolanum';
  if (n.includes('sabadell')) return 'banco-sabadell';
  if (n.includes('bnp')) return 'bnp-paribas';
  if (n.includes('bunq') && n.includes('deutschland')) return 'bunq-deutschland';
  if (n.includes('bunq')) return 'bunq-nederland';
  if (n.includes('rabobank')) return 'rabobank';
  if (n.includes('ing nederland') || n.includes('ing groep')) return 'ing-nederland';
  if (n.includes('caixabank')) return 'caixabank';
  if (n.includes('comdirect')) return 'comdirect-bank';
  if (n.includes('crédit agricole') || n.includes('credit agricole')) return 'cr-dit-agricole';
  if (n.includes('erste bank')) return 'erste-bank';
  if (n.includes('ing belgium')) return 'ing-belgium';
  if (n.includes('kbc')) return 'kbc-bank';
  if (n.includes('millennium')) return 'millennium-bcp';
  if (n.includes('n26')) return 'n26-bank';
  if (n.includes('op financial') || n.includes('op ')) return 'op-financial-group';
  if (n.includes('raiffeisen')) return 'raiffeisen-bank-international';
  if (n.includes('raisin')) return 'raisin-bank';
  if (n.includes('spuerkeess')) return 'spuerkeess';
  if (n.includes('unicredit')) return 'unicredit';
  if (n.includes('nordax')) return 'nordax-bank';
  if (n.includes('knab')) return 'knab';
  if (n.includes('lunar')) return 'lunar-bank';
  if (n.includes('tf bank')) return 'tf-bank';
  if (n.includes('trade republic')) return 'trade-republic';
  if (n.includes('openbank')) return 'openbank';
  if (n.includes('consors')) return 'consorsbank';
  if (n.includes('postfinance')) return 'postfinance';
  if (n.includes('santander consumer')) return 'santander-deutschland';
  if (n.includes('1822')) return '1822direkt';
  if (n.includes('renault bank')) return 'renault-bank-direkt';
  if (n.includes('hello bank')) return 'hello-bank';
  if (n.includes('easybank')) return 'easybank';
  if (n.includes('suresse')) return 'suresse-direkt-bank';
  if (n.includes('swissquote')) return 'swissquote';
  if (n.includes('pibank')) return 'pibank';
  if (n.includes('anadi')) return 'anadi-bank';
  if (n.includes('norwegian')) return 'bank-norwegian';
  if (n.includes('sydbank')) return 'sydbank';
  if (n.includes('argenta')) return 'argenta';
  if (n.includes('bluor') || n.includes('blueorange')) return 'bluor-bank-as';
  if (n.includes('mano bankas')) return 'mano-bankas';
  if (n.includes('pop pankki')) return 'pop-pankki';
  if (n.includes('ikano')) return 'ikano-bank';
  if (n.includes('j&t') || n.includes('jt direkt')) return 'jt-direktbank';
  if (n.includes('vivibanca')) return 'vivibanca';
  if (n.includes('banco bpi')) return 'banco-bpi';
  if (n.includes('crelan')) return 'crelan';
  if (n.includes('distingo')) return 'distingo-bank';
  if (n.includes('kommunalkredit')) return 'kommunalkredit-invest';
  if (n.includes('oma sääst') || n.includes('oma saast')) return 'oma-saastopankki';
  if (n.includes('coop pank') || n.includes('coop bank')) return 'coop-pank';
  if (n.includes('ebn banco')) return 'ebn-banco';
  if (n.includes('sbab')) return 'sbab-bank';
  if (n.includes('nibc')) return 'nibc-direct';
  if (n.includes('ca auto')) return 'ca-auto-bank';
  return null;
}

function resolveSlug(offer) {
  const raw = offer?.bank_slug || slugFromBankName(offer?.bank_name);
  if (!raw) return null;
  return SLUG_ALIASES[raw] || raw;
}

export function resolveOfferBankSlug(offer) {
  return resolveSlug(offer);
}

export { BANK_BONUS_COPY };

const BONUS_LINE_RE = /neukundenbonus\s+(?:bis\s+)?(\d+)/i;

function parseBonusFromBankCopy(copy) {
  if (!copy?.benefits?.length) return 0;
  for (const line of copy.benefits) {
    const match = String(line).match(BONUS_LINE_RE);
    if (match) return Number(match[1]);
  }
  return 0;
}

function defaultBonusByRate(offer) {
  const rate = Number(offer?.interest_rate) || 0;
  if (rate >= 4) return 300;
  if (rate >= 3.5) return 250;
  if (rate >= 3) return 200;
  return 150;
}

/** Effektiver Neukundenbonus: DB → Copy → Zins-Tier. */
export function getOfferBonusAmount(offer) {
  const fromDb = Number(offer?.bonus_amount);
  if (fromDb > 0) return fromDb;

  const slug = resolveSlug(offer);
  const fromCopy = slug ? parseBonusFromBankCopy(BANK_BONUS_COPY[slug]) : 0;
  if (fromCopy > 0) return fromCopy;

  return defaultBonusByRate(offer);
}

function formatEuro(n) {
  return Number(n).toLocaleString('de-DE');
}

function buildGeneratedCopy(offer, profile) {
  const bankName = offer.bank_name || 'Partnerbank';
  const countryDe = profile?.countryDe || COUNTRY_DE[offer.country] || offer.country || 'Europa';
  const product = getDisplayProductType(offer);
  const bonusAmount = getOfferBonusAmount(offer);
  const minDep = offer.min_deposit != null && Number(offer.min_deposit) > 0
    ? `${formatEuro(offer.min_deposit)} €`
    : null;
  const slug = resolveSlug(offer) || bankName;
  const variant = Math.abs([...String(slug)].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % 5;

  const availability =
    (offer.early_withdrawal || '').toLowerCase().includes('jederzeit') ||
    offer.deposit_term === 0
      ? 'täglich verfügbar'
      : 'planbar gebunden';

  const summaries = [
    `${bankName} bietet ${product} mit ${availability === 'täglich verfügbar' ? 'flexibler Verfügbarkeit' : 'planbarer Verzinsung'} für Anleger aus ${countryDe}. ${bonusAmount > 0 ? `Neukunden erhalten zusätzlich einen Willkommensbonus bis ${formatEuro(bonusAmount)} €.` : 'Das Angebot überzeugt durch transparente Konditionen und EU-konforme Einlagensicherung.'} Abschluss und Betreuung erfolgen über ${MEDIATOR_BRAND}.`,
    `Mit ${product} bei ${bankName} profitieren Sie von regulierter Verwahrung in ${countryDe}${minDep ? ` ab ${minDep} Mindestanlage` : ''}. ${bonusAmount > 0 ? `Die Willkommensprämie bis ${formatEuro(bonusAmount)} € macht den Einstieg besonders attraktiv.` : 'Auch ohne separate Bonusaktion bietet das Produkt solide Rahmenbedingungen für sicherheitsorientierte Anleger.'} ${MEDIATOR_BRAND} begleitet Sie durch den gesamten Eröffnungsprozess.`,
    `${bankName} richtet sich an Anleger, die ${product}-Konditionen mit ${profile?.legalAmount || '100.000 €'} Einlagenschutz kombinieren möchten. ${bonusAmount > 0 ? `Der Neukundenbonus bis ${formatEuro(bonusAmount)} € wird nach Erfüllung der Partnerbedingungen gutgeschrieben.` : 'Der Fokus liegt auf dem Zinsniveau, der Verfügbarkeit und der digitalen Abwicklung — ohne separate Bonusaktion.'} Reguliert in ${countryDe}.`,
    `Das ${product}-Angebot von ${bankName} verbindet ${availability === 'täglich verfügbar' ? 'Liquidität' : 'planbare Rendite'} mit europäischer Bankenaufsicht. ${bonusAmount > 0 ? `Erstanleger erhalten bis zu ${formatEuro(bonusAmount)} € Willkommensbonus.` : 'Transparente Produktbedingungen und digitale Kontoeröffnung stehen im Vordergrund.'} Vermittlung über ${MEDIATOR_BRAND}.`,
    `Als Anleger bei ${bankName} nutzen Sie ein ${product}-Produkt aus ${countryDe} mit etablierter Einlagensicherung. ${bonusAmount > 0 ? `Zusätzlich zum Zins winkt ein Neukundenbonus bis ${formatEuro(bonusAmount)} €.` : 'Das Angebot punktet mit klaren Konditionen statt Werbeversprechen.'} ${minDep ? `Mindestanlage: ${minDep}.` : ''}`,
  ];

  const conditionsBase = offer.investment_conditions?.trim();
  const conditions =
    conditionsBase ||
    (bonusAmount > 0
      ? `Neukundenbonus bei Erstabschluss über ${MEDIATOR_BRAND}.${minDep ? ` Mindestanlage ${minDep}.` : ''} Identifikation erforderlich. Bonus wird nach bestätigter Kontoeröffnung gemäß Partnerbedingungen gutgeschrieben. Steuerlich als Kapitalertrag zu behandeln.`
      : `Kontoeröffnung über ${MEDIATOR_BRAND}.${minDep ? ` Mindestanlage ${minDep}.` : ''} Identifikation erforderlich. Es gelten die Produktbedingungen der ${bankName}.`);

  const benefits = [
    bonusAmount > 0 ? `Neukundenbonus bis ${formatEuro(bonusAmount)} €` : `${product} mit attraktivem Zinsniveau`,
    `${profile?.legalAmount || '100.000 €'} Einlagensicherung in ${countryDe}`,
    availability === 'täglich verfügbar' ? 'Flexible Verfügbarkeit Ihrer Einlage' : 'Planbare Verzinsung über die Laufzeit',
    `Vermittlungsbonus 45 € über ${MEDIATOR_BRAND} nach erfolgreichem Abschluss`,
  ].filter(Boolean);

  return {
    summary: summaries[variant],
    conditions,
    benefits,
  };
}

/**
 * Bank-spezifische Texte für den Tab „Bonus & Vorteile“.
 */
export function getBankBonusContent(offer, profile) {
  const slug = resolveSlug(offer);
  const bonusAmount = getOfferBonusAmount(offer);
  const bankName = offer.bank_name || 'Partnerbank';
  const explicit = slug ? BANK_BONUS_COPY[slug] : null;
  const generated = buildGeneratedCopy(offer, profile);
  const copy = explicit
    ? {
        ...generated,
        ...explicit,
        conditions: explicit.conditions || generated.conditions,
        benefits: explicit.benefits || generated.benefits,
      }
    : generated;

  const hasBonus = bonusAmount > 0;

  return {
    hasBonus,
    bonusAmount,
    headline: hasBonus
      ? `Neukundenbonus bis zu ${formatEuro(bonusAmount)} € bei ${bankName}`
      : `Ihre Vorteile bei ${bankName}`,
    summary: copy.summary,
    conditions: copy.conditions,
    benefits: copy.benefits,
    mediatorNote: hasBonus
      ? `Zusätzlich erhalten Sie einen Vermittlungsbonus in Höhe von 45 € über ${MEDIATOR_BRAND} — Auszahlung nach bestätigter Kontoeröffnung und Mindestanlage gemäß Partnerbedingungen.`
      : `Über ${MEDIATOR_BRAND} können Sie nach erfolgreicher Vermittlung einen Vermittlungsbonus von 45 € erhalten — Details auf Anfrage.`,
  };
}
