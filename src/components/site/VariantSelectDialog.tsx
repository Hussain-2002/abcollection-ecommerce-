"use client";

import { useEffect, useMemo, useState } from "react";

import { CatalogPrice } from "@/components/site/CatalogPrice";
import { ProductVariantPicker } from "@/components/site/ProductVariantPicker";
import { ProductImage } from "@/components/site/ProductImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { addToCartLabel, useAddToCart } from "@/hooks/use-add-to-cart";
import type { Product } from "@/lib/catalog-types";
import { colorToImageIndex } from "@/lib/product-colors";
import { isValidProductVariant, productVariantOptions } from "@/lib/product-variants";
import { variantHasStock } from "@/lib/inventory";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";

export function VariantSelectDialog({
  product,
  open,
  onOpenChange,
  initialColor = "",
  onAdded,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs after the item is in the bag (e.g. remove it from the wishlist). */
  onAdded?: () => void;
  initialColor?: string;
}) {
  const images = product.images?.length ? product.images : [product.image];
  const options = productVariantOptions(product);
  const { hasOffer } = useIstefadaOffer();
  const { status, error, run, isBusy } = useAddToCart();
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState("");

  useEffect(() => {
    if (!open) return;
    setColor(initialColor || "");
    setSize("");
  }, [open, initialColor]);

  const preview = useMemo(() => {
    if (!color) return product.image;
    const src = images[colorToImageIndex(color, product.colors, images, product.colorImages)] ?? "";
    return src.trim() ? src : product.image;
  }, [color, images, product.colorImages, product.colors, product.image]);

  const canAdd = isValidProductVariant(product, color, size);
  const inStock = !canAdd || variantHasStock(product, color, size);

  const submit = async () => {
    if (!canAdd || isBusy || !inStock) return;
    const result = await run({
      productId: product.id,
      color: color || options.soleColor || "Default",
      size: size || options.soleSize || "OS",
      quantity: 1,
    });
    if (result.ok) {
      onOpenChange(false);
      onAdded?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[min(100%,calc(100vw-1.5rem))] max-w-md flex-col gap-0 overflow-hidden bg-background p-0">
        <div className="flex h-[var(--header-h)] shrink-0 items-center border-b border-border px-5 pr-12">
          <DialogTitle className="text-[0.78rem] font-medium tracking-[0.2em] uppercase">
            Choose size
          </DialogTitle>
          <DialogDescription className="sr-only">
            Pick a colour and size for {product.name}
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <div className="flex gap-4">
            <ProductImage
              src={preview}
              alt={product.name}
              width={400}
              height={600}
              sizes="96px"
              className="aspect-[2/3] w-24 shrink-0 bg-sand object-cover"
            />
            <div className="min-w-0">
              <p className="text-[0.84rem] font-medium tracking-[0.1em] uppercase">
                {product.name}
              </p>
              <p className="mt-0.5 text-[0.8rem] text-muted-foreground">{product.fabric}</p>
              <div className="mt-2">
                <CatalogPrice
                  product={product}
                  hasOffer={hasOffer}
                  align="left"
                  color={color}
                  variantSize={size}
                />
              </div>
            </div>
          </div>
          <div className="mt-6">
            <ProductVariantPicker
              product={product}
              selectedColor={color}
              selectedSize={size}
              onColorChange={setColor}
              onSizeChange={setSize}
            />
          </div>
          {!canAdd ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Select {options.requiresColor && !color ? "a colour" : ""}
              {options.requiresColor && !color && options.requiresSize && !size ? " and " : ""}
              {options.requiresSize && !size ? "a size" : ""} to continue.
            </p>
          ) : !inStock ? (
            <p className="mt-4 text-sm text-destructive">
              This product/variant is currently out of stock.
            </p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="shrink-0 border-t border-border px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            disabled={!canAdd || isBusy || !inStock}
            onClick={() => void submit()}
            className="h-12 w-full bg-ink text-[0.78rem] font-normal tracking-[0.18em] text-white uppercase hover:bg-[#333]"
          >
            {canAdd && !inStock ? "Out of stock" : addToCartLabel(status)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
