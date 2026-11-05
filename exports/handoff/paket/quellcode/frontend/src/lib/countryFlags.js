/** ISO 3166-1 alpha-2 — keys match `banks.country` in Supabase. */
export const COUNTRY_ISO = {
  Germany: 'DE',
  France: 'FR',
  Italy: 'IT',
  Spain: 'ES',
  Netherlands: 'NL',
  Austria: 'AT',
  Belgium: 'BE',
  Sweden: 'SE',
  Portugal: 'PT',
  Poland: 'PL',
  Finland: 'FI',
  Denmark: 'DK',
  Ireland: 'IE',
  Luxembourg: 'LU',
  Greece: 'GR',
  Estonia: 'EE',
  Norway: 'NO',
  Latvia: 'LV',
  Lithuania: 'LT',
  'Czech Republic': 'CZ',
  Switzerland: 'CH',
  Iceland: 'IS',
  Malta: 'MT',
  Cyprus: 'CY',
  Slovakia: 'SK',
  Slovenia: 'SI',
  Croatia: 'HR',
  Bulgaria: 'BG',
  Romania: 'RO',
  Hungary: 'HU',
  Liechtenstein: 'LI',
};

/** German display names (sentence case). */
export const COUNTRY_DE = {
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
  Iceland: 'Island',
  Malta: 'Malta',
  Cyprus: 'Zypern',
  Slovakia: 'Slowakei',
  Slovenia: 'Slowenien',
  Croatia: 'Kroatien',
  Bulgaria: 'Bulgarien',
  Romania: 'Rumänien',
  Hungary: 'Ungarn',
  Liechtenstein: 'Liechtenstein',
};

/** German labels (e.g. from `banks.country` or filters) → ISO. */
export const COUNTRY_ISO_BY_DE = Object.fromEntries(
  Object.entries(COUNTRY_DE).map(([en, de]) => [de, COUNTRY_ISO[en]]),
);

export function getCountryIso(country) {
  if (!country) return 'eu';
  const key = String(country).trim();
  if (/^[a-zA-Z]{2}$/.test(key)) return key.toLowerCase();
  const fromEn = COUNTRY_ISO[key];
  if (fromEn) return fromEn.toLowerCase();
  const fromDe = COUNTRY_ISO_BY_DE[key];
  if (fromDe) return fromDe.toLowerCase();
  return 'eu';
}

export function getCountryLabelDe(country, { uppercase = false } = {}) {
  if (!country) return '';
  const key = String(country).trim();
  // ISO-2 direkt via englischen Namen auflösen
  if (/^[a-zA-Z]{2}$/.test(key)) {
    const en = Object.entries(COUNTRY_ISO).find(([, iso]) => iso === key.toUpperCase())?.[0];
    if (en && COUNTRY_DE[en]) {
      const text = COUNTRY_DE[en];
      return uppercase ? text.toUpperCase() : text;
    }
  }
  const text = COUNTRY_DE[key] || key;
  return uppercase ? text.toUpperCase() : text;
}

/** @deprecated Use CountryFlagIcon — emoji flags fail on Windows (show ISO letters). */
export const COUNTRY_FLAG_EMOJI = Object.fromEntries(
  Object.entries(COUNTRY_ISO).map(([name, iso]) => {
    const chars = [...iso.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)));
    return [name, chars.join('')];
  }),
);
