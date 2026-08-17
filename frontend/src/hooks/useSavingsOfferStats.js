import { useEffect, useState } from 'react';
import { fetchSavingsOfferStatsByType } from '@/lib/savingsOfferStats';

const EMPTY_STATS = {
  Festgeld: { maxRate: null, minDeposit: null },
  Flexgeld: { maxRate: null, minDeposit: null },
  Tagesgeld: { maxRate: null, minDeposit: null },
};

export default function useSavingsOfferStats() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);
      try {
        const next = await fetchSavingsOfferStatsByType();
        if (!cancelled) setStats(next);
      } catch {
        if (!cancelled) {
          setStats(EMPTY_STATS);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}
