/**
 * Inspect Raisin API entry fields for flex/cancellation products.
 */
const API =
  'https://api2.weltsparen.de/dcms/v1/public/products?distribution_channel_id=raisin_direct_retail_deu&distributor_id=Raisin&limit=500';

const data = await fetch(API, { headers: { Accept: 'application/json' } }).then((r) => r.json());

const notice = (data.entries ?? []).filter((e) => e.product_type === 'NOTICE');
console.log('NOTICE count', notice.length);
if (notice[0]) {
  console.log('NOTICE sample keys', Object.keys(notice[0]));
  console.log(JSON.stringify(notice[0], null, 2).slice(0, 2500));
}

// unique banks with any product containing Kündig in name
const kundig = new Map();
for (const e of data.entries ?? []) {
  const name = e.display?.product_name ?? '';
  if (!/kündig|flex|notice/i.test(name)) continue;
  const b = e.deposit_taking_bank;
  if (!b?.bank_slug) continue;
  const rate = parseFloat(e.interest_rates?.interest_rate_nominal);
  kundig.set(b.bank_slug, { name: b.name, rate, type: e.product_type, product: name });
}
console.log('\nKündig/Flex in product name:', kundig.size);
for (const [s, v] of kundig) console.log(s, v.rate, v.type, v.product);
