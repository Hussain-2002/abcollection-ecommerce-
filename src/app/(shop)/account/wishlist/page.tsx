"use client";

import Link from "next/link";
import { Heart, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { CatalogPrice } from "@/components/site/CatalogPrice";
import { useCatalog } from "@/components/site/CatalogProvider";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductImage } from "@/components/site/ProductImage";
import { VariantSelectDialog } from "@/components/site/VariantSelectDialog";
import type { Product } from "@/lib/catalog-types";
import { colorSwatchClass } from "@/lib/product-colors";
import { resolveDirectCartVariant } from "@/lib/product-variants";
import { bestsellers, isSoldOut, productHoverImage, productHref } from "@/lib/storefront";
import { cn } from "@/lib/utils";

const press =
  "transition-[background-color,color,border-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";

export default function WishlistPage() {
  const { customer, loading, openAuth, wishlist, toggleWishlist, addToCart } = useCommerce();
  const { products } = useCatalog();
  const { hasOffer } = useIstefadaOffer();
  const [busy, setBusy] = useState<string | null>(null);
  const [picker, setPicker] = useState<Product | null>(null);

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account/wishlist" });
  }, [customer, loading, openAuth]);

  if (!customer) return <div className="min-h-[50vh]" />;

  const savedIds = new Set(wishlist.map((item) => item.productId));
  const suggestions = bestsellers(products)
    .filter((product) => !savedIds.has(product.id))
    .slice(0, 4);

  const moveToBag = async (product: Product) => {
    const direct = resolveDirectCartVariant(product);
    if (!direct) {
      setPicker(product);
      return;
    }
    setBusy(product.id);
    const result = await addToCart(direct);
    if (result.ok) await toggleWishlist(product.id);
    setBusy(null);
  };

  return (
    <div className="page-wrap py-[clamp(2.5rem,6vw,4rem)]">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        ← My account
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="editorial text-[clamp(2.4rem,6vw,3.8rem)] leading-none">Wishlist</h1>
        {wishlist.length ? (
          <p className="text-sm text-muted-foreground">
            {wishlist.length} saved piece{wishlist.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {!wishlist.length ? (
        <>
          <div className="mt-10 grid place-items-center border border-border bg-paper px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-muted">
              <Heart className="size-6" strokeWidth={1.4} />
            </span>
            <p className="mt-5 text-xl font-light">Nothing saved yet</p>
            <p className="mt-2 max-w-[36ch] text-sm text-muted-foreground">
              Tap the heart on any piece to keep it here for later.
            </p>
            <Link
              href="/collection"
              className={cn(
                "mt-7 inline-flex min-h-12 items-center bg-ink px-8 text-[0.74rem] tracking-[0.18em] text-white uppercase hover:bg-[#333]",
                press,
              )}
            >
              Shop all
            </Link>
          </div>
          {suggestions.length ? (
            <section className="mt-14" aria-labelledby="suggestions-heading">
              <h2 id="suggestions-heading" className="text-[clamp(1.5rem,3vw,2.2rem)]">
                You might like
              </h2>
              <div className="mt-6 grid grid-cols-2 gap-x-2.5 gap-y-7 min-[900px]:grid-cols-4 min-[900px]:gap-x-4">
                {suggestions.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-2.5 gap-y-8 sm:grid-cols-3 min-[1100px]:grid-cols-4 min-[1100px]:gap-x-4">
          {wishlist.map((item) => {
            const product = products.find((row) => row.id === item.productId);
            const soldOut = product ? isSoldOut(product) : true;
            const hover = product ? productHoverImage(product, product.colors[0] ?? "") : "";
            return (
              <li key={item.id} className="group relative min-w-0">
                <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                  <Link
                    href={product ? productHref(product) : "/collection"}
                    className="absolute inset-0"
                    aria-label={item.productName}
                  >
                    <ProductImage
                      src={item.productImage}
                      alt={item.productName}
                      width={900}
                      height={1350}
                      sizes="(min-width: 1100px) 24vw, (min-width: 640px) 32vw, 48vw"
                      className={cn(
                        "absolute inset-0 size-full object-cover transition-transform duration-1000 ease-[var(--ease-brand)] can-hover:group-hover:scale-[1.03]",
                        soldOut && "opacity-60",
                      )}
                    />
                    {hover && !soldOut ? (
                      <ProductImage
                        src={hover}
                        alt=""
                        width={900}
                        height={1350}
                        sizes="(min-width: 1100px) 24vw, 48vw"
                        className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 can-hover:group-hover:opacity-100"
                      />
                    ) : null}
                  </Link>
                  {soldOut ? (
                    <span className="absolute top-2.5 left-2.5 bg-ink px-2 py-1 text-[0.6rem] tracking-[0.16em] text-white uppercase">
                      {product ? "Sold out" : "Unavailable"}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void toggleWishlist(item.productId)}
                    aria-label={`Remove ${item.productName} from wishlist`}
                    className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full bg-white/90 text-ink transition-[transform,background-color] duration-150 hover:bg-white active:scale-90"
                  >
                    <X className="size-4" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="grid gap-0.5 pt-3">
                  <h2 className="truncate text-[0.8rem] font-medium tracking-[0.08em] uppercase sm:text-[0.84rem]">
                    {item.productName}
                  </h2>
                  {product ? (
                    <>
                      <p className="truncate text-[0.74rem] text-muted-foreground sm:text-[0.78rem]">
                        {product.fabric}
                      </p>
                      <div className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
                        <div className="min-w-0 overflow-hidden">
                          <CatalogPrice product={product} hasOffer={hasOffer} align="left" />
                        </div>
                        <span
                          className="flex shrink-0 gap-1"
                          aria-label={`${product.colors.length} colours`}
                        >
                          {product.colors.slice(0, 3).map((color) => (
                            <i
                              key={color}
                              title={color}
                              className={cn(
                                "block size-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]",
                                colorSwatchClass(color),
                              )}
                            />
                          ))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[0.78rem] text-muted-foreground">No longer available</p>
                  )}
                  <button
                    type="button"
                    disabled={!product || soldOut || busy === item.productId}
                    onClick={() => product && void moveToBag(product)}
                    className={cn(
                      "mt-2 min-h-10 bg-ink px-3 text-[0.66rem] tracking-[0.18em] text-white uppercase hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
                      press,
                    )}
                  >
                    {soldOut ? "Sold out" : busy === item.productId ? "Adding…" : "Move to bag"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {picker ? (
        <VariantSelectDialog
          product={picker}
          open
          onOpenChange={(open) => (open ? undefined : setPicker(null))}
          onAdded={() => void toggleWishlist(picker.id)}
        />
      ) : null}
    </div>
  );
}
