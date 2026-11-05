import { useEffect, useState } from 'react';
import { getApiBase } from '@/lib/apiBase';

const REFRESH_MS = 15 * 60 * 1000;

// One batched request for all listed symbols; refreshed every 15 min, never per row.
export default function useDepotSparklines(symbols) {
  const key = [...new Set(symbols)].sort().join(',');
  const [data, setData] = useState({});
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${getApiBase()}/api/stocks/sparklines?range=1mo&symbols=${encodeURIComponent(key)}`);
        if (!r.ok) return;
        const j = await r.json();
        if (alive) setData(j.items || {});
      } catch { /* keep last data */ }
    };
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [key]);
  return data;
}
