import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CONTRACT_CONDITIONS, resolveContractConditions } from '@/lib/formularConditions';

const SESSION_KEY = 'formular_session_id';

export function useFormularConditions(bank, product, fallback = DEFAULT_CONTRACT_CONDITIONS) {
  const [custom, setCustom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        if (!cancelled) {
          setCustom(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.rpc('get_formular_session_conditions', {
        p_session_id: sessionId,
        p_bank: bank,
        p_product: product,
      });

      if (!cancelled) {
        setCustom(error ? null : data);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [bank, product]);

  const conditions = useMemo(
    () => resolveContractConditions(custom, fallback),
    [custom, fallback],
  );

  return { conditions, loading, isCustom: Boolean(custom) };
}
