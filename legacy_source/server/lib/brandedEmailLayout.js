/**
 * Kapitalmitte branded HTML email shell — matches site palette (index.css)
 * and editorial templates under templates/email/.
 *
 * Palette: cobalt #2186D4, ink #1E293B, muted #64748B, surface #F5F8FC, border #E2E8F0
 * Layout: white card, logo header, cobalt accent rule (no navy gradient / gold bar).
 */

const BRAND = 'Kapitalmitte';
const SITE_URL = 'https://www.kapitalmitte.com';
const LOGO_URL = `${SITE_URL}/assets/logo/kapitalmitte-logo.png?v=20`;
const SUPPORT_EMAIL = 'kundenservice@kapitalmitte.com';

const COLORS = {
  primary: '#2186D4',
  primaryHover: '#146EB4',
  accent: '#38A3E8',
  bg: '#F5F8FC',
  surface: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
  successBg: '#ECFDF5',
  success: '#059669',
  noteBg: '#ECF5FC',
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCardRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.muted};vertical-align:top;width:38%;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:${COLORS.text};text-align:right;vertical-align:top;">
        ${value}
      </td>
    </tr>`;
}

function renderCard(rowsHtml) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;background:${COLORS.bg};border:1px solid ${COLORS.border};">
      <tr>
        <td style="padding:4px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

function renderEyebrow(text) {
  return `
    <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.primary};">
      ${escapeHtml(text)}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
      <tr>
        <td height="2" style="background-color:${COLORS.primary};font-size:0;line-height:0;">&nbsp;</td>
      </tr>
    </table>`;
}

function renderButton(href, label) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 8px auto;">
      <tr>
        <td align="center" style="background-color:${COLORS.primary};border-radius:2px;">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

function renderBadge(text, tone = 'success') {
  const bg = tone === 'success' ? COLORS.successBg : COLORS.noteBg;
  const color = tone === 'success' ? COLORS.success : COLORS.primary;
  return `
    <p style="margin:0 0 16px 0;">
      <span style="display:inline-block;padding:6px 12px;background:${bg};color:${color};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
        ${escapeHtml(text)}
      </span>
    </p>`;
}

function renderNote(html) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0;">
      <tr>
        <td style="padding:14px 16px;background:${COLORS.noteBg};border-left:3px solid ${COLORS.primary};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:${COLORS.text};">
          ${html}
        </td>
      </tr>
    </table>`;
}

/**
 * @param {string} eyebrow - small uppercase label under logo
 * @param {string} bodyHtml - inner HTML (already escaped where needed)
 * @param {{ preheader?: string }} [opts]
 */
function wrapEmail(eyebrow, bodyHtml, opts = {}) {
  const year = new Date().getFullYear();
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLORS.bg};">${escapeHtml(opts.preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(BRAND)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:Arial,Helvetica,sans-serif;">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${COLORS.surface};border:1px solid ${COLORS.border};">
          <tr>
            <td align="center" style="padding:36px 40px 16px 40px;background-color:${COLORS.surface};">
              <a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="${BRAND}" width="260" height="66"
                     style="display:block;border:0;outline:none;text-decoration:none;width:260px;max-width:260px;height:auto;margin:0 auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 8px 40px;">
              ${renderEyebrow(eyebrow || BRAND)}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 32px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${COLORS.text};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 40px;border-top:1px solid ${COLORS.border};background-color:${COLORS.bg};font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:${COLORS.muted};text-align:center;">
              Diese E-Mail wurde automatisch erstellt. Bitte antworten Sie nicht direkt auf diese Nachricht.<br/>
              Fragen? <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLORS.primary};text-decoration:underline;">${SUPPORT_EMAIL}</a>
              &nbsp;&middot;&nbsp;
              <a href="${SITE_URL}" style="color:${COLORS.primary};text-decoration:underline;">www.kapitalmitte.com</a><br/>
              &copy; ${year} ${BRAND}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  BRAND,
  SITE_URL,
  LOGO_URL,
  SUPPORT_EMAIL,
  COLORS,
  escapeHtml,
  renderCardRow,
  renderCard,
  renderEyebrow,
  renderButton,
  renderBadge,
  renderNote,
  wrapEmail,
};
