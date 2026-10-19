import React from 'react';
import { AlertCircle } from 'lucide-react';
import { siteContact } from '@/data/siteContact';

const formatAmount = (v, currency = 'USD') =>
  Number(v).toLocaleString('de-DE', { style: 'currency', currency: currency || 'USD' });

/**
 * Inline alert when a buy order exceeds available buying power.
 */
const InsufficientBuyingPowerAlert = ({ requiredAmount, availableAmount, currency = 'USD' }) => (
  <div
    role="alert"
    className="flex gap-3 rounded-xl border border-red-200/90 bg-red-50 px-4 py-4 dark:border-red-900/40 dark:bg-red-950/30"
  >
    <div
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white"
      aria-hidden
    >
      <AlertCircle size={14} strokeWidth={2.5} />
    </div>
    <div className="min-w-0 space-y-2">
      <p className="text-[15px] font-semibold text-red-800 dark:text-red-200">Nicht genug Kaufkraft.</p>
      <p className="text-[14px] leading-relaxed text-red-800 dark:text-red-200/90">
        Zum Kaufen benötigen Sie {formatAmount(requiredAmount, currency)}, Ihnen stehen nur{' '}
        {formatAmount(availableAmount, currency)} zur Verfügung.
      </p>
      <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
        Bitte wenden Sie sich an Ihren zuständigen Berater, um Ihre Kaufkraft zu erhöhen oder weitere
        Optionen zu besprechen.{' '}
        <a
          href={`tel:${siteContact.phoneTel}`}
          className="font-medium text-bank-primary underline-offset-2 hover:underline"
        >
          {siteContact.phoneDisplay}
        </a>
        {' · '}
        <a
          href={`mailto:${siteContact.email}`}
          className="font-medium text-bank-primary underline-offset-2 hover:underline"
        >
          {siteContact.email}
        </a>
      </p>
    </div>
  </div>
);

export default InsufficientBuyingPowerAlert;
