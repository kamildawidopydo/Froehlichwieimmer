const syms = [
  { t: 'AAC', m: 'US' },
  { t: 'BSP', m: 'US' },
  { t: 'CUX', m: 'US' },
  { t: 'MOT', m: 'US' },
  { t: 'LIME', m: 'US' },
  { t: 'ITG', m: 'US' },
  { t: 'ALLSF', m: 'EU' },
];

for (const { t, m } of syms) {
  const urls = [
    `https://img.stockanalysis.com/logos1/US/${t.toLowerCase()}.png`,
    `https://financialmodelingprep.com/image-stock/${t}.png`,
    `https://companiesmarketcap.com/img/company-logos/128/${t}.png`,
    `https://financialmodelingprep.com/image-stock/${t}.PA.png`,
    `https://financialmodelingprep.com/image-stock/${t}.DE.png`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { method: 'HEAD', redirect: 'follow' });
      const ct = r.headers.get('content-type') || '';
      console.log(t, r.status, ct.split(';')[0], u.slice(0, 70));
    } catch (e) {
      console.log(t, 'ERR', u.slice(0, 70));
    }
  }
  console.log('---');
}
