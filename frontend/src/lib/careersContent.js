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
    title: 'Berufseinsteiger', claim: 'Starte deine Karriere in der Finanzwelt.',
    intro: 'Du hast deine Ausbildung oder dein Studium abgeschlossen und möchtest in der Finanzbranche durchstarten? Bei uns lernst du die Beratung von Grund auf kennen.',
    points: ['Strukturierte Einarbeitung mit festen Ansprechpartnern', 'Begleitung in echten Kundengesprächen', 'Schrittweise mehr Verantwortung', 'Fachliche Weiterbildung von Anfang an'],
  },
  {
    slug: 'quereinsteiger', level: 'quereinsteiger', icon: Repeat, image: '/assets/careers/quereinsteiger.jpg',
    title: 'Quereinsteiger', claim: 'Entdecke neue berufliche Perspektiven.',
    intro: 'Du bringst Erfahrung aus einer anderen Branche mit und suchst eine neue Herausforderung? Deine Stärken im Umgang mit Menschen sind bei uns gefragt.',
    points: ['Einstieg ohne klassischen Bankhintergrund', 'Begleitung beim Erwerb notwendiger Qualifikationen', 'Deine bisherigen Erfahrungen zählen', 'Klare Entwicklungsschritte'],
  },
  {
    slug: 'berufserfahrene', level: 'erfahren', icon: Award, image: '/assets/careers/erfahrene.jpg',
    title: 'Berufserfahrene', claim: 'Bringe deine Erfahrung ein und entwickle dich weiter.',
    intro: 'Du kennst die Finanzwelt und möchtest deine Expertise in einem engagierten Team einbringen? Gestalte mit uns die Zukunft von Essence Invest.',
    points: ['Verantwortungsvolle Aufgaben', 'Raum für eigene Ideen', 'Perspektiven mit fachlicher oder Führungsverantwortung', 'Zusammenarbeit auf Augenhöhe'],
  },
];

export const CULTURE_CARDS = [
  { icon: Sprout, title: 'Persönliche Weiterentwicklung', text: 'Wir fördern deine Stärken und begleiten dich mit regelmäßigem Feedback auf deinem Weg.' },
  { icon: Users, title: 'Zusammenarbeit im Team', text: 'Wir arbeiten offen, kollegial und unterstützen uns gegenseitig – gemeinsam erreichen wir mehr.' },
  { icon: TrendingUp, title: 'Karriereperspektiven', text: 'Mit wachsender Erfahrung eröffnen sich dir neue Aufgaben und Verantwortungsbereiche.' },
  { icon: Compass, title: 'Eigenverantwortliches Arbeiten', text: 'Wir vertrauen dir und geben dir den Freiraum, Aufgaben selbstständig zu gestalten.' },
  { icon: BookOpen, title: 'Finanzwissen und Weiterbildung', text: 'Fachliche Schulungen helfen dir, dein Wissen rund um Geldanlage und Finanzen stetig auszubauen.' },
  { icon: Landmark, title: 'Langfristige Perspektiven', text: 'Wir setzen auf nachhaltige Zusammenarbeit und möchten gemeinsam mit dir wachsen.' },
];

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '');
