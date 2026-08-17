/**
 * Kapitalmitte — Aktien & IPO Broschüre
 * Run: node scripts/generate-aktien-ipo-brochure.mjs [output-path]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'public/assets/documents/Kapitalmitte_Aktien_IPO_Broschuere.pdf');
const OUT = process.argv[2] || DEFAULT_OUT;
const LOGO_DIR = path.join(ROOT, 'public/assets');

const CONTACT = {
  company: 'Kapitalmitte',
  email: 'kundenservice@kapitalmitte.com',
  phone: '+49 74 568 549 983',
  site: 'kapitalmitte.com',
  street: 'Hallgartenstraße 57, 60389 Frankfurt am Main',
};

const TRUST_PILLARS = [
  { title: 'Persönliche Beratung', text: 'Individuelle Strategie durch erfahrene Anlageberater' },
  { title: 'Transparente Konditionen', text: 'Klare Gewinnbeteiligung ohne versteckte Gebühren' },
  { title: 'Premium-Zugang', text: 'Exklusive IPO-Vorabzuteilungen und Top-Aktien' },
  { title: 'Deutscher Service', text: 'Kundenservice Mo–Fr · 09:00 – 18:00 Uhr' },
];

const COMPANIES = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'IPO · Vorabzuteilung',
    ref: 'BR-AK-001',
    accent: '#10a37f',
    coupon: 12.0,
    logo: path.join(LOGO_DIR, 'ipo-logos/openai.svg'),
    logoUrl: null,
    ticker: '— (erwartet)',
    exchange: 'NASDAQ / NYSE',
    status: 'S-1 vertraulich eingereicht · Juni 2026',
    profile: { risiko: 'Hoch', horizont: 'Langfristig', mindestanlage: 'ab 25.000 €', liquiditaet: 'Vor IPO eingeschränkt' },
    metrics: [
      ['Bewertung (Series C)', '852 Mrd. USD'],
      ['Letzte Finanzierung', '122 Mrd. USD · März 2026'],
      ['Gesamtfinanzierung', 'über 180 Mrd. USD'],
      ['Sektor', 'Künstliche Intelligenz'],
      ['Hauptprodukte', 'ChatGPT, GPT-5, DALL·E, API'],
      ['Wöchentliche Nutzer', '900 Mio.+'],
      ['IPO-Fenster', 'Q4 2026 – 2027 (geschätzt)'],
      ['Sekundärmarkt-Preis', 'ca. 722 USD/Aktie (Forge)'],
      ['Geschätzter ARR', '> 20 Mrd. USD'],
      ['Wachstum Umsatz', '> 100 % p.a.'],
    ],
    investors: ['Microsoft', 'Nvidia', 'SoftBank', 'Amazon', 'Andreessen Horowitz', 'TPG', 'MGX', 'T. Rowe Price'],
    highlights: [
      'Marktführer bei generativer KI — ChatGPT mit 900 Mio.+ wöchentlichen Nutzern',
      'Vertrauliche S-1-Einreichung bei der SEC im Juni 2026',
      'Größter erwarteter Tech-IPO der Geschichte mit Zielbewertung bis 1 Billion USD',
      'Strategische Partnerschaften mit Microsoft Azure und Nvidia Rechenzentren',
      'Enterprise-API-Umsatz wächst exponentiell; Fortune-500-Kunden im Portfolio',
      'Breite institutionelle Investorenbasis signalisiert starkes IPO-Interesse',
    ],
    body: 'OpenAI definiert die KI-Revolution und gilt nach der vertraulichen S-1-Einreichung als einer der meist erwarteten Börsengänge aller Zeiten. Das Unternehmen vereint Consumer-Produkte (ChatGPT) mit einer skalierbaren Enterprise-API-Plattform. Über Kapitalmitte erhalten qualifizierte Anleger Zugang zu Vorabzuteilungen — bevor der breite Markt handeln kann.',
    analystNote: 'OpenAI dominiert den Consumer-KI-Markt, während der Wettbewerb mit Anthropic und Google zunimmt. Die Bewertung reflektiert enormes Wachstumspotenzial, birgt aber erhebliche Bewertungsrisiken.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'IPO · Vorabzuteilung',
    ref: 'BR-AK-002',
    accent: '#c4956a',
    coupon: 11.0,
    logo: path.join(LOGO_DIR, 'ipo-logos/anthropic.svg'),
    logoUrl: null,
    ticker: '— (erwartet)',
    exchange: 'NASDAQ (erwartet)',
    status: 'S-1 vertraulich eingereicht · 1. Juni 2026',
    profile: { risiko: 'Hoch', horizont: 'Langfristig', mindestanlage: 'ab 25.000 €', liquiditaet: 'Vor IPO eingeschränkt' },
    metrics: [
      ['Bewertung (Series H)', '965 Mrd. USD'],
      ['Letzte Finanzierung', '65 Mrd. USD · Mai 2026'],
      ['Gesamtfinanzierung', 'ca. 137 Mrd. USD'],
      ['Sektor', 'KI · Safety & Alignment'],
      ['Hauptprodukt', 'Claude (Opus, Sonnet, Haiku)'],
      ['ARR (geschätzt)', '47 Mrd. USD+'],
      ['IPO-Fenster', 'Herbst 2026 (geschätzt)'],
      ['Umsatzwachstum', 'Steilste Ramp-up in der Software-Geschichte'],
      ['Amazon-Investment', 'bis 8 Mrd. USD'],
      ['Google-Investment', 'ca. 3 Mrd. USD'],
    ],
    investors: ['Sequoia', 'Altimeter', 'Amazon', 'Google', 'Blackstone', 'Coatue', 'ICONIQ', 'Temasek', 'Fidelity'],
    highlights: [
      'Erstmals wertvoller als OpenAI — 965 vs. 852 Mrd. USD Bewertung',
      'Claude führt bei Enterprise-Coding und sicherheitskritischen Anwendungen',
      'Series H mit 65 Mrd. USD — einer der größten privaten Finanzierungsrunden',
      '15 Mrd. USD/Jahr SpaceX-Partnerschaft für Rechenzentrum-Infrastruktur',
      'Gründer Dario & Daniela Amodei (ehem. OpenAI) mit starker Governance',
      'Vertrauliche S-1-Einreichung einen Woche vor OpenAI',
    ],
    body: 'Anthropic steht für verantwortungsvolle KI-Entwicklung mit dem Claude-Modell. Das Unternehmen übertraf OpenAI erstmals bei der Bewertung und bereitet einen der bedeutendsten Tech-IPOs vor. Enterprise-Kunden schätzen Claudes Zuverlässigkeit bei komplexen Aufgaben. Kapitalmitte ermöglicht den Zugang mit attraktiver Gewinnbeteiligung.',
    analystNote: 'Anthropic profitiert vom Enterprise-Trend zu sicherer KI. Die Bewertung setzt auf anhaltendes Umsatzwachstum von über 100 % — ein ambitioniertes Szenario mit hohem Upside und Downside.',
  },
  {
    id: 'spacex',
    name: 'SpaceX',
    type: 'Aktie · NASDAQ',
    ref: 'BR-AK-003',
    accent: '#005288',
    coupon: 10.0,
    logo: null,
    logoUrl: 'https://financialmodelingprep.com/image-stock/SPCX.png',
    ticker: 'SPCX',
    exchange: 'NASDAQ',
    status: 'Börsennotiert seit 12. Juni 2026',
    profile: { risiko: 'Mittel–Hoch', horizont: 'Mittel–Langfristig', mindestanlage: 'ab 5.000 €', liquiditaet: 'Täglich handelbar' },
    metrics: [
      ['Aktienkurs', '162,00 USD (6. Juli 2026)'],
      ['Marktkapitalisierung', '2,11 Billionen USD'],
      ['IPO-Preis', '135,00 USD'],
      ['Emissionsvolumen', '85,7 Mrd. USD (Rekord)'],
      ['Umsatz 2025', '18,7 Mrd. USD (+33 %)'],
      ['Starlink-Umsatz 2025', '11,4 Mrd. USD'],
      ['Starlink-Abonnenten', '10,3 Mio.+ · 164 Länder'],
      ['Starlink EBITDA-Marge', '63 %'],
      ['Kursziel (Ø Analysten)', '202,42 USD (+23 %)'],
      ['Nasdaq-100 Aufnahme', '7. Juli 2026'],
    ],
    investors: ['Öffentlicher Markt', 'Goldman Sachs (Lead)', 'Morgan Stanley (Lead)', 'Retail ~30 %'],
    highlights: [
      'Größter Börsengang der Geschichte — 85,7 Mrd. USD Emissionsvolumen',
      'Starlink: einzig profitables Segment mit 63 % EBITDA-Marge',
      'Falcon 9 & Starship: marktführende wiederverwendbare Raketentechnologie',
      'Über 9.600 Satelliten — > 75 % aller aktiven LEO-Satelliten',
      'xAI-Integration stärkt KI-Infrastruktur-Ökosystem',
      'Massiver ETF-Zufluss durch Nasdaq-100-Aufnahme erwartet',
    ],
    body: 'SpaceX vereint Weltraumtransport und globale Konnektivität. Nach dem historischen IPO im Juni 2026 gehört SPCX zu den wertvollsten Unternehmen weltweit. Starlink finanziert die ambitionierte Mars-Vision, während die Raketensparte die Kosten pro Launch revolutioniert hat.',
    analystNote: 'Goldman Sachs Kursziel $217 vs. Morgan Stanley $150 — breite Spanne reflektiert Unsicherheit über Starship-Kosten und ARPU-Entwicklung bei Starlink.',
  },
  {
    id: 'nvda',
    name: 'NVIDIA',
    type: 'Aktie · NASDAQ',
    ref: 'BR-AK-004',
    accent: '#5a8f00',
    coupon: 9.5,
    logo: null,
    logoUrl: 'https://financialmodelingprep.com/image-stock/NVDA.png',
    ticker: 'NVDA',
    exchange: 'NASDAQ',
    status: 'Börsennotiert · Magnificent Seven',
    profile: { risiko: 'Mittel', horizont: 'Langfristig', mindestanlage: 'ab 5.000 €', liquiditaet: 'Täglich handelbar' },
    metrics: [
      ['Aktienkurs', '195,55 USD (6. Juli 2026)'],
      ['Marktkapitalisierung', '4,74 Billionen USD'],
      ['Sektor', 'Halbleiter · KI-Beschleuniger'],
      ['Umsatz (TTM)', 'über 130 Mrd. USD'],
      ['Datacenter-Anteil', '> 85 % des Umsatzes'],
      ['Dividende', '1,00 USD p.a. (0,51 %)'],
      ['52-Wochen-Performance', '+22,7 %'],
      ['Hauptprodukt', 'Blackwell GPU-Plattform'],
      ['KGV (Forward)', '~30x'],
      ['Beta', '2,21'],
    ],
    investors: ['Institutionelle Anleger', 'Indexfonds (S&P 500)', 'Strategische Partner (OpenAI, Microsoft)'],
    highlights: [
      'Dominanter KI-Chip-Lieferant — CUDA-Ökosystem als Burggraben',
      'Blackwell-Architektur treibt nächste Rechenzentrum-Generation',
      'Marktkapitalisierung übertrifft deutsches BIP',
      'Strategische Beteiligungen in OpenAI-Finanzierungsrunden',
      'Jensen Huang als visionärer CEO mit 30+ Jahren Branchenerfahrung',
      'Konstante Innovation trotz US-China-Exportbeschränkungen',
    ],
    body: 'NVIDIA ist das Rückgrat der künstlichen Intelligenz. Die Blackwell-Architektur treibt Rechenzentren weltweit an und macht NVDA zur unverzichtbaren Infrastruktur-Schicht des KI-Booms. Als Kernholding im Tech-Portfolio bietet NVIDIA Stabilität und Wachstum zugleich.',
    analystNote: 'NVDA bleibt der zentrale Profiteur des KI-Infrastruktur-Baus. Konzentrationsrisiko und Bewertung sind die Hauptrisikofaktoren — dennoch Top-Pick der meisten Analysten.',
  },
  {
    id: 'aapl',
    name: 'Apple',
    type: 'Aktie · NASDAQ',
    ref: 'BR-AK-005',
    accent: '#333333',
    coupon: 8.5,
    logo: null,
    logoUrl: 'https://financialmodelingprep.com/image-stock/AAPL.png',
    ticker: 'AAPL',
    exchange: 'NASDAQ',
    status: 'Börsennotiert · Dow Jones & S&P 500',
    profile: { risiko: 'Niedrig–Mittel', horizont: 'Langfristig', mindestanlage: 'ab 5.000 €', liquiditaet: 'Täglich handelbar' },
    metrics: [
      ['Aktienkurs', '314,00 USD (7. Juli 2026)'],
      ['Marktkapitalisierung', '4,59 Billionen USD'],
      ['Sektor', 'Technologie · Consumer Electronics'],
      ['Umsatz (FY2025)', 'ca. 400 Mrd. USD'],
      ['Services-Umsatz', 'über 100 Mrd. USD p.a.'],
      ['Aktive Geräte', '2,2 Mrd.+ weltweit'],
      ['Dividende', '0,34 % Rendite p.a.'],
      ['KGV (P/E)', '37,34'],
      ['Free Cashflow', 'über 100 Mrd. USD p.a.'],
      ['Aktienrückkäufe', 'Konsequentes Buyback-Programm'],
    ],
    investors: ['Berkshire Hathaway', 'Vanguard', 'BlackRock', 'State Street'],
    highlights: [
      'Wertvollstes Consumer-Tech-Unternehmen mit unvergleichlicher Markenloyalität',
      'Services-Ökosystem (App Store, iCloud, Apple Pay) mit hohen Margen',
      'Apple Intelligence integriert KI in iPhone, Mac und Vision Pro',
      'Starker Free Cashflow finanziert Dividenden und Rückkäufe',
      'Defensive Qualitätsaktie mit Tech-Wachstumspotenzial',
      'Globale Lieferkette und Retail-Präsenz in über 500 Stores',
    ],
    body: 'Apple verbindet Hardware-Exzellenz mit einem wachsenden Services-Ökosystem. Als defensive Tech-Qualitätsaktie ergänzt AAPL jedes diversifizierte Portfolio. Der Übergang zu einem Services-getriebenen Geschäftsmodell erhöht die Planbarkeit der Erträge.',
    analystNote: 'Apple bietet Stabilität in volatilen Märkten. iPhone-Umsatz stagniert, aber Services und Wearables kompensieren. KI-Integration ist der nächste Wachstumskatalysator.',
  },
  {
    id: 'googl',
    name: 'Alphabet (Google)',
    type: 'Aktie · NASDAQ',
    ref: 'BR-AK-006',
    accent: '#1a73e8',
    coupon: 9.0,
    logo: null,
    logoUrl: 'https://financialmodelingprep.com/image-stock/GOOGL.png',
    ticker: 'GOOGL',
    exchange: 'NASDAQ',
    status: 'Börsennotiert · Magnificent Seven',
    profile: { risiko: 'Mittel', horizont: 'Langfristig', mindestanlage: 'ab 5.000 €', liquiditaet: 'Täglich handelbar' },
    metrics: [
      ['Aktienkurs', '366,46 USD (6. Juli 2026)'],
      ['Marktkapitalisierung', '4,47 Billionen USD'],
      ['Sektor', 'Technologie · Suche & Cloud'],
      ['Umsatz (TTM)', 'über 350 Mrd. USD'],
      ['Google Cloud Wachstum', 'Zweistellig p.a.'],
      ['Dividende', '0,88 USD p.a. (0,24 %)'],
      ['52-Wochen-Performance', '+104,1 %'],
      ['Hauptprodukte', 'Search, Gemini, Cloud, YouTube'],
      ['YouTube-Nutzer', '2,7 Mrd.+ monatlich'],
      ['Waymo', 'Führendes autonomes Fahren (USA)'],
    ],
    investors: ['Vanguard', 'BlackRock', 'Fidelity', 'Larry Page & Sergey Brin'],
    highlights: [
      'Dominanz in Online-Suche mit über 90 % Marktanteil',
      'Gemini-KI als direkter Wettbewerber zu OpenAI und Anthropic',
      'Google Cloud wächst zweistellig — drittgrößter Cloud-Anbieter',
      'YouTube: Milliarden-Reichweite und wachsende Werbeeinnahmen',
      'Waymo: kommerzieller Robotaxi-Betrieb in mehreren US-Städten',
      'Starke Bilanz mit über 100 Mrd. USD Cash-Reserven',
    ],
    body: 'Alphabet vereint die weltweit größte Suchmaschine mit Cloud-Infrastruktur und KI-Forschung. GOOGL profitiert vom KI-Wachstum und bietet über Kapitalmitte Zugang mit attraktiver Gewinnbeteiligung. Die Diversifikation über Cloud, YouTube und Other Bets reduziert die Abhängigkeit von der Suche.',
    analystNote: 'Alphabet ist der stille KI-Gewinner: Gemini holt auf, Cloud beschleunigt, und die Bewertung bleibt unter den reinen KI-Playern. Antitrust-Risiken bleiben im Blick.',
  },
  {
    id: 'tsla',
    name: 'Tesla',
    type: 'Aktie · NASDAQ',
    ref: 'BR-AK-007',
    accent: '#c41e1e',
    coupon: 10.5,
    logo: null,
    logoUrl: 'https://financialmodelingprep.com/image-stock/TSLA.png',
    ticker: 'TSLA',
    exchange: 'NASDAQ',
    status: 'Börsennotiert · S&P 500',
    profile: { risiko: 'Hoch', horizont: 'Mittel–Langfristig', mindestanlage: 'ab 5.000 €', liquiditaet: 'Täglich handelbar' },
    metrics: [
      ['Aktienkurs', '419,77 USD (6. Juli 2026)'],
      ['Marktkapitalisierung', '1,58 Billionen USD'],
      ['Sektor', 'Elektromobilität · Energie · KI'],
      ['Umsatz (TTM)', '97,88 Mrd. USD'],
      ['Auslieferungen 2025', 'ca. 1,8 Mio. Fahrzeuge'],
      ['Supercharger-Stationen', '6.000+ weltweit'],
      ['52-Wochen-Performance', '+42,8 %'],
      ['Kursziel (Ø Analysten)', '460,00 USD (+9,6 %)'],
      ['Energy Storage', 'Wachstum > 50 % YoY'],
      ['KGV (Forward)', '~100x'],
    ],
    investors: ['Elon Musk (~13 %)', 'Vanguard', 'BlackRock', 'Baillie Gifford'],
    highlights: [
      'Marktführer bei Elektrofahrzeugen mit globaler Supercharger-Infrastruktur',
      'Energy Storage (Megapack) als schnell wachsendes Segment',
      'Full Self-Driving (FSD) und Robotaxi als zukünftige Wachstumstreiber',
      'Eng verbunden mit SpaceX-Ökosystem (Elon Musk)',
      'Gigafactories in USA, China, Deutschland und weiteren Standorten',
      'Optimus-Roboter und KI-Rechenzentrum als neue Optionen',
    ],
    body: 'Tesla definiert die Elektromobilität und expandiert in Energiespeicherung und autonomes Fahren. Als dynamische Wachstumsaktie bietet TSLA über Kapitalmitte Zugang mit erhöhter Gewinnbeteiligung. Die Bewertung reflektiert nicht nur Autos, sondern das gesamte Energie- und KI-Ökosystem.',
    analystNote: 'Tesla bleibt polarisierend: Bullen sehen Robotaxi und Energy, Bären die Margendruck im Kerngeschäft. Hohe Volatilität — geeignet für risikobewusste Wachstumsinvestoren.',
  },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function fetchLogoDataUrl(url, size = 80) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Kapitalmitte-PDF/1.0' } });
  if (!res.ok) throw new Error(`Logo fetch failed: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const png = await sharp(buf).resize(size, size, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function rasterizeSvg(svgPath, size = 80) {
  const buf = await fs.promises.readFile(svgPath);
  const png = await sharp(buf).resize(size, size, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function loadBrandLogo(height = 48) {
  const p = path.join(LOGO_DIR, 'logo/kapitalmitte-logo.png');
  const buf = await fs.promises.readFile(p);
  const png = await sharp(buf).resize(null, height, { fit: 'inside' }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

async function resolveLogo(company) {
  if (company.logo && fs.existsSync(company.logo)) {
    return rasterizeSvg(company.logo, 64);
  }
  if (company.logoUrl) {
    try {
      return await fetchLogoDataUrl(company.logoUrl, 64);
    } catch {
      return null;
    }
  }
  return null;
}

function pct(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function trustStripHtml() {
  return TRUST_PILLARS.map(
    (p) => `
    <div class="trust-item">
      <div class="trust-item-title">${p.title}</div>
      <div class="trust-item-text">${p.text}</div>
    </div>`,
  ).join('');
}

function companyPage(c, logoSrc) {
  const metricsRows = c.metrics
    .map(
      ([k, v]) => `
      <div class="metric-row">
        <span class="metric-key">${k}</span>
        <span class="metric-val">${v}</span>
      </div>`,
    )
    .join('');

  const highlights = c.highlights.map((h) => `<li>${h}</li>`).join('');
  const investors = c.investors.map((i) => `<span class="investor-tag">${i}</span>`).join('');

  const profileRows = Object.entries(c.profile)
    .map(([k, v]) => {
      const labels = { risiko: 'Risikoprofil', horizont: 'Anlagehorizont', mindestanlage: 'Mindestanlage', liquiditaet: 'Liquidität' };
      return `<div class="profile-cell"><span class="profile-key">${labels[k] || k}</span><span class="profile-val">${v}</span></div>`;
    })
    .join('');

  return `
  <div class="page company-page" style="--accent: ${c.accent}">
    <header class="page-header">
      <div class="header-left">
        <div class="logo-badge"><img src="{{BRAND}}" alt="Kapitalmitte"/></div>
        <span class="header-ref">${c.ref}</span>
      </div>
      <div class="header-right">
        <span class="header-site">${CONTACT.site}</span>
        <span class="header-date">Stand: Juli 2026</span>
      </div>
    </header>

    <div class="company-hero">
      <div class="hero-left">
        ${logoSrc ? `<div class="logo-frame"><img src="${logoSrc}" alt="${c.name}"/></div>` : ''}
        <div class="hero-text">
          <div class="company-type">${c.type}</div>
          <h2 class="company-name">${c.name}</h2>
          <div class="ticker-line">${c.ticker} · ${c.exchange}</div>
          <div class="status-pill">${c.status}</div>
        </div>
      </div>
      <div class="coupon-block">
        <div class="coupon-label">Gewinnbeteiligung</div>
        <div class="coupon-value">${pct(c.coupon)}<span class="coupon-unit">%</span></div>
        <div class="coupon-sub">p.a. über Kapitalmitte</div>
      </div>
    </div>

    <div class="profile-bar">${profileRows}</div>

    <div class="main-content">
      <div class="col-left">
        <div class="panel">
          <div class="panel-title">Kennzahlen &amp; Bewertung</div>
          <div class="metrics-list">${metricsRows}</div>
        </div>
        <div class="panel panel-investors">
          <div class="panel-title">Wichtige Investoren &amp; Partner</div>
          <div class="investor-tags">${investors}</div>
        </div>
      </div>
      <div class="col-right">
        <div class="panel">
          <div class="panel-title">Investment-These</div>
          <p class="narrative">${c.body}</p>
        </div>
        <div class="panel">
          <div class="panel-title">Highlights</div>
          <ul class="highlights">${highlights}</ul>
        </div>
        <div class="panel panel-analyst">
          <div class="panel-title">Markteinschätzung</div>
          <p class="analyst-note">${c.analystNote}</p>
        </div>
      </div>
    </div>

    <div class="why-br">
      <div class="why-br-label">Ihr Vorteil bei Kapitalmitte</div>
      <div class="why-br-text">
        Erwerben Sie <strong>${c.name}</strong> über uns und sichern Sie sich
        <strong>${pct(c.coupon)} % p.a. Gewinnbeteiligung</strong> — exklusiv für Kapitalmitte-Kunden.
        Wir begleiten Sie von der Beratung bis zur Ausführung.
      </div>
    </div>

    <div class="trust-strip">${trustStripHtml()}</div>

    <footer class="page-footer">
      <span>${CONTACT.email}</span>
      <span>${CONTACT.phone}</span>
      <span class="disclaimer">Kein Angebot · Alle Angaben ohne Gewähr</span>
    </footer>
  </div>`;
}

function coverPage() {
  return `
  <div class="page cover-page">
    <div class="cover-accent-top"></div>

    <div class="cover-inner">
      <div class="cover-logo-wrap">
        <img src="{{BRAND}}" alt="Kapitalmitte" class="cover-logo"/>
      </div>

      <div class="cover-main">
        <h1 class="cover-title">Aktien &amp; IPO<br/>Portfolio</h1>
        <div class="cover-rule"></div>
        <p class="cover-edition">Juli 2026</p>
      </div>
    </div>

    <div class="cover-footer">
      <span>${CONTACT.company}</span>
      <span class="cover-dot">·</span>
      <span>${CONTACT.site}</span>
    </div>
  </div>`;
}

function summaryPage() {
  const rows = COMPANIES.map(
    (c) => `
    <tr>
      <td class="sum-name">${c.name}</td>
      <td>${c.type.split('·')[0].trim()}</td>
      <td>${c.ticker}</td>
      <td>${c.profile.risiko}</td>
      <td class="sum-coupon">${pct(c.coupon)} %</td>
    </tr>`,
  ).join('');

  return `
  <div class="page summary-page">
    <header class="page-header">
      <div class="header-left">
        <div class="logo-badge"><img src="{{BRAND}}" alt="Kapitalmitte"/></div>
        <span class="header-ref">BR-AK-008</span>
      </div>
      <div class="header-right">
        <span class="header-site">${CONTACT.site}</span>
        <span class="header-date">Stand: Juli 2026</span>
      </div>
    </header>

    <h2 class="summary-title">Portfolioübersicht</h2>
    <p class="summary-intro">
      Erwerben Sie Aktien und IPO-Vorabzuteilungen über Kapitalmitte und profitieren Sie von einer
      exklusiven jährlichen Gewinnbeteiligung zwischen 8,0 % und 12,0 % — abhängig vom gewählten Wertpapier.
    </p>

    <table class="summary-table">
      <thead>
        <tr>
          <th>Unternehmen</th>
          <th>Typ</th>
          <th>Ticker</th>
          <th>Risiko</th>
          <th>Gewinnbeteiligung</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="cta-block">
      <h3>Persönliche Beratung vereinbaren</h3>
      <p>
        Unsere Experten beraten Sie individuell zu Zuteilung, Mindestanlage und zeitlicher Verfügbarkeit.
        Kontaktieren Sie uns — wir finden die optimale Strategie für Ihr Portfolio.
      </p>
      <div class="cta-contact">
        <strong>${CONTACT.company}</strong> · ${CONTACT.street}<br/>
        ${CONTACT.email} · ${CONTACT.phone} · Mo–Fr 09:00–18:00
      </div>
    </div>

    <div class="trust-strip">${trustStripHtml()}</div>

    <div class="legal-note">
      <strong>Wichtiger Hinweis:</strong> Diese Broschüre dient ausschließlich Informationszwecken und stellt
      weder eine Anlageberatung noch ein Angebot zum Erwerb oder Verkauf von Wertpapieren dar.
      Investitionen in Aktien und Vor-IPO-Zuteilungen sind mit erheblichen Risiken verbunden, einschließlich
      des vollständigen Verlusts des eingesetzten Kapitals. Vergangene Performance ist kein Indikator für
      zukünftige Ergebnisse. Die dargestellte Gewinnbeteiligung bezieht sich auf exklusive Konditionen im
      Rahmen von Kapitalmitte und kann je nach Marktlage und Verfügbarkeit variieren.
    </div>

    <footer class="page-footer">
      <span>© 2026 Kapitalmitte</span>
      <span>Frankfurt am Main · Berlin</span>
      <span class="disclaimer">Kein Angebot · Keine Anlageberatung</span>
    </footer>
  </div>`;
}

function buildHtml(brandLogo, companyLogos) {
  const companyPages = COMPANIES.map((c) => companyPage(c, companyLogos[c.id])).join('\n');
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>Kapitalmitte — Aktien &amp; IPO Portfolio</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
    color: #1a2a3a;
    font-size: 10.5px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    background: #f4f7fb;
    padding: 10mm 12mm 8mm;
    display: flex;
    flex-direction: column;
  }
  .page:last-child { page-break-after: auto; }

  /* ── Cover (minimal) ── */
  .cover-page {
    padding: 0;
    background: #fff;
    display: flex;
    flex-direction: column;
  }
  .cover-accent-top {
    height: 3px;
    background: linear-gradient(90deg, #0a3a5c 0%, #0a3a5c 70%, #d4a847 70%, #d4a847 100%);
    flex: 0 0 auto;
  }
  .cover-inner {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20mm 18mm;
    text-align: center;
  }
  .cover-logo-wrap {
    background: #fff;
    padding: 10px 20px;
    border-radius: 4px;
    margin-bottom: 22mm;
  }
  .cover-logo { height: 44px; display: block; }
  .cover-main { max-width: 140mm; }
  .cover-title {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 42px;
    font-weight: 700;
    color: #0a3a5c;
    line-height: 1.14;
    margin-bottom: 8mm;
    letter-spacing: -0.01em;
  }
  .cover-rule {
    width: 48px;
    height: 2px;
    background: #d4a847;
    margin: 0 auto 6mm;
  }
  .cover-edition {
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #8a9bb0;
    font-weight: 400;
  }
  .cover-footer {
    flex: 0 0 auto;
    padding: 6mm 14mm 10mm;
    text-align: center;
    font-size: 9px;
    color: #8a9bb0;
    letter-spacing: 0.03em;
  }
  .cover-dot { margin: 0 6px; color: #cdd8e5; }

  /* ── Shared header ── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5mm;
    padding-bottom: 4mm;
    border-bottom: 2px solid #0a3a5c;
    flex: 0 0 auto;
  }
  .header-left { display: flex; align-items: center; gap: 8px; }
  .logo-badge {
    background: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid #dde5ef;
    box-shadow: 0 1px 4px rgba(10,58,92,0.08);
  }
  .logo-badge img { height: 20px; display: block; }
  .header-ref { font-size: 7.5px; color: #8a9bb0; letter-spacing: 0.12em; }
  .header-right { text-align: right; display: flex; flex-direction: column; gap: 1px; }
  .header-site { font-size: 8px; color: #0a3a5c; font-weight: 600; }
  .header-date { font-size: 7.5px; color: #8a9bb0; }

  /* ── Company hero ── */
  .company-hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 4mm;
    padding: 4mm 5mm;
    background: #fff;
    border: 1px solid #dde5ef;
    border-radius: 6px;
    border-left: 4px solid var(--accent, #0a3a5c);
    flex: 0 0 auto;
  }
  .hero-left { display: flex; align-items: center; gap: 12px; }
  .logo-frame {
    width: 50px; height: 50px;
    background: #fff;
    border: 1px solid #e0e6ef;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    padding: 6px;
    flex-shrink: 0;
  }
  .logo-frame img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .company-type {
    font-size: 7.5px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent, #0a3a5c);
    font-weight: 600;
    margin-bottom: 2px;
  }
  .company-name {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 24px;
    font-weight: 700;
    color: #0a3a5c;
    line-height: 1.1;
    margin-bottom: 2px;
  }
  .ticker-line { font-size: 9.5px; color: #5a6f85; margin-bottom: 3px; }
  .status-pill {
    display: inline-block;
    font-size: 7.5px;
    padding: 2px 8px;
    background: #e8eef5;
    border-radius: 12px;
    color: #4a5f75;
    font-weight: 500;
  }
  .coupon-block {
    text-align: right;
    background: #0a3a5c;
    color: #fff;
    padding: 4mm 5mm;
    border-radius: 6px;
    min-width: 38mm;
  }
  .coupon-label {
    font-size: 7px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
    margin-bottom: 1px;
  }
  .coupon-value {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 30px;
    font-weight: 700;
    color: #d4a847;
    line-height: 1;
  }
  .coupon-unit { font-size: 16px; }
  .coupon-sub { font-size: 7.5px; color: rgba(255,255,255,0.5); margin-top: 1px; }

  /* ── Profile bar ── */
  .profile-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 3mm;
    margin-bottom: 4mm;
    flex: 0 0 auto;
  }
  .profile-cell {
    background: #fff;
    border: 1px solid #dde5ef;
    border-radius: 5px;
    padding: 3mm 4mm;
    text-align: center;
  }
  .profile-key {
    display: block;
    font-size: 7px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8a9bb0;
    margin-bottom: 1.5mm;
    font-weight: 500;
  }
  .profile-val {
    display: block;
    font-size: 10px;
    color: #0a3a5c;
    font-weight: 600;
  }

  /* ── Main content grid ── */
  .main-content {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 4mm;
    flex: 1 1 auto;
    min-height: 0;
    margin-bottom: 3mm;
  }
  .col-left, .col-right {
    display: flex;
    flex-direction: column;
    gap: 3mm;
    min-height: 0;
  }
  .panel {
    background: #fff;
    border: 1px solid #dde5ef;
    border-radius: 5px;
    padding: 3.5mm 4.5mm;
    flex: 1 1 auto;
  }
  .panel-investors { flex: 0 0 auto; }
  .panel-analyst { flex: 0 0 auto; }
  .panel-title {
    font-size: 7.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #0a3a5c;
    font-weight: 700;
    margin-bottom: 3mm;
    padding-bottom: 2mm;
    border-bottom: 1px solid #e8eef5;
  }
  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 1.8mm 0;
    border-bottom: 1px solid #f0f3f7;
    gap: 3mm;
  }
  .metric-row:last-child { border-bottom: none; }
  .metric-key { font-size: 9px; color: #5a6f85; flex: 0 0 52%; font-weight: 400; }
  .metric-val { font-size: 9px; color: #1a2a3a; font-weight: 600; text-align: right; flex: 1; }
  .narrative {
    font-size: 10px;
    color: #3a4f65;
    line-height: 1.6;
    font-weight: 400;
  }
  .highlights { list-style: none; padding: 0; }
  .highlights li {
    font-size: 9px;
    color: #3a4f65;
    line-height: 1.5;
    padding: 1.8mm 0 1.8mm 4mm;
    border-bottom: 1px solid #f0f3f7;
    position: relative;
  }
  .highlights li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 3.8mm;
    width: 3px;
    height: 3px;
    background: var(--accent, #0a3a5c);
    border-radius: 50%;
  }
  .highlights li:last-child { border-bottom: none; }
  .analyst-note {
    font-size: 9px;
    color: #5a6f85;
    line-height: 1.55;
    font-style: italic;
  }
  .investor-tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .investor-tag {
    font-size: 8px;
    padding: 2px 7px;
    background: #e8eef5;
    border-radius: 10px;
    color: #0a3a5c;
    font-weight: 500;
    border: 1px solid #cdd8e5;
  }

  /* ── Why BR strip ── */
  .why-br {
    background: linear-gradient(90deg, #0a3a5c, #123d66);
    color: #fff;
    border-radius: 5px;
    padding: 3.5mm 5mm;
    margin-bottom: 3mm;
    display: flex;
    align-items: center;
    gap: 5mm;
    flex: 0 0 auto;
  }
  .why-br-label {
    font-size: 7.5px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #d4a847;
    font-weight: 600;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  .why-br-text { font-size: 9.5px; color: rgba(255,255,255,0.85); line-height: 1.5; }
  .why-br-text strong { color: #d4a847; }

  /* ── Trust strip ── */
  .trust-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2.5mm;
    margin-bottom: 3mm;
    flex: 0 0 auto;
  }
  .trust-item {
    background: #fff;
    border: 1px solid #dde5ef;
    border-radius: 4px;
    padding: 2.5mm 3mm;
    text-align: center;
  }
  .trust-item-title {
    font-size: 7.5px;
    font-weight: 700;
    color: #0a3a5c;
    margin-bottom: 1mm;
  }
  .trust-item-text { font-size: 7px; color: #5a6f85; line-height: 1.4; }

  .page-footer {
    flex: 0 0 auto;
    margin-top: auto;
    padding-top: 2.5mm;
    border-top: 1px solid #dde5ef;
    display: flex;
    justify-content: space-between;
    font-size: 7px;
    color: #8a9bb0;
  }
  .disclaimer { font-style: italic; }

  /* ── Summary ── */
  .summary-title {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 22px;
    color: #0a3a5c;
    margin-bottom: 3mm;
    font-weight: 700;
  }
  .summary-intro {
    font-size: 10.5px;
    color: #4a5f75;
    line-height: 1.6;
    margin-bottom: 5mm;
    max-width: 165mm;
  }
  .summary-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 5mm;
    font-size: 9.5px;
    background: #fff;
    border: 1px solid #dde5ef;
    border-radius: 5px;
    overflow: hidden;
  }
  .summary-table th {
    text-align: left;
    font-size: 7.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #fff;
    background: #0a3a5c;
    font-weight: 600;
    padding: 2.5mm 3mm;
  }
  .summary-table td {
    padding: 2.5mm 3mm;
    border-bottom: 1px solid #f0f3f7;
    color: #3a4f65;
  }
  .sum-name { font-weight: 600; color: #0a3a5c; }
  .sum-coupon { color: #0a3a5c; font-weight: 700; }
  .cta-block {
    background: #fff;
    border: 1px solid #dde5ef;
    border-left: 4px solid #d4a847;
    border-radius: 5px;
    padding: 4.5mm 5.5mm;
    margin-bottom: 4mm;
  }
  .cta-block h3 {
    font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 14px;
    color: #0a3a5c;
    margin-bottom: 2mm;
    font-weight: 700;
  }
  .cta-block p { font-size: 10px; color: #4a5f75; line-height: 1.55; margin-bottom: 2.5mm; }
  .cta-contact { font-size: 9.5px; color: #3a4f65; line-height: 1.55; }
  .legal-note {
    font-size: 7px;
    color: #8a9bb0;
    line-height: 1.5;
    margin-bottom: 3mm;
  }
  .legal-note strong { color: #5a6f85; }
</style>
</head>
<body>
${coverPage()}
${companyPages}
${summaryPage()}
</body>
</html>`;

  return html.replaceAll('{{BRAND}}', brandLogo);
}

async function main() {
  await ensureDir(path.dirname(OUT));
  console.log('Logos werden geladen…');
  const brand = await loadBrandLogo(48);
  const companyLogos = {};
  for (const c of COMPANIES) {
    try {
      companyLogos[c.id] = await resolveLogo(c);
    } catch (e) {
      console.warn(`Logo für ${c.name} nicht verfügbar:`, e.message);
      companyLogos[c.id] = null;
    }
  }

  const html = buildHtml(brand, companyLogos);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();
  console.log('PDF erstellt:', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
