import React from 'react';
import ThemenLandingLayout from './ThemenLandingLayout';

/**
 * Session 80.35 — /themen/ruhestand-vorsorge
 * Editorial-Landingpage für den kanonischen Topic-Slug `ruhestand-vorsorge`.
 * Registry-Mapping: strategy_categories=[altersvorsorge].
 */
const RuhestandVorsorgePage = () => (
  <ThemenLandingLayout
    slug="ruhestand-vorsorge"
    accent="amber"
    seo={{
      title: 'Ruhestand & Vorsorge | Fröhlich Vermögensberatung',
      description: 'Gesetzliche Rente, betriebliche und private Vorsorge im Überblick — Grundlagen und aktuelle Reformen langfristig einordnen.',
    }}
    hero={{
      kicker: 'Thema · Ruhestand & Vorsorge',
      headline: 'Heute planen. Morgen freier entscheiden.',
      intro: 'Wie die gesetzliche Rente, betriebliche und private Vorsorge ineinandergreifen, entscheidet für viele Menschen langfristig über den finanziellen Handlungsspielraum. Wir zeigen, welche Zusammenhänge tragen und welche aktuellen Reformen Auswirkungen haben können.',
      primaryCta: { label: 'Ruhestandsstrategie ansehen', href: '/strategie/altersvorsorge' },
    }}
    contextBlock={{
      kicker: 'Was verändert sich bei Rente & Vorsorge?',
      headline: 'Drei Zusammenhänge, die Ihre langfristige Planung prägen',
      points: [
        'Die Höhe der gesetzlichen Rente wird durch Beitragssatz, Rentenniveau und Renteneintrittsalter bestimmt — politische Reformen greifen typischerweise an mehreren dieser Stellschrauben gleichzeitig.',
        'Betriebliche und private Vorsorge federn Reformen der gesetzlichen Rente oft besser ab — die Wirkung entfaltet sich vor allem über lange Zeiträume.',
        'Eine tragfähige Ruhestandsplanung berücksichtigt neben der Rentenhöhe auch die Struktur der Auszahlung, Steuern und Inflation über einen Zeitraum von 20 bis 30 Jahren.',
      ],
    }}
    knowledgeLinks={[
      {
        href: '/finanzwissen/altersvorsorge',
        title: 'Altersvorsorge verstehen',
        description: 'Wie sich gesetzliche, betriebliche und private Vorsorge ergänzen — und welche Rolle jede Säule spielt.',
        cta: 'Grundlagen ansehen',
      },
      {
        href: '/inflation-und-vermoegensaufbau',
        title: 'Inflation & langfristiger Vermögensaufbau',
        description: 'Warum Inflation über Jahrzehnte hinweg der wichtigste Gegenspieler einer Ruhestandsplanung ist.',
        cta: 'Grundlagen ansehen',
      },
    ]}
    primaryOffer={{
      kicker: 'Nächste Schritte',
      title: 'Ihre Ruhestandsstrategie strukturiert entwickeln',
      body: 'Wir besprechen mit Ihnen die Bausteine einer tragfähigen Ruhestandsplanung — von der Analyse der Versorgungslücke bis zur strukturierten Umsetzung.',
      ctaLabel: 'Zur Ruhestandsstrategie',
      href: '/strategie/altersvorsorge',
      testId: 'themen-ruhestand-strategy',
    }}
    strategyLinks={[
      {
        href: '/strategie/altersvorsorge',
        title: 'Altersvorsorge strategisch aufbauen',
        description: 'Wie sich die drei Säulen der Altersvorsorge im Rahmen einer langfristigen Vermögensstruktur sinnvoll kombinieren lassen.',
      },
    ]}
    relatedTopics={[
      { label: 'Aktien & Kapitalmärkte', href: '/themen/aktien' },
      { label: 'Zinsen & Sparen', href: '/themen/zinsen-sparen' },
    ]}
  />
);

export default RuhestandVorsorgePage;
