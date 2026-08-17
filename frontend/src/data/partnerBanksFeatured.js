/**
 * Featured partner banks for the Partnerbanken page — editorial copy and display order.
 * Einlagensicherungstext from Supabase `banks` when matched; `logoLocal` is a static SVG fallback
 * (Wikimedia Commons) when `logo_url` is missing or fails to load.
 */
export const featuredBanks = [
  {
    name: 'BBVA',
    country: 'Spanien',
    iso: 'ESP',
    flag: '🇪🇸',
    description:
      'Eine der größten Banken Spaniens mit über 150 Jahren Geschichte und starker Präsenz in Europa.',
    depositProtection: 'Spanische Einlagensicherung (FGD)',
    founded: '1857',
  },
  {
    name: 'Santander',
    /** DB / Admin names differ from marketing short name */
    logoAliases: ['Banco Santander', 'Santander Consumer Bank', 'Santander Consumer Bank GmbH'],
    logoLocal: '/assets/bank-logos/santander-wordmark.svg',
    country: 'Spanien',
    iso: 'ESP',
    flag: '🇪🇸',
    description:
      'Globale Bank mit Hauptsitz in Spanien, bekannt für Stabilität und kundenorientierte Finanzlösungen.',
    depositProtection: 'Spanische Einlagensicherung (FGD)',
    founded: '1857',
  },
  {
    name: 'BNP Paribas',
    country: 'Frankreich',
    iso: 'FRA',
    flag: '🇫🇷',
    description: 'Führende französische Bank und eine der größten Banken der Eurozone.',
    depositProtection: 'Französische Einlagensicherung (FGDR)',
    founded: '2000',
  },
  {
    name: 'Deutsche Bank',
    logoAliases: ['Deutsche Bank AG'],
    logoLocal: '/assets/bank-logos/deutsche-bank-mark.svg',
    country: 'Deutschland',
    iso: 'DEU',
    flag: '🇩🇪',
    description:
      'Deutschlands größte Bank mit globalem Netzwerk und umfassenden Finanzdienstleistungen.',
    depositProtection: 'Deutsche Einlagensicherung',
    founded: '1870',
  },
  {
    name: 'UniCredit',
    country: 'Italien',
    iso: 'ITA',
    flag: '🇮🇹',
    description:
      'Paneuropäische Bankengruppe mit starker Präsenz in Italien, Deutschland und Österreich.',
    depositProtection: 'Italienische Einlagensicherung (FITD)',
    founded: '1998',
  },
  {
    name: 'Rabobank',
    logoAliases: ['Rabobank U.A.', 'Cooperatieve Rabobank U.A.'],
    logoLocal: '/assets/bank-logos/rabobank-wordmark.svg',
    country: 'Niederlande',
    iso: 'NLD',
    flag: '🇳🇱',
    description:
      'Niederländische Genossenschaftsbank mit besonderem Fokus auf nachhaltige Finanzdienstleistungen.',
    depositProtection: 'Niederländische Einlagensicherung (DGS)',
    founded: '1898',
  },
  {
    name: 'Commerzbank',
    logoAliases: ['Commerzbank AG'],
    logoLocal: '/assets/bank-logos/commerzbank-wordmark.svg',
    country: 'Deutschland',
    iso: 'DEU',
    flag: '🇩🇪',
    description:
      'Traditionsreiche deutsche Geschäftsbank mit umfangreichem Filialnetz und digitalen Services.',
    depositProtection: 'Deutsche Einlagensicherung',
    founded: '1870',
  },
  {
    name: 'Postbank',
    logoAliases: ['Deutsche Postbank AG', 'Postbank AG'],
    logoLocal: '/assets/bank-logos/postbank-official.svg',
    country: 'Deutschland',
    iso: 'DEU',
    flag: '🇩🇪',
    description:
      'Deutschlands bekannte Retail-Bank mit bundesweitem Zugang zu Tagesgeld, Festgeld und Flexgeld.',
    depositProtection: 'Deutsche Einlagensicherung',
    founded: '1990',
  },
];
