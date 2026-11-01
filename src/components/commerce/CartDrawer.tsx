"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Minus, Plus, Truck, X } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useCatalog } from "@/components/site/CatalogProvider";
import { ColorSwatchRow } from "@/components/site/ColorSwatchRow";
import { ProductImage } from "@/components/site/ProductImage";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildDisplayCartLines,
  linePricing,
  bestQualifyingBundle,
  validateDisplayCartLines,
  type DisplayCartLine,
} from "@/lib/cart-display";
import {
  LOW_STOCK_THRESHOLD,
  availableStock,
  productHasPurchasableStock,
  quantityCap,
  stockStatusLabel,
  variantHasStock,
} from "@/lib/inventory";
import { cn } from "@/lib/utils";
import { CART_MAX_QUANTITY } from "@/lib/commerce-constants";
import { formatInr, parsePriceInr } from "@/lib/price";
import { useMemberPricing } from "@/components/membership/MembershipProvider";
import { resolveIstefadaDiscount } from "@/lib/istefada-offer";
import type { BundleOfferView } from "@/lib/store-offers";

export function CartDrawer() {
  const router = useRouter();
  const {
    customer,
    cart,
    guestCart,
    cartDrawerOpen,
    closeCart,
    cartCount,
    openAuth,
    updateCartQuantity,
    updateCartVariant,
    removeFromCart,
  } = useCommerce();
  const { products } = useCatalog();
  const { hasOffer, promoCode, discountInr } = useIstefadaOffer();
  const [bundles, setBundles] = useState<BundleOfferView[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const fetchedBundles = useRef(false);

  useEffect(() => {
    if (!cartDrawerOpen || fetchedBundles.current) return;
    fetchedBundles.current = true;
    void fetch("/api/bundles")
      .then((res) => res.json())
      .then((data: { bundles?: BundleOfferView[] }) => setBundles(data.bundles ?? []))
      .catch(() => setBundles([]));
  }, [cartDrawerOpen]);

  const lines = useMemo(
    () =>
      buildDisplayCartLines({
        customer: Boolean(customer),
        cart,
        guestCart,
        products,
      }),
    [customer, cart, guestCart, products],
  );

  const issues = useMemo(() => validateDisplayCartLines(lines, products), [lines, products]);
  const issueByKey = useMemo(
    () => Object.fromEntries(issues.map((issue) => [issue.key, issue])),
    [issues],
  );
  // AB Insider prices for display; checkout recalculates everything on the server.
  const member = useMemberPricing(lines);
  const suggestions = useMemo(() => {
    const inBag = new Set(lines.map((line) => line.productId));
    return products
      .filter((product) => !inBag.has(product.id) && productHasPurchasableStock(product))
      .slice(0, 4);
  }, [lines, products]);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = hasOffer ? resolveIstefadaDiscount(promoCode, member.offerLines) : 0;
  const appliedBundle = bestQualifyingBundle(bundles, member.bundleLines);
  const bundleSavings = appliedBundle?.savings ?? 0;
  const total = Math.max(0, subtotal - member.memberSavings - discount - bundleSavings);

  const checkout = () => {
    closeCart();
    router.push("/checkout");
  };

  return (
    <Sheet open={cartDrawerOpen} onOpenChange={(open) => (open ? undefined : closeCart())}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-[min(100%,27.5rem)] flex-col gap-0 bg-background p-0"
      >
        <SheetHeader className="flex h-[var(--header-h)] shrink-0 flex-row items-center gap-3 space-y-0 border-b border-border px-5 pr-14 text-left">
          <SheetTitle className="text-[0.78rem] font-medium tracking-[0.2em] uppercase">
            Your bag
          </SheetTitle>
          <SheetDescription className="text-[0.78rem]">
            {cartCount ? `(${cartCount})` : ""}
          </SheetDescription>
        </SheetHeader>
        <p className="sr-only" aria-live="polite">
          {cartCount ? `${cartCount} items in your cart.` : "Your cart is empty."}
        </p>
        {lines.length ? (
          <p className="flex shrink-0 items-center gap-2 border-b border-border bg-paper px-5 py-2.5 text-xs">
            <Truck className="size-3.5" strokeWidth={1.4} aria-hidden />
            Free shipping across India on this order
          </p>
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {lines.length ? (
            <>
              <ul>
                {member.lines.map((line) => (
                  <CartDrawerItem
                    key={line.key}
                    line={line}
                    issue={issueByKey[line.key]}
                    hasOffer={hasOffer}
                    busy={busyKey === line.key}
                    onBusy={setBusyKey}
                    onQuantity={updateCartQuantity}
                    onVariant={updateCartVariant}
                    onRemove={removeFromCart}
                    onNavigate={closeCart}
                  />
                ))}
              </ul>
              {suggestions.length ? (
                <section
                  className="mt-6 border-t border-border pt-5"
                  aria-labelledby="bag-suggestions"
                >
                  <h3
                    id="bag-suggestions"
                    className="text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase"
                  >
                    You might also like
                  </h3>
                  <ul className="no-scrollbar mt-3 grid auto-cols-[42%] grid-flow-col gap-2.5 overflow-x-auto">
                    {suggestions.map((product) => (
                      <li key={product.id}>
                        <Link
                          href={`/collection/${product.id}`}
                          onClick={closeCart}
                          className="group block"
                        >
                          <ProductImage
                            src={product.image}
                            alt=""
                            width={300}
                            height={450}
                            sizes="160px"
                            className="aspect-[2/3] w-full bg-muted object-cover"
                          />
                          <span className="mt-2 block truncate text-[0.7rem] tracking-[0.08em] uppercase group-hover:underline">
                            {product.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatInr(parsePriceInr(product.price))}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg font-light">Your bag is empty.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Heavyweight essentials, free shipping across India.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  router.push("/collection");
                }}
                className="mt-6 min-h-12 border border-ink px-8 text-[0.74rem] tracking-[0.18em] uppercase transition-colors hover:bg-ink hover:text-white"
              >
                Shop all
              </button>
            </div>
          )}

          {appliedBundle ? (
            <div className="mt-6">
              <div className="border border-border bg-paper px-4 py-3">
                <p className="text-[0.7rem] tracking-[0.16em] uppercase">Bundle offer applied</p>
                <p className="mt-1 text-sm font-medium">{appliedBundle.title}</p>
                {appliedBundle.savings > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Save {appliedBundle.savingsLabel} ({appliedBundle.savingsPercent}%) on this set
                    at checkout.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {lines.length ? (
            <div className="mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatInr(subtotal)}</span>
              </div>
              {member.memberSavings > 0 ? (
                <div className="flex justify-between">
                  <span>AB Insider prices</span>
                  <span>-{formatInr(member.memberSavings)}</span>
                </div>
              ) : null}
              {discount > 0 ? (
                <div className="flex justify-between text-teal">
                  <span>
                    Istefada ₹{discountInr} × {cartCount}
                  </span>
                  <span>-{formatInr(discount)}</span>
                </div>
              ) : null}
              {bundleSavings > 0 ? (
                <div className="flex justify-between text-teal">
                  <span>{appliedBundle?.title || "Bundle"}</span>
                  <span>-{formatInr(bundleSavings)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2.5 text-base">
                <span>Total</span>
                <span className="font-medium">{formatInr(total)}</span>
              </div>
            </div>
          ) : null}
          <Button
            type="button"
            disabled={!lines.length || issues.length > 0}
            onClick={checkout}
            className="h-12 w-full bg-ink text-[0.78rem] font-normal tracking-[0.18em] text-white uppercase hover:bg-[#333] transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
          >
            Checkout securely
          </Button>
          <button
            type="button"
            onClick={closeCart}
            className="mt-2 w-full py-2 text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Continue shopping
          </button>
          {issues.length ? (
            <p className="mt-3 text-center text-xs text-destructive">
              Update unavailable quantities before checking out.
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CartDrawerItem({
  line,
  issue,
  hasOffer,
  busy,
  onBusy,
  onQuantity,
  onVariant,
  onRemove,
  onNavigate,
}: {
  line: DisplayCartLine & { isMemberPriced?: boolean; regularUnitPrice?: number };
  issue?: { message: string } | undefined;
  hasOffer: boolean;
  busy: boolean;
  onBusy: (key: string | null) => void;
  onQuantity: (itemId: string, quantity: number) => Promise<{ ok: boolean; error?: string }>;
  onVariant: (
    itemId: string,
    size: string,
    color: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  onRemove: (itemId: string) => Promise<{ ok: boolean; error?: string }>;
  onNavigate: () => void;
}) {
  const priced = linePricing(line, hasOffer && !line.isMemberPriced);
  const colors = line.product?.colors ?? [];
  const sizes = line.product?.sizes ?? [];
  const stock = availableStock(line.product, line.color, line.size, CART_MAX_QUANTITY);
  const maxQty = quantityCap(stock);
  const [qty, setQty] = useState(line.quantity);
  const [editing, setEditing] = useState(false);
  const editable = colors.length > 1 || sizes.length > 1;
  const href = `/collection/${line.productId}`;

  useEffect(() => {
    setQty(line.quantity);
  }, [line.quantity]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    if (busy) return;
    onBusy(line.key);
    await fn();
    onBusy(null);
  };

  const changeQty = (next: number) => {
    const clamped = Math.max(0, Math.min(maxQty || 0, next));
    setQty(clamped || 0);
    void onQuantity(line.key, clamped);
  };

  return (
    <li className="flex min-w-0 gap-4 border-b border-border py-5 first:pt-1 last:border-b-0">
      <Link href={href} onClick={onNavigate} className="shrink-0 self-start">
        <ProductImage
          src={line.image}
          alt={line.name}
          width={192}
          height={288}
          sizes="80px"
          className="aspect-[2/3] w-[4.5rem] bg-muted object-cover sm:w-20"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={href}
            onClick={onNavigate}
            className="min-w-0 truncate pt-0.5 text-[0.78rem] font-medium tracking-[0.1em] uppercase hover:underline"
          >
            {line.name}
          </Link>
          <button
            type="button"
            aria-label={`Remove ${line.name}`}
            disabled={busy}
            onClick={() => void run(() => onRemove(line.key))}
            className="-mt-2 -mr-2 grid size-9 shrink-0 place-items-center text-muted-foreground transition-[color,transform] duration-150 hover:text-foreground active:scale-90"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">
            {line.color} · {line.size}
          </span>
          {editable ? (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              aria-expanded={editing}
              className="shrink-0 text-xs text-foreground underline underline-offset-4"
            >
              {editing ? "Done" : "Edit"}
            </button>
          ) : null}
        </p>

        {editing ? (
          <div className="animate-in fade-in slide-in-from-top-1 mt-3 grid gap-3 duration-200">
            {colors.length > 1 ? (
              <ColorSwatchRow
                colors={colors}
                selected={line.color}
                disabled={busy}
                label={`Colour for ${line.name}`}
                onSelect={(color) => void run(() => onVariant(line.key, line.size, color))}
              />
            ) : null}
            {sizes.length > 1 ? (
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label={`Size for ${line.name}`}
              >
                {sizes.map((size) => {
                  const selected = size === line.size;
                  const available = variantHasStock(line.product, line.color, size);
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={busy || (!available && !selected)}
                      aria-pressed={selected}
                      onClick={() =>
                        !selected && void run(() => onVariant(line.key, size, line.color))
                      }
                      className={cn(
                        "h-9 min-w-10 border px-2 text-xs transition-colors",
                        selected
                          ? "border-ink bg-ink text-white"
                          : "border-border bg-paper hover:border-ink",
                        !available && !selected && "text-muted-foreground line-through",
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div
            className="inline-flex items-center border border-border"
            aria-label={`Quantity for ${line.name}`}
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={busy}
              onClick={() => changeQty(qty - 1)}
              className="grid size-8 place-items-center hover:bg-muted"
            >
              <Minus className="size-3" />
            </button>
            <span className="min-w-6 text-center text-sm" aria-live="polite">
              {qty !== line.quantity || busy ? (
                <Loader2 className="mx-auto size-3.5 animate-spin" />
              ) : (
                qty
              )}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={busy || qty >= maxQty}
              onClick={() => changeQty(qty + 1)}
              className="grid size-8 place-items-center hover:bg-muted disabled:opacity-40"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <div className="text-right">
            {line.isMemberPriced && line.regularUnitPrice ? (
              <p className="flex items-baseline justify-end gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground line-through">
                  {formatInr(line.regularUnitPrice * line.quantity)}
                </span>
                {formatInr(line.lineTotal)}
              </p>
            ) : hasOffer && priced.savings > 0 ? (
              <p className="flex items-baseline justify-end gap-1.5 text-sm">
                <span className="text-xs text-muted-foreground line-through">
                  {formatInr(priced.originalLine)}
                </span>
                {formatInr(priced.discountedLine)}
              </p>
            ) : (
              <p className="text-sm">{formatInr(line.lineTotal)}</p>
            )}
            {line.isMemberPriced ? (
              <p className="mt-0.5 text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
                Insider price
              </p>
            ) : line.quantity > 1 ? (
              <p className="text-xs text-muted-foreground">{formatInr(line.unitPrice)} each</p>
            ) : null}
          </div>
        </div>
        {issue ? (
          <p className="mt-2 text-xs text-destructive">{issue.message}</p>
        ) : stock > 0 && stock <= LOW_STOCK_THRESHOLD ? (
          <p className="mt-2 text-xs text-[#9a3412]">{stockStatusLabel(stock)}</p>
        ) : null}
      </div>
    </li>
  );
}
