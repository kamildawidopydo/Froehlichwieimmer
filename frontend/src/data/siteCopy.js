/**
 * Central marketing copy — kapital-direkt24.de.
 * Formal-warm German tone; Nähe + Internationalität.
 */

import {
  savingsCopy,
  calculatorCopy,
  homeCtaCopy,
  faqCopy,
  socialCopy,
} from '@/data/siteCopyPhase5';

export const siteCopy = {
  brand: {
    name: 'Fröhlich Vermögensberatung',
    legalName: 'Fröhlich Vermögensberatung GmbH',
  },

  hero: {
    titleLine1: 'Ihre Investments.',
    titleLine2: 'Alle Banken.',
    titleLine3: 'Eine Plattform.',
    lede:
      'Wir sind ein großes Unternehmen, das mit über 100 führenden europäischen Banken zusammenarbeitet.',
    lede2:
      'Über unsere Plattform steuern Sie alle Investments – einfach, sicher und an einem Ort.',
    ctaEyebrow: 'Unternehmen',
    ctaLabel: 'Über Fröhlich Vermögensberatung',
    imageAlt:
      'Deutsche Familie auf dem Sofa — sanftes Lächeln, realistisches Tablet, natürlich',
    imageAltNight:
      'Deutsche Familie auf dem Sofa — sanftes Lächeln, realistisches Tablet, natürlich',
    glanceTitle: 'Ihre Investments auf einen Blick',
    glanceFooter: 'Alle Konten. Alle Banken. Eine Plattform.',
    glanceItems: [
      'Tagesgeld',
      'Flexgeld',
      'Festgeld',
      'Aktien & ETFs',
      'Fonds',
      'Anleihen',
    ],
  },

  brandSlogan: {
    title: 'Fröhlich Vermögensberatung | Ihre Investments. Alle Banken. Eine Plattform.',
    description:
      'Tagesgeld, Festgeld & mehr bei über 100 europäischen Banken – auf einer Plattform vergleichen und verwalten. Sicher, übersichtlich und unverbindlich mit Fröhlich Vermögensberatung.',
  },

  homePlatform: {
    titleLine1: 'Ein Login.',
    titleLine2: 'Alle Investments.',
    ledeStrong: 'Verwalten Sie sämtliche Kapitalanlagen über eine einzige Oberfläche.',
    lede:
      'Ob Tagesgeld, Festgeld, Flexgeld, Aktien, Anleihen oder Fonds – Fröhlich Vermögensberatung ermöglicht Ihnen eine strukturierte Übersicht über Ihre Investments und Bankverbindungen. Behalten Sie Ihr Vermögen, Ihre Liquidität und Ihre Anlageentscheidungen jederzeit im Blick.',
    tagline: 'Alle Banken. Alle Investments. Eine Plattform.',
  },

  footer: {
    sloganMain: 'Nähe und Internationalität —',
    sloganAccent: 'für Ihre finanzielle Freiheit.',
    lede:
      'Gemeinsam verbinden wir Nähe und Internationalität – für Ihre finanzielle Freiheit und eine sichere Zukunft. Lokale Betreuung in Deutschland, europäische Partnerstärke.',
    securityBadge: 'Bankentaugliche Sicherheit · TLS 1.3',
    regulatedHeading: 'REGULIERT & GESCHÜTZT',
    copyright: (year) => `© ${year} Fröhlich Vermögensberatung GmbH · Alle Rechte vorbehalten.`,
    benefitsAriaLabel: 'Ihre Vorteile bei Fröhlich Vermögensberatung',
  },

  benefits: [
    {
      icon: '/assets/footer/benefits/persoenliche-beratung.png',
      title: 'Individuelle Betreuung',
      body: 'Persönliche Unterstützung durch erfahrene Ansprechpartner — von der ersten Anfrage bis zur Kontoeröffnung.',
    },
    {
      icon: '/assets/footer/benefits/kostenloser-vergleich.png',
      title: 'Unverbindlicher Vergleich',
      body: 'Unser Anlagenvergleich ist für Sie kostenfrei, transparent und ohne versteckte Verpflichtungen.',
    },
    {
      icon: '/assets/footer/benefits/tuv-sicherheit.png',
      title: 'TÜV-geprüfte Sicherheit',
      body: 'Zertifizierter Datenschutz und geprüfte Systeme — für ein beruhigendes Gefühl bei jeder Anfrage.',
    },
    {
      icon: '/assets/footer/benefits/schnelle-abwicklung.png',
      title: 'Digitale Abwicklung',
      body: 'Schnelle Bearbeitung und unkomplizierte Kontoeröffnung bei vielen Partnerbanken — in der Regel innerhalb weniger Tage.',
    },
  ],

  nav: {
    groups: [
      {
        id: 'angebote',
        label: 'Angebote',
        links: [
          { name: 'Sparvergleich', path: '/comparison', desc: 'Festgeld, Tagesgeld und Flexgeld im Überblick' },
          { name: 'Kredit', path: '/kredit', desc: 'Kreditangebote strukturiert vergleichen' },
          { name: 'Spezial-AIF', path: '/spezial-aif', desc: 'Fondsprofil und Anlagestrategie' },
          { name: 'Festgeld', path: '/produkte/festgeld', desc: savingsCopy.guides.festgeld.cardLede },
          { name: 'Flexgeld', path: '/produkte/flexgeld', desc: savingsCopy.guides.flexgeld.cardLede },
          { name: 'Tagesgeld', path: '/produkte/tagesgeld', desc: savingsCopy.guides.tagesgeld.cardLede },
        ],
      },
      {
        id: 'strategie',
        label: 'Strategie',
        links: [
          { name: 'Strategie-Hub', path: '/strategie', desc: 'Anlagestile, Nachhaltigkeit, Vorsorge und Generationen' },
          { name: 'Anlagestile', path: '/strategie/anlagestile', desc: 'Value Investing und Dividendenstrategien' },
          { name: 'Nachhaltigkeit', path: '/strategie/nachhaltigkeit', desc: 'ESG-Investments und Impact Investing' },
          { name: 'Schutz & Steuerung', path: '/strategie/schutz-steuerung', desc: 'Vermögensschutz, Inflationsschutz, Aufbau' },
          { name: 'Altersvorsorge', path: '/strategie/altersvorsorge', desc: 'Gesetzlich, privat und betrieblich verzahnen' },
          { name: 'Generationen', path: '/strategie/generationen', desc: 'Für Kinder aufbauen, Vermögen übertragen' },
        ],
      },
      {
        id: 'wissen',
        label: 'Wissen',
        links: [
          { name: 'Wissen & Perspektiven', path: '/wissen', desc: 'Ratgeber zu Sparen, Anlageklassen und Planung' },
          { name: 'Investment & Börse', path: '/handeln', desc: 'Grundlagen, Orderarten und Börsen-ABC im Wissenshub' },
          { name: 'Investmentthemen', path: '/themen', desc: 'Aktien, Anleihen und Dividenden im Fokus' },
          { name: 'Fonds-Grundlagen', path: '/fonds-grundlagen', desc: 'Wie ein Fonds funktioniert — verständlich erklärt' },
          { name: 'So funktioniert es', path: '/how-it-works', desc: 'Der Ablauf in vier übersichtlichen Schritten' },
          { name: 'Rechner', path: '/calculator', desc: 'Zinserträge und Laufzeiten berechnen' },
          { name: 'Sicherheit', path: '/security', desc: 'EU-Einlagensicherung und Schutzmechanismen' },
          { name: 'Compliance', path: '/compliance', desc: 'Aufsicht, Regulierung und Transparenz' },
          { name: 'Steuern', path: '/savings-education', desc: 'Sparen und Besteuerung verständlich erklärt' },
          { name: 'FAQ', path: '/faq', desc: 'Antworten auf häufig gestellte Fragen' },
        ],
      },
      {
        id: 'unternehmen',
        label: 'Unternehmen',
        links: [
          { name: 'Dokumente', path: '/dokumente', desc: 'PDFs und Unterlagen zum Download', accent: true },
          { name: 'Über uns', path: '/about', desc: 'Wer wir sind und wofür wir stehen' },
          { name: 'Philosophie', path: '/philosophie', desc: 'Unsere Grundsätze und unser Anlageansatz' },
          { name: 'Leistungen', path: '/leistungen', desc: 'Sparen, Vermögensaufbau und Beratung' },
          { name: 'Kontakt', path: '/contact', desc: 'Beratung, Support und Erreichbarkeit' },
        ],
      },
    ],
    news: {
      name: 'News & Märkte',
      path: '/news',
      desc: 'Aktuelle Meldungen, Marktdaten und unsere Einschätzungen',
    },
    actions: {
      formular: 'Formular',
      upload: 'Dokument hochladen',
      uploadShort: 'Upload',
      login: 'Anmelden',
      register: 'Konto eröffnen',
      registerShort: 'Konto',
      dashboard: 'Dashboard',
      onboarding: 'Onboarding',
      logout: 'Abmelden',
      search: 'Suchen',
      menu: 'Menü',
    },
  },

  home: {
    productsEyebrow: 'Angebote · Kuratiert · Transparent · Europäisch',
    productsTitle: 'Produktüberblick',
    productsLede:
      'Ein klar strukturiertes Raster für fundierte Entscheidungen — mit derselben Sorgfalt, die Sie von einer etablierten Vermittlung erwarten.',
    productTiles: [
      {
        slug: 'anleihen',
        title: 'Anleihen',
        href: '/handeln',
        lede:
          'Staats- und Unternehmensanleihen im Depot — Laufzeit, Kupon und Liquidität auf einen Blick.',
        points: ['Kupon und Laufzeit nachvollziehbar', 'Risiko als Kennzahl sichtbar', 'Handel unter Bankenstandard'],
        cta: 'Mehr erfahren',
        testId: 'home-product-anleihen',
      },
      {
        slug: 'aktien',
        title: 'Aktien',
        href: '/handeln',
        lede:
          'Direktinvestments in Einzelwerte — mit transparentem Order- und Positionsüberblick.',
        points: ['Echtzeitkurse und Charts', 'Watchlisten und Alerts', 'Handel ohne Ablenkung'],
        cta: 'Mehr erfahren',
        testId: 'home-product-aktien',
      },
      {
        slug: 'weitere',
        title: 'Kreditvergleich mit Partnerkonditionen',
        href: '/kredit',
        lede:
          'Kreditvergleich und ergänzende Spar- und Anlageformen — durchgängig bei regulierten Instituten.',
        points: ['Konditionen im direkten Vergleich', 'Verwendungszwecke sauber dokumentiert', 'Weitere Banken im Partnernetzwerk'],
        cta: 'Mehr erfahren',
        testId: 'home-product-weitere',
      },
    ],
  },

  savings: savingsCopy,
  calculator: calculatorCopy,
  homeCta: homeCtaCopy,
  faq: faqCopy,
  social: socialCopy,

  footerNav: {
    products: [
      { to: '/comparison', label: 'Sparvergleich' },
      { to: '/partner-banks', label: 'Partnerbanken' },
      { to: '/kredit', label: 'Kredit' },
      { to: '/handeln', label: 'Handeln' },
      { to: '/spezial-aif', label: 'Spezial-AIF' },
    ],
    company: [
      { to: '/dokumente', label: 'Dokumente', accent: true, desc: 'PDFs zum Download' },
      { to: '/news', label: 'News' },
      { to: '/about', label: 'Über uns' },
      { to: '/philosophie', label: 'Philosophie' },
      { to: '/leistungen', label: 'Leistungen' },
      { to: '/wissen', label: 'Wissen' },
      { to: '/how-it-works', label: "So funktioniert's" },
      { to: '/calculator', label: 'Zinsrechner' },
      { to: '/security', label: 'Sicherheit' },
      { to: '/compliance', label: 'Compliance' },
      { to: '/savings-education', label: 'Sparen erklärt' },
      { to: '/faq', label: 'FAQ' },
      { to: '/contact', label: 'Kontakt' },
    ],
    legal: [
      { to: '/legal/impressum', label: 'Impressum' },
      { to: '/legal/privacy', label: 'Datenschutz' },
      { to: '/legal/terms', label: 'AGB' },
      { to: '/legal/disclaimer', label: 'Haftungsausschluss' },
      { to: '/legal/revocation', label: 'Widerruf' },
    ],
  },
};

export default siteCopy;
