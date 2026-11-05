import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { pctDe, dateTimeDe } from '@/lib/bondDisplay';

export const BondPriceAlerts = ({ reloadKey }) => {
  const [data, setData] = useState({ alerts: [], warn_hours: 24 });

  useEffect(() => {
    fetch('/api/admin/bonds/price-alerts', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : { alerts: [] }))
      .then((d) => setData({ alerts: d.alerts || [], warn_hours: d.warn_hours || 24 }))
      .catch(() => setData({ alerts: [], warn_hours: 24 }));
  }, [reloadKey]);

  if (!data.alerts.length) return null;
  return (
    <div className="mb-4 border-l-4 border-amber-500 bg-amber-50 p-4" data-testid="bond-price-alerts">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle size={16} /> Kursüberwachung: verbindliche Kaufkurse prüfen
      </p>
      <ul className="space-y-1 text-[13px] text-amber-900">
        {data.alerts.map((a) => (
          <li key={a.id} data-testid={`bond-price-alert-${a.id}`}>
            <strong>{a.bond_name || a.isin}</strong> ({a.isin}) · Kaufkurs {pctDe(a.kaufkurs, 2, 4)} ·{' '}
            {a.status === 'expired'
              ? <span className="font-semibold text-rose-700">abgelaufen seit {dateTimeDe(a.valid_until)} – keine neuen Kaufaufträge, Kunden sehen „Kaufangebot anfordern“</span>
              : <span>läuft ab am {dateTimeDe(a.valid_until)} (Warnung {data.warn_hours} Std. vorher)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BondPriceAlerts;
