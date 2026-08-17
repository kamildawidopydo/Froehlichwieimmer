/**
 * Natürliche Kundenbewertungen – ohne ständige Produktnamen im Fließtext.
 * Festgeld- vs. Flexgeld-Kontext über separate Template-Pools.
 */

const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

function pickFrom(arr, ctx, salt = 0) {
  const i = (ctx.seed + ctx.index * 17 + salt + ctx.attempt * 31) % arr.length;
  return arr[i];
}

/** @typedef {{
 *   bank: string;
 *   bankFull: string;
 *   productType: string;
 *   rateStr: string;
 *   termMonths: number;
 *   termPhrase: string;
 *   minDepStr: string;
 *   countryDe: string;
 *   freq: string;
 *   isBbva: boolean;
 *   index: number;
 *   seed: number;
 *   attempt: number;
 * }} ReviewTextContext */

/** @typedef {'festgeld' | 'flexgeld' | 'any'} ProductScope */

/** @param {ProductScope} scope */
function tag(scope, fn) {
  return { scope, fn };
}

/** Neutral – passt zu beiden Produkten, ohne Festgeld/Flexgeld im Text. */
const GENERAL_TEMPLATES = [
  tag('any', (c) => `hab über die Plattform bei ${c.bank} eröffnet. ${c.rateStr} stand so im Antrag, passt.`),
  tag('any', (c) => `Einlagenschutz in ${c.countryDe} war mir wichtig, das war klar erklärt. seitdem ruhig.`),
  tag('any', (c) => `Eröffnung hat bei mir nen Nachmittag gedauert. Ausweis hochladen, fertig. ${c.rateStr} ok.`),
  tag('any', (c) => `hab paar Banken verglichen, bei ${c.bank} gelandet. Zins ${c.rateStr} ohne Nachverhandlung.`),
  tag('any', (c) => `Rückfrage zum Referenzkonto – Antwort kam am nächsten Werktag. läuft.`),
  tag('any', (c) => `Online-Banking ist übersichtlich genug. brauch nicht mehr.`),
  tag('any', (c) => `Erstfreigabe hat 2 Tage gedauert. danach Zinsen pünktlich, Jahresübersicht ok.`),
  tag('any', (c) => `alles digital, kein Postkram. als Berufstätiger gut.`),
  tag('any', (c) => `EU-Sicherung und Grenzen im Vertrag genannt – das wollte ich sehen.`),
  tag('any', (c) => `Identifikation ging flott, Konto noch am selben Tag aktiv. ${c.rateStr} wie erwartet.`),
  tag('any', (c) => `Vergleich und Abschluss wichen nicht ab. ${c.bank} hat ${c.rateStr} so gebucht.`),
  tag('any', (c) => `Steuerunterlagen kamen digital, musste nicht nachfragen. positiv bei ${c.bank}.`),
  tag('any', (c) => `mobil erledigt, Desktop nur fürs Bestätigen. wirkt modern ohne Spielerei.`),
  tag('any', (c) => `SMS-TAN hats einmal nicht geschafft – Hotline half, seitdem ruhig.`),
  tag('any', (c) => `vergleich alle paar Monate. diesmal blieb ${c.bank} oben. ${c.rateStr} und Ablauf stimmten.`),
  tag('any', (c) => `Doku auf Deutsch, klar. im Kleingedruckten bisher keine böse Überraschung.`),
  tag('any', (c) => `Zinsanpassung wurde per Mail angekündigt, nicht versteckt. fair.`),
  tag('any', (c) => `Mindestanlage ${c.minDepStr} – für mich ok. Chat-Support war schnell.`),
  tag('any', (c) => `seit Monaten rund. Auszüge und Zinsnachweise passen zusammen.`),
  tag('any', (c) => `Hinweis auf ${c.countryDe} und Aufsicht war gut – schafft Vertrauen.`),
  tag('any', (c) => `kurz: schneller Abschluss, fairer Zins, keine versteckten Kosten. würde ich wieder machen.`),
  tag('any', (c) => `nutze mehrere EU-Anlagen. ${c.bank} ist übersichtlich und zuverlässig beim Zins.`),
  tag('any', (c) => `Adressänderung in 2 Klicks. Abrechnung blieb korrekt.`),
  tag('any', (c) => `Zinszahlung ${c.freq.toLowerCase()} – im Vertrag so, in der Praxis auch.`),
  tag('any', (c) => `erst skeptisch wegen Ausland, Infos zur Einlagensicherung haben mich überzeugt.`),
  tag('any', (c) => `Tipp: Referenzkonto vorher freischalten. sonst zufrieden mit ${c.rateStr} bei ${c.bank}.`),
  tag('any', (c) => `Plattform war übersichtlich, ${c.bank} selbst eher sachlich. gut so.`),
  tag(
    'any',
    (c) => `seit ${pickFrom(MONTHS_DE, c, 3)} ${2019 + (c.index % 5)} dabei – Zins bisher ohne Abweichung.`
  ),
  tag('any', (c) => `PDF und Produktinfo stimmten mit der Online-Vorschau. seriös.`),
  tag('any', (c) => `ein Stern weniger nur wegen Warteschleife. Antwort danach aber ok.`),
  tag('any', (c) => `AGB zur Einlagensicherung bei ${c.bank} verständlich – das hilft.`),
  tag('any', (c) => `Erinnerung zur Legitimation kam rechtzeitig. ohne die hätt ich die Frist verpasst.`),
  tag('any', (c) => `erste Abrechnung: exakt ${c.rateStr}, inkl. Hinweis zum eff. Jahreszins.`),
  tag('any', (c) => `Mails sachlich, kein Marketing-Blabla. wirkt wie Bank, nicht wie Casino.`),
  tag('any', (c) => `mit Steuerberater gecheckt: Zinsbescheinigung für ${c.countryDe} stimmte.`),
  tag('any', (c) => `von Anfrage bis erster Zinsgutschrift so ca. 10 Tage. transparent kommuniziert.`),
  tag('any', (c) => `Mindestbetrag ${c.minDepStr} klar bestätigt, kein Nachfordern später.`),
  tag('any', (c) => `keine Upsell-Mails nach Eröffnung – nur Service-Infos. angenehm.`),
  tag('any', (c) => `Neukunde ohne Filiale: alles nachvollziehbar. Erwartungen erfüllt.`),
  tag('any', (c) => `Zinsen check ich regelmäßig. bei ${c.bank} passen ${c.rateStr} und Service.`),
  tag('any', (c) => `Ausweis-Upload beim 2. Versuch sofort ok. Support danach erreichbar.`),
  tag('any', (c) => `solide Bank, klarer Prozess, Konditionen wie beschrieben. mehr brauch ich nicht.`),
  tag('any', (c) => `${c.rateStr} und Sitz in ${c.countryDe} – stimmig. Abschluss ok.`),
  tag('any', (c) => `meiner Partnerin den Ablauf gezeigt – Antrag in unter 15 Minuten.`),
  tag('any', (c) => `Euro, kein Wechselkurs-Thema. Rückzahlung und Zinsen wie versprochen.`),
  tag('any', (c) => `war erst unsicher, hab klein angefangen. nach 2 Monaten aufgestockt.`),
  tag('any', (c) => `Support Antwort war kurz aber hilfreich. besser als ellenlange Textbausteine.`),
  tag('any', (c) => `App lädt schnell, Saldo stimmt. mehr will ich eigentlich nicht.`),
  tag('any', (c) => `hab vorher woanders gehabt – hier weniger Frust beim Onboarding.`),
  tag('any', (c) => `Zinsbescheinigung kam ohne Nachhakerei. für die Steuer reicht das.`),
];

