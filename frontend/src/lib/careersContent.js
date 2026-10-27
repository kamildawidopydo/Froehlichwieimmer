import { GraduationCap, Repeat, Award, HeartHandshake, ShieldCheck, LineChart, Sprout } from 'lucide-react';

export const LEVEL_LABEL = {
  einsteiger: 'Berufseinsteiger',
  quereinsteiger: 'Quereinsteiger',
  erfahren: 'Berufserfahrene',
};

export const AREAS = ['Finanzberatung', 'Vertrieb', 'Kundenbetreuung', 'Personal & Recruiting', 'Marketing & Kommunikation', 'Geschäftsführung & Verwaltung', 'Unternehmensentwicklung'];

export const EMPLOYMENT_TYPES = ['Vollzeit', 'Teilzeit', 'Vollzeit oder Teilzeit', 'Freie Mitarbeit', 'Werkstudium', 'Praktikum'];

export const EXPERIENCE_OPTIONS = ['Keine Berufserfahrung', 'Unter 2 Jahre', '2–5 Jahre', '5–10 Jahre', 'Über 10 Jahre'];

export const CAREER_PATHS = [
  {
    slug: 'berufseinsteiger', level: 'einsteiger', icon: GraduationCap, image: '/assets/careers/einsteiger.jpg',
    title: 'Berufseinsteiger',
    claim: 'Sie möchten die Finanzbranche kennenlernen und interessieren sich für wirtschaftliche Zusammenhänge, Kapitalmärkte und persönliche Beratung? Informieren Sie sich über mögliche Einstiegswege und Tätigkeitsbereiche.',
    intro: 'Ob nach Ausbildung oder Studium: Hier erfahren Sie, welche Tätigkeitsbereiche die Vermögensberatung umfasst und welche Kenntnisse dabei eine Rolle spielen.',
    points: ['Wirtschaftliche Zusammenhänge und Kapitalmärkte verstehen', 'Persönliche Beratung von Menschen kennenlernen', 'Tätigkeitsbereiche der Vermögensberatung entdecken', 'Mögliche Einstiegswege im Überblick'],
  },
  {
    slug: 'quereinsteiger', level: 'quereinsteiger', icon: Repeat, image: '/assets/careers/quereinsteiger.jpg',
    title: 'Quereinsteiger',
    claim: 'Sie möchten sich beruflich neu orientieren und Ihre bisherigen Erfahrungen in einem anderen Tätigkeitsfeld einsetzen? Entdecken Sie die Anforderungen und Möglichkeiten der Vermögensberatung.',
    intro: 'Erfahrungen aus anderen Branchen – etwa im Umgang mit Menschen, im Vertrieb oder in der Organisation – können auch in der Vermögensberatung wertvoll sein. Hier erfahren Sie, welche Anforderungen dieses Tätigkeitsfeld mit sich bringt.',
    points: ['Bisherige Erfahrungen in ein neues Tätigkeitsfeld einbringen', 'Anforderungen der Vermögensberatung kennenlernen', 'Erforderliche Qualifikationen im Überblick', 'Der persönliche Umgang mit Menschen im Mittelpunkt'],
  },
  {
    slug: 'berufserfahrene', level: 'erfahren', icon: Award, image: '/assets/careers/erfahrene.jpg',
    title: 'Berufserfahrene',
    claim: 'Sie verfügen bereits über Erfahrung in der Finanzberatung, im Bankwesen oder im Investmentbereich? Lernen Sie unseren Beratungsansatz und unser Unternehmen näher kennen.',
    intro: 'Sie kennen die Finanzbranche bereits? Hier erfahren Sie mehr über den persönlichen Beratungsansatz der Fröhlich Vermögensberatung GmbH.',
    points: ['Erfahrung aus Finanzberatung, Bankwesen oder Investmentbereich', 'Unseren Beratungsansatz kennenlernen', 'Verantwortungsvoller Umgang mit Kundeninteressen', 'Fachliche Kompetenz in der Beratung einsetzen'],
  },
];

export const VALUE_CARDS = [
  { icon: HeartHandshake, title: 'Persönliche Beratung', text: 'Individuelle finanzielle Situationen verstehen und Kunden bei wichtigen Entscheidungen begleiten.' },
  { icon: ShieldCheck, title: 'Vertrauen und Verantwortung', text: 'Verantwortungsbewusst handeln und die Interessen unserer Kunden berücksichtigen.' },
  { icon: LineChart, title: 'Finanzmärkte und Investmentlösungen', text: 'Wirtschaftliche Entwicklungen verstehen und sich mit modernen Finanz- und Investmentlösungen beschäftigen.' },
  { icon: Sprout, title: 'Perspektiven und Weiterentwicklung', text: 'Neue Kenntnisse erwerben, vorhandene Erfahrungen einbringen und sich mit den Anforderungen der Finanzberatung auseinandersetzen.' },
];

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '');
