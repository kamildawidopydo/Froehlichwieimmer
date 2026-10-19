import React from 'react';
import { Headphones, Mail, Phone, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { siteContact } from '@/data/siteContact';
import { cn } from '@/lib/utils';

const contactCardClass =
  'flex min-h-[72px] items-start gap-2.5 rounded-lg border border-bank-border bg-white px-3.5 py-3 text-[13px] transition-colors';

/**
 * Persistent contact strip — phone, email, hours.
 */
const SupportContactBar = () => {
  const { t } = useTranslation();

  return (
    <div className="mb-6 rounded-xl border border-bank-border bg-gradient-to-br from-white to-bank-bg/80 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bank-primary/20 bg-bank-primary/10 text-bank-primary">
          <Headphones size={22} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-bank-text">
            {t('dashboardShell.support.contactTitle', { defaultValue: 'Kundenservice' })}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-bank-text-muted">
            {t('dashboardShell.support.contactSubtitle', {
              defaultValue: 'Persönliche Beratung zu Depot, Verträgen und Aufträgen.',
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <a
          href={`tel:${siteContact.phoneTel}`}
          className={cn(contactCardClass, 'hover:border-bank-primary/30 hover:bg-bank-primary/5')}
        >
          <Phone size={15} className="mt-0.5 shrink-0 text-bank-primary" strokeWidth={1.5} />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-bank-text-muted">
              {t('dashboardShell.support.phone', { defaultValue: 'Telefon' })}
            </span>
            <span className="mt-0.5 block font-medium tabular-nums leading-snug text-bank-text">
              {siteContact.phoneDisplay}
            </span>
          </span>
        </a>

        <a
          href={`mailto:${siteContact.email}`}
          className={cn(contactCardClass, 'hover:border-bank-primary/30 hover:bg-bank-primary/5')}
        >
          <Mail size={15} className="mt-0.5 shrink-0 text-bank-primary" strokeWidth={1.5} />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-bank-text-muted">
              {t('dashboardShell.support.email', { defaultValue: 'E-Mail' })}
            </span>
            <span className="mt-0.5 block break-all text-[12px] font-medium leading-snug text-bank-text sm:text-[13px]">
              {siteContact.email}
            </span>
          </span>
        </a>

        <div className={contactCardClass}>
          <Clock size={15} className="mt-0.5 shrink-0 text-bank-text-muted" strokeWidth={1.5} />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-bank-text-muted">
              {t('dashboardShell.support.hours', { defaultValue: 'Erreichbar' })}
            </span>
            <span className="mt-0.5 block whitespace-nowrap font-medium leading-snug text-bank-text">
              {siteContact.businessHoursLine}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SupportContactBar;
