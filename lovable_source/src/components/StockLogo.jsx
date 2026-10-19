import React, { useEffect, useMemo, useState } from 'react';
import { getCompanyInitials } from '@/lib/ipoLogo';
import { getStockLogoCandidates } from '@/lib/stockLogo';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: { box: 'h-10 w-10', icon: 16, text: 'text-[10px]' },
  md: { box: 'h-12 w-12', icon: 18, text: 'text-[11px]' },
};

const StockLogo = ({
  symbol,
  name,
  logoUrl,
  exchange,
  market,
  isTradable,
  size = 'sm',
  className,
  eager = false,
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const candidates = useMemo(
    () => getStockLogoCandidates(symbol, logoUrl, { name, exchange, market, isTradable }),
    [symbol, logoUrl, name, exchange, market, isTradable],
  );
  const resolved = candidates[sourceIndex] || null;
  const cfg = SIZE[size] || SIZE.sm;
  const initials = getCompanyInitials(name, symbol);

  useEffect(() => {
    setSourceIndex(0);
  }, [symbol, logoUrl, name, exchange, market, isTradable]);

  if (!resolved) {
    return (
      <div
        className={cn(
          cfg.box,
          'flex shrink-0 items-center justify-center rounded-lg border border-bank-border bg-bank-bg font-semibold uppercase text-bank-text-muted',
          cfg.text,
          className,
        )}
        title={name || symbol}
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
        alt={name || symbol || 'Aktie'}
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

export default StockLogo;
