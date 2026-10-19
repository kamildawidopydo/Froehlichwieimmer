// Registry for Rohstoff / Index snapshot detail pages.

export const ROHSTOFF_INSTRUMENTS = [
  {
    slug: 'gold',
    symbol: 'GC=F',
    label: 'Goldpreis',
    title: 'Goldpreis',
    section: 'Edelmetalle',
    newsCategory: 'rohstoffe',
    currency: 'USD',
    unit: 'je Feinunze',
    about:
      'Gold zählt seit Jahrtausenden zu den wichtigsten Reserve- und Anlageanlagen. Der Spotpreis wird an den internationalen Terminmärkten in US-Dollar je Feinunze gehandelt.',
  },
  {
    slug: 'palladium',
    symbol: 'PA=F',
    label: 'Palladiumpreis',
    title: 'Palladiumpreis',
    section: 'Edelmetalle',
    newsCategory: 'rohstoffe',
    currency: 'USD',
    unit: 'je Feinunze',
    about:
      'Palladium wird vor allem in der Autoindustrie für Katalysatoren genutzt und gehört zu den Platingruppenmetallen.',
  },
  {
    slug: 'platin',
    symbol: 'PL=F',
    label: 'Platinpreis',
    title: 'Platinpreis',
    section: 'Edelmetalle',
    newsCategory: 'rohstoffe',
    currency: 'USD',
    unit: 'je Feinunze',
    about:
      'Platin ist ein seltenes Edelmetall mit hoher industrieller Nachfrage, insbesondere in der Schmuck- und Autokatalysator-Produktion.',
  },
  {
    slug: 'silber',
    symbol: 'SI=F',
    label: 'Silberpreis',
    title: 'Silberpreis',
    section: 'Edelmetalle',
    newsCategory: 'rohstoffe',
    currency: 'USD',
    unit: 'je Feinunze',
    about:
      'Silber verbindet Eigenschaften als Edelmetall und Industriemetall und wird in Elektronik, Photovoltaik und als Anlageform gehandelt.',
  },
  {
    slug: 'erdgas',
    symbol: 'NG=F',
    label: 'Erdgaspreis',
    title: 'Erdgaspreis',
    section: 'Energie',
    newsCategory: 'rohstoffe',
    currency: 'USD',
    unit: 'je MMBtu',
    about:
      'Erdgas ist ein zentraler Energieträger für Stromerzeugung, Heizung und Industrie. Die Futures an der NYMEX sind ein wichtiger Referenzpreis.',
  },
  {
    slug: 'oel',
    symbol: 'CL=F',
    label: 'Ölpreis (WTI)',
    title: 'Ölpreis (WTI)',
    section: 'Energie',
    newsCategory: 'rohstoffe',
    currency: 'USD',
    unit: 'je Barrel',
    about:
      'WTI (West Texas Intermediate) ist einer der wichtigsten Referenzpreise für Rohöl weltweit und wird an der NYMEX gehandelt.',
  },
];

export const INDEX_INSTRUMENTS = [
  {
    slug: 'dax',
    symbol: '^GDAXI',
    label: 'DAX',
    title: 'DAX',
    section: 'Europa',
    newsCategory: 'aktien',
    currency: 'EUR',
    unit: 'Punkte',
    about:
      'Der DAX bildet die Entwicklung der 40 größten deutschen Unternehmen nach Marktkapitalisierung und Börsenumsatz ab.',
  },
  {
    slug: 'tecdax',
    symbol: '^TECDAX',
    label: 'TecDAX',
    title: 'TecDAX',
    section: 'Europa',
    newsCategory: 'aktien',
    currency: 'EUR',
    unit: 'Punkte',
    about:
      'Der TecDAX umfasst die 30 größten Technologiewerte im Prime Standard der Frankfurter Wertpapierbörse.',
  },
  {
    slug: 'euro-stoxx-50',
    symbol: '^STOXX50E',
    label: 'Euro Stoxx 50',
    title: 'Euro Stoxx 50',
    section: 'Europa',
    newsCategory: 'aktien',
    currency: 'EUR',
    unit: 'Punkte',
    about:
      'Der EURO STOXX 50 repräsentiert die 50 größten Unternehmen der Eurozone nach Marktkapitalisierung.',
  },
  {
    slug: 'dow-jones',
    symbol: '^DJI',
    label: 'Dow Jones',
    title: 'Dow Jones Industrial Average',
    section: 'USA',
    newsCategory: 'aktien',
    currency: 'USD',
    unit: 'Punkte',
    about:
      'Der Dow Jones Industrial Average ist einer der ältesten und bekanntesten US-Aktienindizes mit 30 großen Unternehmen.',
  },
  {
    slug: 'nasdaq',
    symbol: '^IXIC',
    label: 'Nasdaq',
    title: 'Nasdaq Composite',
    section: 'USA',
    newsCategory: 'aktien',
    currency: 'USD',
    unit: 'Punkte',
    about:
      'Der Nasdaq Composite bildet alle an der Nasdaq gelisteten Aktien ab und ist stark von Technologiewerten geprägt.',
  },
  {
    slug: 'sp-500',
    symbol: '^GSPC',
    label: 'S&P 500',
    title: 'S&P 500',
    section: 'USA',
    newsCategory: 'aktien',
    currency: 'USD',
    unit: 'Punkte',
    about:
      'Der S&P 500 umfasst 500 der größten börsennotierten US-Unternehmen und gilt als Leitindex für den US-Aktienmarkt.',
  },
];

export const DETAIL_CHART_RANGES = [
  { id: '1d', label: 'Intraday' },
  { id: '7d', label: '1W' },
  { id: '1mo', label: '1M' },
  { id: '3mo', label: '3M' },
  { id: '1y', label: '1J' },
  { id: '3y', label: '3J' },
  { id: '5y', label: '5J' },
];

export const getRohstoffInstrument = (slug) =>
  ROHSTOFF_INSTRUMENTS.find((i) => i.slug === slug) ?? null;

export const getIndexInstrument = (slug) =>
  INDEX_INSTRUMENTS.find((i) => i.slug === slug) ?? null;

export const getInstrument = (type, slug) => {
  if (type === 'rohstoff') return getRohstoffInstrument(slug);
  if (type === 'index') return getIndexInstrument(slug);
  return null;
};

export const snapshotPath = (type, slug) => `/news/markt/${type}/${slug}`;

export const overviewPath = (type) =>
  type === 'rohstoff' ? '/news/rohstoffcharts' : '/news';

export const ROHSTOFF_CHART_SECTIONS = ROHSTOFF_INSTRUMENTS.reduce((acc, item) => {
  let group = acc.find((g) => g.title === item.section);
  if (!group) {
    group = { title: item.section, items: [] };
    acc.push(group);
  }
  group.items.push({
    slug: item.slug,
    symbol: item.symbol,
    label: item.label,
  });
  return acc;
}, []);
