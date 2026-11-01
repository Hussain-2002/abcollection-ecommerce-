"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Reveal } from "@/components/Reveal";
import { ProductCard } from "@/components/site/ProductCard";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { Product } from "@/lib/catalog-types";
import { variantHasStock } from "@/lib/inventory";
import { parsePriceInr } from "@/lib/price";
import { colorSwatchClass } from "@/lib/product-colors";
import { SIZE_ORDER } from "@/lib/storefront";
import { cn } from "@/lib/utils";

type Sort = "featured" | "price-asc" | "price-desc";
type Density = "compact" | "large";

const SORTS: { value: Sort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
];

function sizeRank(size: string) {
  const index = SIZE_ORDER.indexOf(size.toUpperCase());
  return index < 0 ? SIZE_ORDER.length : index;
}

/** Product listing with a filter sheet (colour, size, stock), sort and a grid density toggle. */
export function ShopGrid({ products }: { products: Product[] }) {
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");
  const [density, setDensity] = useState<Density>("compact");
  const [panelOpen, setPanelOpen] = useState(false);

  const allColors = useMemo(
    () => Array.from(new Set(products.flatMap((product) => product.colors))),
    [products],
  );
  const allSizes = useMemo(
    () =>
      Array.from(new Set(products.flatMap((product) => product.sizes))).sort(
        (a, b) => sizeRank(a) - sizeRank(b),
      ),
    [products],
  );

  const results = useMemo(() => {
    const matches = products.flatMap((product) => {
      const colorPool = colors.length
        ? product.colors.filter((color) => colors.includes(color))
        : product.colors;
      if (!colorPool.length) return [];
      const sizePool = sizes.length
        ? product.sizes.filter((size) => sizes.includes(size))
        : product.sizes;
      if (!sizePool.length) return [];
      const stocked = colorPool.filter((color) =>
        sizePool.some((size) => variantHasStock(product, color, size)),
      );
      // A size filter means "I can buy this size", so it implies stock.
      if ((inStockOnly || sizes.length) && !stocked.length) return [];
      return [{ product, color: stocked[0] ?? colorPool[0] ?? "" }];
    });
    if (sort === "featured") return matches;
    const direction = sort === "price-asc" ? 1 : -1;
    return [...matches].sort(
      (a, b) => direction * (parsePriceInr(a.product.price) - parsePriceInr(b.product.price)),
    );
  }, [colors, inStockOnly, products, sizes, sort]);

  const activeCount = colors.length + sizes.length + (inStockOnly ? 1 : 0);
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  const clearAll = () => {
    setColors([]);
    setSizes([]);
    setInStockOnly(false);
  };

  return (
    <>
      <div className="sticky top-[var(--header-h)] z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="page-wrap flex h-12 items-center justify-between gap-4 text-[0.72rem] tracking-[0.16em] uppercase">
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="inline-flex h-full items-center gap-2"
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.4} />
            Filter & sort{activeCount ? ` (${activeCount})` : ""}
          </button>
          <span className="hidden text-muted-foreground sm:inline" aria-live="polite">
            {results.length} {results.length === 1 ? "product" : "products"}
          </span>
          <div className="flex items-center gap-1" role="group" aria-label="Grid size">
            <DensityButton
              active={density === "compact"}
              onClick={() => setDensity("compact")}
              label="Small images"
              cells={4}
            />
            <DensityButton
              active={density === "large"}
              onClick={() => setDensity("large")}
              label="Large images"
              cells={2}
            />
          </div>
        </div>
      </div>

      <div className="page-wrap pt-5 pb-[clamp(3.5rem,8vw,7rem)]">
        {activeCount ? (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {colors.map((color) => (
              <Chip
                key={color}
                label={color}
                onRemove={() => setColors((list) => toggle(list, color))}
              />
            ))}
            {sizes.map((size) => (
              <Chip
                key={size}
                label={`Size ${size}`}
                onRemove={() => setSizes((list) => toggle(list, size))}
              />
            ))}
            {inStockOnly ? <Chip label="In stock" onRemove={() => setInStockOnly(false)} /> : null}
            <button
              type="button"
              onClick={clearAll}
              className="ml-1 text-[0.8rem] text-muted-foreground underline underline-offset-[3px]"
            >
              Clear all
            </button>
          </div>
        ) : null}

        {results.length ? (
          <div
            className={cn(
              "grid gap-x-2.5 gap-y-7 min-[900px]:gap-x-4 min-[900px]:gap-y-10",
              density === "compact"
                ? "grid-cols-2 min-[900px]:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2 min-[900px]:grid-cols-3",
            )}
          >
            {results.map(({ product, color }, index) => (
              <Reveal key={`${product.id}-${color}`} delay={(index % 4) * 60}>
                <ProductCard
                  product={product}
                  initialColor={color}
                  priority={index < 4}
                  sizes={
                    density === "compact"
                      ? "(min-width: 900px) 24vw, 48vw"
                      : "(min-width: 900px) 32vw, (min-width: 640px) 48vw, 96vw"
                  }
                />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="border border-border bg-paper px-6 py-16 text-center">
            <p className="text-lg font-light">Nothing matches those filters.</p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-5 min-h-11 border border-ink px-6 text-[0.72rem] tracking-[0.18em] uppercase transition-colors hover:bg-ink hover:text-white"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="flex w-full max-w-[26rem] flex-col gap-0 p-0">
          <div className="flex h-[var(--header-h)] shrink-0 items-center border-b border-border px-6 pr-14">
            <SheetTitle className="text-[0.78rem] font-medium tracking-[0.2em] uppercase">
              Filter & sort
            </SheetTitle>
            <SheetDescription className="sr-only">
              Narrow the collection by colour, size and stock, or change the order.
            </SheetDescription>
          </div>
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-6 py-6">
            <fieldset>
              <legend className="mb-3 text-[0.72rem] tracking-[0.16em] uppercase">Sort by</legend>
              <div className="grid gap-1">
                {SORTS.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-10 cursor-pointer items-center gap-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="sort"
                      value={option.value}
                      checked={sort === option.value}
                      onChange={() => setSort(option.value)}
                      className="size-4 accent-ink"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-[0.72rem] tracking-[0.16em] uppercase">Colour</legend>
              <div className="flex flex-wrap gap-2">
                {allColors.map((color) => {
                  const on = colors.includes(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setColors((list) => toggle(list, color))}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 border px-3 text-sm transition-colors",
                        on
                          ? "border-ink bg-ink text-white"
                          : "border-border bg-paper hover:border-ink",
                      )}
                    >
                      <i
                        className={cn(
                          "block size-3 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]",
                          colorSwatchClass(color),
                        )}
                      />
                      {color}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-[0.72rem] tracking-[0.16em] uppercase">
                Size (in stock)
              </legend>
              <div className="grid grid-cols-5 gap-1.5">
                {allSizes.map((size) => {
                  const on = sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSizes((list) => toggle(list, size))}
                      className={cn(
                        "h-11 border text-sm transition-colors",
                        on
                          ? "border-ink bg-ink text-white"
                          : "border-border bg-paper hover:border-ink",
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-border pt-5 text-sm">
              Only show items in stock
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
                className="size-4 accent-ink"
              />
            </label>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={clearAll}
              disabled={!activeCount}
              className="min-h-12 border border-ink text-[0.72rem] tracking-[0.18em] uppercase disabled:border-border disabled:text-muted-foreground"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="min-h-12 bg-ink text-[0.72rem] tracking-[0.18em] text-white uppercase hover:bg-[#333]"
            >
              Show {results.length}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex min-h-9 items-center gap-2 border border-border bg-paper px-3 text-[0.8rem] hover:border-ink"
      aria-label={`Remove filter: ${label}`}
    >
      {label}
      <X className="size-3.5" strokeWidth={1.5} />
    </button>
  );
}

function DensityButton({
  active,
  onClick,
  label,
  cells,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  cells: 2 | 4;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "grid size-9 place-items-center transition-opacity",
        active ? "opacity-100" : "opacity-40 hover:opacity-70",
      )}
    >
      <span
        aria-hidden
        className={cn("grid gap-[2px]", cells === 4 ? "grid-cols-2" : "grid-cols-1")}
      >
        {Array.from({ length: cells }, (_, index) => (
          <span
            key={index}
            className={cn("block bg-current", cells === 4 ? "size-[6px]" : "h-[6px] w-[14px]")}
          />
        ))}
      </span>
    </button>
  );
}
