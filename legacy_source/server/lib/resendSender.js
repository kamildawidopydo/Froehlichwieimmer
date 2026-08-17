/** @see supabase/functions/_shared/resendSender.ts */
const DEFAULT_RESEND_FROM = 'Kapitalmitte <kundenservice@kapitalmitte.com>';

function resolveResendFrom(raw) {
  let s = (raw || '').trim();
  if (!s) return DEFAULT_RESEND_FROM;

  s = s.replace(/@kapitalmitte-eu\.com/gi, '@kapitalmitte.com');
  s = s.replace(/kapitalmitte-eu\.com/gi, 'kapitalmitte.com');

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

module.exports = { DEFAULT_RESEND_FROM, resolveResendFrom };
