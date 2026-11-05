import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { pctDe, dateTimeDe } from '@/lib/bondDisplay';

const fmtDateTime = dateTimeDe;

export const BondPriceChart = ({ bondId }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/bonds/catalog/${bondId}/prices`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [bondId]);

  const points = (data?.points || []).map((p) => ({ ...p, t: new Date(p.recorded_at).getTime() }));

  return (
    <div className="mt-3 border border-bank-border p-3" data-testid={`bond-price-chart-${bondId}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
        Historischer Kursverlauf – Referenzkurse
      </p>
      <p className="mt-0.5 text-[11px] text-bank-text-muted" data-testid="bond-price-chart-updated">
        Letzte Kursaktualisierung: {fmtDateTime(data?.price_updated_at)}
      </p>
      {error ? (
        <p className="mt-2 text-[12px] text-bank-text-muted">Kursdaten konnten nicht geladen werden.</p>
      ) : !data ? (
        <p className="mt-2 text-[12px] text-bank-text-muted">Lädt…</p>
      ) : points.length < 2 ? (
        <p className="mt-2 text-[12px] text-bank-text-muted" data-testid="bond-price-chart-insufficient">
          Für ein Kursdiagramm liegen noch nicht genügend gespeicherte Kursdaten vor
          {points.length === 1 ? ` (bisher ein Referenzkurs: ${pctDe(points[0].kurs, 2, 2)}).` : '.'}
        </p>
      ) : (
        <div className="mt-2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 5, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => new Date(t).toLocaleDateString('de-DE')} tick={{ fontSize: 10 }} />
              <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} allowDecimals tickCount={5} tickFormatter={(v) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 })} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(t) => fmtDateTime(t)} formatter={(v) => [pctDe(v, 2, 2), 'Referenzkurs']} />
              <Line type="linear" dataKey="kurs" stroke="#1e3a8a" strokeWidth={1.75} dot={{ r: 2.5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-[10.5px] text-bank-text-muted">Nur gespeicherte Referenzwerte, keine aktuellen Marktpreise.</p>
    </div>
  );
};

export default BondPriceChart;
