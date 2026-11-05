import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageContainer, PageHeader } from '@/components/dashboard/PageHeader';
import PortfolioPageLayout from '@/components/dashboard/PortfolioPageLayout';
import {
  fetchAllPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
  checkPriceAlerts,
} from '@/services/priceAlertService';
import { useDashboardData } from '@/context/DashboardDataContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AlarmePage() {
  const { stockPriceMap, refreshAll } = useDashboardData();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('');
  const [target, setTarget] = useState('');
  const [direction, setDirection] = useState('above');
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAllPriceAlerts();
      setAlerts(rows);
    } catch (err) {
      toast.error('Alarme konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    checkPriceAlerts()
      .then((res) => {
        if (res?.triggered?.length) {
          toast.info(`${res.triggered.length} Kursalarm(e) ausgelöst`);
          load();
        }
      })
      .catch(() => {});
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    const px = Number(target);
    if (!sym || !px) {
      toast.error('Symbol und Zielkurs erforderlich');
      return;
    }
    try {
      await createPriceAlert({ symbol: sym, direction, targetPrice: px });
      toast.success('Alarm angelegt');
      setSymbol('');
      setTarget('');
      await load();
    } catch (err) {
      toast.error('Alarm konnte nicht angelegt werden.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePriceAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success('Alarm gelöscht');
    } catch (err) {
      toast.error('Alarm konnte nicht gelöscht werden.');
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await checkPriceAlerts();
      if (res?.triggered?.length) {
        toast.success(`${res.triggered.length} Alarm(e) ausgelöst`);
        await refreshAll();
      } else {
        toast.message('Keine Alarme ausgelöst');
      }
      await load();
    } catch (err) {
      toast.error('Prüfung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setChecking(false);
    }
  };

  const active = alerts.filter((a) => a.is_active);
  const triggered = alerts.filter((a) => a.triggered_at);

  return (
    <PageContainer>
      <PortfolioPageLayout>
        <PageHeader
          eyebrow="Handel"
          title="Kursalarme"
          icon={Bell}
          description="Benachrichtigung wenn ein Kurs Ihr Ziel erreicht."
          actions={
            <Button variant="outline" size="sm" onClick={handleCheck} disabled={checking}>
              {checking ? 'Prüfe…' : 'Jetzt prüfen'}
            </Button>
          }
        />

        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-bank-border bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-[15px] font-semibold text-bank-text">Neuer Alarm</h3>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Symbol (z.B. AAPL)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-36"
            />
            <Input
              type="number"
              step="any"
              placeholder="Zielkurs"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-32"
            />
            <div className="inline-flex rounded-lg border border-bank-border p-0.5">
              {[
                { id: 'above', label: '≥ über', icon: ArrowUpRight },
                { id: 'below', label: '≤ unter', icon: ArrowDownRight },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDirection(id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[12px] font-medium',
                    direction === id ? 'bg-bank-primary text-white' : 'text-bank-text-muted',
                  )}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
            <Button type="submit" size="sm">
              <Plus size={14} /> Anlegen
            </Button>
          </div>
        </form>

        <div className="mb-6 rounded-xl border border-bank-border bg-white shadow-sm">
          <div className="border-b border-bank-border px-5 py-3">
            <h3 className="text-[15px] font-semibold text-bank-text">
              Aktive Alarme ({active.length})
            </h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-[13px] text-bank-text-muted">Lade…</div>
          ) : active.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-bank-text-muted">Keine aktiven Alarme.</div>
          ) : (
            <ul className="divide-y divide-bank-border/70">
              {active.map((a) => {
                const px = stockPriceMap?.[a.symbol];
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <Link to={`/dashboard/aktien/${a.symbol}`} className="font-semibold text-bank-primary hover:underline">
                        {a.symbol}
                      </Link>
                      <p className="text-[12px] text-bank-text-muted">
                        {a.direction === 'above' ? '≥' : '≤'}{' '}
                        {Number(a.target_price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        {px?.price != null && (
                          <span className="ml-2">
                            · Last{' '}
                            {Number(px.price).toLocaleString('de-DE', {
                              style: 'currency',
                              currency: px.currency || 'EUR',
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="rounded-lg p-2 text-bank-text-muted hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Löschen"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {triggered.length > 0 && (
          <div className="rounded-xl border border-bank-border bg-white shadow-sm">
            <div className="border-b border-bank-border px-5 py-3">
              <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold text-bank-text">
                <BellRing size={16} className="text-amber-600" /> Ausgelöst
              </h3>
            </div>
            <ul className="divide-y divide-bank-border/70">
              {triggered.slice(0, 10).map((a) => (
                <li key={a.id} className="px-5 py-3 text-[13px]">
                  <span className="font-semibold">{a.symbol}</span>
                  <span className="text-bank-text-muted">
                    {' '}
                    — Ziel {Number(a.target_price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} ·{' '}
                    {a.triggered_at
                      ? new Date(a.triggered_at).toLocaleString('de-DE')
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PortfolioPageLayout>
    </PageContainer>
  );
}
