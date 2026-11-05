import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  getTaxIdFormatHint,
  getTaxIdPlaceholder,
  sanitizeEuropeanTaxIdInput,
  validateEuropeanTaxId,
} from '@/lib/europeanTaxId';

const TaxIdInput = ({
  value,
  onChange,
  country,
  className,
  showHint = true,
  showError = true,
  required = false,
  id,
  disabled = false,
  inputClassName,
}) => {
  const validation = value
    ? validateEuropeanTaxId(value, country, { required })
    : { ok: !required };

  const handleChange = (e) => {
    onChange(sanitizeEuropeanTaxIdInput(e.target.value, country));
  };

  const inputMode = ['Italien', 'Spanien', 'Irland', 'Finnland'].includes(country)
    ? 'text'
    : 'numeric';

  return (
    <div>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        placeholder={country ? getTaxIdPlaceholder(country) : 'Steuer-ID'}
        autoComplete="off"
        className={cn(className, inputClassName)}
      />
      {showHint && country && !value && (
        <p className="mt-1 text-xs text-bank-text-muted">{getTaxIdFormatHint(country)}</p>
      )}
      {showError && value && !validation.ok && (
        <p className="mt-1 text-xs text-bank-error">{validation.message}</p>
      )}
      {showHint && !country && (
        <p className="mt-1 text-xs text-bank-text-muted">
          Bitte zuerst die Staatsangehörigkeit wählen
        </p>
      )}
    </div>
  );
};

export default TaxIdInput;

export { validateEuropeanTaxId };
