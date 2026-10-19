import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sanitizeFormField } from '@/lib/formInputSanitize';

const AddressFields = ({
  value,
  onChange,
  disabled = false,
  inputClassName,
  labelClassName,
  showLine2 = true,
  startNum = 4,
  FieldLabel,
}) => {
  const inputClass =
    inputClassName ||
    'h-11 w-full rounded-none border-bank-border bg-white text-sm focus-visible:border-bank-gold/55 focus-visible:ring-2 focus-visible:ring-bank-accent/30';

  const defaultLabel = ({ num, children }) => (
    <span className="mb-2.5 flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-bank-text-muted">
      {num && <span className="text-bank-gold">{num}</span>}
      <span>{children}</span>
    </span>
  );

  const profileLabel = ({ children }) => (
    <span className={cn('mb-2 block text-bank-text-muted', labelClassName)}>{children}</span>
  );

  const Label = FieldLabel || (startNum ? defaultLabel : profileLabel);
  const num = (offset) => (startNum ? String(startNum + offset).padStart(2, '0') : null);

  const set = (key) => (e) => onChange({ ...value, [key]: sanitizeFormField(key, e.target.value) });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_120px]">
        <label className="block">
          <Label num={num(0)}>Straße</Label>
          <Input
            type="text"
            value={value.address_street}
            onChange={set('address_street')}
            disabled={disabled}
            className={inputClass}
            placeholder="Musterstraße"
            autoComplete="address-line1"
          />
        </label>
        <label className="block">
          <Label num={num(1)}>Hausnr.</Label>
          <Input
            type="text"
            value={value.address_house_number}
            onChange={set('address_house_number')}
            disabled={disabled}
            className={inputClass}
            placeholder="12a"
            autoComplete="off"
          />
        </label>
      </div>

      {showLine2 && (
        <label className="block">
          <Label num={num(2)}>
            Adresszusatz <span className="normal-case tracking-normal text-bank-text-muted/80">(optional)</span>
          </Label>
          <Input
            type="text"
            value={value.address_line_2}
            onChange={set('address_line_2')}
            disabled={disabled}
            className={inputClass}
            placeholder="Etage, c/o, Gebäude …"
            autoComplete="address-line2"
          />
        </label>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[140px_1fr]">
        <label className="block">
          <Label num={num(3)}>PLZ</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={value.address_postal_code}
            onChange={set('address_postal_code')}
            disabled={disabled}
            className={inputClass}
            placeholder="10115"
            autoComplete="postal-code"
          />
        </label>
        <label className="block">
          <Label num={num(4)}>Ort</Label>
          <Input
            type="text"
            value={value.address_city}
            onChange={set('address_city')}
            disabled={disabled}
            className={inputClass}
            placeholder="Berlin"
            autoComplete="address-level2"
          />
        </label>
      </div>
    </div>
  );
};

export default AddressFields;
