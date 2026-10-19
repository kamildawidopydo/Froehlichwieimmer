import { getApiBase } from '@/lib/apiBase';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Bell, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const client = axios.create({ baseURL: `${getApiBase()}/api`, withCredentials: true });

/**
 * StockAlertButton — Session 80.82 Watchlist Professional 3/4.
 * Editorial Bell-Pill on /aktien/:symbol; opens dialog for CRUD of persistent
 * server-side stock alerts. Requires login.
 */
export default function StockAlertButton({ symbol, displayName, currency = 'EUR' }) {
  const { user } = useAuth();
  const isAuthed = !!user;
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ alert_type: 'price_above', threshold: '', reminder_days: 2 });
  const navigate = useNavigate();
  const location = useLocation();

  const refresh = async () => {
    if (!isAuthed) return;
    setLoading(true);
    try {
      const { data } = await client.get(`/stock-alerts`, { params: { symbol } });
      setAlerts(data.items || []);
    } catch { /* keep prior state */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open && isAuthed) refresh(); /* eslint-disable-next-line */ }, [open, isAuthed, symbol]);

  const create = async () => {
    if (!isAuthed) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
    try {
      const payload = { symbol, alert_type: form.alert_type, channel: 'in_app' };
      if (form.alert_type === 'price_above' || form.alert_type === 'price_below') {
        payload.threshold = parseFloat(String(form.threshold).replace(',', '.'));
        if (!payload.threshold || isNaN(payload.threshold)) { toast.error('Bitte gültige Schwelle angeben.'); return; }
      }
      if (form.alert_type === 'earnings_reminder' || form.alert_type === 'ex_dividend_reminder') {
        payload.reminder_days = parseInt(form.reminder_days, 10);
      }
      await client.post('/stock-alerts', payload);
      toast.success('Alarm erstellt.');
      setForm({ alert_type: 'price_above', threshold: '', reminder_days: 2 });
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Alarm konnte nicht erstellt werden.');
    }
  };

  const toggle = async (a) => {
    try { await client.patch(`/stock-alerts/${a.id}`, { is_active: !a.is_active }); refresh(); }
    catch { toast.error('Aktion fehlgeschlagen.'); }
  };
  const del = async (a) => {
    try { await client.delete(`/stock-alerts/${a.id}`); refresh(); toast.success('Alarm gelöscht.'); }
    catch { toast.error('Aktion fehlgeschlagen.'); }
  };

  const label = alerts.length > 0 ? `${alerts.length} Alarm${alerts.length === 1 ? '' : 'e'} aktiv` : 'Alarm erstellen';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!isAuthed) { navigate(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="stock-alert-button"
        className={cn(
          'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em]',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bank-primary/40',
          alerts.length > 0
            ? 'border-bank-gold/60 bg-bank-gold/10 text-bank-gold hover:bg-bank-gold/15'
            : 'border-bank-border bg-white text-bank-text hover:border-bank-primary hover:text-bank-primary-strong dark:bg-bank-surface',
        )}
      >
        <Bell className="h-4 w-4" strokeWidth={LUCIDE_STROKE} aria-hidden />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-dialog-title"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-bank-border bg-white p-6 shadow-xl dark:bg-bank-surface sm:rounded-2xl sm:p-8"
            data-testid="stock-alert-dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Alarm konfigurieren</p>
                <h3 id="alert-dialog-title" className="mt-1 font-display text-[1.4rem] font-light text-bank-text">{displayName || symbol}</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Dialog schließen"
                className="rounded-full p-2 text-bank-text-muted hover:bg-bank-border/50">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Create form */}
            <div className="mt-6 space-y-3">
              <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">Alert-Typ</label>
              <select
                value={form.alert_type}
                onChange={(e) => setForm((f) => ({ ...f, alert_type: e.target.value }))}
                className="min-h-[44px] w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-[14px] text-bank-text dark:bg-bank-bg"
                data-testid="alert-type-select"
              >
                <option value="price_above">Kurs steigt über …</option>
                <option value="price_below">Kurs fällt unter …</option>
                <option value="earnings_reminder">Erinnerung vor Earnings</option>
                <option value="ex_dividend_reminder">Erinnerung vor Ex-Dividende</option>
                <option value="news_new">Neue Meldungen (24 h)</option>
              </select>
              {(form.alert_type === 'price_above' || form.alert_type === 'price_below') && (
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">
                    Schwelle ({currency})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.threshold}
                    onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                    placeholder="z. B. 200"
                    data-testid="alert-threshold-input"
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-[14px] text-bank-text dark:bg-bank-bg"
                  />
                </div>
              )}
              {(form.alert_type === 'earnings_reminder' || form.alert_type === 'ex_dividend_reminder') && (
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-bank-text-muted">Vorlauf</label>
                  <select
                    value={form.reminder_days}
                    onChange={(e) => setForm((f) => ({ ...f, reminder_days: e.target.value }))}
                    data-testid="alert-days-select"
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-[14px] text-bank-text dark:bg-bank-bg"
                  >
                    <option value={1}>1 Tag vorher</option>
                    <option value={2}>2 Tage vorher</option>
                    <option value={7}>7 Tage vorher</option>
                  </select>
                </div>
              )}
              <button
                type="button"
                onClick={create}
                data-testid="alert-create-btn"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-bank-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white hover:bg-bank-primary-strong"
              >
                Alarm erstellen
              </button>
            </div>

            {/* Active alerts */}
            <div className="mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-bank-primary-strong">Aktive Alarme</p>
              {loading ? (
                <p className="mt-4 text-[13px] text-bank-text-muted">Wird geladen …</p>
              ) : alerts.length === 0 ? (
                <p className="mt-4 text-[13px] text-bank-text-muted">Noch keine Alarme für {symbol}.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-bank-border px-3 py-2.5" data-testid={`alert-row-${a.id}`}>
                      <div className="min-w-0">
                        <p className="text-[13.5px] text-bank-text">{describeAlert(a, currency)}</p>
                        <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-bank-text-muted">
                          {a.is_active ? 'Aktiv' : 'Deaktiviert'} · {a.channel}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toggle(a)} aria-label={a.is_active ? 'Deaktivieren' : 'Aktivieren'}
                          className="inline-flex min-h-[36px] items-center rounded-full border border-bank-border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-bank-text-muted hover:text-bank-text"
                        >{a.is_active ? 'Pause' : 'Start'}</button>
                        <button type="button" onClick={() => del(a)} aria-label="Löschen"
                          className="inline-flex min-h-[36px] items-center rounded-full border border-red-200 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-red-600 hover:bg-red-50"
                        >Löschen</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="mt-6 text-[11px] leading-relaxed text-bank-text-muted">
              Kurse können zeitverzögert sein.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function describeAlert(a, ccy) {
  const fmt = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: ccy, minimumFractionDigits: 2 }).format(v);
  switch (a.alert_type) {
    case 'price_above': return `Kurs steigt über ${fmt(a.threshold)}`;
    case 'price_below': return `Kurs fällt unter ${fmt(a.threshold)}`;
    case 'earnings_reminder': return `Earnings-Erinnerung · ${a.reminder_days} Tag${a.reminder_days === 1 ? '' : 'e'} vorher`;
    case 'ex_dividend_reminder': return `Ex-Dividende · ${a.reminder_days} Tag${a.reminder_days === 1 ? '' : 'e'} vorher`;
    case 'news_new': return 'Neue Meldungen (24 h)';
    default: return a.alert_type;
  }
}
