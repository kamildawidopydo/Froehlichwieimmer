// Central topic registry — must stay in sync with REVIEW_TOPICS in server.py
export const REVIEW_TOPICS = [
  { slug: 'persoenliche-betreuung', label: 'Persönliche Betreuung' },
  { slug: 'vertrauen', label: 'Vertrauen' },
  { slug: 'beratung', label: 'Beratung' },
  { slug: 'erreichbarkeit', label: 'Erreichbarkeit' },
  { slug: 'langfristigkeit', label: 'Langfristige Zusammenarbeit' },
  { slug: 'transparenz', label: 'Transparenz' },
  { slug: 'service', label: 'Service' },
  { slug: 'investmentuebersicht', label: 'Investment-Übersicht' },
];

export const TOPIC_LABEL = REVIEW_TOPICS.reduce((acc, t) => {
  acc[t.slug] = t.label;
  return acc;
}, {});
