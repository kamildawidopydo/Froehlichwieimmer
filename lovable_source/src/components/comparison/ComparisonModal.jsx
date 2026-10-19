import React from 'react';
import { X } from 'lucide-react';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import { getCountryLabelDe } from '@/lib/countryFlags';
import { formatEur } from '@/lib/savingsCalculator';
import { cn } from '@/lib/utils';
import { LUCIDE_STROKE } from '@/lib/lucideStroke';

const fmtRate = (v) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toFixed(2).replace('.', ',') + ' %' : '—';
const fmtInt = (v) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString('de-DE') + ' €' : '—';
const fmtBool = (v) => (v === true ? 'Ja' : v === false ? 'Nein' : '—');

const FREQ_LABELS = {
  monthly: 'monatlich',
  quarterly: 'quartalsweise',
  yearly: 'jährlich',
  at_maturity: 'am Laufzeitende',
};

/**
 * Vergleichsansicht (Modal). Zeigt bis zu 4 Angebote nebeneinander.
 * Unterschiede werden pro Zeile visuell hervorgehoben (unterschiedliche Werte → farbig).
 * KEINE subjektiven "Sieger"-Kennzeichnungen.
 */
export default function ComparisonModal({ offers = [], onClose }) {
  if (!offers.length) return null;

  const rows = [
    { key: 'bank_name', label: 'Bank', get: (o) => o.banks?.name || o.bank_name || '—' },
    {
      key: 'country',
      label: 'Bankland',
      get: (o) => (
        <span className="inline-flex items-center gap-1.5">
          <CountryFlagIcon country={o.country_code || o.country} size="xs" />
          {getCountryLabelDe(o.country_code || o.country) || o.country_code || o.country || '—'}
        </span>
      ),
    },
    { key: 'product_type', label: 'Produkt', get: (o) => o.investment_type || o.product_type || '—' },
    { key: 'interest_rate', label: 'Zinssatz', get: (o) => fmtRate(o.interest_rate) },
    {
      key: 'promo',
      label: 'Aktionsdauer',
      get: (o) =>
        o.interest_rate_type === 'promo' && o.promo_duration_months
          ? `${o.promo_duration_months} Monate`
          : '—',
    },
    {
      key: 'standard',
      label: 'Folgezins',
      get: (o) =>
        o.interest_rate_type === 'promo' ? fmtRate(o.standard_rate_after_promo) : '—',
    },
    {
      key: 'yield',
      label: 'Erwarteter Ertrag',
      get: (o) => {
        const y = o.expected_yield?.gross_return_eur;
        return y != null ? formatEur(y) : '—';
      },
    },
    { key: 'min_amount', label: 'Mindestanlage', get: (o) => fmtInt(o.min_amount) },
    { key: 'max_amount', label: 'Maximalanlage', get: (o) => fmtInt(o.max_amount) },
    {
      key: 'term_months',
      label: 'Laufzeit',
      get: (o) => (o.term_months ? `${o.term_months} Monate` : 'flexibel'),
    },
    {
      key: 'interest_frequency',
      label: 'Zinsgutschrift',
      get: (o) => FREQ_LABELS[o.interest_frequency] || '—',
    },
    {
      key: 'deposit_protection',
      label: 'Einlagensicherung',
      get: (o) => o.deposit_protection || '€100.000',
    },
    {
      key: 'deposit_guarantee_country',
      label: 'Sicherungsland',
      get: (o) => (
        <span className="inline-flex items-center gap-1.5">
          <CountryFlagIcon country={o.deposit_guarantee_country} size="xs" />
          {getCountryLabelDe(o.deposit_guarantee_country) || o.deposit_guarantee_country || '—'}
        </span>
      ),
    },
    { key: 'new_customers_only', label: 'Nur Neukunden', get: (o) => fmtBool(o.new_customers_only) },
    { key: 'is_demo', label: 'Datenquelle', get: (o) => (o.is_demo ? 'Bankangabe' : 'verifiziert') },
  ];

  // Diff-Detektor: Zeile hervorheben, wenn Werte unterschiedlich (bei simple values).
  const isDiff = (row) => {
    const vals = offers.map((o) => {
      const v = row.get(o);
      return typeof v === 'string' ? v : JSON.stringify(v?.props ?? v);
    });
    return new Set(vals).size > 1;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Angebotsvergleich"
      data-testid="comparison-modal"
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/55 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-6xl overflow-hidden border border-bank-border bg-white shadow-editorial-lg"
      >
        <div className="flex items-center justify-between border-b border-bank-border px-6 py-4">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-gold">
              Vergleich
            </p>
            <h2 className="font-display text-xl font-light text-bank-text">
              {offers.length} Angebote im Direktvergleich
            </h2>
          </div>
          <button
            type="button"
            data-testid="comparison-modal-close"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center border border-bank-border text-bank-text-muted hover:border-bank-primary hover:text-bank-primary"
            aria-label="Vergleich schließen"
          >
            <X className="h-4 w-4" strokeWidth={LUCIDE_STROKE} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-80px)] overflow-auto">
          <table className="w-full min-w-[680px] border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-bank-bg">
              <tr>
                <th className="px-4 py-3 text-left font-mono text-[10.5px] uppercase tracking-[0.2em] text-bank-text-muted">
                  Kriterium
                </th>
                {offers.map((o) => (
                  <th
                    key={o.id}
                    className="px-4 py-3 text-left font-display text-[15px] font-medium text-bank-text"
                  >
                    {o.banks?.name || o.product_name || o.bank_slug}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className={cn(
                    'border-t border-bank-border',
                    isDiff(row) ? 'bg-bank-gold/5' : ''
                  )}
                  data-testid={`comparison-row-${row.key}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[11.5px] font-medium uppercase tracking-[0.14em] text-bank-text-muted">
                    {row.label}
                  </td>
                  {offers.map((o) => (
                    <td key={o.id} className="px-4 py-3 text-bank-text">
                      {row.get(o)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