/** Laufzeit & Bindung – ohne Produktlabel im Text. */
const FESTGELD_EXCLUSIVE = [
  tag(
    'festgeld',
    (c) => `Bindung bei ${c.bank} (${c.rateStr}): Laufzeit im Portal korrekt, Zins ${c.freq.toLowerCase()} wie Vertrag.`
  ),
  tag('festgeld', (c) => `Erinnerung vor Laufzeitende half. Auszahlung danach pünktlich aufs Referenzkonto.`),
  tag(
    'festgeld',
    (c) => `feste Bindung ${c.termPhrase} war mir wichtiger als tägliche Verfügbarkeit. Abschluss bei ${c.bank} ok.`
  ),
  tag('festgeld', (c) => `Konditionen aus dem Vergleich (${c.rateStr}) 1:1 übernommen. erste Abrechnung nachvollziehbar.`),
  tag('festgeld', (c) => `als Baustein im Portfolio: PDFs verständlich, Laufzeit klar angezeigt.`),
  tag('festgeld', (c) => `nach der ersten Laufzeit neu angelegt – gleicher Weg, keine erneute Identifikation.`),
  tag('festgeld', (c) => `Mindestanlage ${c.minDepStr} transparent. Support hat die Summe schriftlich bestätigt.`),
  tag('festgeld', (c) => `EU-Schutz in ${c.countryDe} und ${c.rateStr} unverändert seit Eröffnung – genau das.`),
  tag('festgeld', (c) => `Verlängerung wurde neutral erklärt – kein Auto-Renew ohne Hinweis. gut.`),
  tag('festgeld', (c) => `Zins für ${c.termPhrase} war ausschlaggebend. Buchungen stimmen mit der Vorschau.`),
  tag('festgeld', (c) => `Zinsbescheinigung digital – für Steuer ohne Nacharbeit nutzbar.`),
  tag('festgeld', (c) => `Restlaufzeit-Anzeige im Banking ist klein aber praktisch. bei ${c.bank} gut.`),
  tag('festgeld', (c) => `Wechsel von anderer Bank: Übertrag brauchte Geduld, danach ${c.rateStr} wie vereinbart.`),
  tag('festgeld', (c) => `Frage zur vorzeitigen Auflösung: Gebühren sachlich erklärt. Entscheidung blieb bei mir.`),
  tag(
    'festgeld',
    (c) =>
      `erste Zinsgutschrift nach ${pickFrom(MONTHS_DE, c, 1)} ${2022 + (c.index % 3)} exakt berechnet – ${c.rateStr}.`
  ),
  tag('festgeld', (c) => `wollte Geld für festen Zeitraum parken. ${c.bank} hat ${c.termPhrase} sauber hinterlegt.`),
  tag('festgeld', (c) => `Benachrichtigung vor Ablauf mit klaren Optionen – weiteranlegen oder auszahlen. unkompliziert.`),
  tag('festgeld', (c) => `für längere Planung: ${c.rateStr} und ${c.freq.toLowerCase()} wie angekündigt.`),
  tag('festgeld', (c) => `hab die Laufzeit bewusst gewählt. bisher keine Überraschung bei der Abrechnung.`),
  tag('festgeld', (c) => `vorzeitig brauchte ichs nicht. wenn doch: Konditionen waren vorher klar.`),
];

