import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { portfolioOrderApi } from '@/services/portfolioOrderApi';

/**
 * OrderCreateModal — Limit-Kauforder (Session 82.21 · Depot Phase 3C).
 *
 * Props:
 *   open, onClose         Modal-Steuerung
 *   symbol                Ticker (uppercase)
 *   displayName?          Anzeigename
 *   onCreated?            Callback nach erfolgreicher Order-Erstellung
 *
 * Backend-seitig: nur Limit-Buy in Preview. Market-Orders sind sichtbar,
 * aber disabled.
 */
const formatEUR = (v) =>
  Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const genIdemKey = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

const OrderCreateModal = ({ open, onClose, symbol, displayName, onCreated }) => {
  const [qty, setQty] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(null);
  const [idemKey, setIdemKey] = useState(() => genIdemKey());

  useEffect(() => {
    if (!open) return;
    setQty('');
    setLimitPrice('');
    setError('');
    setIdemKey(genIdemKey());
    portfolioOrderApi
      .getCash()
      .then((c) => setAvailable(Number(c?.cash_available || 0)))
      .catch(() => setAvailable(null));
  }, [open, symbol]);

  const reserved = useMemo(() => {
    const q = Number(qty);
    const p = Number(limitPrice);
    if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p <= 0) return 0;
    return Math.round(q * p * 100) / 100;
  }, [qty, limitPrice]);

  if (!open) return null;

  const isFormValid = () => {
    const q = parseInt(qty, 10);
    const p = parseFloat(limitPrice);
    return Number.isInteger(q) && q > 0 && Number.isFinite(p) && p > 0 && !!symbol;
  };

  const submit = async () => {
    if (submitting || !isFormValid()) return;
    setSubmitting(true);
    setError('');
    try {
      await portfolioOrderApi.createOrder({
        symbol: String(symbol).toUpperCase(),
        side: 'buy',
        order_type: 'limit',
        quantity: String(parseInt(qty, 10)),
        limit_price: String(parseFloat(limitPrice).toFixed(2)),
        idempotency_key: idemKey,
      });
      toast.success('Ihre Limit-Kauforder wurde erfolgreich erfasst.');
      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(err.detail || err.message || 'Order konnte nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="order-create-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-bank-surface">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-bank-text-muted hover:text-bank-text"
          aria-label="Schließen"
          data-testid="order-modal-close"
        >
          <X size={18} />
        </button>
        <h2 className="mb-4 text-lg font-semibold text-bank-text">Limit-Kauforder</h2>

        <div className="mb-3 text-sm">
          <div className="text-bank-text-muted">Instrument</div>
          <div className="font-medium text-bank-text" data-testid="order-symbol">
            {displayName || symbol}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="mb-1 block text-bank-text-muted">Ordertyp</label>
            <select
              value="limit"
              disabled
              className="w-full rounded border border-bank-border bg-bank-bg/40 px-2 py-1.5 text-[13px] text-bank-text"
              data-testid="order-type"
            >
              <option value="limit">Limit</option>
              <option value="market" disabled>Market — derzeit nicht verfügbar</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-bank-text-muted">Seite</label>
            <div className="w-full rounded border border-bank-border bg-bank-bg/40 px-2 py-1.5 text-[13px]" data-testid="order-side">
              Kaufen
            </div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-bank-text-muted">Stückzahl</label>
            <Input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="10"
              data-testid="order-quantity"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-bank-text-muted">Limitpreis (EUR)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="100.00"
              data-testid="order-limit-price"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="mb-4 rounded border border-bank-border/60 bg-bank-bg/40 p-3 text-[13px]">
          <div className="flex justify-between">
            <span className="text-bank-text-muted">Voraussichtliche Reservierung</span>
            <span className="tabular-nums font-medium" data-testid="order-reserved">
              {formatEUR(reserved)}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-bank-text-muted">Verfügbare Liquidität</span>
            <span className="tabular-nums" data-testid="order-available">
              {available != null ? formatEUR(available) : '—'}
            </span>
          </div>
        </div>

        {error && (
          <div
            className="mb-3 rounded border border-rose-300/60 bg-rose-50 px-3 py-2 text-[13px] text-rose-800"
            data-testid="order-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting} data-testid="order-cancel-btn">
            Abbrechen
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !isFormValid()}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            data-testid="order-submit-btn"
          >
            {submitting ? 'Wird gesendet…' : 'Kauforder aufgeben'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderCreateModal;
