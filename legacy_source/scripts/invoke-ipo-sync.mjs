import fs from 'node:fs';
import path from 'node:path';
import { fetchUsIposLocal } from './usIpoFetch.mjs';

const envPath = path.join(process.cwd(), '.env');
const env = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
  const re = new RegExp(`^${key}=(.+)$`, 'm');
  const m = env.match(re);
  if (!m) return '';
  return m[1].trim().replace(/^"|"$/g, '');
}

const url = getEnv('SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

let usIpoRows = [];
try {
  usIpoRows = await fetchUsIposLocal();
  console.error(`US IPOs: fetched ${usIpoRows.length} rows from StockAnalysis`);
} catch (err) {
  console.error('US IPO local fetch failed:', err?.message || err);
}

const res = await fetch(`${url}/functions/v1/ipo-sync`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    apikey: key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ force: true, nasdaqRows: usIpoRows }),
});

const body = await res.json().catch(async () => res.text());
console.log(JSON.stringify({ status: res.status, body }, null, 2));
process.exit(res.ok ? 0 : 1);
