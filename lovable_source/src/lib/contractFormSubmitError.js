/** User-facing message for contract form POST failures. */
export function contractFormSubmitErrorMessage(err) {
  const msg = err?.message || 'Unbekannter Fehler';
  if (msg === 'Failed to fetch' || /NetworkError|Load failed/i.test(msg)) {
    if (process.env.NODE_ENV === 'development') {
      return 'Server nicht erreichbar. Bitte „npm run dev“ verwenden (startet Web + API).';
    }
    return 'Verbindungsfehler beim Senden. Bitte erneut versuchen. Falls die Anfrage mehrfach fehlschlägt, kontaktieren Sie uns — Ihre Eingaben bleiben im Formular erhalten.';
  }
  return msg;
}
