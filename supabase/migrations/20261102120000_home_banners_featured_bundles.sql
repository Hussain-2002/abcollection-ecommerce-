-- Homepage hero banners managed from the admin, and featured bundles on the homepage.

ALTER TABLE public.bundle_offers ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.storefront_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hero_banners JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.storefront_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS storefront_settings_set_updated_at ON public.storefront_settings;
CREATE TRIGGER storefront_settings_set_updated_at
  BEFORE UPDATE ON public.storefront_settings
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.storefront_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storefront_settings_public_read" ON public.storefront_settings;
CREATE POLICY "storefront_settings_public_read"
  ON public.storefront_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.storefront_settings TO anon, authenticated;
GRANT ALL ON public.storefront_settings TO service_role;
