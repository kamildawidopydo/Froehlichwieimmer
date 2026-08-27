import React from 'react';
import ThemenLandingLayout from './ThemenLandingLayout';

/**
 * Session 80.35 — /themen/zinsen-sparen
 * Editorial-Landingpage für den kanonischen Topic-Slug `zinsen-sparen`.
 * Registry-Mapping: strategy_categories=[schutz-steuerung], sparangebote=true.
 * Keine erfundenen Inhalte — Wissens- und Strategie-Links referenzieren nur
 * bestehende Routen.
 */
const ZinsenSparenPage = () => (
  <ThemenLandingLayout
    slug="zinsen-sparen"
    accent="petrol"
    seo={{
      title: 'Zinsen & Sparen | Fröhlich Vermögensberatung',
      description: 'Zinsen verstehen, Sparzinsen im aktuellen Umfeld neutral einordnen und aktuelle Angebote für Tagesgeld und Festgeld überblicken.',
    }}
    hero={{
      kicker: 'Thema · Zinsen & Sparen',
      headline: 'Zinsen verstehen. Chancen richtig einordnen.',
      intro: 'Die Zinsen für Tagesgeld, Festgeld und Sparanlagen bewegen sich seit einiger Zeit wieder deutlicher. Wir helfen Ihnen dabei, die aktuelle Lage neutral einzuordnen und im Kontext von Inflation, Einlagensicherung und Ihrer persönlichen Liquiditätsplanung zu bewerten.',
      primaryCta: { label: 'Sparangebote vergleichen', href: '/sparangebote' },
    }}
    contextBlock={{
      kicker: 'Was bedeutet die Zinslage für Sparer?',
      headline: 'Drei Zusammenhänge, die aktuell besonders wichtig sind',
      points: [
        'Tagesgeld-Konditionen reagieren häufig schneller auf veränderte Leitzinsen als andere Sparformen — die Ranglisten der Anbieter können sich in kurzer Zeit deutlich verschieben.',
        'Festgeld kann Planungssicherheit über einen definierten Zeitraum bieten — im Gegenzug ist das Kapital während der Laufzeit gebunden.',
        'Für die reale Verzinsung zählt die Differenz zwischen Nominalzins und Inflationsrate — nicht der reine Zinssatz auf der Werbetafel.',
      ],
    }}
    knowledgeLinks={[
      {
        href: '/inflation-und-vermoegensaufbau',
        title: 'Inflation & Vermögensaufbau',
        description: 'Warum die Inflationsrate für die reale Rendite jeder Spar- und Anlageform entscheidend ist.',
        cta: 'Grundlagen ansehen',
      },
      {
        href: '/fonds-grundlagen',
        title: 'Anlageklassen im Überblick',
        description: 'Wie sich Sparformen, Anleihen und Fonds hinsichtlich Sicherheit, Verfügbarkeit und Renditepotenzial unterscheiden.',
        cta: 'Grundlagen ansehen',
      },
    ]}
    primaryOffer={{
      kicker: 'Passend zum Thema',
      title: 'Aktuelle Sparangebote im Überblick',
      body: 'Vergleichen Sie neutrale, transparente Konditionen für Tagesgeld und Festgeld — inklusive Hinweisen zur Einlagensicherung und den wichtigsten Bedingungen.',
      ctaLabel: 'Zu den Sparangeboten',
      href: '/sparangebote',
      testId: 'themen-sparangebote',
    }}
    strategyLinks={[
      {
        href: '/strategie/schutz-steuerung',
        title: 'Vermögen schützen & steuern',
        description: 'Wie sich Liquidität, Sicherheit und ertragsorientierte Bausteine strukturell aufeinander abstimmen lassen.',
      },
    ]}
    relatedTopics={[
      { label: 'Anleihen & Zinsen', href: '/themen/anleihen' },
      { label: 'Ruhestand & Vorsorge', href: '/themen/ruhestand-vorsorge' },
    ]}
  />
);

export default ZinsenSparenPage;
