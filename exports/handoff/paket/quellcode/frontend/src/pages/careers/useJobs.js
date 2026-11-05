import { useCallback, useEffect, useState } from 'react';
import { careersApi } from '@/lib/careersApi';

export default function useJobs(isStaff, initial = {}) {
  const [filters, setFilters] = useState({ q: '', location: '', employment_type: '', level: '', area: '', sort: 'newest', ...initial });
  const [data, setData] = useState({ items: [], locations: [], employment_types: [], areas: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f) => {
    setLoading(true);
    try {
      const r = await careersApi.get('/jobs', { params: { ...f, preview: isStaff ? 1 : undefined } });
      setData({ areas: [], ...r.data });
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => { load(filters); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  return { filters, setFilters, data, loading, search: (f = filters) => load(f) };
}
