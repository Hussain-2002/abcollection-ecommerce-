-- Guest checkout: shoppers can order without an account. Each guest checkout
-- gets its own customer row with status 'guest' and a password hash that can
-- never match, so guest rows can't be used to log in.
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_status_check CHECK (status IN ('active', 'disabled', 'guest'));
