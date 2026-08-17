/** First-visit welcome gate + shared cookie consent helpers. */

export const VISITOR_PROFILE_KEY = 'kapitalmitte_visitor_profile';
export const COOKIE_CONSENT_KEY = 'kapitalmitte_cookie_consent';
export const OPEN_COOKIE_SETTINGS_EVENT = 'open-cookie-settings';

export const VISITOR_ROLES = [
  // Privatkunden
  { value: 'privatperson', label: 'Privatperson / Privatanleger' },
  { value: 'retail-sparer', label: 'Sparer / Tages- und Festgeldkunde' },
  { value: 'selbststaendig', label: 'Selbstständige / Freiberufler' },
  { value: 'unternehmer-privat', label: 'Unternehmer (Privatvermögen)' },
  { value: 'erwerbstaetig', label: 'Angestellte / Erwerbstätige' },
  { value: 'ruhestand', label: 'Ruhestand / Pensionär' },
  { value: 'erbe', label: 'Erbe / Vermögensnachfolge' },
  { value: 'auswanderer', label: 'Auswanderer / Expats' },
  { value: 'grenzgaenger', label: 'Grenzgänger' },
  { value: 'hnwi', label: 'Vermögende Privatperson (HNWI)' },
  { value: 'uhnwi', label: 'Ultra High Net Worth (UHNWI)' },
  { value: 'private-banking-kunde', label: 'Private-Banking-Kunde' },
  { value: 'wealth-management-kunde', label: 'Wealth-Management-Kunde' },
  { value: 'depothalter', label: 'Depotinhaber / Wertpapierkunde' },
  { value: 'immobilieninvestor-privat', label: 'Privater Immobilieninvestor' },
  { value: 'kryptoinvestor', label: 'Krypto- / Digital-Asset-Interessent' },
  { value: 'nachhaltig-anleger', label: 'Nachhaltiger / ESG-Anleger' },
  { value: 'jugendlicher', label: 'Jugendliche / Minderjährige (mit Erziehungsberechtigten)' },
  { value: 'student', label: 'Studierende / Ausbildung' },
  { value: 'auszubildender', label: 'Auszubildende / Berufseinsteiger' },
  { value: 'interessent-privat', label: 'Interessent ohne bestehendes Mandat' },

  // Family Office & Vermögen
  { value: 'family-office-single', label: 'Single Family Office' },
  { value: 'family-office-multi', label: 'Multi Family Office' },
  { value: 'family-office', label: 'Family Office (allgemein)' },
  { value: 'stiftungsvorstand-privat', label: 'Familienstiftung / Privatstiftung' },
  { value: 'treuhand', label: 'Treuhandgesellschaft / Trustee' },

  // Institutionelle Anleger
  { value: 'institutionell', label: 'Institutioneller Anleger' },
  { value: 'pensionskasse', label: 'Pensionskasse / Vorsorgeeinrichtung' },
  { value: 'versorgungswerk', label: 'Versorgungswerk / berufsständige Versorgung' },
  { value: 'versicherung', label: 'Versicherung / Versicherer' },
  { value: 'rueckversicherung', label: 'Rückversicherung' },
  { value: 'krankenkasse', label: 'Krankenversicherung / Krankenkasse' },
  { value: 'kirchen', label: 'Kirche / kirchliche Einrichtung' },
  { value: 'stiftung', label: 'Stiftung / gemeinnützige Organisation' },
  { value: 'ngo', label: 'NGO / Non-Profit' },
  { value: 'endowment', label: 'Endowment / Universitätsstiftung' },
  { value: 'sovereign', label: 'Staatsfonds / Sovereign Wealth Fund' },
  { value: 'zentralbank', label: 'Zentralbank / Währungsbehörde' },
  { value: 'oeffentliche-kasse', label: 'Öffentliche Kasse / Finanzverwaltung' },
  { value: 'kommunal', label: 'Kommune / kommunale Einrichtung' },
  { value: 'genossenschaft', label: 'Genossenschaft / genossenschaftliche Einrichtung' },

  // Banken & Finanzinstitute
  { value: 'bank', label: 'Bank / Kreditinstitut' },
  { value: 'privatbank', label: 'Privatbank / Private Bank' },
  { value: 'sparkasse', label: 'Sparkasse' },
  { value: 'volksbank', label: 'Volks- und Raiffeisenbank' },
  { value: 'landesbank', label: 'Landesbank / Förderbank' },
  { value: 'investmentbank', label: 'Investmentbank' },
  { value: 'auslandsbank', label: 'Auslandsbank / Zweigniederlassung' },
  { value: 'zahlungsinstitut', label: 'Zahlungsinstitut / E-Geld-Institut' },
  { value: 'bausparkasse', label: 'Bausparkasse' },
  { value: 'leasing', label: 'Leasinggesellschaft' },
  { value: 'factoring', label: 'Factoringgesellschaft' },

  // Asset Management & Fonds
  { value: 'vermoegensverwalter', label: 'Vermögensverwalter / Asset Manager' },
  { value: 'kvg', label: 'Kapitalverwaltungsgesellschaft (KVG)' },
  { value: 'fonds', label: 'Fondsgesellschaft / Fondsinitiator' },
  { value: 'aif-manager', label: 'AIF-Manager / Spezialfonds' },
  { value: 'etf-anbieter', label: 'ETF- / Indexfondsanbieter' },
  { value: 'hedgefonds', label: 'Hedgefonds' },
  { value: 'private-equity', label: 'Private Equity / Venture Capital' },
  { value: 'real-estate-fonds', label: 'Immobilienfonds / REOC' },
  { value: 'infra-fonds', label: 'Infrastrukturfonds' },
  { value: 'fondsvertrieb', label: 'Fondsvertrieb / Fund Distributor' },
  { value: 'fondsanalyse', label: 'Fondsanalyse / Research' },
  { value: 'depotbank', label: 'Verwahrstelle / Depotbank' },
  { value: 'broker', label: 'Broker / Wertpapierdienstleister' },
  { value: 'handelsplatz', label: 'Börse / Handelsplatz' },
  { value: 'clearing', label: 'Clearing / Settlement' },
  { value: 'custody', label: 'Custody / Wertpapierverwahrung' },

  // Beratung & Vertrieb
  { value: 'finanzberater', label: 'Finanzberater / Anlageberater' },
  { value: 'honorarberater', label: 'Honorarberater' },
  { value: 'vermittler', label: 'Finanzanlagenvermittler (§ 34f GewO)' },
  { value: 'versicherungsmakler', label: 'Versicherungsmakler / -berater' },
  { value: 'immobilienmakler', label: 'Immobilienmakler / -berater' },
  { value: 'kreditvermittler', label: 'Kreditvermittler' },
  { value: 'ifp', label: 'Unabhängiger Finanzplaner (IFP)' },
  { value: 'wealth-planner', label: 'Wealth Planner / Nachfolgeplaner' },
  { value: 'versicherungsvertreter', label: 'Versicherungsvertreter' },
  { value: 'strukturvertrieb', label: 'Strukturvertrieb / Netzwerkvertrieb' },

  // Unternehmen & Corporate
  { value: 'unternehmen', label: 'Unternehmen / Corporate Treasury' },
  { value: 'cfo', label: 'CFO / Finanzvorstand' },
  { value: 'treasury', label: 'Treasury / Cash Management' },
  { value: 'controlling', label: 'Controlling / Finanzcontrolling' },
  { value: 'mittelstand', label: 'Mittelstand / KMU' },
  { value: 'konzern', label: 'Konzern / Großunternehmen' },
  { value: 'startup', label: 'Start-up / Scale-up' },
  { value: 'holding', label: 'Holdinggesellschaft' },
  { value: 'familienunternehmen', label: 'Familienunternehmen' },
  { value: 'immobilienunternehmen', label: 'Immobilienunternehmen / Projektentwickler' },
  { value: 'industrie', label: 'Industrie / Produktion' },
  { value: 'handel', label: 'Handel / Retail' },
  { value: 'dienstleistung', label: 'Dienstleistungsunternehmen' },

  // Fintech & Technologie
  { value: 'fintech', label: 'Fintech / Plattform' },
  { value: 'neobank', label: 'Neobank / Challenger Bank' },
  { value: 'robo-advisor', label: 'Robo-Advisor / digitale Vermögensverwaltung' },
  { value: 'payment', label: 'Payment / Zahlungsdienstleister' },
  { value: 'regtech', label: 'RegTech / Compliance-Technologie' },
  { value: 'insurtech', label: 'InsurTech' },
  { value: 'proptech', label: 'PropTech / Immobilienplattform' },
  { value: 'software-finanz', label: 'Softwareanbieter Finanzwesen' },
  { value: 'datenanbieter', label: 'Daten- / Marktdatenanbieter' },
  { value: 'ratingagentur', label: 'Ratingagentur' },

  // Recht, Steuer, Prüfung
  { value: 'anwalt', label: 'Rechtsanwalt' },
  { value: 'notar', label: 'Notar' },
  { value: 'steuerberater', label: 'Steuerberater' },
  { value: 'wirtschaftspruefer', label: 'Wirtschaftsprüfer' },
  { value: 'treuhaender', label: 'Treuhänder / Fiduciary' },
  { value: 'compliance-officer', label: 'Compliance Officer' },
  { value: 'risk-manager', label: 'Risk Manager' },
  { value: 'internes-audit', label: 'Internes Audit / Revision' },
  { value: 'rechtsabteilung', label: 'Rechtsabteilung / Legal Counsel' },
  { value: 'insolvenzverwalter', label: 'Insolvenzverwalter' },

  // Aufsicht, Politik, Öffentlich
  { value: 'oeffentlich', label: 'Öffentliche Hand / Behörde' },
  { value: 'aufsicht', label: 'Aufsichtsbehörde (BaFin, EZB u. a.)' },
  { value: 'politik', label: 'Politik / Parlament' },
  { value: 'verband', label: 'Branchenverband / Interessenvertretung' },
  { value: 'kammer', label: 'Kammer / berufsständische Organisation' },
  { value: 'botschaft', label: 'Botschaft / Konsulat' },
  { value: 'internationale-org', label: 'Internationale Organisation' },

  // Medien, Bildung, Forschung
  { value: 'journalist', label: 'Journalist / Redaktion' },
  { value: 'medien', label: 'Medienunternehmen / Publisher' },
  { value: 'blogger', label: 'Blogger / Content Creator (Finanzen)' },
  { value: 'influencer-finanz', label: 'Finanz-Influencer / Podcaster' },
  { value: 'wissenschaft', label: 'Wissenschaft / Forschung' },
  { value: 'hochschule', label: 'Hochschule / Universität' },
  { value: 'schule', label: 'Schule / Bildungseinrichtung' },
  { value: 'dozent', label: 'Dozent / Trainer Finanzwissen' },
  { value: 'analyst', label: 'Finanzanalyst / Equity Research' },
  { value: 'oekonom', label: 'Ökonom / Makroanalyst' },

  // Sonstige
  { value: 'personalvermittler', label: 'Personalvermittler / Headhunter (Finance)' },
  { value: 'beratung-allgemein', label: 'Unternehmensberatung / Strategy' },
  { value: 'it-dienstleister', label: 'IT-Dienstleister / Systemintegrator' },
  { value: 'pr-agentur', label: 'PR- / Kommunikationsagentur' },
  { value: 'event', label: 'Event- / Konferenzveranstalter' },
  { value: 'lieferant', label: 'Lieferant / Dienstleister (sonstig)' },
  { value: 'bewerber', label: 'Bewerber / Karriereinteressent' },
  { value: 'partner-interessent', label: 'Kooperations- / Partnerinteressent' },
  { value: 'sonstige', label: 'Sonstige / keine der genannten' },
];

