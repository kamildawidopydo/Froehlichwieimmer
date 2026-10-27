/**
 * Parse Vercel/API responses safely (413 etc. return plain text, not JSON).
 */
export async function parseApiJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return { data: null, raw: '' };
  }
  try {
    return { data: JSON.parse(text), raw: text };
  } catch {
    return { data: null, raw: text };
  }
}

export function apiErrorMessage(response, rawText, fallback = 'Fehler beim Senden') {
  if (response?.status === 401 && /\/api\/send-/.test(response?.url || '')) {
    sessionStorage.removeItem('formular_session_id');
    window.setTimeout(() => window.location.assign('/formular?abgelaufen=1'), 1800);
    return 'Ihre Formular-Sitzung ist abgelaufen. Sie werden zur Code-Eingabe weitergeleitet …';
  }
  const t = (rawText || '').trim();
  if (response?.status === 413 || /request entity too large/i.test(t)) {
    return 'Die Anfrage ist zu groß. Bitte versuchen Sie es erneut oder kontaktieren Sie kundenservice@essenceinvest.com.';
  }
  if (t.startsWith('{')) {
    try {
      const j = JSON.parse(t);
      if (j.error) return j.error;
      if (typeof j.detail === 'string') return j.detail;
      if (Array.isArray(j.detail)) return 'Bitte prüfen Sie Ihre Eingaben.';
      return fallback;
    } catch {
      /* ignore */
    }
  }
  if (t.length > 0 && t.length < 200) return t;
  return fallback;
}
