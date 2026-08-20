/**
 * Central marketing image paths — Fröhlich Vermögensberatung rebrand (local assets, no Unsplash).
 * Generated via scripts/generate-rebrand-marketing-images.mjs
 */

const m = (file) => `/assets/marketing/${file}`;
const p = (file) => `/assets/products/${file}`;
const c = (file) => `/assets/compliance/${file}`;
const b = (file) => `/assets/footer/benefits/${file}`;

export const siteImages = {
  icons: {
    bonusGift: '/assets/icons/bonus-gift.svg?v=4',
    bonusGiftJpg: '/assets/icons/bonus-gift.jpg?v=4',
    bonusGiftAlt: 'Willkommensbonus — Premium-Geschenk mit Euro-Zeichen',
  },
  hero: {
    banking: '/assets/hero-family-planning.jpg?v=15',
    bankingNight: '/assets/hero-family-planning.jpg?v=15',
    bankingAlt:
      'Deutsche Familie auf dem Sofa — sanftes Lächeln, realistisches Tablet, natürlich',
    bankingNightAlt:
      'Deutsche Familie auf dem Sofa — sanftes Lächeln, realistisches Tablet, natürlich',
  },

  home: {
    ctaGrowth: m('home-cta-growth.png?v=4'),
    ctaGrowthAlt:
      'Heller Schreibtisch mit Unterlagen vor Glasfassaden — Wachstum mit Überblick, Raisin-Stil',
    ctaBonusStrip: m('home-cta-bonus.png'),
    ctaBonusAlt: 'Kolleginnen und Kollegen im Gespräch — ungestellt und nahbar',
    processIcons: {
      chooseProduct: m('icons/process-choose-product.png'),
      answerQuestions: m('icons/process-answer-questions.png'),
      sendData: m('icons/process-send-data.png'),
      personalOffer: m('icons/process-personal-offer.png'),
    },
    flowIcons: {
      youAccount: m('icons/flow-you-account.png'),
      kapitalmitte: m('icons/flow-kapitalmitte.png'),
      partnerBanks: m('icons/flow-partner-banks.png'),
    },
  },

  about: {
    hero: m('about-hero.jpg?v=6'),
    heroAlt: 'Ruhiger Nordischer Küchenmorgen — Paar im Gespräch am Fenster, Vertrauen und Nähe',
    partner: m('about-partner.png?v=2'),
    partnerAlt: 'Partnerschaftliches Gespräch auf Augenhöhe — geteiltes Notizbuch, echte Aufmerksamkeit',
    leistung: m('about-leistung.png?v=2'),
    leistungAlt: 'Zwei Fachleute prüfen Produktmappen — ruhige, konzentrierte Zusammenarbeit',
    arbeitsweise: m('about-arbeitsweise.png?v=2'),
    arbeitsweiseAlt: 'Team annotiert Charts an einer Glaswand — transparente Arbeitsweise',
    standort: m('about-standort.png?v=2'),
    standortAlt: 'Frankfurt am Main bei Blauen Stunde — Skyline mit Alltag am Fluss',
  },

  security: {
    hero: m('security-hero.png'),
    heroAlt: 'Moderner Serverraum mit blauem Licht — Datensicherheit und Schutz',
    editorial: m('security-editorial.png'),
    editorialAlt: 'Schlosssymbol an Glasfassade — Vertrauen und Einlagensicherung',
  },

  howItWorks: {
    hero: m('how-it-works-hero.png'),
    heroAlt: 'Übersichtliche Finanzunterlagen auf hellem Schreibtisch',
    steps: [
      { src: m('how-it-works-step-1.png'), alt: 'Vergleich von Angeboten auf Papier und Bildschirm' },
      { src: m('how-it-works-step-2.png'), alt: 'Persönliches Beratungsgespräch in freundlicher Atmosphäre' },
      { src: m('how-it-works-step-3.png'), alt: 'Digitale Kontoeröffnung — strukturierter Prozess' },
      { src: m('how-it-works-step-4.png'), alt: 'Bestätigung und Übersicht nach erfolgreicher Eröffnung' },
    ],
  },

  savingsEducation: {
    hero: m('savings-education-hero.png'),
    heroAlt: 'Ordentlicher Schreibtisch mit Sparmappe — Steuern und Sparen planen',
    section1: m('savings-education-1.png?v=2'),
    section1Alt: 'Paar bespricht Finanzen am Küchentisch — ruhig, alltagsnah, ungestellt',
    section2: m('savings-education-2.png?v=2'),
    section2Alt: 'Zinsen kalkulieren am Schreibtisch — ehrlicher Close-up ohne Pose',
  },

  credit: {
    hero: '/assets/kredit-hero.png',
    heroAlt: 'Paar betritt neue Wohnung — Finanzierung und Aufbruch',
  },

  comparison: {
    hero: m('comparison-hero.png'),
    heroAlt: 'Europa-Karte mit markierten Standorten — grenzüberschreitender Sparvergleich',
  },

  spezialAif: {
    hero: m('spezial-aif-hero.jpg?v=3'),
    heroAlt: 'Reifes Paar genießt Meerblick — langfristige Vermögensplanung',
    strategy: m('spezial-aif-strategy.png?v=2'),
    strategyAlt: 'Fachkraft prüft Unterlagen am Fenster — Due Diligence ohne Pose',
    focusBackdrop: m('spezial-aif-focus.png'),
    focusBackdropAlt: 'Moderne Glasarchitektur — institutionelle Qualität',
    assetClasses: {
      re: m('spezial-aif-asset-re.png'),
      infra: m('spezial-aif-asset-infra.png'),
      debt: m('spezial-aif-asset-debt.png'),
      liq: m('spezial-aif-asset-liq.png'),
      other: m('spezial-aif-asset-other.png'),
    },
  },

  spezialAifPib: {
    goals: m('spezial-aif-pib-goals.png?v=2'),
    goalsAlt: 'Mehrgenerationen-Familie im Park — candid, nicht gestelltes Stock-Foto',
  },

  fondsGrundlagen: {
    bandInstitutional: {
      png: m('fg-band-sea.png'),
      alt: 'Klares tiefblaues Meer von oben — ruhige abstrakte Wasserfläche',
    },
    riskCalmOffice: {
      png: m('fg-calm-office.png'),
      alt: 'Helles aufgeräumtes Büro — strukturierte Arbeitsweise',
    },
    afterInvestTeam: {
      png: m('fg-team.png'),
      alt: 'Kolleginnen und Kollegen in konstruktiver Zusammenarbeit',
    },
    sparkontoPlanning: {
      png: m('fg-planning.png'),
      alt: 'Finanzplanung am Schreibtisch — Orientierung und Klarheit',
    },
    philosophieTogether: {
      png: m('fg-philosophy.png?v=2'),
      alt: 'Team mit gemeinsamem Fokus auf ein Dokument — Investmentphilosophie',
    },
  },

  products: {
    festgeld: {
      homeCard: p('festgeld-home-card.png'),
      hero: p('festgeld-hero.png'),
      lifestyle: p('festgeld-lifestyle.png'),
      cta: p('festgeld-cta.png'),
    },
    flexgeld: {
      homeCard: p('flexgeld-home-card.png'),
      hero: p('flexgeld-hero.png'),
      lifestyle: p('flexgeld-lifestyle.png'),
      cta: p('flexgeld-cta.png'),
    },
    tagesgeld: {
      homeCard: p('tagesgeld-home-card.png'),
      hero: p('tagesgeld-hero.png'),
      lifestyle: p('tagesgeld-lifestyle.png'),
      cta: p('tagesgeld-cta.png'),
    },
  },

  compliance: {
    customerTrain: c('customer-train.png'),
    journeyMirror: c('journey-mirror.png'),
    peaceHeadphones: c('peace-headphones.png'),
  },

  benefits: {
    beratung: b('persoenliche-beratung.png'),
    vergleich: b('kostenloser-vergleich.png'),
    sicherheit: b('tuv-sicherheit.png'),
    abwicklung: b('schnelle-abwicklung.png'),
  },
};

export default siteImages;
