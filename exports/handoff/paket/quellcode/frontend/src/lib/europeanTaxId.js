import { COUNTRIES } from '@/constants/countries';

const SPANISH_NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const alnumOnly = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const validateGermanTaxId = (value) => {
  const id = digitsOnly(value);
  if (id.length !== 11) {
    return { ok: false, message: 'Deutsche Steuer-ID: genau 11 Ziffern erforderlich' };
  }
  if (id[0] === '0') {
    return { ok: false, message: 'Deutsche Steuer-ID darf nicht mit 0 beginnen' };
  }

  let product = 10;
  for (let i = 0; i < 10; i += 1) {
    let sum = (Number(id[i]) + product) % 10;
    if (sum === 0) sum = 10;
    product = (sum * 2) % 11;
  }
  const check = product === 1 ? 0 : 11 - product;
  if (check !== Number(id[10])) {
    return { ok: false, message: 'Ungültige deutsche Steuer-ID (Prüfziffer)' };
  }

  return { ok: true, normalized: id };
};

const validateDigits = (value, length, countryLabel, { minLength, maxLength, extraCheck } = {}) => {
  const id = digitsOnly(value);
  const min = minLength ?? length;
  const max = maxLength ?? length;

  if (id.length < min || id.length > max) {
    if (min === max) {
      return { ok: false, message: `${countryLabel}: genau ${length} Ziffern erforderlich` };
    }
    return { ok: false, message: `${countryLabel}: ${min}–${max} Ziffern erforderlich` };
  }

  if (extraCheck && !extraCheck(id)) {
    return { ok: false, message: `Ungültige ${countryLabel}` };
  }

  return { ok: true, normalized: id };
};

const validateSpanishTaxId = (value) => {
  const id = alnumOnly(value);
  if (!/^[0-9XYZ][0-9]{7}[A-Z]$/.test(id)) {
    return { ok: false, message: 'Spanische Steuer-ID (NIF/NIE): 8 Ziffern + Prüfbuchstabe' };
  }

  const first = id[0];
  let numberPart;
  if (/[0-9]/.test(first)) {
    numberPart = Number(id.slice(0, 8));
  } else {
    numberPart = Number(String('XYZ'.indexOf(first)) + id.slice(1, 8));
  }
  const expected = SPANISH_NIF_LETTERS[numberPart % 23];
  if (expected !== id[8]) {
    return { ok: false, message: 'Ungültige spanische Steuer-ID (Prüfbuchstabe)' };
  }

  return { ok: true, normalized: id };
};

const validateItalianTaxId = (value) => {
  const id = alnumOnly(value);
  if (!/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(id)) {
    return { ok: false, message: 'Italienische Steuer-ID (Codice Fiscale): 16 Zeichen erforderlich' };
  }
  return { ok: true, normalized: id };
};

const validateIrishTaxId = (value) => {
  const id = alnumOnly(value);
  if (!/^[0-9]{7}[A-W][A-I]?$/.test(id)) {
    return { ok: false, message: 'Irische Steuer-ID (PPS): 7 Ziffern + Prüfzeichen' };
  }
  return { ok: true, normalized: id };
};

const validateFinnishTaxId = (value) => {
  const id = String(value || '').toUpperCase().replace(/[^0-9A-Z+-]/g, '');
  if (!/^[0-9]{6}[+-A][0-9]{3}[0-9A-Z]$/.test(id)) {
    return { ok: false, message: 'Finnische Steuer-ID (HETU): Format TTMMJJXZZZQ' };
  }
  return { ok: true, normalized: id };
};

const COUNTRY_VALIDATORS = {
  Deutschland: validateGermanTaxId,
  Österreich: (value) => validateDigits(value, 9, 'Österreichische Steuer-ID'),
  Schweiz: (value) => validateDigits(value, 13, 'Schweizer AHV-Nummer', {
    extraCheck: (id) => id.startsWith('756'),
  }),
  Frankreich: (value) => validateDigits(value, 13, 'Französische Steuer-ID'),
  Italien: validateItalianTaxId,
  Spanien: validateSpanishTaxId,
  Niederlande: (value) => validateDigits(value, 9, 'Niederländische BSN', {
    extraCheck: (id) => !id.startsWith('0000'),
  }),
  Belgien: (value) => validateDigits(value, 11, 'Belgische Steuer-ID'),
  Polen: (value) => validateDigits(value, 11, 'Polnische Steuer-ID', { minLength: 10, maxLength: 11 }),
  Schweden: (value) => validateDigits(value, 12, 'Schwedische Personnummer', { minLength: 10, maxLength: 12 }),
  Portugal: (value) => validateDigits(value, 9, 'Portugiesische Steuer-ID'),
  Irland: validateIrishTaxId,
  Griechenland: (value) => validateDigits(value, 9, 'Griechische Steuer-ID (AFM)'),
  Finnland: validateFinnishTaxId,
  Dänemark: (value) => validateDigits(value, 10, 'Dänische CPR-Nummer'),
};