/** Verfügbarkeit & Liquidität – ohne Produktlabel im Text. */
const FLEXGELD_EXCLUSIVE = [
  tag('flexgeld', (c) => `Notgroschen bei ${c.bank}: Verfügbarkeit wie beschrieben, Zins ${c.rateStr} ohne Drama.`),
  tag('flexgeld', (c) => `Überweisung zurück aufs Giro war am nächsten Werktag da. genau dafür brauch ichs.`),
  tag('flexgeld', (c) => `ohne feste Bindung, dafür Liquidität. ${c.rateStr} bei ${c.bank} für meinen Puffer.`),
  tag('flexgeld', (c) => `tägliche Verfügbarkeit war mir wichtiger als ein paar Zehntel mehr. hier passt es.`),
  tag('flexgeld', (c) => `Konto in paar Minuten. App zeigt Saldo und letzte Zinsen übersichtlich.`),
  tag('flexgeld', (c) => `kurzfristig Geld gebraucht – Abbuchung ohne Hotline. Limit klar ersichtlich.`),
  tag('flexgeld', (c) => `Zinsgutschrift ${c.freq.toLowerCase()} – Betrag entspricht der Rechnung im Kundenbereich.`),
  tag('flexgeld', (c) => `Puffer für Renovierung: jederzeit Zugriff, ${c.bank} kommuniziert ${c.rateStr} transparent.`),
  tag('flexgeld', (c) => `Flexibilität wichtiger als maximale Bindung. Eröffnung bei ${c.bank} komplett digital.`),
  tag('flexgeld', (c) => `Referenzkonto einmal eingerichtet – seitdem Ein- und Auszahlungen ohne Theater.`),
  tag('flexgeld', (c) => `für die Urlaubskasse: ${c.rateStr} bei ${c.bank}, Teilbeträge abrufbar.`),
  tag('flexgeld', (c) => `ersetzt mein altes Tagesgeld: bessere Übersicht, gleiche Verfügbarkeit, etwas mehr Zins.`),
  tag('flexgeld', (c) => `erst Testbetrag, dann erhöht. Ablauf blieb gleich einfach.`),
  tag('flexgeld', (c) => `Einlagenschutz in ${c.countryDe} geprüft, dann mit ${c.minDepStr} gestartet. bisher stimmig.`),
  tag('flexgeld', (c) => `zwischen Gehalt und längerfristiger Anlage die Reserve – bei ${c.bank} gut aufgehoben.`),
  tag('flexgeld', (c) => `unerwartete Ausgabe: Geld war am selben Tag wieder auf dem Giro.`),
  tag('flexgeld', (c) => `Support erklärte gebunden vs. flexibel verständlich – danach zügig eröffnet.`),
  tag('flexgeld', (c) => `richtige Mischung aus Zugang und Zins. ${c.rateStr} ohne Kleingedrucktes-Überraschung.`),
  tag('flexgeld', (c) => `hab schon 2x Teilbeträge rausgenommen. ging ohne Anruf.`),
  tag('flexgeld', (c) => `für mich wichtiger als Maximalzins: jederzeit rangekommen. passt.`),
];

