export const COUNTRIES = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Frankreich',
  'Italien',
  'Spanien',
  'Niederlande',
  'Belgien',
  'Polen',
  'Schweden',
  'Portugal',
  'Irland',
  'Griechenland',
  'Finnland',
  'Dänemark',
];

/** Staatsangehörigkeit (Adjektiv), nicht Ländername */
export const COUNTRY_NATIONALITIES = {
  Deutschland: 'Deutsch',
  Österreich: 'Österreichisch',
  Schweiz: 'Schweizer',
  Frankreich: 'Französisch',
  Italien: 'Italienisch',
  Spanien: 'Spanisch',
  Niederlande: 'Niederländisch',
  Belgien: 'Belgisch',
  Polen: 'Polnisch',
  Schweden: 'Schwedisch',
  Portugal: 'Portugiesisch',
  Irland: 'Irisch',
  Griechenland: 'Griechisch',
  Finnland: 'Finnisch',
  Dänemark: 'Dänisch',
};

export const NATIONALITY_TO_COUNTRY = Object.fromEntries(
  Object.entries(COUNTRY_NATIONALITIES).map(([country, nationality]) => [nationality, country]),
);

export const NATIONALITIES = COUNTRIES.map((country) => COUNTRY_NATIONALITIES[country]);

/** Ländername oder Staatsangehörigkeit → Anzeigewert (Staatsangehörigkeit) */
export const getNationalityForCountry = (countryOrNationality) => {
  if (!countryOrNationality) return '';
  if (COUNTRY_NATIONALITIES[countryOrNationality]) return COUNTRY_NATIONALITIES[countryOrNationality];
  return countryOrNationality;
};

/** Staatsangehörigkeit oder Ländername → Ländername (für Steuer-ID-Prüfung) */
export const getCountryForNationality = (nationalityOrCountry) => {
  if (!nationalityOrCountry) return '';
  if (NATIONALITY_TO_COUNTRY[nationalityOrCountry]) return NATIONALITY_TO_COUNTRY[nationalityOrCountry];
  if (COUNTRY_NATIONALITIES[nationalityOrCountry]) return nationalityOrCountry;
  return nationalityOrCountry;
};
