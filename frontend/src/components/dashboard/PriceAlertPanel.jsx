import React, { useEffect, useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  createPriceAlert,
  deletePriceAlert,
  fetchPriceAlerts,
} from '@/services/priceAlertService';
import { cn } from '@/lib/utils';

const PriceAlertPanel = ({ symbol, currentPrice, currency = 'EUR' }) => {
  const [alerts, setAlerts] = useState([]);
  const [target, setTarget] = useState('');
  const [direction, setDirection] = useState('above');
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetchPriceAlerts()
      .then((rows) => setAlerts(rows.filter((a) => a.symbol === symbol)))
      .catch(() => setAlerts([]));
  };

  useEffect(() => {
    if (symbol) load();
  }, [symbol]);

  const submit = async (e) => {
    e.preventDefault();
    const price = Number(target);
    if (!price || price <= 0) {
      toast.error('Bitte gültigen Zielkurs eingeben');
      return;
    }
    setLoading(true);
    try {
      await createPriceAlert({ symbol, direction, targetPrice: price });
      toast.success('Kursalarm gespeichert');
      setTarget('');
      load();
    } catch (err) {
      toast.error('Kursalarm konnte nicht gespeichert werden.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    try {
      await deletePriceAlert(id);
      load();
      toast.success('Alarm entfernt');
    } catch {
      toast.error('Entfernen fehlgeschlagen');
    }
  };

  return (
    <div className="rounded-xl border border-bank-border bg-white p-5 shadow-sm">
      <h3 className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-bank-text">
        <Bell size={16} className="text-bank-primary" /> Kursalarm
      </h3>
      {currentPrice != null && (
        <p className="mb-3 text-[12px] text-bank-text-muted">
          Aktuell:{' '}
          <span className="font-semibold tabular-nums text-bank-text">
            {Number(currentPrice).toLocaleString('de-DE', { style: 'currency', currency })}
          </span>
        </p>
      )}
      <form onSubmit={submit} className="space-y-2">
        <div className="flex gap-2">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="h-9 rounded-md border border-bank-border bg-white px-2 text-[13px]"
          >
            <option value="above">Über</option>
            <option value="below">Unter</option>
          </select>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Zielkurs"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="flex-1"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading} className="w-full">
          Alarm setzen
        </Button>
      </form>
      {alerts.length > 0 && (
        <ul className="mt-4 divide-y divide-bank-border/70 border-t border-bank-border pt-3">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-[12px]">
              <span>
                {a.direction === 'above' ? '≥' : '≤'}{' '}
                {Number(a.target_price).toLocaleString('de-DE', { maximumFractionDigits: 4 })}
              </span>
              <button type="button" onClick={() => remove(a.id)} className="text-bank-text-muted hover:text-rose-600">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PriceAlertPanel;