const BBVA_TEMPLATES = [
  tag(
    'any',
    (c) => `BBVA Online-Banking wirkt aufgeräumt. nach Identifikation am selben Tag aktiv, ${c.rateStr} bestätigt.`
  ),
  tag('any', (c) => `Depotübertrag zur BBVA lief strukturiert. Schritte nachvollziehbar, Mail am nächsten Werktag.`),
  tag('any', (c) => `App und Webportal konsistent – keine doppelten Eingaben. technisch ok.`),
  tag('any', (c) => `an Spitzentagen längere Warteschleife. fachlich aber kompetent.`),
  tag('any', (c) => `spanische Einlagensicherung verständlich erklärt – wichtig vor dem ersten Euro.`),
  tag('any', (c) => `Zinserhöhung per Mail angekündigt, nicht erst im Kleingedruckten. vertrauenswürdig.`),
  tag('festgeld', (c) => `24 Monate wie im Vergleich (${c.rateStr}) – kein Nachverhandeln, Vertrag stimmte.`),
  tag('festgeld', (c) => `Laufzeit und ${c.freq} korrekt im Kundenbereich. nach Ablauf pünktliche Auszahlung.`),
  tag('flexgeld', (c) => `Reserve bei BBVA: Verfügbarkeit wie beschrieben, ${c.rateStr} – für Notgroschen richtig.`),
  tag('any', (c) => `Vergleich über Kapitalmitte, Abschluss bei BBVA – beide Seiten stimmten überein.`),
  tag('any', (c) => `Legitimation ohne Papierpost – großer Pluspunkt für mich.`),
  tag('any', (c) => `Jahresübersicht digital – steuerlich mit Berater ohne Probleme.`),
  tag('any', (c) => `Erstfreigabe übers Wochenende verzögert, Montag frei. seitdem reibungslos.`),
  tag('festgeld', (c) => `Rückfrage zur Verlängerung nach 12 Monaten – Optionen schriftlich bestätigt.`),
  tag('any', (c) => `Support am selben Werktag bei Referenzkonto-Änderung – selten so schnell.`),
  tag('any', (c) => `hab BBVA wegen ${c.rateStr} genommen. bisher keine bösen Überraschungen.`),
  tag('any', (c) => `Portal etwas gewöhnungsbedürftig am Anfang, danach klar.`),
];

