import { DEFAULT_PHONE_DIAL_CODE, PHONE_DIAL_CODES, getDialCodeForCountry } from '@/constants/phoneDialCodes';

export const normalizePhoneLocal = (value) =>
  String(value || '')
    .replace(/[^\d\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Free-form phone fields: digits and common formatting chars only. */
export const sanitizePhoneInput = (value) =>
  String(value || '').replace(/[^\d+\s().-]/g, '');

export const combinePhoneNumber = (dialCode, localNumber) => {
  const code = String(dialCode || DEFAULT_PHONE_DIAL_CODE).trim();
  const local = normalizePhoneLocal(localNumber).replace(/\s/g, '');
  if (!local) return '';
  return `${code}${local}`;
};

export const splitPhoneNumber = (phone) => {
  const raw = String(phone || '').trim();
  if (!raw) {
    return { dialCode: DEFAULT_PHONE_DIAL_CODE, localNumber: '' };
  }

  const sortedCodes = [...new Set(PHONE_DIAL_CODES.map((entry) => entry.dialCode))].sort(
    (a, b) => b.length - a.length,
  );

  for (const code of sortedCodes) {
    if (raw.startsWith(code)) {
      return {
        dialCode: code,
        localNumber: normalizePhoneLocal(raw.slice(code.length)),
      };
    }
  }

  if (raw.startsWith('+')) {
    const match = raw.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      return {
        dialCode: match[1],
        localNumber: normalizePhoneLocal(match[2]),
      };
    }
  }

  return { dialCode: DEFAULT_PHONE_DIAL_CODE, localNumber: normalizePhoneLocal(raw) };
};

export const phoneFormFromProfile = (profile) => {
  const split = splitPhoneNumber(profile?.phone);
  if (profile?.phone) {
    return { phone_dial_code: split.dialCode, phone_local: split.localNumber };
  }
  return {
    phone_dial_code: profile?.country ? getDialCodeForCountry(profile.country) : DEFAULT_PHONE_DIAL_CODE,
    phone_local: '',
  };
};

export const validatePhoneLocal = (localNumber, { required = false } = {}) => {
  const digits = normalizePhoneLocal(localNumber).replace(/\s/g, '');
  if (!digits) {
    return required ? { ok: false, message: 'Telefon ist erforderlich' } : { ok: true };
  }
  if (digits.length < 6) return { ok: false, message: 'Telefonnummer ist zu kurz' };
  if (digits.length > 15) return { ok: false, message: 'Telefonnummer ist zu lang' };
  if (!/^\d+$/.test(digits)) return { ok: false, message: 'Telefonnummer darf nur Ziffern enthalten' };
  return { ok: true };
};
