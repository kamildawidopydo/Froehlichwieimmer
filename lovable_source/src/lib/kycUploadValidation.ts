import { z } from 'zod';

export const KYC_MAX_BYTES = 10 * 1024 * 1024;
export const KYC_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const;
export const kycUploadSchema = z.object({
  doc_type: z.enum(['id_front', 'id_back', 'address_proof', 'other']),
  file_base64: z.string().min(10).max(Math.ceil(KYC_MAX_BYTES * 4 / 3) + 16),
  media_type: z.enum(KYC_MIME),
  file_name: z.string().trim().min(1).max(200),
  address_doc_kind: z.string().trim().max(120).optional(),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function validateKycFile(p: z.infer<typeof kycUploadSchema>, kinds: string[], maxAge: number, now = new Date()) {
  if (p.doc_type === 'address_proof') {
    if (!p.address_doc_kind || !kinds.includes(p.address_doc_kind)) throw new Error('Bitte die Art des Adressnachweises auswählen.');
    if (!p.document_date) throw new Error('Bitte das Datum auf der Rechnung oder dem Adressnachweis angeben.');
    const d = new Date(`${p.document_date}T00:00:00Z`);
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== p.document_date) throw new Error('Das Dokumentdatum ist ungültig.');
    const limit = new Date(now); limit.setUTCMonth(limit.getUTCMonth() - maxAge); limit.setUTCHours(0, 0, 0, 0);
    if (d > now) throw new Error('Das Dokumentdatum liegt in der Zukunft.');
    if (d < limit) throw new Error(`Der Adressnachweis ist älter als ${maxAge} Monate. Bitte ein aktuelleres Dokument hochladen.`);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(p.file_base64) || p.file_base64.length % 4 !== 0) throw new Error('Die Datei konnte nicht gelesen werden.');
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(p.file_base64), ch => ch.charCodeAt(0)); } catch { throw new Error('Die Datei konnte nicht gelesen werden.'); }
  if (!bytes.length || bytes.length > KYC_MAX_BYTES) throw new Error('Bitte eine Datei bis 10 MB auswählen.');
  const starts = (...v: number[]) => v.every((x, i) => bytes[i] === x);
  const text = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  const valid = p.media_type === 'application/pdf' ? text(0, 5) === '%PDF-'
    : p.media_type === 'image/png' ? starts(137, 80, 78, 71, 13, 10, 26, 10)
    : p.media_type === 'image/jpeg' ? starts(255, 216, 255)
    : text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP';
  if (!valid) throw new Error('Dateiinhalt und Dateiformat passen nicht zusammen. Bitte ein PDF oder ein Foto (JPG, PNG, WEBP) auswählen.');
  const ext = ({ 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const)[p.media_type];
  return { bytes, ext };
}