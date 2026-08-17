/** Deterministische „menschliche“ Abweichungen – nie komplett zufällig pro Reload. */
export function humanizeReviewText(text, slot) {
  if (!text) return text;

  let t = text;
  const s = Math.abs(slot) || 1;

  if (s % 3 !== 0) {
    t = t.charAt(0).toLowerCase() + t.slice(1);
  }
  if (s % 4 === 1) {
    t = t.replace(/\.\s*$/, '');
  }
  if (s % 5 === 2) {
    t = t.replace(/\bhabe\b/gi, 'hab');
  }
  if (s % 6 === 1) {
    t = t.replace(/\bmal\b/gi, 'ma');
  }
  if (s % 7 === 3) {
    t = t.replace(/\bein bisschen\b/gi, 'n bisschen');
  }
  if (s % 8 === 5) {
    t = t.replace(/,\s+/g, ' ');
  }
  if (s % 9 === 4) {
    t = t.replace(/\bEigentlich\b/, 'eigentlich');
  }
  if (s % 10 === 7) {
    t = t.replace(/\bsehr\b/gi, 'echt');
  }
  if (s % 11 === 2) {
    t = t.replace(/\bnicht\b/gi, 'nich');
  }
  if (s % 13 === 6) {
    if (!/[.!?…]$/.test(t.trim())) t = `${t} ..`;
  }
  if (s % 14 === 8) {
    t = t.replace(/\bIch\b/g, 'ich');
  }
  if (s % 15 === 9) {
    t = t.replace(/\bund\b/gi, 'u');
  }
  if (s % 17 === 3) {
    t = t.replace(/\bfür\b/gi, 'fuer');
  }
  if (s % 19 === 11) {
    t = t.replace(/\.\s+/g, '. ');
  }
  if (s % 21 === 5) {
    t = t.replace(/\bwurde\b/gi, 'wurde');
    t = t.replace(/\bist\b/gi, 'is');
  }
  if (s % 23 === 4) {
    t = t.replace(/\bganz\b/gi, 'ziemlich');
  }

  return t.trim();
}

export function humanizeReplyText(text, slot) {
  if (!text) return text;
  let t = text;
  const s = Math.abs(slot) || 1;

  if (s % 4 === 0) {
    t = t.replace(/\.\s*$/, '.');
  }
  if (s % 6 === 2) {
    t = t.replace(/\bVielen Dank\b/, 'vielen Dank');
  }
  if (s % 8 === 3) {
    t = t.replace(/\bgern\b/gi, 'gerne');
  }

  return t.trim();
}

/** @param {import('@/data/offerReviewTexts').ReviewTextContext} c */
export const PROBLEM_REVIEW_TEMPLATES = [
  (c) =>
    `Identifikation ist bei mir 2x abgebrochen, echt nervig. am ende hats dann doch geklappt – ${c.rateStr} passt wenigstens.`,
  (c) =>
    `Erstüberweisung hing fast ne woche fest, hotline schwer erreichbar. geld is jetzt da aber der stress war unnötig`,
  (c) =>
    `im Antrag stand ${c.rateStr}, auf dem Vertrag kam kurz was anderes – musste nachhaken bis ${c.bank} das korrigiert hat.`,
  (c) =>
    `Referenzkonto wurde erst nach 3 mails freigeschaltet, bis dahin konnt ich nich einzahlen. läuft jetzt aber.`,
  (c) =>
    `Support hat 4 tage gebraucht für ne simple frage zur einlagensicherung. antwort war ok, tempo naja.`,
  (c) =>
    `online banking hing an nem samstag komplett, montag gings wieder. für mich wars uncool.`,
  (c) =>
    `Zinsgutschrift kam ne woche später als gedacht, bank sagt „Bearbeitung“ – hätt ich gern früher gewusst.`,
  (c) =>
    `Legitimation per post wär fast abgelaufen weil die erinnerung spät kam. knapp aber geklappt.`,
  (c) =>
    `TAN per sms kam dauernd zu spät, musste 3x neu starten. technisch mühsam bei ${c.bank}.`,
  (c) =>
    `Mindestanlage ${c.minDepStr} war im portal falsch angezeigt, telefonisch erst richtig erklärt worden.`,
];

export const KAPITALMITTE_REPLY_TEMPLATES = {
  problem: [
    (c) =>
      `Kapitalmitte Kundenservice: Danke für die Rückmeldung. Wir haben das direkt bei ${c.bank} nachgefragt – laut Bank ist der Vorgang inzwischen abgeschlossen. Wenn noch was hängt, schreiben Sie uns gern nochmal mit Ihrer Referenz.`,
    (c) =>
      `Kapitalmitte Kundenservice: Tut uns leid für den Ärger. Wir haben Ihren Fall intern notiert und die Partnerbank kontaktiert. Die Verzögerung sollte behoben sein – melden Sie sich bitte, falls nicht.`,
    (c) =>
      `Kapitalmitte Kundenservice: vielen Dank für den Hinweis. Wir vermitteln nur den Kontakt, aber helfen bei solchen Stolpersteinen. ${c.bank} bestätigt uns, dass die Freigabe bzw. Buchung erfolgt ist.`,
    (c) =>
      `Kapitalmitte Kundenservice: Das klingt nach einem technischen Hänger – nicht ideal. Wir haben nachgehakt; die Bank meldet, dass das System wieder normal läuft. Bei erneuten Problemen gerne direkt an uns.`,
  ],
  neutral: [
    (c) =>
      `Kapitalmitte Kundenservice: Danke für Ihre Bewertung! Schön, dass der Ablauf bei ${c.bank} für Sie gepasst hat.`,
    (c) =>
      `Kapitalmitte Kundenservice: vielen Dank fürs Feedback – freut uns, dass ${c.rateStr} und Service stimmig waren.`,
    (c) =>
      `Kapitalmitte Kundenservice: Wir geben Ihr Lob an ${c.bank} weiter. Bei Fragen zur Vermittlung sind wir jederzeit da.`,
  ],
};

export function pickKapitalmitteReply(isProblem, ctx, slot) {
  const pool = isProblem ? KAPITALMITTE_REPLY_TEMPLATES.problem : KAPITALMITTE_REPLY_TEMPLATES.neutral;
  const idx = Math.abs(slot) % pool.length;
  return humanizeReplyText(pool[idx](ctx), slot + 3);
}

export function addDaysToReviewDateDe(dateStr, days) {
  const [day, month, year] = dateStr.split('.').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
