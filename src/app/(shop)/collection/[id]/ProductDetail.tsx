"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Minus, Plus } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LineIcon } from "@/components/site/Brand";
import { CatalogPrice } from "@/components/site/CatalogPrice";
import { useCatalog } from "@/components/site/CatalogProvider";
import { ProductBadgeList } from "@/components/site/ProductBadgeList";
import { ProductBundleOffers } from "@/components/site/ProductBundleOffers";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductImage } from "@/components/site/ProductImage";
import { ProductReviews } from "@/components/site/ProductReviews";
import { ProductVariantPicker } from "@/components/site/ProductVariantPicker";
import { StarRating } from "@/components/site/StarRating";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { addToCartLabel, useAddToCart } from "@/hooks/use-add-to-cart";
import { useInView } from "@/hooks/use-in-view";
import { useProductInventory } from "@/hooks/use-product-inventory";
import type { Product } from "@/lib/catalog-types";
import {
  availableStock,
  productHasPurchasableStock,
  quantityCap,
  stockStatusLabel,
  variantHasStock,
} from "@/lib/inventory";
import { cdnImageUrl } from "@/lib/media";
import { isValidProductVariant } from "@/lib/product-variants";
import type { ReviewListing } from "@/lib/reviews";
import type { DeliveryEstimate } from "@/lib/shipping";
import type { BundleOfferView } from "@/lib/store-offers";
import { colorImages, isSoldOut, titleCase } from "@/lib/storefront";
import { cn } from "@/lib/utils";
import { META_CURRENCY, fbqTrack } from "@/lib/meta-pixel";
import { parsePriceInr } from "@/lib/price";

function firstPurchasableVariant(product: Product) {
  const colors = product.colors.length ? product.colors : [""];
  const sizes = product.sizes.length ? product.sizes : ["M"];
  for (const color of colors) {
    const size = sizes.find((candidate) => variantHasStock(product, color, candidate));
    if (size) return { color, size };
  }
  return { color: colors[0] ?? "", size: "" };
}

const primaryButton =
  "inline-flex h-12 w-full items-center justify-center bg-ink px-6 text-[0.78rem] tracking-[0.18em] text-white uppercase transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";
const outlineButton =
  "inline-flex h-12 w-full items-center justify-center border border-ink px-6 text-[0.78rem] tracking-[0.18em] uppercase transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent";

