"use client";

import Link from "next/link";
import { Loader2, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useCatalog } from "@/components/site/CatalogProvider";
import { ColorSwatchRow } from "@/components/site/ColorSwatchRow";
import { ProductImage } from "@/components/site/ProductImage";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { variantHasStock } from "@/lib/inventory";
import { formatInr } from "@/lib/price";
import { cartCoversBundleItems, type BundleOfferView } from "@/lib/store-offers";
import { cn } from "@/lib/utils";

const press =
  "transition-[background-color,color,border-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";

// ---------------------------------------------------------------- data

let bundlesPromise: Promise<BundleOfferView[]> | null = null;

/** Active bundles, fetched once per page load and shared by every component. */
export function useBundles(initial?: BundleOfferView[]) {
  const [bundles, setBundles] = useState<BundleOfferView[]>(initial ?? []);
  useEffect(() => {
    if (initial) return;
    bundlesPromise ??= fetch("/api/bundles")
      .then((res) => (res.ok ? res.json() : { bundles: [] }))
      .then((data: { bundles?: BundleOfferView[] }) => data.bundles ?? [])
      .catch(() => {
        bundlesPromise = null;
        return [];
      });
    let alive = true;
    void bundlesPromise.then((rows) => alive && setBundles(rows));
    return () => {
      alive = false;
    };
  }, [initial]);
  return bundles;
}

type LineLike = { productId: string; color?: string; quantity?: number };

/**
 * The bundle a shopper is closest to: at least one piece already in the bag,
 * some still missing. Prefers fewer missing pieces, then the bigger saving.
 */
export function bundleSuggestion(bundles: BundleOfferView[], lines: LineLike[]) {
  if (!lines.length) return null;
  // A bundle that already applies needs no nudge.
  if (bundles.some((bundle) => cartCoversBundleItems(bundle.items, lines))) return null;
  let best: { bundle: BundleOfferView; missing: number[]; matched: number } | null = null;
  for (const bundle of bundles) {
    if (bundle.savings <= 0) continue;
    const pool = lines.map((line) => ({ ...line, left: Math.max(0, line.quantity ?? 1) }));
    const missing: number[] = [];
    bundle.items.forEach((item, index) => {
      const hit = pool.find(
        (line) =>
          line.left > 0 && line.productId === item.id && (!item.color || line.color === item.color),
      );
      if (hit) hit.left -= 1;
      else missing.push(index);
    });
    const matched = bundle.items.length - missing.length;
    if (!matched || !missing.length) continue;
    if (
      !best ||
      missing.length < best.missing.length ||
      (missing.length === best.missing.length && bundle.savings > best.bundle.savings)
    ) {
      best = { bundle, missing, matched };
    }
  }
  return best;
}

// ---------------------------------------------------------------- visuals

function BundleVisual({
  bundle,
  className,
  sizes = "(min-width: 900px) 30vw, 80vw",
}: {
  bundle: BundleOfferView;
  className?: string;
  sizes?: string | undefined;
}) {
  const cover = bundle.images[0];
  if (cover) {
    return (
      <ProductImage
        src={cover}
        alt={`${bundle.title} bundle`}
        width={900}
        height={1125}
        sizes={sizes}
        className={cn("size-full object-cover", className)}
      />
    );
  }
  // No bundle photo yet: tile the pieces' own photos.
  const tiles = bundle.items.slice(0, 4);
  return (
    <div className={cn("grid size-full gap-px bg-border", "grid-cols-2", className)}>
      {tiles.map((item, index) => (
        <ProductImage
          key={`${item.id}-${index}`}
          src={item.image}
          alt=""
          width={400}
          height={600}
          sizes="20vw"
          className={cn(
            "size-full bg-muted object-cover",
            tiles.length === 3 && index === 0 && "row-span-2",
          )}
        />
      ))}
    </div>
  );
}

function SaveBadge({ bundle, className }: { bundle: BundleOfferView; className?: string }) {
  if (bundle.savings <= 0) return null;
  return (
    <span
      className={cn(
        "bg-ink px-2 py-1 text-[0.6rem] tracking-[0.16em] text-white uppercase",
        className,
      )}
    >
      Save {Math.round(bundle.savingsPercent)}%
    </span>
  );
}

