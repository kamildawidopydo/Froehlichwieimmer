-- Structured address fields on profiles (street, house number, postal code, city, optional line 2).
-- Keeps legacy `address` column in sync for existing queries and exports.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_house_number text,
  ADD COLUMN IF NOT EXISTS address_line_2 text,
  ADD COLUMN IF NOT EXISTS address_postal_code text,
  ADD COLUMN IF NOT EXISTS address_city text;

COMMENT ON COLUMN public.profiles.address_street IS 'Straße ohne Hausnummer';
COMMENT ON COLUMN public.profiles.address_house_number IS 'Hausnummer (inkl. Zusatz, z. B. 12a)';
COMMENT ON COLUMN public.profiles.address_line_2 IS 'Adresszusatz (Etage, c/o, etc.)';
COMMENT ON COLUMN public.profiles.address_postal_code IS 'Postleitzahl / PLZ';
COMMENT ON COLUMN public.profiles.address_city IS 'Ort / Stadt';

CREATE OR REPLACE FUNCTION public.sync_profile_address()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(trim(NEW.address_street), '') <> ''
     OR coalesce(trim(NEW.address_house_number), '') <> ''
     OR coalesce(trim(NEW.address_postal_code), '') <> ''
     OR coalesce(trim(NEW.address_city), '') <> ''
     OR coalesce(trim(NEW.address_line_2), '') <> '' THEN
    NEW.address := trim(both E'\n' from concat_ws(E'\n',
      trim(concat_ws(' ', nullif(trim(NEW.address_street), ''), nullif(trim(NEW.address_house_number), ''))),
      nullif(trim(NEW.address_line_2), ''),
      trim(concat_ws(' ', nullif(trim(NEW.address_postal_code), ''), nullif(trim(NEW.address_city), '')))
    ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_address ON public.profiles;

CREATE TRIGGER trg_sync_profile_address
  BEFORE INSERT OR UPDATE OF address_street, address_house_number, address_line_2, address_postal_code, address_city
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_address();
