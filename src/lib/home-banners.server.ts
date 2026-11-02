import "server-only";

import { cache } from "react";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { heroBannersSchema, type HeroBanner } from "@/lib/home-banners";
import { getSupabaseReadClient, getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

const MIGRATION_HINT =
  "Homepage banners need a database update first: run supabase/migrations/20261102120000_home_banners_featured_bundles.sql.";

async function loadBanners(): Promise<HeroBanner[]> {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("storefront_settings" as never)
    .select("hero_banners")
    .eq("id", "default")
    .maybeSingle();
  // Before the migration runs the homepage keeps its built-in banners.
  if (error || !data) return [];
  const parsed = heroBannersSchema.safeParse((data as { hero_banners: unknown }).hero_banners);
  return parsed.success ? parsed.data : [];
}

const BANNERS_CACHE_TAG = "hero-banners";

export const getHeroBanners = cache(
  unstable_cache(loadBanners, ["hero-banners"], {
    revalidate: 60,
    tags: [BANNERS_CACHE_TAG],
  }),
);

export async function saveHeroBanners(input: HeroBanner[]) {
  const banners = heroBannersSchema.parse(input);
  const supabase = getSupabaseWriteClient();
  const { error } = await supabase
    .from("storefront_settings" as never)
    .upsert({ id: "default", hero_banners: banners } as never);
  if (error) {
    if (/storefront_settings|hero_banners/.test(error.message)) throw new Error(MIGRATION_HINT);
    throw error;
  }
  revalidateTag(BANNERS_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/admin/banners");
  return banners;
}