export const RESIDENCE_COUNTRIES = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'CH', label: 'Schweiz' },
  { value: 'LI', label: 'Liechtenstein' },
  { value: 'LU', label: 'Luxemburg' },
  { value: 'NL', label: 'Niederlande' },
  { value: 'BE', label: 'Belgien' },
  { value: 'FR', label: 'Frankreich' },
  { value: 'IT', label: 'Italien' },
  { value: 'ES', label: 'Spanien' },
  { value: 'PT', label: 'Portugal' },
  { value: 'IE', label: 'Irland' },
  { value: 'GB', label: 'Vereinigtes Königreich' },
  { value: 'DK', label: 'Dänemark' },
  { value: 'SE', label: 'Schweden' },
  { value: 'NO', label: 'Norwegen' },
  { value: 'FI', label: 'Finnland' },
  { value: 'PL', label: 'Polen' },
  { value: 'CZ', label: 'Tschechien' },
  { value: 'SK', label: 'Slowakei' },
  { value: 'HU', label: 'Ungarn' },
  { value: 'RO', label: 'Rumänien' },
  { value: 'BG', label: 'Bulgarien' },
  { value: 'HR', label: 'Kroatien' },
  { value: 'SI', label: 'Slowenien' },
  { value: 'GR', label: 'Griechenland' },
  { value: 'CY', label: 'Zypern' },
  { value: 'MT', label: 'Malta' },
  { value: 'EE', label: 'Estland' },
  { value: 'LV', label: 'Lettland' },
  { value: 'LT', label: 'Litauen' },
  { value: 'US', label: 'Vereinigte Staaten' },
  { value: 'CA', label: 'Kanada' },
  { value: 'OTHER', label: 'Anderes Land' },
];

export function readVisitorProfile() {
  try {
    const raw = localStorage.getItem(VISITOR_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasVisitorProfile() {
  return Boolean(readVisitorProfile());
}

export function saveVisitorProfile(profile) {
  const data = {
    ...profile,
    timestamp: new Date().toISOString(),
    version: '1.0',
  };
  localStorage.setItem(VISITOR_PROFILE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('visitor-profile-updated', { detail: data }));
  return data;
}

export function saveCookieConsent(preferences) {
  const consentData = {
    preferences,
    timestamp: new Date().toISOString(),
    version: '1.0',
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
  window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: consentData }));
  return consentData;
}

export const ACCEPT_ALL_COOKIE_PREFS = {
  necessary: true,
  preferences: true,
  statistics: true,
  marketing: true,
};

export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
