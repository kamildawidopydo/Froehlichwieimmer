/** Dial codes aligned with registration country names (German labels). */
export const PHONE_DIAL_CODES = [
  { country: 'Deutschland', dialCode: '+49', iso: 'DE' },
  { country: 'Österreich', dialCode: '+43', iso: 'AT' },
  { country: 'Schweiz', dialCode: '+41', iso: 'CH' },
  { country: 'Frankreich', dialCode: '+33', iso: 'FR' },
  { country: 'Italien', dialCode: '+39', iso: 'IT' },
  { country: 'Spanien', dialCode: '+34', iso: 'ES' },
  { country: 'Niederlande', dialCode: '+31', iso: 'NL' },
  { country: 'Belgien', dialCode: '+32', iso: 'BE' },
  { country: 'Polen', dialCode: '+48', iso: 'PL' },
  { country: 'Schweden', dialCode: '+46', iso: 'SE' },
  { country: 'Portugal', dialCode: '+351', iso: 'PT' },
  { country: 'Irland', dialCode: '+353', iso: 'IE' },
  { country: 'Griechenland', dialCode: '+30', iso: 'GR' },
  { country: 'Finnland', dialCode: '+358', iso: 'FI' },
  { country: 'Dänemark', dialCode: '+45', iso: 'DK' },
  { country: 'Luxemburg', dialCode: '+352', iso: 'LU' },
  { country: 'Tschechien', dialCode: '+420', iso: 'CZ' },
  { country: 'Ungarn', dialCode: '+36', iso: 'HU' },
  { country: 'Rumänien', dialCode: '+40', iso: 'RO' },
  { country: 'Bulgarien', dialCode: '+359', iso: 'BG' },
  { country: 'Kroatien', dialCode: '+385', iso: 'HR' },
  { country: 'Slowakei', dialCode: '+421', iso: 'SK' },
  { country: 'Slowenien', dialCode: '+386', iso: 'SI' },
  { country: 'Estland', dialCode: '+372', iso: 'EE' },
  { country: 'Lettland', dialCode: '+371', iso: 'LV' },
  { country: 'Litauen', dialCode: '+370', iso: 'LT' },
  { country: 'Malta', dialCode: '+356', iso: 'MT' },
  { country: 'Zypern', dialCode: '+357', iso: 'CY' },
  { country: 'Vereinigtes Königreich', dialCode: '+44', iso: 'GB' },
  { country: 'Norwegen', dialCode: '+47', iso: 'NO' },
  { country: 'Island', dialCode: '+354', iso: 'IS' },
  { country: 'Türkei', dialCode: '+90', iso: 'TR' },
  { country: 'USA', dialCode: '+1', iso: 'US' },
  { country: 'Kanada', dialCode: '+1', iso: 'CA' },
];

export const DEFAULT_PHONE_DIAL_CODE = '+49';

export const dialCodeToFlag = (iso) => {
  if (!iso || iso.length !== 2) return '';
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
};

export const formatDialCodeLabel = (entry) =>
  `${dialCodeToFlag(entry.iso)} ${entry.dialCode}`;

export const getDialCodeForCountry = (countryName) =>
  PHONE_DIAL_CODES.find((entry) => entry.country === countryName)?.dialCode || DEFAULT_PHONE_DIAL_CODE;

/** One option per dial code (for select lists). */
export const PHONE_DIAL_CODE_OPTIONS = PHONE_DIAL_CODES.reduce((acc, entry) => {
  if (!acc.some((item) => item.dialCode === entry.dialCode)) {
    acc.push(entry);
  }
  return acc;
}, []);

export const getDialCodeOption = (dialCode) =>
  PHONE_DIAL_CODE_OPTIONS.find((entry) => entry.dialCode === dialCode) ||
  PHONE_DIAL_CODE_OPTIONS.find((entry) => entry.dialCode === DEFAULT_PHONE_DIAL_CODE);
