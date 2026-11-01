-- Bundle photos: shown on bundle cards in the shop, product pages and the bag.
ALTER TABLE public.bundle_offers ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';
