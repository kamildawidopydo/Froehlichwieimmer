/**
 * Session 80.30 — Verständliche relative Zeitangaben.
 *
 * Regeln:
 *   < 90 s        → "gerade eben"
 *   < 60 min      → "vor N Min."
 *   < 24 h        → "vor N Std."
 *   heute (Datum) → "Heute, 16:20"          (falls Datum = today, aber >24h ist unmöglich)
 *   gestern       → "Gestern, 16:20"
 *   sonst < 48 h  → "Gestern, HH:MM"
 *
 * Da wir die 48-h-Freshness-Regel strikt einhalten (Session 80.27), werden
 * ältere Zeitangaben in der News-Übersicht gar nicht angezeigt.
 */
export const relativeTimeLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffSec = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (diffSec < 90) return 'gerade eben';
  if (diffSec < 3600) return `vor ${Math.floor(diffSec / 60)} Min.`;
  if (diffSec < 86400) return `vor ${Math.floor(diffSec / 3600)} Std.`;
  // >24h: Datumsbezug statt "vor 1 Tag"
  const hhmm = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `Heute, ${hhmm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Gestern, ${hhmm}`;
  // Fallback (sollte innerhalb 48h nicht erreicht werden)
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, ${hhmm}`;
};

/**
 * Optionaler Aktualisierungs-Suffix — nur wenn updated_at echt gesetzt und
 * mindestens 10 Minuten nach published_at liegt (Threshold verhindert
 * kosmetische "aktualisiert-vor-1-Min"-Anzeigen bei Auto-Republish).
 */
export const updatedLabel = (updatedAt, publishedAt) => {
  if (!updatedAt || !publishedAt) return null;
  const u = new Date(updatedAt).getTime();
  const p = new Date(publishedAt).getTime();
  if (!u || !p) return null;
  if (u - p < 10 * 60 * 1000) return null;
  return `Aktualisiert ${relativeTimeLabel(updatedAt).toLowerCase()}`;
};
