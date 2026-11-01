"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useMemo, useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { CatalogPrice } from "@/components/site/CatalogPrice";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { ProductBadgeList } from "@/components/site/ProductBadgeList";
import { ProductImage } from "@/components/site/ProductImage";
import { VariantSelectDialog } from "@/components/site/VariantSelectDialog";
import { useAddToCart } from "@/hooks/use-add-to-cart";
import { productImageForColor } from "@/lib/cart-display";
import type { Product } from "@/lib/catalog-types";
import { productHasPurchasableStock, variantHasStock } from "@/lib/inventory";
import { colorSwatchClass } from "@/lib/product-colors";
import { resolveDirectCartVariant } from "@/lib/product-variants";
import { productHoverImage, productHref, titleCase } from "@/lib/storefront";
import { cn } from "@/lib/utils";

const MAX_DOTS = 3;

export function ProductCard({
  product,
  sizes = "(min-width: 900px) 24vw, 48vw",
  priority = false,
  initialColor,
}: {
  product: Product;
  sizes?: string;
  priority?: boolean;
  initialColor?: string;
}) {
  const { hasOffer } = useIstefadaOffer();
  const { toggleWishlist, wishlistIds } = useCommerce();
  const { status, error, run, isBusy } = useAddToCart();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [color, setColor] = useState(
    () =>
      (initialColor && product.colors.includes(initialColor) ? initialColor : undefined) ??
      product.colors.find((option) =>
        product.sizes.some((size) => variantHasStock(product, option, size)),
      ) ??
      product.colors[0] ??
      "",
  );
  const direct = resolveDirectCartVariant(product);
  const soldOut = !productHasPurchasableStock(product);
  const wished = wishlistIds.has(product.id);
  const href = productHref(product);
  const name = titleCase(product.name);

  const primary = useMemo(
    () => (color ? productImageForColor(product, color) : product.image),
    [color, product],
  );
  const hover = useMemo(() => productHoverImage(product, color), [color, product]);

  const quickAdd = (size: string) => {
    if (isBusy) return;
    void run({ productId: product.id, color, size, quantity: 1 });
  };

  const chooseSize = () => {
    if (soldOut || isBusy) return;
    if (direct) {
      void run(direct);
      return;
    }
    setPickerOpen(true);
  };

  return (
    <article className="group relative min-w-0">
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        <Link
          href={href}
          aria-label={`${name}, ${color || product.fabric}`}
          className="absolute inset-0"
        >
          <ProductImage
            src={primary}
            alt={`${name} in ${color || "default"}`}
            width={900}
            height={1350}
            sizes={sizes}
            priority={priority}
            className="absolute inset-0 size-full object-cover transition-transform duration-1000 ease-[var(--ease-brand)] can-hover:group-hover:scale-[1.03]"
          />
          {hover ? (
            <ProductImage
              src={hover}
              alt=""
              width={900}
              height={1350}
              sizes={sizes}
              className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 ease-[var(--ease-brand)] can-hover:group-hover:opacity-100"
            />
          ) : null}
        </Link>

        <ProductBadgeList product={product} limit={1} className="absolute top-2.5 left-2.5 z-[2]" />

        <button
          type="button"
          aria-pressed={wished}
          aria-label={wished ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
          onClick={() => void toggleWishlist(product.id)}
          className="absolute top-1 right-1 z-[2] grid size-11 place-items-center"
        >
          <Heart
            className={cn(
              "size-5 transition-[transform,color,fill] duration-200",
              wished ? "scale-110 fill-[#b5562f] text-[#b5562f]" : "fill-white/60 text-ink",
            )}
            strokeWidth={1.3}
          />
        </button>

        {!direct && !soldOut ? (
          <div
            role="group"
            aria-label={`Quick add ${name}`}
            className="absolute inset-x-2 bottom-2 z-[2] hidden translate-y-[calc(100%+0.6rem)] bg-white/95 p-2.5 transition-transform duration-[450ms] ease-[var(--ease-brand)] can-hover:block can-hover:group-focus-within:translate-y-0 can-hover:group-hover:translate-y-0"
          >
            <p className="mb-1.5 text-center text-[0.66rem] tracking-[0.16em] text-muted-foreground uppercase">
              {status === "added" ? "Added to bag" : `Quick add · ${color}`}
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              {product.sizes.map((size) => {
                const inStock = variantHasStock(product, color, size);
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!inStock || isBusy}
                    onClick={() => quickAdd(size)}
                    aria-label={inStock ? `Add size ${size} to bag` : `Size ${size} sold out`}
                    className="h-9 min-w-10 border border-border bg-white px-1.5 text-[0.78rem] transition-[background-color,color,border-color,transform] duration-150 active:scale-95 hover:border-ink hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:text-muted-foreground/60 disabled:line-through disabled:hover:border-border disabled:hover:bg-white"
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-0.5 pt-3">
        {/* One line each so every card in a row lines up; full name on hover/long-press. */}
        <h3
          title={product.name}
          className="truncate text-[0.8rem] leading-snug font-medium tracking-[0.08em] uppercase sm:text-[0.84rem] sm:tracking-[0.1em]"
        >
          <Link href={href} className="underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="truncate text-[0.74rem] text-muted-foreground sm:text-[0.78rem]">
          {product.fabric}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center justify-between gap-1.5">
          <div className="min-w-0 overflow-hidden">
            <CatalogPrice product={product} hasOffer={hasOffer} align="left" />
          </div>
          {product.colors.length > 1 ? (
            <ul className="-mr-1 flex shrink-0 items-center" aria-label={`${name} colours`}>
              {product.colors.slice(0, MAX_DOTS).map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    aria-label={option}
                    aria-pressed={option === color}
                    title={option}
                    onClick={() => setColor(option)}
                    className="grid size-5 place-items-center sm:size-6"
                  >
                    <i
                      className={cn(
                        "block size-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]",
                        colorSwatchClass(option),
                        option === color && "ring-1 ring-ink ring-offset-2 ring-offset-background",
                      )}
                    />
                  </button>
                </li>
              ))}
              {product.colors.length > MAX_DOTS ? (
                <li className="pl-0.5 text-[0.68rem] text-muted-foreground">
                  +{product.colors.length - MAX_DOTS}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          onClick={chooseSize}
          disabled={soldOut || isBusy}
          className={cn(
            "mt-2 min-h-10 border border-ink px-3 text-[0.66rem] tracking-[0.18em] uppercase transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent",
            !direct && !soldOut && "can-hover:hidden",
          )}
        >
          {soldOut
            ? "Sold out"
            : direct
              ? status === "added"
                ? "Added"
                : "Add to bag"
              : "Choose size"}
        </button>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>

      {!direct ? (
        <VariantSelectDialog
          product={product}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initialColor={color}
        />
      ) : null}
    </article>
  );
}
