import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { siteContact } from '@/data/siteContact';
import { cn } from '@/lib/utils';

/**
 * IPO / investment advisory contact — uses site-wide Kundenservice details.
 */
const IpoContactBlock = ({ className, compact = false }) => (
  <div
    className={cn(
      'rounded-lg border border-bank-border bg-bank-bg/40 text-[12px] text-bank-text-muted',
      compact ? 'p-3 space-y-2' : 'p-4 space-y-3',
      className,
    )}
  >
    <p className={cn('font-medium text-bank-text', compact ? 'text-[12px]' : 'text-[13px]')}>
      Persönliche Beratung
    </p>
    <p className="leading-relaxed">
      Sie interessieren sich für einen Börsengang oder möchten eine unverbindliche Investitionsanfrage stellen? Unser Team steht Ihnen gerne für Fragen zur Verfügung.
    </p>
    <div className="flex flex-col gap-2">
      <a
        href={`tel:${siteContact.phoneTel}`}
        className="inline-flex items-center gap-2 font-medium text-bank-primary hover:underline"
      >
        <Phone size={14} className="shrink-0" />
        {siteContact.phoneDisplay}
      </a>
      <a
        href={`mailto:${siteContact.email}`}
        className="inline-flex items-center gap-2 font-medium text-bank-primary hover:underline break-all"
      >
        <Mail size={14} className="shrink-0" />
        {siteContact.email}
      </a>
    </div>
    <p className="text-[11px] text-bank-text-muted">{siteContact.businessHoursLine}</p>
  </div>
);

export default IpoContactBlock;
