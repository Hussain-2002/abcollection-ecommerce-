"use client";

import { ColorSwatchRow } from "@/components/site/ColorSwatchRow";
import type { Product } from "@/lib/catalog-types";
import { availableStock, stockStatusLabel, variantHasStock } from "@/lib/inventory";
import { productVariantOptions } from "@/lib/product-variants";
import { cn } from "@/lib/utils";

/** Colour swatches with the colour name, then square size buttons (sold-out sizes struck through). */
export function ProductVariantPicker({
  product,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
  onSizeGuide,
}: {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
  onSizeGuide?: (() => void) | undefined;
}) {
  const options = productVariantOptions(product);
  const selectedStock = availableStock(product, selectedColor, selectedSize);
  const showStock = Boolean(product.variants?.length && selectedColor && selectedSize);

  return (
    <div className="space-y-5">
      {options.requiresColor ? (
        <fieldset>
          <legend className="mb-2.5 text-[0.72rem] tracking-[0.16em] uppercase">
            Colour <span className="font-medium">{selectedColor}</span>
          </legend>
          <ColorSwatchRow
            colors={options.colors}
            selected={selectedColor}
            onSelect={onColorChange}
            label={`${product.name} colours`}
            isAvailable={(color) =>
              options.sizes.some((size) => variantHasStock(product, color, size))
            }
          />
        </fieldset>
      ) : null}

      {options.requiresSize ? (
        <fieldset>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <legend className="text-[0.72rem] tracking-[0.16em] uppercase">
              Size <span className="font-medium">{selectedSize}</span>
            </legend>
            {onSizeGuide ? (
              <button
                type="button"
                onClick={onSizeGuide}
                className="text-[0.8rem] text-muted-foreground underline underline-offset-[3px] hover:text-foreground"
              >
                Size guide
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap">
            {options.sizes.map((size) => {
              const selected = size === selectedSize;
              const inStock = !selectedColor || variantHasStock(product, selectedColor, size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={selected}
                  aria-label={inStock ? `Size ${size}` : `Size ${size}, sold out`}
                  disabled={!inStock}
                  onClick={() => onSizeChange(size)}
                  className={cn(
                    "relative inline-flex h-11 min-w-12 items-center justify-center overflow-hidden border px-3 text-sm transition-colors",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-paper hover:border-foreground",
                    !inStock &&
                      "cursor-not-allowed text-muted-foreground hover:border-border after:absolute after:inset-x-0 after:top-1/2 after:h-px after:-rotate-[20deg] after:bg-muted-foreground/50",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {showStock ? (
        <p
          className={cn(
            "text-sm",
            selectedStock <= 0
              ? "text-destructive"
              : selectedStock <= 5
                ? "text-[#9a3412]"
                : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {stockStatusLabel(selectedStock)}
        </p>
      ) : null}
    </div>
  );
}
