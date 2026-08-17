import { sanitizePersonName } from '@/lib/personName';
import { normalizePhoneLocal, sanitizePhoneInput } from '@/lib/phoneNumber';

const LETTERS_ONLY_KEYS = new Set([
  'birthPlace',
  'city',
  'address_city',
  'registryCourt',
  'idAuthority',
  'bankName',
  'profession',
  'selfEmployedBranch',
]);

const NUMERIC_KEYS = new Set(['postalCode', 'address_postal_code']);

const DECIMAL_AMOUNT_KEYS = new Set([
  'investmentAmount',
  'welcomeBonus',
  'festgeldAmount',
  'flexgeldAmount',
  'bonusAmount',
  'registryNumber',
]);

const RATE_KEYS = new Set(['interestRate', 'festgeldRate', 'flexgeldRate']);

const DURATION_KEYS = new Set(['term', 'festgeldTerm', 'flexgeldFixedTerm', 'flexgeldFlexTerm']);

const IBAN_KEYS = new Set(['iban']);
const BIC_KEYS = new Set(['bic']);
const ALPHANUM_KEYS = new Set(['idNumber', 'contractNumber']);

function stripPrefix(field) {
  return field.replace(/^(s_|rep1_|rep2_)/, '');
}

function fieldKey(field) {
  return stripPrefix(field);
}

function isPersonNameField(field) {
  if (!field) return false;
  if (
    field === 'fullName'
    || field === 'accountHolder'
    || field === 'first_name'
    || field === 'last_name'
    || field === 'firstName'
    || field === 'lastName'
    || field === 'name'
  ) {
    return true;
  }
  if (stripPrefix(field) === 'accountHolder') return true;
  return /fullName$/i.test(field);
}

function isPhoneField(field) {
  if (!field || field === 'phone_dial_code') return false;
  return /phone|mobile/i.test(field);
}

export function sanitizeLettersOnly(value) {
  return String(value || '').replace(/[^\p{L}\s'.-]/gu, '');
}

export function sanitizeDigitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

export function sanitizeDecimalAmount(value) {
  return String(value || '').replace(/[^\d.,]/g, '');
}

export function sanitizeRate(value) {
  return String(value || '').replace(/[^\d.,%]/g, '');
}

export function sanitizeDuration(value) {
  return String(value || '').replace(/[^\p{L}\d\s]/gu, '');
}

export function sanitizeIban(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9\s]/g, '')
    .toUpperCase();
}

export function sanitizeBic(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

export function sanitizeAlphanumeric(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

export function sanitizeHouseNumber(value) {
  return String(value || '').replace(/[^A-Za-z0-9\s/-]/g, '');
}

export function sanitizeStreet(value) {
  return String(value || '').replace(/[^\p{L}\d\s.'-/]/gu, '');
}

export function sanitizePlaceDate(value) {
  return String(value || '').replace(/[^\p{L}\d\s.,/-]/gu, '');
}

export function sanitizeEmailInput(value) {
  return String(value || '').replace(/\s/g, '');
}

export function sanitizeFormField(field, value) {
  if (value == null || typeof value === 'boolean') return value;
  if (typeof value === 'string' && value.startsWith('data:image/')) return value;
  if (typeof value !== 'string') return value;

  const key = fieldKey(field);

  if (isPersonNameField(field)) return sanitizePersonName(value);
  if (isPhoneField(field)) {
    return field === 'phone_local' ? normalizePhoneLocal(value) : sanitizePhoneInput(value);
  }
  if (field === 'email' || key === 'email') return sanitizeEmailInput(value);
  if (LETTERS_ONLY_KEYS.has(key)) return sanitizeLettersOnly(value);
  if (NUMERIC_KEYS.has(key)) return sanitizeDigitsOnly(value);
  if (DECIMAL_AMOUNT_KEYS.has(key)) return sanitizeDecimalAmount(value);
  if (RATE_KEYS.has(key)) return sanitizeRate(value);
  if (DURATION_KEYS.has(key)) return sanitizeDuration(value);
  if (IBAN_KEYS.has(key)) return sanitizeIban(value);
  if (BIC_KEYS.has(key)) return sanitizeBic(value);
  if (ALPHANUM_KEYS.has(key)) return sanitizeAlphanumeric(value);
  if (key === 'houseNumber') return sanitizeHouseNumber(value);
  if (key === 'street') return sanitizeStreet(value);
  if (/^sig\d+_date$/.test(field)) return sanitizePlaceDate(value);
  if (key === 'taxId') return value;

  return value;
}

/** @param {{ required?: boolean }} [options] */
export function validateEmail(value, { required = true } = {}) {
  const trimmed = sanitizeEmailInput(value).trim();
  if (!trimmed) {
    return required ? { ok: false, message: 'E-Mail ist erforderlich' } : { ok: true };
  }
  if (!trimmed.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(trimmed)) {
    return { ok: false, message: 'Bitte eine gültige E-Mail-Adresse mit @ eingeben' };
  }
  return { ok: true, value: trimmed };
}
