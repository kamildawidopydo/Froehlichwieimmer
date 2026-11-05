import React, { useEffect, useMemo, useState } from 'react';
import { getCompanyInitials, getIpoLogoCandidates } from '@/lib/ipoLogo';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: { box: 'h-10 w-10', text: 'text-[10px]' },
  md: { box: 'h-12 w-12', text: 'text-[11px]' },
  lg: { box: 'h-14 w-14', text: 'text-[12px]' },
};

const IpoLogo = ({ ipo, size = 'sm', className, eager = false }) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const candidates = useMemo(() => getIpoLogoCandidates(ipo), [ipo]);
  const resolved = candidates[sourceIndex] || null;
  const cfg = SIZE[size] || SIZE.sm;
  const label = ipo?.company_name || ipo?.ticker_proposed || 'IPO';
  const initials = getCompanyInitials(ipo?.company_name, ipo?.ticker_proposed);

  useEffect(() => {
    setSourceIndex(0);
  }, [ipo?.id, ipo?.external_key, ipo?.logo_url, ipo?.ticker_proposed, ipo?.prospectus_url]);

  if (!resolved) {
    return (
      <div
        className={cn(
          cfg.box,
          'flex shrink-0 items-center justify-center rounded-lg border border-bank-border bg-bank-bg font-semibold uppercase text-bank-text-muted',
          cfg.text,
          className,
        )}
        title={label}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        cfg.box,
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-bank-border bg-white p-1',
        className,
      )}
    >
      <img
        src={resolved}
        alt={label}
        loading={eager ? 'eager' : 'lazy'}
        draggable={false}
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain"
        onError={() => {
          if (sourceIndex < candidates.length - 1) setSourceIndex((i) => i + 1);
          else setSourceIndex(candidates.length);
        }}
      />
    </div>
  );
};

export default IpoLogo;
