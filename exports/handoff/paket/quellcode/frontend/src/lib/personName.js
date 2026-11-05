const PERSON_NAME_PATTERN = /^[\p{L}\s'-]+$/u;

export function sanitizePersonName(value) {
  return String(value || '').replace(/[^\p{L}\s'-]/gu, '');
}

export function validatePersonName(value, { required = true, label = 'Name' } = {}) {
  const trimmed = sanitizePersonName(value).trim();
  if (!trimmed) {
    return required ? { ok: false, message: `${label} ist erforderlich` } : { ok: true };
  }
  if (!PERSON_NAME_PATTERN.test(trimmed)) {
    return { ok: false, message: `${label} darf nur Buchstaben enthalten` };
  }
  return { ok: true, value: trimmed };
}