const COUNTRY_INPUT_LIMITS = {
  Deutschland: 11,
  Österreich: 9,
  Schweiz: 13,
  Frankreich: 13,
  Italien: 16,
  Spanien: 9,
  Niederlande: 9,
  Belgien: 11,
  Polen: 11,
  Schweden: 12,
  Portugal: 9,
  Irland: 9,
  Griechenland: 9,
  Finnland: 11,
  Dänemark: 10,
};

const COUNTRY_PLACEHOLDERS = {
  Deutschland: '12345678901',
  Österreich: '123456789',
  Schweiz: '7561234567890',
  Frankreich: '1234567890123',
  Italien: 'RSSMRA85M01H501Z',
  Spanien: '12345678Z',
  Niederlande: '123456789',
  Belgien: '12345678901',
  Polen: '12345678901',
  Schweden: '9001011234',
  Portugal: '123456789',
  Irland: '1234567A',
  Griechenland: '123456789',
  Finnland: '010190-123A',
  Dänemark: '0101901234',
};

const COUNTRY_HINTS = {
  Deutschland: '11-stellige Steueridentifikationsnummer (nur Ziffern)',
  Österreich: '9-stellige Steueridentifikationsnummer',
  Schweiz: '13-stellige AHV-Nummer (beginnt mit 756)',
  Frankreich: '13-stellige Numéro fiscal',
  Italien: '16-stelliger Codice Fiscale',
  Spanien: 'NIF/NIE mit Prüfbuchstabe',
  Niederlande: '9-stellige BSN',
  Belgien: '11-stellige Nationalregisternummer',
  Polen: '10–11-stellige PESEL/NIP',
  Schweden: '10–12-stelliges Personnummer',
  Portugal: '9-stellige NIF',
  Irland: 'PPS-Nummer (7 Ziffern + Buchstaben)',
  Griechenland: '9-stellige AFM',
  Finnland: 'HETU im Format TTMMJJXZZZQ',
  Dänemark: '10-stellige CPR-Nummer',
};

const ALNUM_COUNTRIES = new Set(['Italien', 'Spanien', 'Irland']);
const FINLAND_COUNTRY = 'Finnland';

export const isSupportedTaxIdCountry = (country) =>
  COUNTRIES.includes(country) && Boolean(COUNTRY_VALIDATORS[country]);

export const getTaxIdPlaceholder = (country) =>
  COUNTRY_PLACEHOLDERS[country] || 'Steuer-ID eingeben';

export const getTaxIdFormatHint = (country) =>
  COUNTRY_HINTS[country] || 'Gültige Steuer-ID des EU/EWR-Landes eingeben';

export const sanitizeEuropeanTaxIdInput = (value, country) => {
  const raw = String(value || '');

  if (!country || !isSupportedTaxIdCountry(country)) {
    return raw.replace(/[^0-9A-Za-z+\- ]/g, '').slice(0, 16);
  }

  if (ALNUM_COUNTRIES.has(country)) {
    return alnumOnly(raw).slice(0, COUNTRY_INPUT_LIMITS[country]);
  }

  if (country === FINLAND_COUNTRY) {
    return raw.toUpperCase().replace(/[^0-9A-Z+-]/g, '').slice(0, COUNTRY_INPUT_LIMITS[country]);
  }

  return digitsOnly(raw).slice(0, COUNTRY_INPUT_LIMITS[country]);
};

export const validateEuropeanTaxId = (value, country, { required = true } = {}) => {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    return required
      ? { ok: false, message: 'Steuer-ID ist erforderlich', normalized: '' }
      : { ok: true, normalized: '' };
  }

  if (!country) {
    return {
      ok: false,
      message: 'Bitte wählen Sie zuerst die Staatsangehörigkeit',
      normalized: trimmed,
    };
  }

  if (!isSupportedTaxIdCountry(country)) {
    return {
      ok: false,
      message: 'Für diese Staatsangehörigkeit ist keine Steuer-ID-Prüfung hinterlegt',
      normalized: trimmed,
    };
  }

  return COUNTRY_VALIDATORS[country](trimmed);
};

export const formatTaxIdForDisplay = (value, country) => {
  const check = validateEuropeanTaxId(value, country, { required: false });
  if (!check.ok || !check.normalized) return sanitizeEuropeanTaxIdInput(value, country);

  if (country === 'Deutschland' && check.normalized.length === 11) {
    return check.normalized.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  }

  return check.normalized;
};
