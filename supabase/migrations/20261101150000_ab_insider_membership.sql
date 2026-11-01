-- AB Insider Membership: paid or admin-granted membership that unlocks member
-- prices. All tables are server-only (RLS on, no policies); the app reads them
-- with the service role.

-- Programme settings: a single row (id = 1).
CREATE TABLE IF NOT EXISTS public.membership_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  programme_enabled boolean NOT NULL DEFAULT false,
  membership_fee integer NOT NULL DEFAULT 0 CHECK (membership_fee >= 0),
  default_validity_days integer NOT NULL DEFAULT 365 CHECK (default_validity_days BETWEEN 1 AND 3650),
  plan_name text NOT NULL DEFAULT 'AB Insider',
  description text NOT NULL DEFAULT '',
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms_content text NOT NULL DEFAULT '',
  terms_version integer NOT NULL DEFAULT 1,
  stack_coupons boolean NOT NULL DEFAULT false,
  stack_offers boolean NOT NULL DEFAULT false,
  stack_bundles boolean NOT NULL DEFAULT false,
  reminder_days integer NOT NULL DEFAULT 7 CHECK (reminder_days BETWEEN 0 AND 60),
  notify_on_grant boolean NOT NULL DEFAULT true,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.membership_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.customer_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'active', 'expired', 'failed', 'revoked')),
  source text NOT NULL CHECK (source IN ('paid', 'admin_granted')),
  plan_name text NOT NULL,
  fee_amount integer NOT NULL DEFAULT 0,
  validity_days integer NOT NULL,
  terms_version integer NOT NULL DEFAULT 1,
  purchased_at timestamptz,
  starts_at timestamptz,
  expires_at timestamptz,
  gateway_order_id text UNIQUE,
  granted_by text,
  grant_note text,
  revoked_at timestamptz,
  revoked_by text,
  revoke_reason text,
  activation_notified_at timestamptz,
  reminder_sent_at timestamptz,
  expiry_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_memberships_customer_idx
  ON public.customer_memberships (customer_id);
CREATE INDEX IF NOT EXISTS customer_memberships_status_idx
  ON public.customer_memberships (status, expires_at);

CREATE TABLE IF NOT EXISTS public.membership_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_membership_id uuid NOT NULL REFERENCES public.customer_memberships (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'cashfree',
  provider_order_id text NOT NULL UNIQUE,
  provider_payment_id text,
  amount integer NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.membership_product_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  -- NULL applies to every variant of the product; a variant row overrides it.
  variant_id uuid REFERENCES public.product_variants (id) ON DELETE CASCADE,
  is_eligible boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  pricing_type text NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'percent')),
  member_price integer CHECK (member_price IS NULL OR member_price >= 0),
  discount_percent numeric(5, 2) CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent < 100)),
  max_discount integer CHECK (max_discount IS NULL OR max_discount >= 0),
  min_allowed_price integer CHECK (min_allowed_price IS NULL OR min_allowed_price >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS membership_product_rules_target_idx
  ON public.membership_product_rules (product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE IF NOT EXISTS public.membership_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membership_audit_logs_created_idx
  ON public.membership_audit_logs (created_at DESC);

-- Member orders: which membership priced the order and how much it saved.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_membership_id uuid
  REFERENCES public.customer_memberships (id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS member_discount integer NOT NULL DEFAULT 0;

ALTER TABLE public.membership_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_product_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_audit_logs ENABLE ROW LEVEL SECURITY;
