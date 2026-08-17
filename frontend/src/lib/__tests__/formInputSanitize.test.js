import { sanitizePersonName, validatePersonName } from '@/lib/personName';
import {
  sanitizeFormField,
  sanitizeDigitsOnly,
  sanitizeDecimalAmount,
  sanitizeLettersOnly,
  sanitizeIban,
  sanitizeRate,
} from '@/lib/formInputSanitize';
import { normalizePhoneLocal, sanitizePhoneInput } from '@/lib/phoneNumber';

describe('personName', () => {
  test('sanitizePersonName removes digits', () => {
    expect(sanitizePersonName('Max123')).toBe('Max');
    expect(sanitizePersonName('Müller-Schmidt')).toBe('Müller-Schmidt');
  });

  test('validatePersonName rejects empty required names', () => {
    expect(validatePersonName('', { label: 'Vorname' }).ok).toBe(false);
    expect(validatePersonName('Anna', { label: 'Vorname' }).ok).toBe(true);
  });
});

describe('formInputSanitize', () => {
  test('routes name and phone fields', () => {
    expect(sanitizeFormField('first_name', 'Max1')).toBe('Max');
    expect(sanitizeFormField('phone_local', '170abc4567')).toBe('1704567');
    expect(sanitizeFormField('phone', '+49 abc 123')).toBe('+49  123');
    expect(sanitizeFormField('mobile', '0170abc4567')).toBe('01704567');
    expect(sanitizeFormField('s_mobile', '+49 abc 123')).toBe('+49  123');
  });

  test('sanitizes contract form fields by type', () => {
    expect(sanitizeFormField('fullName', 'Anna123')).toBe('Anna');
    expect(sanitizeFormField('s_fullName', 'Tom9')).toBe('Tom');
    expect(sanitizeFormField('rep1_fullName', 'Lisa8')).toBe('Lisa');
    expect(sanitizeFormField('birthPlace', 'Berlin123')).toBe('Berlin');
    expect(sanitizeFormField('s_birthPlace', 'Köln1')).toBe('Köln');
    expect(sanitizeFormField('city', 'München99')).toBe('München');
    expect(sanitizeFormField('postalCode', '10a115')).toBe('10115');
    expect(sanitizeFormField('s_postalCode', '80331x')).toBe('80331');
    expect(sanitizeFormField('investmentAmount', '10.000abc')).toBe('10.000');
    expect(sanitizeFormField('festgeldAmount', '5000eur')).toBe('5000');
    expect(sanitizeFormField('interestRate', '3,25%abc')).toBe('3,25%');
    expect(sanitizeFormField('iban', 'de12 abc!')).toBe('DE12 ABC');
    expect(sanitizeFormField('bic', 'abc123!')).toBe('ABC123');
    expect(sanitizeFormField('idNumber', 'l1z 824')).toBe('L1Z824');
    expect(sanitizeFormField('accountHolder', 'Max Mustermann1')).toBe('Max Mustermann');
    expect(sanitizeFormField('sig1_date', 'Berlin, 11.06.2026')).toBe('Berlin, 11.06.2026');
    expect(sanitizeFormField('sig1_image', 'data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  test('helper sanitizers', () => {
    expect(sanitizeDigitsOnly('12ab34')).toBe('1234');
    expect(sanitizeDecimalAmount('1.234,56x')).toBe('1.234,56');
    expect(sanitizeLettersOnly('Bank99')).toBe('Bank');
    expect(sanitizeIban('de 12!')).toBe('DE 12');
    expect(sanitizeRate('2,5%x')).toBe('2,5%');
  });
});

describe('phoneNumber sanitizers', () => {
  test('sanitizePhoneInput strips letters', () => {
    expect(sanitizePhoneInput('abc123def')).toBe('123');
  });

  test('normalizePhoneLocal keeps digits only', () => {
    expect(normalizePhoneLocal('170abc4567')).toBe('1704567');
  });
});
