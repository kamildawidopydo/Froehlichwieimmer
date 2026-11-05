import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { careersApi } from '@/lib/careersApi';

export default function useCareerVisible() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let alive = true;
    careersApi.get('/status')
      .then((r) => { if (alive) setVisible(!!(r.data.site_public || r.data.is_staff)); })
      .catch(() => { if (alive) setVisible(false); });
    return () => { alive = false; };
  }, [user?.id, user?.role]);
  return visible;
}
