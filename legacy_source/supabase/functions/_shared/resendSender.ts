/** Verified Resend sender for kapitalmitte.com. */
export const DEFAULT_RESEND_FROM = 'Kapitalmitte <kundenservice@kapitalmitte.com>';

/**
 * Normalizes SENDER_EMAIL from env and ensures "Display Name <email>" format for Resend.
 */
export function resolveResendFrom(raw: string | undefined | null): string {
  let s = (raw || '').trim();
  if (!s) return DEFAULT_RESEND_FROM;

  const angleMatch = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (angleMatch) {
    const name = angleMatch[1].trim() || 'Kapitalmitte';
    const email = angleMatch[2].trim();
    return `${name} <${email}>`;
  }

  if (s.includes('@')) {
    return `Kapitalmitte <${s}>`;
  }

  return DEFAULT_RESEND_FROM;
}
