const {
  escapeHtml,
  renderCardRow,
  renderCard,
  wrapEmail,
} = require('./brandedEmailLayout');

const PRODUCT_LABELS = {
  aktien: 'Aktien',
  anleihen: 'Anleihen',
  spargeld: 'Tagesgeld / Festgeld / Flexgeld',
};

function formatNotesHtml(notes) {
  if (!String(notes || '').trim()) return null;
  return escapeHtml(notes).replace(/\n/g, '<br/>');
}

function collectAnswerRows(answers) {
  if (!answers || typeof answers !== 'object') return [];

  if (answers.source === 'home_savings_inquiry') {
    const rows = [];
    if (answers.investment_type) rows.push(['Anlageform', answers.investment_type]);
    if (answers.amount_label) rows.push(['Anlagesumme', answers.amount_label]);
    else if (answers.amount_eur != null) rows.push(['Anlagesumme', `${answers.amount_eur} €`]);
    if (answers.notes) rows.push(['Anmerkungen', answers.notes]);
    return rows;
  }

  return Object.entries(answers).map(([key, val]) => {
    const label =
      val && typeof val === 'object' && val.label != null ? String(val.label) : String(val ?? '–');
    return [key, label];
  });
}

function buildAdminProductInquiryEmail(payload) {
  const {
    product,
    first_name,
    last_name,
    email,
    phone,
    customer_number,
    answers,
    consent_marketing,
    leadId,
  } = payload;

  const productLabel = escapeHtml(PRODUCT_LABELS[product] || product || 'Produkt');
  const fullName = escapeHtml(`${first_name || ''} ${last_name || ''}`.trim() || '–');
  const customerEmail = escapeHtml(email || '–');
  const phoneLabel = escapeHtml(String(phone || '').trim() || '–');
  const customerNo = escapeHtml(String(customer_number || '').trim() || '–');
  const sourceLabel =
    answers?.source === 'home_savings_inquiry'
      ? 'Startseite — Spar-Anfrage'
      : 'Startseite — Produktfragebogen';

  const answerRows = collectAnswerRows(answers);
  const answerHtml = answerRows.length
    ? answerRows
        .map(([k, v]) => {
          const notesHtml = k === 'Anmerkungen' ? formatNotesHtml(v) : null;
          return renderCardRow(escapeHtml(k), notesHtml || escapeHtml(String(v)));
        })
        .join('')
    : renderCardRow('Fragebogen', 'Keine Zusatzangaben');

  const leadRef = leadId ? escapeHtml(String(leadId)) : '–';

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#1E293B;line-height:1.3;">
      Neue ${productLabel}-Anfrage
    </p>
    <p style="margin:0 0 8px 0;color:#64748B;">
      Eine neue unverbindliche Anfrage wurde über die Website eingereicht (${escapeHtml(sourceLabel)}).
    </p>
    ${renderCard(
      [
        renderCardRow('Referenz', leadRef),
        renderCardRow('Produkt', productLabel),
        renderCardRow('Name', fullName),
        renderCardRow('E-Mail', customerEmail),
        renderCardRow('Telefon', phoneLabel),
        customer_number ? renderCardRow('Kundennummer', customerNo) : '',
        answerHtml,
        renderCardRow('Marketing-Einwilligung', consent_marketing ? 'Ja' : 'Nein'),
      ].join(''),
    )}
    <p style="margin:0;color:#64748B;">
      Die Anfrage liegt auch im Admin-Bereich unter „Produkt-Anfragen (Start)“.
    </p>
  `;

  const nameForSubject = `${first_name || ''} ${last_name || ''}`.trim() || 'Interessent';
  const sourceShort = answers?.source === 'home_savings_inquiry' ? 'Spar-Anfrage' : productLabel;

  return {
    subject: `Neue ${sourceShort}: ${nameForSubject}`,
    html: wrapEmail('Neue Produktanfrage', bodyHtml, {
      preheader: `${nameForSubject} · ${sourceShort}`,
    }),
    replyTo: String(email || '').trim() || undefined,
  };
}

module.exports = {
  PRODUCT_LABELS,
  buildAdminProductInquiryEmail,
};
