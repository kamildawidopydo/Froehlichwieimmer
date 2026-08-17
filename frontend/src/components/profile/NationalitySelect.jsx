import React from 'react';
import { NATIONALITIES, getNationalityForCountry } from '@/constants/countries';
import { cn } from '@/lib/utils';

const NationalitySelect = ({
  value,
  onChange,
  className,
  required = false,
  id,
  disabled = false,
  placeholder = 'Staatsangehörigkeit wählen…',
}) => (
  <select
    id={id}
    value={value ? getNationalityForCountry(value) : ''}
    onChange={(e) => onChange(e.target.value)}
    required={required}
    disabled={disabled}
    className={cn(
      'mt-1 h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
  >
    <option value="">{placeholder}</option>
    {NATIONALITIES.map((nationality) => (
      <option key={nationality} value={nationality}>
        {nationality}
      </option>
    ))}
    {value && !NATIONALITIES.includes(getNationalityForCountry(value)) && (
      <option value={getNationalityForCountry(value)}>{getNationalityForCountry(value)}</option>
    )}
  </select>
);

export default NationalitySelect;