/** Bundle card for the shop page and product pages. */
export function BundleCard({
  bundle,
  layout = "stack",
  className,
}: {
  bundle: BundleOfferView;
  layout?: "stack" | "row";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const row = layout === "row";
  return (
    <article
      className={cn(
        "group flex min-w-0 border border-border bg-paper",
        row ? "flex-row gap-4 p-3 sm:p-4" : "flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          row ? "aspect-[4/5] w-28 sm:w-32" : "aspect-[4/5] w-full",
        )}
      >
        <BundleVisual
          bundle={bundle}
          className="transition-transform duration-700 ease-[var(--ease-brand)] can-hover:group-hover:scale-[1.03]"
        />
        <SaveBadge bundle={bundle} className="absolute top-2.5 left-2.5" />
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col", row ? "" : "p-4 sm:p-5")}>
        <p className="text-[0.66rem] tracking-[0.18em] text-muted-foreground uppercase">
          Bundle · {bundle.items.length} pieces
        </p>
        <h3 className="mt-1 text-[0.95rem] leading-snug font-medium">{bundle.title}</h3>
        <ul className="mt-2 grid gap-0.5 text-[0.82rem] text-muted-foreground">
          {bundle.items.map((item, index) => (
            <li key={`${item.id}-${index}`} className="truncate">
              <Link
                href={`/collection/${item.id}`}
                className="hover:text-foreground hover:underline"
              >
                {item.name}
              </Link>
              {item.color ? ` · ${item.color}` : ""}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-4">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg">{bundle.bundlePriceLabel}</span>
            <span className="text-sm text-muted-foreground line-through">
              {bundle.individualTotalLabel}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            You save {bundle.savingsLabel} vs buying separately
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "mt-3 min-h-11 w-full bg-ink px-4 text-[0.7rem] tracking-[0.18em] text-white uppercase hover:bg-[#333]",
              press,
            )}
          >
            Add bundle to bag
          </button>
        </div>
      </div>
      <BundleAddDialog bundle={bundle} open={open} onOpenChange={setOpen} />
    </article>
  );
}

/** A bundle shown like any product card in the shop grid. */
export function BundleProductCard({ bundle, sizes }: { bundle: BundleOfferView; sizes?: string }) {
  const [open, setOpen] = useState(false);
  const names = Array.from(new Set(bundle.items.map((item) => item.name)));
  return (
    <article className="group relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${bundle.title}: choose sizes`}
        className="relative block aspect-[2/3] w-full overflow-hidden bg-muted"
      >
        <BundleVisual
          bundle={bundle}
          sizes={sizes}
          className="transition-transform duration-1000 ease-[var(--ease-brand)] can-hover:group-hover:scale-[1.03]"
        />
        <span className="absolute top-2.5 left-2.5 flex gap-1">
          <span className="bg-white px-2 py-1 text-[0.6rem] tracking-[0.16em] uppercase">
            Bundle
          </span>
          <SaveBadge bundle={bundle} />
        </span>
      </button>
      <div className="grid gap-0.5 pt-3">
        <h3
          title={bundle.title}
          className="truncate text-[0.8rem] leading-snug font-medium tracking-[0.08em] uppercase sm:text-[0.84rem] sm:tracking-[0.1em]"
        >
          {bundle.title}
        </h3>
        <p className="truncate text-[0.74rem] text-muted-foreground sm:text-[0.78rem]">
          {bundle.items.length} pieces ·{" "}
          {names.map((name) => name.replace(/^THE\s+/i, "")).join(", ")}
        </p>
        <p className="mt-0.5 flex min-w-0 items-baseline gap-2 whitespace-nowrap">
          <span className="text-[0.92rem]">{bundle.bundlePriceLabel}</span>
          <span className="truncate text-[0.7rem] text-muted-foreground line-through sm:text-xs">
            {bundle.individualTotalLabel}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "mt-2 min-h-10 border border-ink px-3 text-[0.66rem] tracking-[0.18em] uppercase hover:bg-ink hover:text-white",
            press,
          )}
        >
          Add bundle
        </button>
      </div>
      <BundleAddDialog bundle={bundle} open={open} onOpenChange={setOpen} />
    </article>
  );
}

/** Cart / checkout nudge: "Add these to complete the bundle and save". */
export function BundleNudge({ lines, className }: { lines: LineLike[]; className?: string }) {
  const bundles = useBundles();
  const suggestion = useMemo(() => bundleSuggestion(bundles, lines), [bundles, lines]);
  const [open, setOpen] = useState(false);
  if (!suggestion) return null;
  const { bundle, missing } = suggestion;
  const missingItems = missing.map((index) => bundle.items[index]!);
  return (
    <div className={cn("flex gap-3 border border-ink bg-paper p-3", className)}>
      <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-muted">
        <BundleVisual bundle={bundle} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[0.62rem] tracking-[0.18em] uppercase">
          <Package className="size-3.5" strokeWidth={1.5} aria-hidden />
          Complete the bundle
        </p>
        <p className="mt-1 text-sm leading-snug">
          Add{" "}
          {missingItems
            .map((item) => `${item.name}${item.color ? ` (${item.color})` : ""}`)
            .join(" + ")}{" "}
          and get <b className="font-medium">{bundle.title}</b> for {bundle.bundlePriceLabel}.
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          You save {bundle.savingsLabel} on the set.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "mt-2.5 min-h-9 border border-ink px-3 text-[0.64rem] tracking-[0.16em] uppercase hover:bg-ink hover:text-white",
            press,
          )}
        >
          Add {missingItems.length === 1 ? "it" : `${missingItems.length} pieces`}
        </button>
      </div>
      <BundleAddDialog bundle={bundle} only={missing} open={open} onOpenChange={setOpen} />
    </div>
  );
}

