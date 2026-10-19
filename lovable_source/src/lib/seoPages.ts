// Suchmaschinen-Angaben je öffentlicher Seite + Liste privater Bereiche.
// Wird vom Catch-all-Route-head() und von /sitemap.xml gemeinsam genutzt.
export const SITE_URL = "https://essenceinvest.com";
const BRAND = "Fröhlich Vermögensberatung";

type SeoEntry = { title: string; description: string };

export const SEO_PAGES: Record<string, SeoEntry> = {
  "/": {
    title: `${BRAND} | Ihre Investments. Alle Banken. Eine Plattform.`,
    description: "Tagesgeld, Festgeld & mehr bei über 100 europäischen Banken – auf einer Plattform vergleichen und verwalten.",
  },
  "/comparison": {
    title: `Tagesgeld- & Festgeldvergleich Europa | ${BRAND}`,
    description: "Aktuelle Tagesgeld- und Festgeldzinsen europäischer Banken vergleichen – mit Einlagensicherung und Laufzeiten im Überblick.",
  },
  "/sparangebote": {
    title: `Sparangebote: Tagesgeld & Festgeld | ${BRAND}`,
    description: "Ausgewählte Sparangebote für Tagesgeld und Festgeld bei geprüften europäischen Partnerbanken.",
  },
  "/banken": {
    title: `Bankenübersicht – Partnerbanken in Europa | ${BRAND}`,
    description: "Alle Partnerbanken im Überblick: Land, Einlagensicherung, Produkte und Konditionen europäischer Banken.",
  },
  "/partner-banks": {
    title: `Partnerbanken | ${BRAND}`,
    description: "Die europäischen Partnerbanken von Fröhlich Vermögensberatung mit Einlagensicherung und Produkten.",
  },
  "/contact": {
    title: `Kontakt | ${BRAND}`,
    description: "Kontakt zu Fröhlich Vermögensberatung GmbH: Telefon 089 20 175 125, E-Mail und Anschrift in Bad Kreuznach.",
  },
  "/about": {
    title: `Über uns – Unternehmensinformationen | ${BRAND}`,
    description: "Wer wir sind: Fröhlich Vermögensberatung GmbH aus Bad Kreuznach – Team, Werte und Arbeitsweise.",
  },
  "/legal/impressum": {
    title: `Impressum | ${BRAND} GmbH`,
    description: "Impressum der Fröhlich Vermögensberatung GmbH, Bösgrunder Weg 62, 55543 Bad Kreuznach, HRB 23436.",
  },
  "/datenschutz": { title: `Datenschutz | ${BRAND}`, description: "Datenschutzerklärung der Fröhlich Vermögensberatung GmbH." },
  "/how-it-works": { title: `So funktioniert's | ${BRAND}`, description: "In wenigen Schritten zum passenden Zinsangebot – so funktioniert die Anlage über Fröhlich Vermögensberatung." },
  "/leistungen": { title: `Leistungen | ${BRAND}`, description: "Unsere Leistungen: Zinsvergleich, Festgeld, Tagesgeld, Anleihen und Vermögensaufbau." },
  "/philosophie": { title: `Unsere Philosophie | ${BRAND}`, description: "Wofür Fröhlich Vermögensberatung steht: Transparenz, Sicherheit und Unabhängigkeit." },
  "/calculator": { title: `Zinsrechner | ${BRAND}`, description: "Zinsen und Zinseszins für Tagesgeld und Festgeld einfach berechnen." },
  "/kredit": { title: `Kreditvergleich | ${BRAND}`, description: "Ratenkredite bekannter Banken übersichtlich vergleichen." },
  "/faq": { title: `Häufige Fragen (FAQ) | ${BRAND}`, description: "Antworten auf häufige Fragen zu Tagesgeld, Festgeld, Einlagensicherung und Kontoeröffnung." },
  "/sicherheit-regulierung": { title: `Sicherheit & Regulierung | ${BRAND}`, description: "Einlagensicherung, Regulierung und Sicherheit Ihrer Geldanlage in Europa." },
  "/security": { title: `Sicherheit | ${BRAND}`, description: "So schützen wir Ihre Daten und Ihr Geld." },
  "/compliance": { title: `Compliance | ${BRAND}`, description: "Compliance-Grundsätze der Fröhlich Vermögensberatung GmbH." },
  "/bewertungen": { title: `Kundenbewertungen | ${BRAND}`, description: "Erfahrungen und Bewertungen unserer Kunden." },
  "/kundenstimmen": { title: `Kundenstimmen | ${BRAND}`, description: "Was Kunden über Fröhlich Vermögensberatung sagen." },
  "/nachrichten": { title: `Finanznachrichten | ${BRAND}`, description: "Aktuelle Nachrichten zu Zinsen, Märkten, Aktien und Anleihen." },
  "/news": { title: `Markt & News | ${BRAND}`, description: "Börse, Zinsen, Rohstoffe und Währungen – aktuelle Marktnachrichten." },
  "/aktien": { title: `Aktien – Kurse & Analysen | ${BRAND}`, description: "Aktienkurse, Kennzahlen und Analysen ausgewählter Unternehmen." },
  "/wissen": { title: `Finanzwissen | ${BRAND}`, description: "Verständliche Ratgeber rund um Geldanlage, Zinsen und Vermögensaufbau." },
  "/themen": { title: `Anlagethemen | ${BRAND}`, description: "Anlagethemen im Überblick: Zinsen, Ruhestand, Vorsorge und mehr." },
  "/strategie": { title: `Anlagestrategien | ${BRAND}`, description: "Anlagestrategien für unterschiedliche Ziele und Lebensphasen." },
  "/fonds-grundlagen": { title: `Fonds-Grundlagen | ${BRAND}`, description: "Grundlagen zu Fonds und ETFs einfach erklärt." },
  "/spezial-aif": { title: `Spezial-AIF | ${BRAND}`, description: "Informationen zu Spezial-AIF für größere Vermögen." },
  "/groessere-vermoegen": { title: `Größere Vermögen | ${BRAND}`, description: "Lösungen für größere Vermögen und institutionelle Anleger." },
  "/inflation-und-vermoegensaufbau": { title: `Inflation & Vermögensaufbau | ${BRAND}`, description: "Wie Sie Ihr Vermögen trotz Inflation sinnvoll aufbauen." },
  "/savings-education": { title: `Spar-Ratgeber | ${BRAND}`, description: "Ratgeber rund ums Sparen mit Tagesgeld und Festgeld." },
  "/so-funktioniert-der-vergleich": { title: `So funktioniert der Vergleich | ${BRAND}`, description: "Wie unser Zinsvergleich Angebote auswählt und darstellt." },
  "/newsletter": { title: `Newsletter | ${BRAND}`, description: "Zinsnews und Marktthemen regelmäßig per E-Mail erhalten." },
};

// Bereiche, die nie in Suchmaschinen erscheinen sollen.
export const PRIVATE_PREFIXES = [
  "/dashboard", "/admin", "/panel", "/mein-depot", "/meine-alarme", "/onboarding",
  "/login", "/register", "/forgot-password", "/reset-password", "/dokument-upload",
  "/dokumente", "/statement", "/formular", "/apply", "/contract", "/handeln",
  "/logo-preview", "/bausteine",
];

export function isPrivatePath(path: string) {
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
}

export const SITEMAP_PATHS = Object.keys(SEO_PAGES);
