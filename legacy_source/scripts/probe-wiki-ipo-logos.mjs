const companies = [
  'Ares Acquisition Corporation',
  'Bending Spoons',
  'CopperTech Metals',
  'MetaOptics',
  'Anduril Industries',
  'Neutron Holdings',
  'ITG, Inc.',
];

for (const name of companies) {
  const q = encodeURIComponent(name);
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${q}`, {
    headers: { 'User-Agent': 'Kapitalmitte/1.0' },
  });
  const j = await r.json();
  const img = j.thumbnail?.source || j.originalimage?.source;
  console.log(name, r.status, img?.slice(0, 90) || 'none');
}
