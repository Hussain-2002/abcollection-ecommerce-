"use client";

import { BundleCard } from "@/components/bundles/Bundles";
import type { BundleOfferView } from "@/lib/store-offers";

/** Bundles that include this product, with photos and one-tap add. */
export function ProductBundleOffers({ bundles }: { bundles: BundleOfferView[] }) {
  if (!bundles.length) return null;
  return (
    <section className="mt-8 space-y-3" aria-label="Bundle offers">
      <p className="text-[0.72rem] tracking-[0.16em] uppercase">Bundle &amp; save</p>
      {bundles.map((bundle) => (
        <BundleCard key={bundle.id} bundle={bundle} layout="row" />
      ))}
    </section>
  );
}
