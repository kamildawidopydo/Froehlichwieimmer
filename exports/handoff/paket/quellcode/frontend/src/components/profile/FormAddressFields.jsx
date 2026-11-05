import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sanitizeFormField } from '@/lib/formInputSanitize';

const FormAddressFields = ({
  values,
  onChange,
  prefix = '',
  labelClassName,
  inputClassName = 'mt-1',
  required = false,
}) => {
  const field = (name) => `${prefix}${name}`;
  const val = (name) => values[field(name)] || '';
  const set = (name) => (e) => onChange(field(name), sanitizeFormField(field(name), e.target.value));
  const req = required ? ' *' : '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
        <div>
          <Label className={cn('font-semibold', labelClassName)}>Straße{req}</Label>
          <Input
            value={val('street')}
            onChange={set('street')}
            className={inputClassName}
            placeholder="Musterstraße"
            autoComplete="address-line1"
          />
        </div>
        <div>
          <Label className={cn('font-semibold', labelClassName)}>Hausnr.{req}</Label>
          <Input
            value={val('houseNumber')}
            onChange={set('houseNumber')}
            className={inputClassName}
            placeholder="12a"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4">
        <div>
          <Label className={cn('font-semibold', labelClassName)}>PLZ{req}</Label>
          <Input
            value={val('postalCode')}
            onChange={set('postalCode')}
            className={inputClassName}
            placeholder="10115"
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </div>
        <div>
          <Label className={cn('font-semibold', labelClassName)}>Ort{req}</Label>
          <Input
            value={val('city')}
            onChange={set('city')}
            className={inputClassName}
            placeholder="Berlin"
            autoComplete="address-level2"
          />
        </div>
      </div>
    </div>
  );
};

export default FormAddressFields;
