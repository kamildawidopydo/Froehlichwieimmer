import { GraduationCap, Repeat, Award, Sprout, Users, TrendingUp, Compass, BookOpen, Landmark } from 'lucide-react';

export const LEVEL_LABEL = {
  einsteiger: 'Berufseinsteiger',
  quereinsteiger: 'Quereinsteiger',
  erfahren: 'Berufserfahrene',
};

export const EMPLOYMENT_TYPES = ['Vollzeit', 'Teilzeit', 'Vollzeit oder Teilzeit', 'Freie Mitarbeit', 'Werkstudium', 'Praktikum'];

export const EXPERIENCE_OPTIONS = ['Keine Berufserfahrung', 'Unter 2 Jahre', '2–5 Jahre', '5–10 Jahre', 'Über 10 Jahre'];

export const CAREER_PATHS = [
  {
    slug: 'berufseinsteiger', level: 'einsteiger', icon: GraduationCap, image: '/assets/careers/einsteiger.jpg',
    title: 'Berufseinsteiger', claim: 'Entdecken Sie Perspektiven für Ihren Einstieg in die Finanzbranche.',
    intro: 'Sie haben Ihre Ausbildung oder Ihr Studium abgeschlossen und interessieren sich für die Finanzbranche? Hier erfahren Sie, wie ein Einstieg in die Beratung bei uns aussehen kann.',
    points: ['Strukturierte Einarbeitung mit festen Ansprechpartnern', 'Begleitung in echten Kundengesprächen', 'Schrittweise mehr Verantwortung', 'Fachliche Weiterbildung von Anfang an'],
  },
  {
    slug: 'quereinsteiger', level: 'quereinsteiger', icon: Repeat, image: '/assets/careers/quereinsteiger.jpg',
    title: 'Quereinsteiger', claim: 'Sie möchten sich beruflich neu orientieren? Lernen Sie unsere Tätigkeitsbereiche kennen.',
    intro: 'Sie bringen Erfahrung aus einer anderen Branche mit und suchen eine neue Herausforderung? Ihre Stärken im Umgang mit Menschen sind in der Beratung wertvoll.',
    points: ['Einstieg ohne klassischen Bankhintergrund', 'Begleitung beim Erwerb notwendiger Qualifikationen', 'Ihre bisherigen Erfahrungen zählen', 'Klare Entwicklungsschritte'],
  },
  {
    slug: 'berufserfahrene', level: 'erfahren', icon: Award, image: '/assets/careers/erfahrene.jpg',
    title: 'Berufserfahrene', claim: 'Bringen Sie Ihre Erfahrung und Ihre fachlichen Kompetenzen in ein anspruchsvolles Beratungsumfeld ein.',
    intro: 'Sie kennen die Finanzwelt und möchten Ihre Expertise in einem engagierten Team einbringen? Gestalten Sie mit der Fröhlich Vermögensberatung GmbH die Zukunft von Essence Invest.',
    points: ['Verantwortungsvolle Aufgaben', 'Raum für eigene Ideen', 'Perspektiven mit fachlicher oder Führungsverantwortung', 'Zusammenarbeit auf Augenhöhe'],
  },
];

export const CULTURE_CARDS = [
  { icon: Sprout, title: 'Persönliche Weiterentwicklung', text: 'Wir fördern Ihre Stärken und begleiten Sie mit regelmäßigem Feedback auf Ihrem Weg.' },
  { icon: Users, title: 'Zusammenarbeit im Team', text: 'Wir arbeiten offen, kollegial und unterstützen uns gegenseitig – gemeinsam erreichen wir mehr.' },
  { icon: TrendingUp, title: 'Karriereperspektiven', text: 'Mit wachsender Erfahrung eröffnen sich Ihnen neue Aufgaben und Verantwortungsbereiche.' },
  { icon: Compass, title: 'Eigenverantwortliches Arbeiten', text: 'Wir vertrauen Ihnen und geben Ihnen den Freiraum, Aufgaben selbstständig zu gestalten.' },
  { icon: BookOpen, title: 'Finanzwissen und Weiterbildung', text: 'Fachliche Schulungen helfen Ihnen, Ihr Wissen rund um Geldanlage und Finanzen stetig auszubauen.' },
  { icon: Landmark, title: 'Langfristige Perspektiven', text: 'Wir setzen auf nachhaltige Zusammenarbeit und möchten gemeinsam mit Ihnen wachsen.' },
];

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '');
