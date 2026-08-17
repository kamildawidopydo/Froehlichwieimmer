const {
  escapeHtml,
  renderCardRow,
  renderCard,
  wrapEmail,
} = require('./brandedEmailLayout');

function getFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'Kunde';
}

function formatMessageHtml(message) {
  if (!String(message || '').trim()) return 'Keine Nachricht';
  return escapeHtml(message).replace(/\n/g, '<br/>');
}

function buildCustomerOfferInterestEmail({ name, offer }) {
  const firstName = escapeHtml(getFirstName(name));
  const productLabel = escapeHtml(offer.product_label || 'Festgeld');
  const bankName = escapeHtml(offer.bank_name || '–');
  const rateLabel = escapeHtml(offer.rate_label || '–');
  const termLabel = escapeHtml(offer.term_label || '–');

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#1E293B;line-height:1.3;">
      Vielen Dank, ${firstName}
    </p>
    <p style="margin:0 0 14px 0;color:#64748B;">
      wir haben Ihre ${productLabel}-Anfrage erhalten und nehmen uns Ihr Anliegen persönlich vor.
    </p>
    <p style="margin:0 0 8px 0;color:#64748B;">
      Unser Beratungsteam prüft das Angebot und bereitet die nächsten Schritte für Sie vor.
    </p>
    ${renderCard(
      [
        renderCardRow('Bank', bankName),
        renderCardRow('Zinssatz', `${rateLabel} p.a.`),
        renderCardRow('Laufzeit', termLabel),
      ].join(''),
    )}
    <p style="margin:0;color:#64748B;">
      Wir melden uns werktags in der Regel innerhalb von 24 Stunden bei Ihnen — unverbindlich, mit Antworten auf Ihre Fragen und allen relevanten Details zu diesem Angebot.
    </p>
  `;

  return {
    subject: 'Ihre Anfrage ist bei Kapitalmitte eingegangen',
    html: wrapEmail('Eingangsbestätigung', bodyHtml, {
      preheader: `Ihre ${offer.product_label || 'Anlage'}-Anfrage bei Kapitalmitte ist eingegangen.`,
    }),
  };
}

function buildAdminOfferInterestEmail({ name, email, phone, message, offer }) {
  const fullName = escapeHtml(name || '–');
  const customerEmail = escapeHtml(email || '–');
  const phoneLabel = escapeHtml(phone?.trim() || 'Nicht angegeben');
  const bankName = escapeHtml(offer.bank_name || '–');
  const rateLabel = escapeHtml(offer.rate_label || '–');
  const termLabel = escapeHtml(offer.term_label || '–');
  const productLabel = escapeHtml(offer.product_label || 'Festgeld');
  const messageHtml = formatMessageHtml(message);

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#1E293B;line-height:1.3;">
      Neue ${productLabel}-Anfrage
    </p>
    <p style="margin:0 0 8px 0;color:#64748B;">
      Eine neue Angebotsanfrage wurde über die Vergleichsseite eingereicht.
    </p>
    ${renderCard(
      [
        renderCardRow('Name', fullName),
        renderCardRow('E-Mail', customerEmail),
        renderCardRow('Telefon', phoneLabel),
        renderCardRow('Bank', bankName),
        renderCardRow('Zinssatz', `${rateLabel} p.a.`),
        renderCardRow('Laufzeit', termLabel),
        renderCardRow('Nachricht', messageHtml),
      ].join(''),
    )}
  `;

  return {
    subject: `Neue Angebotsanfrage: ${offer.bank_name || 'Angebot'} — ${name || 'Interessent'}`,
    html: wrapEmail('Neue Anfrage', bodyHtml, {
      preheader: `${name || 'Interessent'} · ${offer.bank_name || 'Angebot'}`,
    }),
  };
}

module.exports = {
  buildCustomerOfferInterestEmail,
  buildAdminOfferInterestEmail,
};
