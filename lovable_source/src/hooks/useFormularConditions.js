import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getApiBase } from '@/lib/apiBase';
import { DEFAULT_CONTRACT_CONDITIONS, resolveContractConditions } from '@/lib/formularConditions';

// Session 82.96 — Supabase-RPC `get_formular_session_conditions` ersetzt durch
// `POST /api/formular-access/session/conditions` (FastAPI/Mongo).

const SESSION_KEY = 'formular_session_id';
const API = getApiBase();

export function useFormularConditions(bank, product, fallback = DEFAULT_CONTRACT_CONDITIONS) {
  const [custom, setCustom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        if (!cancelled) { setCustom(null); setLoading(false); }
        return;
      }
      try {
        const { data } = await axios.post(
          `${API}/api/formular-access/session/conditions`,
          { session_id: sessionId, bank, product },
          { withCredentials: true },
        );
        if (!cancelled) {
          setCustom(data?.conditions || null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setCustom(null); setLoading(false); }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [bank, product]);

  const conditions = useMemo(
    () => resolveContractConditions(custom, fallback),
    [custom, fallback],
  );

  return { conditions, loading, isCustom: Boolean(custom) };
}
