import React from 'react';
import { Input } from '@/components/ui/input';
import { formatDialCodeLabel, PHONE_DIAL_CODE_OPTIONS } from '@/constants/phoneDialCodes';
import { normalizePhoneLocal } from '@/lib/phoneNumber';
import { cn } from '@/lib/utils';

const PhoneNumberInput = ({
  dialCode,
  localNumber,
  onDialCodeChange,
  onLocalNumberChange,
  disabled = false,
  dialCodeTestId,
  localNumberTestId,
  localPlaceholder = '170 1234567',
  className,
  selectClassName,
  inputClassName,
}) => {
  const selectClass =
    selectClassName ||
    'h-11 w-[5.65rem] shrink-0 appearance-none rounded-none border border-bank-border bg-white pl-1.5 pr-5 font-mono text-[12px] tabular-nums text-bank-text focus:border-bank-gold/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-bank-accent/30';

  const inputClass =
    inputClassName ||
    'h-11 min-w-0 flex-1 rounded-none border-bank-border focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30';

  return (
    <div className={cn('flex min-w-0 gap-1.5', className)}>
      <div className="relative shrink-0">
        <select
          value={dialCode}
          onChange={(e) => onDialCodeChange(e.target.value)}
          disabled={disabled}
          aria-label="Telefonvorwahl"
          data-testid={dialCodeTestId}
          className={selectClass}
        >
          {PHONE_DIAL_CODE_OPTIONS.map((entry) => (
            <option key={entry.dialCode} value={entry.dialCode}>
              {formatDialCodeLabel(entry)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.12em] text-bank-text-muted">
          ▾
        </span>
      </div>
      <Input
        type="tel"
        inputMode="numeric"
        value={localNumber}
        onChange={(e) => onLocalNumberChange(normalizePhoneLocal(e.target.value))}
        disabled={disabled}
        placeholder={localPlaceholder}
        autoComplete="tel-national"
        data-testid={localNumberTestId}
        className={inputClass}
      />
    </div>
  );
};

export default PhoneNumberInput;