// ---------------------------------------------------------------- add dialog

type Choice = { color: string; size: string };

/** Pick a size (and colour when the bundle doesn't fix one) for each piece, then add them all. */
export function BundleAddDialog({
  bundle,
  only,
  open,
  onOpenChange,
}: {
  bundle: BundleOfferView;
  /** Item indexes to add (e.g. just the missing pieces). Defaults to all. */
  only?: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { products } = useCatalog();
  const { addToCart, openCart } = useCommerce();
  const indexes = useMemo(
    () => only ?? bundle.items.map((_, index) => index),
    [bundle.items, only],
  );
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const next: Record<number, Choice> = {};
    for (const index of indexes) {
      const item = bundle.items[index]!;
      const product = products.find((row) => row.id === item.id);
      const color = item.color || product?.colors[0] || "";
      // Sizes start unselected so shoppers pick their own fit.
      next[index] = { color, size: "" };
    }
    setChoices(next);
    setError("");
  }, [bundle.items, indexes, open, products]);

  const ready = indexes.every((index) => choices[index]?.size);

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      for (const index of indexes) {
        const item = bundle.items[index]!;
        const choice = choices[index]!;
        const result = await addToCart(
          { productId: item.id, color: choice.color, size: choice.size, quantity: 1 },
          { silent: true, skipDrawer: true },
        );
        if (!result.ok) throw new Error(result.error || `Couldn't add ${item.name}.`);
      }
      onOpenChange(false);
      toast.success(
        only
          ? "Bundle completed. The bundle price applies at checkout."
          : "Bundle added to your bag",
      );
      openCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the bundle. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[min(100%,calc(100vw-1.5rem))] max-w-lg flex-col gap-0 overflow-hidden bg-background p-0">
        <div className="flex h-[var(--header-h)] shrink-0 items-center border-b border-border px-5 pr-12">
          <DialogTitle className="truncate text-[0.78rem] font-medium tracking-[0.2em] uppercase">
            {only ? "Complete the bundle" : bundle.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose a size for each piece in {bundle.title}.
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
          {indexes.map((index) => {
            const item = bundle.items[index]!;
            const product = products.find((row) => row.id === item.id);
            const choice = choices[index] ?? { color: item.color, size: "" };
            return (
              <div
                key={`${item.id}-${index}`}
                className="flex gap-4 border-b border-border pb-4 last:border-b-0"
              >
                <ProductImage
                  src={item.image}
                  alt=""
                  width={200}
                  height={300}
                  sizes="72px"
                  className="aspect-[2/3] w-[4.5rem] shrink-0 bg-muted object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.8rem] font-medium tracking-[0.08em] uppercase">
                    {item.name}
                  </p>
                  {item.color || !product || product.colors.length < 2 ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{choice.color}</p>
                  ) : (
                    <ColorSwatchRow
                      className="mt-2"
                      colors={product.colors}
                      selected={choice.color}
                      label={`Colour for ${item.name}`}
                      onSelect={(color) =>
                        setChoices((current) => ({ ...current, [index]: { color, size: "" } }))
                      }
                    />
                  )}
                  <div
                    className="mt-2.5 flex flex-wrap gap-1"
                    role="group"
                    aria-label={`Size for ${item.name}`}
                  >
                    {(product?.sizes ?? []).map((size) => {
                      const available = product
                        ? variantHasStock(product, choice.color, size)
                        : false;
                      const selected = choice.size === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={!available}
                          aria-pressed={selected}
                          onClick={() =>
                            setChoices((current) => ({ ...current, [index]: { ...choice, size } }))
                          }
                          className={cn(
                            "h-9 min-w-10 border px-2 text-xs transition-colors",
                            selected
                              ? "border-ink bg-ink text-white"
                              : "border-border bg-paper hover:border-ink",
                            !available &&
                              "cursor-not-allowed text-muted-foreground line-through hover:border-border",
                          )}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 border-t border-border px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Bundle price</span>
            <span>
              <span className="mr-2 text-xs text-muted-foreground line-through">
                {bundle.individualTotalLabel}
              </span>
              {bundle.bundlePriceLabel}
            </span>
          </div>
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => void submit()}
            className={cn(
              "inline-flex min-h-12 w-full items-center justify-center gap-2 bg-ink text-[0.74rem] tracking-[0.18em] text-white uppercase hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40",
              press,
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {ready ? (only ? "Add to bag" : "Add bundle to bag") : "Choose sizes"}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            The bundle saving of {formatInr(bundle.savings)} is applied in the bag and at checkout.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