function getReviewTemplatePool(isBbva, productType) {
  const want = productType === 'Flexgeld' ? 'flexgeld' : 'festgeld';
  const exclusive = want === 'festgeld' ? FESTGELD_EXCLUSIVE : FLEXGELD_EXCLUSIVE;
  const base = isBbva ? [...BBVA_TEMPLATES, ...GENERAL_TEMPLATES] : GENERAL_TEMPLATES;
  const matched = base.filter((t) => t.scope === want || t.scope === 'any');
  return [...exclusive, ...matched];
}

/** Grober Inhalts-Fingerabdruck (ohne Produktlabels). */
export function reviewTextFingerprint(text) {
  return text
    .replace(/\bFestgeld\b/gi, '')
    .replace(/\bFlexgeld\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getReviewTemplatePoolSize(isBbva, productType) {
  return getReviewTemplatePool(isBbva, productType).length;
}

export function renderReviewFromTemplate(offer, productType, templateSlot, seed, isBbva) {
  const pool = getReviewTemplatePool(isBbva, productType);
  const entry = pool[templateSlot % pool.length];
  const ctx = buildReviewTextContext(offer, productType, templateSlot, seed, isBbva, 0);
  return entry.fn(ctx);
}

/** @deprecated */
export function buildNaturalReviewText(offer, productType, index, seed, isBbva, attempt = 0) {
  return renderReviewFromTemplate(offer, productType, index + attempt * 7, seed, isBbva);
}

export function buildReviewTextContext(offer, productType, index, seed, isBbva, attempt = 0) {
  const bankFull = (offer.bank_name || '').trim() || 'die Bank';
  const bank = shortBankLabel(bankFull);
  const rate = Number(offer.interest_rate);
  const rateStr = Number.isFinite(rate) ? `${rate.toFixed(2).replace('.', ',')} %` : 'den angezeigten Zinssatz';
  const termMonths = Number(offer.deposit_term) || 0;
  const termPhrase =
    termMonths === 0
      ? 'ohne feste Bindung'
      : termMonths === 1
        ? 'mit 1 Monat Laufzeit'
        : `mit ${termMonths} Monaten Laufzeit`;
  const minDep = Number(offer.min_deposit) || 0;
  const minDepStr = minDep > 0 ? `ab ${minDep.toLocaleString('de-DE')} €` : 'ohne hohe Mindestsumme';
  const country = offer.country || 'Germany';
  const countryDe =
    {
      Germany: 'Deutschland',
      France: 'Frankreich',
      Italy: 'Italien',
      Spain: 'Spanien',
      Netherlands: 'Niederlande',
      Austria: 'Österreich',
      Belgium: 'Belgien',
      Sweden: 'Schweden',
      Portugal: 'Portugal',
      Poland: 'Polen',
      Finland: 'Finnland',
      Denmark: 'Dänemark',
      Ireland: 'Irland',
      Luxembourg: 'Luxemburg',
      Greece: 'Griechenland',
    }[country] || country;
  const freq = offer.interest_frequency || 'am Ende der Laufzeit';

  return {
    bank,
    bankFull,
    productType,
    rateStr,
    termMonths,
    termPhrase,
    minDepStr,
    countryDe,
    freq,
    isBbva,
    index,
    seed,
    attempt,
  };
}

function shortBankLabel(bankName) {
  const n = (bankName || '').trim();
  if (!n) return 'die Bank';
  const parts = n.split(/\s+/);
  if (parts.length <= 2) return n;
  return parts.slice(0, 2).join(' ');
}
