import React, { useEffect, useMemo, useState } from 'react';
import { getBondIssuerInitials, getBondLogoCandidates } from '@/lib/bondLogo';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: { box: 'h-10 w-10', text: 'text-[10px]' },
  md: { box: 'h-12 w-12', text: 'text-[11px]' },
  lg: { box: 'h-14 w-14', text: 'text-[12px]' },
};

const BondLogo = ({ bond, size = 'sm', className, eager = false }) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const candidates = useMemo(
    () => getBondLogoCandidates(bond),
    [bond?.id, bond?.isin, bond?.issuer, bond?.bond_name, bond?.logo_url],
  );
  const resolved = candidates[sourceIndex] || null;
  const cfg = SIZE[size] || SIZE.sm;
  const label = bond?.bond_name || bond?.issuer || bond?.isin || 'Anleihe';
  const initials = getBondIssuerInitials(bond);

  useEffect(() => {
    setSourceIndex(0);
  }, [bond?.id, bond?.isin, bond?.issuer, bond?.logo_url, bond?.bond_name]);

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

export default BondLogo;
