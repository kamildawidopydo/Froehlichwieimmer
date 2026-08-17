/** Minimum length and complexity for user-chosen passwords. */
export const PASSWORD_MIN_LENGTH = 10;

const UPPER_RE = /[A-ZÄÖÜ]/;
const LOWER_RE = /[a-zäöüß]/;
const DIGIT_RE = /\d/;
const SPECIAL_RE = /[^A-Za-z0-9äöüßÄÖÜ]/;

const WEAK_EXACT = new Set(
  [
    '12345678',
    '123456789',
    '1234567890',
    'password',
    'password1',
    'password123',
    'qwerty123',
    'qwertyuiop',
    '11111111',
    '00000000',
    '87654321',
    'abc12345',
    'letmein1',
    'welcome1',
    'kapitalmitte',
    'kapitalmitte1',
  ].map((s) => s.toLowerCase()),
);

const SEQUENTIAL_RE =
  /(?:0123456789|123456789|234567890|abcdefgh|bcdefghi|qwertyui|asdfghjk|zxcvbnm)/i;

function isTrivialPassword(password) {
  const normalized = password.trim().toLowerCase();
  if (WEAK_EXACT.has(normalized)) return true;
  if (/^\d+$/.test(password)) return true;
  if (/^(.)\1{5,}$/.test(password)) return true;
  if (SEQUENTIAL_RE.test(normalized)) return true;
  return false;
}

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen`,
    failMessage: `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben.`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'upper',
    label: 'Mindestens ein Großbuchstabe',
    failMessage: 'Das Passwort muss mindestens einen Großbuchstaben enthalten.',
    test: (p) => UPPER_RE.test(p),
  },
  {
    id: 'lower',
    label: 'Mindestens ein Kleinbuchstabe',
    failMessage: 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.',
    test: (p) => LOWER_RE.test(p),
  },
  {
    id: 'digit',
    label: 'Mindestens eine Ziffer',
    failMessage: 'Das Passwort muss mindestens eine Ziffer enthalten.',
    test: (p) => DIGIT_RE.test(p),
  },
  {
    id: 'special',
    label: 'Mindestens ein Sonderzeichen',
    failMessage: 'Das Passwort muss mindestens ein Sonderzeichen enthalten (z. B. ! @ # $).',
    test: (p) => SPECIAL_RE.test(p),
  },
  {
    id: 'notWeak',
    label: 'Kein häufig verwendetes oder zu einfaches Passwort',
    failMessage:
      'Dieses Passwort ist zu schwach (z. B. nur Zahlen oder „12345678“). Bitte wählen Sie ein sichereres Passwort.',
    test: (p) => !isTrivialPassword(p),
  },
];

/**
 * @param {string} password
 * @returns {{ id: string, label: string, met: boolean }[]}
 */
export function getPasswordRequirementStatus(password) {
  const value = password || '';
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(value),
  }));
}

/**
 * @param {string} password
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validatePassword(password) {
  const value = (password || '').trim();
  if (!value) {
    return { ok: false, message: 'Passwort ist erforderlich.' };
  }

  for (const rule of PASSWORD_RULES) {
    if (!rule.test(value)) {
      return { ok: false, message: rule.failMessage };
    }
  }

  return { ok: true };
}