export function ProductDetail({
  product,
  bundles,
  delivery,
  reviewListing,
}: {
  product: Product;
  bundles: BundleOfferView[];
  delivery: DeliveryEstimate;
  reviewListing?: ReviewListing | undefined;
}) {
  const liveProduct = useProductInventory(product);
  const { products } = useCatalog();
  const [initialVariant] = useState(() => firstPurchasableVariant(product));
  const [selectedColor, setSelectedColor] = useState(initialVariant.color);
  const [selectedSize, setSelectedSize] = useState(initialVariant.size);
  const [quantity, setQuantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const purchaseInView = useInView(purchaseRef);
  const { buyNow, toggleWishlist, wishlistIds, cartDrawerOpen } = useCommerce();
  const { status, error, run, isBusy } = useAddToCart();
  const { hasOffer } = useIstefadaOffer();
  const wished = wishlistIds.has(product.id);
  const hasSizeChart = Boolean(liveProduct.sizeChart?.trim());
  const stock = availableStock(liveProduct, selectedColor, selectedSize);
  const productSoldOut = !productHasPurchasableStock(liveProduct);
  const inStock = stock > 0;
  const maxQty = Math.max(1, quantityCap(stock) || 1);
  const variantReady = isValidProductVariant(liveProduct, selectedColor, selectedSize);
  const canPurchase = variantReady && inStock;
  const name = titleCase(product.name);

  const gallery = useMemo(() => {
    const own = colorImages(liveProduct, selectedColor);
    if (own.length) return own;
    const all = liveProduct.images?.length ? liveProduct.images : [liveProduct.image];
    return all.filter((src) => src.trim());
  }, [liveProduct, selectedColor]);

  const related = useMemo(
    () => products.filter((row) => row.id !== product.id && !isSoldOut(row)).slice(0, 8),
    [product.id, products],
  );

  useEffect(() => {
    setQuantity((current) => Math.min(current, maxQty));
  }, [maxQty]);

  useEffect(() => {
    setSlide(0);
    galleryRef.current?.scrollTo({ left: 0 });
  }, [selectedColor]);

  useEffect(() => {
    fbqTrack("ViewContent", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: parsePriceInr(product.price),
      currency: META_CURRENCY,
    });
  }, [product.id, product.name, product.price]);

  const selectColor = (color: string) => {
    setSelectedColor(color);
    if (!variantHasStock(liveProduct, color, selectedSize)) {
      const nextSize = liveProduct.sizes.find((size) => variantHasStock(liveProduct, color, size));
      setSelectedSize(nextSize ?? "");
    }
  };

  const onGalleryScroll = () => {
    const node = galleryRef.current;
    if (!node || !node.clientWidth) return;
    setSlide(Math.round(node.scrollLeft / node.clientWidth));
  };

  const selected = {
    productId: liveProduct.id,
    size: selectedSize,
    color: selectedColor,
    quantity,
  };
  const showStickyBar = !purchaseInView && !cartDrawerOpen;
  const cartLabel = !variantReady
    ? "Select a size"
    : inStock
      ? addToCartLabel(status)
      : "Out of stock";

  return (
    <>
      <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="lg:page-wrap lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12 lg:pt-6 xl:gap-16">
          {/* Gallery: swipe on mobile, stacked grid on desktop. */}
          <div className="min-w-0">
            <div className="relative lg:hidden">
              <div
                ref={galleryRef}
                onScroll={onGalleryScroll}
                className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
                aria-label={`${name} photos`}
              >
                {gallery.map((src, index) => (
                  <div key={`${src}-${index}`} className="w-full shrink-0 snap-start bg-muted">
                    <ProductImage
                      src={src}
                      alt={`${name} in ${selectedColor || "default"}, photo ${index + 1}`}
                      width={1200}
                      height={1800}
                      sizes="100vw"
                      priority={index === 0}
                      className="aspect-[2/3] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {gallery.length > 1 ? (
                <div
                  className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
                  aria-hidden
                >
                  {gallery.map((src, index) => (
                    <span
                      key={`${src}-dot-${index}`}
                      className={cn(
                        "h-0.5 w-6 transition-colors",
                        index === slide ? "bg-ink" : "bg-ink/25",
                      )}
                    />
                  ))}
                </div>
              ) : null}
              <ProductBadgeList product={liveProduct} className="absolute top-3 left-3" limit={2} />
            </div>

            <div
              className={cn(
                "hidden gap-1.5 lg:grid",
                gallery.length > 1 ? "grid-cols-2" : "grid-cols-1",
              )}
            >
              {gallery.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className={cn(
                    "bg-muted",
                    gallery.length > 2 && gallery.length % 2 === 1 && index === 0 && "col-span-2",
                  )}
                >
                  <ProductImage
                    src={src}
                    alt={`${name} in ${selectedColor || "default"}, photo ${index + 1}`}
                    width={1200}
                    height={1800}
                    sizes="(min-width: 1024px) 28vw, 100vw"
                    priority={index < 2}
                    className="aspect-[2/3] w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Info panel stays in view while the photos scroll on desktop. */}
          <div className="page-wrap pt-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start lg:px-0 lg:pt-0">
            <nav
              className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] tracking-[0.14em] text-muted-foreground uppercase"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span aria-hidden>/</span>
              <Link href="/collection" className="hover:text-foreground">
                Shop
              </Link>
            </nav>

            <ProductBadgeList product={liveProduct} className="mt-5 hidden lg:flex" />
            <h1 className="mt-3 text-[clamp(1.35rem,2.4vw,1.75rem)] leading-tight font-normal tracking-[0.06em] uppercase">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{product.fabric}</p>
            {reviewListing && reviewListing.summary.count > 0 ? (
              <a
                href="#reviews"
                className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <StarRating value={reviewListing.summary.average} size="sm" />
                <span>
                  {reviewListing.summary.average.toFixed(1)} · {reviewListing.summary.count} review
                  {reviewListing.summary.count === 1 ? "" : "s"}
                </span>
              </a>
            ) : null}

            <div className="mt-4">
              <CatalogPrice
                product={liveProduct}
                hasOffer={hasOffer}
                align="left"
                size="detail"
                color={selectedColor}
                variantSize={selectedSize}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Inclusive of all taxes · Free shipping
              </p>
              {productSoldOut ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  This product is currently sold out.
                </p>
              ) : null}
            </div>

            <div className="mt-7">
              <ProductVariantPicker
                product={liveProduct}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorChange={selectColor}
                onSizeChange={setSelectedSize}
                onSizeGuide={hasSizeChart ? () => setSizeChartOpen(true) : undefined}
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="text-[0.72rem] tracking-[0.16em] uppercase">Qty</span>
              <div className="inline-flex items-center border border-border" aria-label="Quantity">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={!inStock || quantity <= 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="grid size-10 place-items-center disabled:opacity-40"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="min-w-8 text-center text-sm" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={!inStock || quantity >= maxQty}
                  onClick={() => setQuantity((current) => Math.min(maxQty, current + 1))}
                  className="grid size-10 place-items-center disabled:opacity-40"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>

            <div ref={purchaseRef} className="mt-6 grid gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isBusy || !canPurchase}
                  onClick={() => void run(selected)}
                  className={primaryButton}
                >
                  {cartLabel}
                </button>
                <button
                  type="button"
                  aria-pressed={wished}
                  aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
                  onClick={() => void toggleWishlist(product.id)}
                  className="grid h-12 w-12 shrink-0 place-items-center border border-ink transition-colors hover:bg-ink hover:text-white"
                >
                  <Heart
                    className={cn("size-5", wished && "fill-[#b5562f] text-[#b5562f]")}
                    strokeWidth={1.3}
                  />
                </button>
              </div>
              <button
                type="button"
                onClick={() => void buyNow(selected)}
                disabled={!canPurchase}
                className={outlineButton}
              >
                Buy it now
              </button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>

            <ul className="mt-6 grid gap-3 border-y border-border py-5 text-sm">
              <li className="flex items-start gap-3">
                <LineIcon name="truck" className="size-5 shrink-0" />
                <span className={delivery.available ? "" : "text-muted-foreground"}>
                  {delivery.label}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <LineIcon name="exchange" className="size-5 shrink-0" />
                <span>
                  Exchange assurance on defects or wrong items.{" "}
                  <Link
                    href="/returns"
                    className="text-muted-foreground underline underline-offset-[3px]"
                  >
                    Details
                  </Link>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <LineIcon name="lock" className="size-5 shrink-0" />
                <span>Secure prepaid checkout: UPI, cards and netbanking.</span>
              </li>
            </ul>

            <Accordion type="multiple" defaultValue={["description"]} className="mt-2">
              <AccordionItem value="description">
                <AccordionTrigger className="text-[0.76rem] font-normal tracking-[0.16em] uppercase hover:no-underline">
                  Description
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed text-charcoal">{product.description}</p>
                </AccordionContent>
              </AccordionItem>
              {product.details.length ? (
                <AccordionItem value="details">
                  <AccordionTrigger className="text-[0.76rem] font-normal tracking-[0.16em] uppercase hover:no-underline">
                    Fabric & details
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc space-y-1.5 pl-4 text-sm text-charcoal">
                      {product.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ) : null}
              <AccordionItem value="shipping">
                <AccordionTrigger className="text-[0.76rem] font-normal tracking-[0.16em] uppercase hover:no-underline">
                  Shipping & exchanges
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm text-charcoal">
                    <p>
                      Free shipping across India. Orders are dispatched in 2–3 business days and
                      usually reach you 5–7 business days after dispatch.
                    </p>
                    <p>
                      Received a defective or wrong item? Report it within 2 days of delivery for an
                      exchange. Read the{" "}
                      <Link href="/shipping" className="underline underline-offset-[3px]">
                        shipping policy
                      </Link>{" "}
                      and{" "}
                      <Link href="/returns" className="underline underline-offset-[3px]">
                        exchange policy
                      </Link>
                      .
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <ProductBundleOffers bundles={bundles} />
          </div>
        </div>

        <div className="page-wrap">
          <ProductReviews
            productId={product.id}
            {...(reviewListing ? { initialListing: reviewListing } : {})}
          />
        </div>

        {related.length ? (
          <section
            className="page-wrap py-[clamp(3rem,6vw,5rem)]"
            aria-labelledby="related-heading"
          >
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id="related-heading" className="text-[clamp(1.6rem,3vw,2.4rem)]">
                You may also like
              </h2>
              <Link
                href="/collection"
                className="border-b border-current pb-0.5 text-[0.74rem] tracking-[0.18em] uppercase"
              >
                Shop all
              </Link>
            </div>
            <div className="no-scrollbar grid snap-x snap-mandatory auto-cols-[calc(62.5%-0.375rem)] grid-flow-col gap-2.5 overflow-x-auto overscroll-x-contain pb-2 min-[900px]:auto-cols-[calc(25%-0.75rem)] min-[900px]:gap-4">
              {related.map((row) => (
                <div key={row.id} className="snap-start">
                  <ProductCard product={row} sizes="(min-width: 900px) 25vw, 62vw" />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {hasSizeChart ? (
        <Dialog open={sizeChartOpen} onOpenChange={setSizeChartOpen}>
          <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[min(100%,calc(100vw-1.5rem))] max-w-lg flex-col gap-0 overflow-hidden bg-background p-0">
            <div className="flex h-[var(--header-h)] shrink-0 items-center border-b border-border px-5 pr-12">
              <DialogTitle className="text-[0.78rem] font-medium tracking-[0.2em] uppercase">
                Size guide
              </DialogTitle>
              <DialogDescription className="sr-only">
                Size chart for {product.name}
              </DialogDescription>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <img
                src={cdnImageUrl(product.sizeChart)}
                alt={`${product.name} size chart`}
                className="mx-auto w-full max-w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-200 lg:hidden",
          showStickyBar ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        aria-hidden={!showStickyBar}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.72rem] tracking-[0.12em] uppercase">
              {selectedColor}
              {selectedSize ? ` · ${selectedSize}` : ""}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {variantReady ? stockStatusLabel(stock) : "Select a size above"}
            </p>
          </div>
          <button
            type="button"
            tabIndex={showStickyBar ? 0 : -1}
            disabled={isBusy || !canPurchase}
            onClick={() => void run(selected)}
            className={cn(primaryButton, "w-auto shrink-0 px-5")}
          >
            {variantReady && inStock ? addToCartLabel(status) : "Add to bag"}
          </button>
        </div>
      </div>
    </>
  );
}
