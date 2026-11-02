"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/Reveal";
import { BundleProductCard } from "@/components/bundles/Bundles";
import { LineIcon } from "@/components/site/Brand";
import { ProductCard } from "@/components/site/ProductCard";
import { ProductImage } from "@/components/site/ProductImage";
import { ReviewCard } from "@/components/site/ReviewCard";
import { StarRating } from "@/components/site/StarRating";
import { VariantSelectDialog } from "@/components/site/VariantSelectDialog";
import { productImageForColor } from "@/lib/cart-display";
import type { Collection, Product } from "@/lib/catalog-types";
import { HERO_BANNER_SIZES, type HeroBanner } from "@/lib/home-banners";
import { variantHasStock } from "@/lib/inventory";
import type { PublicReview, ReviewSummary } from "@/lib/reviews";
import type { BundleOfferView } from "@/lib/store-offers";
import { SITE_INSTAGRAM } from "@/lib/site";
import {
  TRUST_POINTS,
  bestsellers,
  fitTiles,
  heroSlides,
  isSoldOut,
  priceLabel,
  productHref,
  productModelImage,
  titleCase,
} from "@/lib/storefront";
import { cn } from "@/lib/utils";

const SLIDE_MS = 6500;

function SectionHead({
  eyebrow,
  title,
  id,
  action,
}: {
  eyebrow: string;
  title: string;
  id: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-[clamp(1.5rem,3vw,2.5rem)] flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h2 id={id} className="text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.05]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="border-b border-current pb-0.5 text-[0.74rem] tracking-[0.18em] uppercase"
    >
      {children}
    </Link>
  );
}

export function HomeHero({ products, banners }: { products: Product[]; banners: HeroBanner[] }) {
  const slides = heroSlides(products, banners);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      SLIDE_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  return (
    <section
      className="relative -mt-[var(--header-h)] flex min-h-[min(calc(100svh-var(--announce-h)),920px)] items-end overflow-hidden bg-[#2a2826] text-white max-sm:min-h-[min(calc(100svh-var(--announce-h)),760px)]"
      aria-roledescription="carousel"
      aria-label="Featured looks"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={`${index}-${slide.desktop}`}
          className={cn(
            "absolute inset-0 transition-opacity duration-[1200ms] ease-[var(--ease-brand)]",
            index === active ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={index !== active}
        >
          <picture>
            <source media="(max-width: 699px)" srcSet={slide.mobile} />
            <img
              src={slide.desktop}
              alt={slide.alt}
              width={HERO_BANNER_SIZES.desktop.width}
              height={HERO_BANNER_SIZES.desktop.height}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              decoding="async"
              className={cn("size-full object-cover", index === active && "animate-ken-burns")}
            />
          </picture>
        </div>
      ))}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.38)_0,rgba(0,0,0,0)_28%,rgba(0,0,0,0.08)_50%,rgba(0,0,0,0.68))]"
      />

      <div className="page-wrap relative z-[2] grid gap-[clamp(0.6rem,2vh,1.2rem)] pt-[calc(var(--header-h)+2rem)] pb-[clamp(1.6rem,6vh,4rem)] [text-shadow:0_1px_18px_rgba(0,0,0,0.18)]">
        <p className="text-[0.72rem] tracking-[0.22em] uppercase">Premium everyday essentials</p>
        <h1 className="editorial text-[clamp(2.6rem,min(9vw,15vh),8.4rem)] leading-[0.95] tracking-[-0.02em]">
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="animate-line-up inline-block">It&apos;s a manifesto</span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="animate-line-up inline-block [animation-delay:120ms]">
              to be <em>worn.</em>
            </span>
          </span>
        </h1>
        <p className="max-w-[40ch] text-[clamp(0.95rem,1.3vw,1.1rem)] text-[#f2eee8]">
          Heavyweight 240–300 GSM cotton essentials for everyday life. Timeless cuts, honest
          pricing, and premium comfort built to last.
        </p>
        <div className="flex flex-wrap gap-2.5 max-sm:[&>a]:flex-1">
          <Link
            href="/collection"
            className="inline-flex min-h-12 items-center justify-center border border-white px-6 text-[0.78rem] tracking-[0.18em] uppercase transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] hover:bg-white hover:text-ink max-sm:px-3 max-sm:text-[0.7rem] max-sm:tracking-[0.12em]"
          >
            Shop new arrivals
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-12 items-center justify-center border border-white px-6 text-[0.78rem] tracking-[0.18em] uppercase transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] hover:bg-white hover:text-ink max-sm:px-3 max-sm:text-[0.7rem] max-sm:tracking-[0.12em]"
          >
            Our story
          </Link>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="absolute right-[var(--page-pad)] bottom-[clamp(1.6rem,6vh,4rem)] z-[3] flex gap-1.5 max-sm:top-[calc(var(--header-h)+0.5rem)] max-sm:right-auto max-sm:bottom-auto max-sm:left-[var(--page-pad)]">
          {slides.map((slide, index) => (
            <button
              key={`${index}-${slide.desktop}`}
              type="button"
              aria-label={`Show slide ${index + 1}: ${slide.alt}`}
              aria-current={index === active}
              onClick={() => setActive(index)}
              className="grid size-11 place-items-center"
            >
              <span
                className={cn(
                  "h-0.5 w-7 transition-colors",
                  index === active ? "bg-white" : "bg-white/45",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function HomeFits({
  collections,
  products,
}: {
  collections: Collection[];
  products: Product[];
}) {
  const tiles = fitTiles(collections, products);
  if (!tiles.length) return null;
  return (
    <section className="py-[clamp(3.5rem,8vw,7rem)]" aria-labelledby="fits-heading">
      <div className="page-wrap">
        <Reveal>
          <SectionHead eyebrow="Shop by fit" title="Find your everyday" id="fits-heading" />
        </Reveal>
        <div className="grid grid-cols-2 gap-2.5 min-[900px]:grid-cols-5 min-[900px]:gap-3">
          {tiles.map((tile, index) => (
            <Reveal key={tile.href + tile.title} delay={index * 70}>
              <Link href={tile.href} className="group relative block overflow-hidden bg-sand">
                <div className="aspect-[3/4] overflow-hidden">
                  <ProductImage
                    src={tile.image}
                    alt=""
                    width={700}
                    height={933}
                    sizes="(min-width: 900px) 20vw, 50vw"
                    className="size-full object-cover object-[50%_20%] transition-transform duration-[900ms] ease-[var(--ease-brand)] group-hover:scale-[1.04]"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-0.5 bg-[linear-gradient(transparent,rgba(0,0,0,0.5))] p-3 text-white sm:p-4">
                  <b className="text-[0.72rem] font-medium tracking-[0.16em] uppercase [overflow-wrap:anywhere] sm:text-[0.82rem]">
                    {tile.title}
                  </b>
                  {tile.caption ? (
                    <small className="text-[0.64rem] opacity-85 sm:text-[0.72rem]">
                      {tile.caption}
                    </small>
                  ) : null}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeNewArrivals({ products }: { products: Product[] }) {
  const sizes = Array.from(new Set(products.flatMap((product) => product.sizes)));
  const range = sizes.length > 1 ? `${sizes[0]}–${sizes[sizes.length - 1]}` : (sizes[0] ?? "");
  return (
    <section className="pb-[clamp(3.5rem,8vw,7rem)]" aria-labelledby="new-heading">
      <div className="page-wrap">
        <Reveal>
          <SectionHead
            eyebrow="New arrivals"
            title="The first drop"
            id="new-heading"
            action={
              <div className="flex items-center gap-6">
                <span className="text-sm text-muted-foreground">
                  {products.length} pieces{range ? ` · ${range}` : ""}
                </span>
                <MoreLink href="/collection">Shop all</MoreLink>
              </div>
            }
          />
        </Reveal>
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-7 min-[900px]:grid-cols-4 min-[900px]:gap-x-4 min-[900px]:gap-y-10">
          {products.slice(0, 8).map((product, index) => (
            <Reveal key={product.id} delay={(index % 4) * 70}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeBundles({ bundles }: { bundles: BundleOfferView[] }) {
  if (!bundles.length) return null;
  return (
    <section className="pb-[clamp(3.5rem,8vw,7rem)]" aria-labelledby="bundles-heading">
      <div className="page-wrap">
        <Reveal>
          <SectionHead
            eyebrow="Bundles"
            title="Better together"
            id="bundles-heading"
            action={<MoreLink href="/collection">Shop all</MoreLink>}
          />
        </Reveal>
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-7 min-[900px]:grid-cols-4 min-[900px]:gap-x-4 min-[900px]:gap-y-10">
          {bundles.map((bundle, index) => (
            <Reveal key={bundle.id} delay={(index % 4) * 70}>
              <BundleProductCard bundle={bundle} sizes="(min-width: 900px) 25vw, 50vw" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeStory({ products }: { products: Product[] }) {
  const pick = products.find((product) => product.id === "terry-260") ?? products[0];
  const image = pick
    ? productModelImage(pick, pick.colors.includes("White") ? "White" : (pick.colors[0] ?? ""))
    : "";
  return (
    <section className="bg-paper py-[clamp(3.5rem,8vw,7rem)]" aria-labelledby="story-heading">
      <div className="page-wrap grid items-center gap-[clamp(1.5rem,4vw,4rem)] min-[900px]:grid-cols-[1.1fr_1fr]">
        {image ? (
          <Reveal>
            <figure className="m-0 aspect-[4/5] overflow-hidden bg-sand">
              <ProductImage
                src={image}
                alt="AB Collection heavyweight tee, worn"
                width={1200}
                height={1500}
                sizes="(min-width: 900px) 52vw, 100vw"
                className="size-full object-cover object-[50%_15%]"
              />
            </figure>
          </Reveal>
        ) : null}
        <Reveal delay={120}>
          <p className="eyebrow mb-3">Our story</p>
          <h2
            id="story-heading"
            className="editorial text-[clamp(2.2rem,4.6vw,4.4rem)] leading-none"
          >
            Built for the in-between.
          </h2>
          <div className="mt-6 max-w-[46ch] space-y-4 text-charcoal">
            <p>
              Most everyday clothing asks you to compromise. Either it feels good and falls apart,
              or it lasts and never feels like yours. AB Collection is premium construction without
              luxury pricing.
            </p>
            <p>
              We spent months on fabric weight, shrinkage and neck ribbing so you never have to
              think about any of it. Buy fewer things. Wear them for years.
            </p>
          </div>
          <ul className="my-8 grid grid-cols-2 gap-5">
            {[
              ["Comfort first", "How it feels on the third wash."],
              ["Timeless design", "Cuts that outlive trends."],
              ["Honest pricing", "Direct to you. No retail markup."],
              ["Made in India", "With partner units we visit ourselves."],
            ].map(([title, body]) => (
              <li key={title} className="border-t border-ink pt-3">
                <b className="block text-[0.76rem] font-medium tracking-[0.16em] uppercase">
                  {title}
                </b>
                <span className="text-[0.86rem] text-muted-foreground">{body}</span>
              </li>
            ))}
          </ul>
          <blockquote className="text-[clamp(1.2rem,1.8vw,1.6rem)] leading-[1.35]">
            “I kept buying tees that looked right in a photo and felt wrong by the third wash. So we
            built the one I wanted to wear.”
            <cite className="mt-4 block font-sans text-[0.7rem] font-medium tracking-[0.18em] text-muted-foreground uppercase not-italic">
              Abbas Badwahwala · Founder
            </cite>
          </blockquote>
        </Reveal>
      </div>
    </section>
  );
}

export function HomeBestsellers({ products }: { products: Product[] }) {
  const track = useRef<HTMLDivElement>(null);
  const cards = bestsellers(products).flatMap((product) =>
    product.colors
      .filter((color) => product.sizes.some((size) => variantHasStock(product, color, size)))
      .map((color) => ({ product, color })),
  );
  if (cards.length < 2) return null;

  const scroll = (direction: number) => {
    const node = track.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="py-[clamp(3.5rem,8vw,7rem)]" aria-labelledby="best-heading">
      <div className="page-wrap">
        <Reveal>
          <SectionHead
            eyebrow="Bestsellers & popular"
            title="Most wanted, every colour"
            id="best-heading"
            action={
              <div className="flex gap-1.5">
                <button
                  type="button"
                  aria-label="Scroll bestsellers back"
                  onClick={() => scroll(-1)}
                  className="grid size-11 place-items-center border border-ink transition-colors hover:bg-ink hover:text-white"
                >
                  <ArrowLeft className="size-4" strokeWidth={1.4} />
                </button>
                <button
                  type="button"
                  aria-label="Scroll bestsellers forward"
                  onClick={() => scroll(1)}
                  className="grid size-11 place-items-center border border-ink transition-colors hover:bg-ink hover:text-white"
                >
                  <ArrowRight className="size-4" strokeWidth={1.4} />
                </button>
              </div>
            }
          />
        </Reveal>
        <div
          ref={track}
          className="no-scrollbar grid snap-x snap-mandatory auto-cols-[calc(62.5%-0.375rem)] grid-flow-col gap-2.5 overflow-x-auto overscroll-x-contain pb-2 min-[900px]:auto-cols-[calc(25%-0.75rem)] min-[900px]:gap-4"
        >
          {cards.map(({ product, color }) => (
            <div key={`${product.id}-${color}`} className="snap-start">
              <ProductCard
                product={product}
                initialColor={color}
                sizes="(min-width: 900px) 25vw, 62vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeShopTheLook({ products }: { products: Product[] }) {
  const product =
    products.find(
      (row) => !isSoldOut(row) && row.colors.length > 2 && (row.colorImages?.length ?? 0) > 2,
    ) ?? products.find((row) => !isSoldOut(row));
  const [picked, setPicked] = useState<string | null>(null);
  if (!product) return null;
  const lead = product.colors[0] ?? "";

  return (
    <section className="bg-sand py-[clamp(3.5rem,8vw,7rem)]" aria-labelledby="look-heading">
      <div className="page-wrap grid items-start gap-[clamp(1.5rem,3vw,3rem)] min-[900px]:grid-cols-[1.2fr_1fr]">
        <Reveal>
          <Link
            href={productHref(product)}
            className="relative block aspect-[4/5] overflow-hidden bg-[#ddd5c7]"
          >
            <ProductImage
              src={productModelImage(product, lead)}
              alt={`${titleCase(product.name)} in ${lead.toLowerCase()}`}
              width={1200}
              height={1500}
              sizes="(min-width: 900px) 55vw, 100vw"
              className="size-full object-cover object-[50%_20%]"
            />
          </Link>
        </Reveal>
        <Reveal delay={120}>
          <p className="eyebrow mb-3">Shop the look</p>
          <h2 id="look-heading" className="editorial text-[clamp(2rem,4vw,3.2rem)] leading-[1.05]">
            {titleCase(product.name)}
          </h2>
          <p className="mt-4 mb-6 max-w-[46ch] text-charcoal">{product.description}</p>
          <ul className="grid gap-3">
            {product.colors.map((color) => {
              const inStock = product.sizes.some((size) => variantHasStock(product, color, size));
              return (
                <li
                  key={color}
                  className="grid grid-cols-[72px_1fr] items-center gap-4 bg-paper p-3 sm:grid-cols-[96px_1fr]"
                >
                  <ProductImage
                    src={productImageForColor(product, color)}
                    alt=""
                    width={192}
                    height={288}
                    sizes="96px"
                    className="aspect-[2/3] w-full object-cover"
                  />
                  <div>
                    <h3 className="text-[0.84rem] font-medium tracking-[0.1em] uppercase">
                      {product.name.replace(/^THE\s+/i, "")} · {color}
                    </h3>
                    <p className="mt-0.5 mb-2.5 text-[0.82rem] text-muted-foreground">
                      {priceLabel(product.price)} ·{" "}
                      {product.sizes.length > 1
                        ? `${product.sizes[0]}–${product.sizes[product.sizes.length - 1]}`
                        : product.sizes[0]}
                    </p>
                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={() => setPicked(color)}
                      className="min-h-10 border border-ink px-4 text-[0.66rem] tracking-[0.18em] uppercase transition-colors hover:bg-ink hover:text-white disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent"
                    >
                      {inStock ? "Choose size" : "Sold out"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
      <VariantSelectDialog
        product={product}
        open={picked !== null}
        onOpenChange={(open) => {
          if (!open) setPicked(null);
        }}
        initialColor={picked ?? lead}
      />
    </section>
  );
}

export function HomeTrust() {
  return (
    <section className="py-[clamp(3.5rem,8vw,7rem)]" aria-label="Why shop with us">
      <div className="page-wrap">
        <div className="grid grid-cols-2 border-t border-l border-border min-[900px]:grid-cols-4">
          {TRUST_POINTS.map((point, index) => (
            <Reveal
              key={point.title}
              delay={index * 70}
              className="grid content-start gap-1.5 border-r border-b border-border p-[clamp(1.1rem,2.5vw,2rem)]"
            >
              <LineIcon name={point.icon} className="size-[26px]" />
              <b className="mt-1 text-[0.76rem] font-medium tracking-[0.16em] uppercase">
                {point.title}
              </b>
              <span className="text-[0.84rem] text-muted-foreground">{point.body}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeInstagram({ products }: { products: Product[] }) {
  const shots = products
    .flatMap((product) =>
      product.colors.map((color) => ({
        src: productModelImage(product, color),
        alt: `${titleCase(product.name)} in ${color.toLowerCase()}`,
      })),
    )
    .filter(
      (shot, index, all) => shot.src && all.findIndex((row) => row.src === shot.src) === index,
    )
    .slice(0, 6);
  if (shots.length < 3) return null;

  return (
    <section className="pb-[clamp(3.5rem,8vw,7rem)]" aria-labelledby="ig-heading">
      <div className="page-wrap">
        <Reveal>
          <SectionHead
            eyebrow="@abcollection.co.in"
            title="Wear everyday"
            id="ig-heading"
            action={
              <a
                href={SITE_INSTAGRAM}
                target="_blank"
                rel="noreferrer noopener"
                className="border-b border-current pb-0.5 text-[0.74rem] tracking-[0.18em] uppercase"
              >
                Follow on Instagram
              </a>
            }
          />
        </Reveal>
        <div className="grid grid-cols-3 gap-1.5 min-[900px]:grid-cols-6 min-[900px]:gap-2">
          {shots.map((shot) => (
            <a
              key={shot.src}
              href={SITE_INSTAGRAM}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`${shot.alt} on Instagram`}
              className="group relative block aspect-square overflow-hidden bg-sand after:absolute after:inset-0 after:bg-black/0 after:transition-colors hover:after:bg-black/20"
            >
              <ProductImage
                src={shot.src}
                alt=""
                width={480}
                height={480}
                sizes="(min-width: 900px) 16vw, 33vw"
                className="size-full object-cover object-[50%_25%] transition-transform duration-[800ms] ease-[var(--ease-brand)] group-hover:scale-105"
              />
            </a>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Tag @abcollection.co.in to be featured.
        </p>
      </div>
    </section>
  );
}

export function HomeReviews({
  reviews,
  summary,
  products,
}: {
  reviews: PublicReview[];
  summary: ReviewSummary;
  products: Product[];
}) {
  const track = useRef<HTMLUListElement>(null);
  if (!reviews.length) return null;
  const productFor = (id: string) => {
    const product = products.find((row) => row.id === id);
    return product
      ? { name: titleCase(product.name), href: `${productHref(product)}#reviews` }
      : undefined;
  };
  const scroll = (direction: number) => {
    const node = track.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="py-[clamp(3.5rem,8vw,7rem)]" aria-labelledby="reviews-home-heading">
      <div className="page-wrap">
        <Reveal>
          <div className="mb-[clamp(1.5rem,3vw,2.5rem)] flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow mb-3">In their words</p>
              <h2
                id="reviews-home-heading"
                className="text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.05]"
              >
                Worn, washed, reviewed
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4">
                <p className="editorial text-[3.4rem] leading-none">{summary.average.toFixed(1)}</p>
                <div>
                  <StarRating value={summary.average} />
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    from {summary.count} review{summary.count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {reviews.length > 1 ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous reviews"
                    onClick={() => scroll(-1)}
                    className="grid size-11 place-items-center border border-ink transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-ink hover:text-white active:scale-[0.95]"
                  >
                    <ArrowLeft className="size-4" strokeWidth={1.4} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next reviews"
                    onClick={() => scroll(1)}
                    className="grid size-11 place-items-center border border-ink transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-ink hover:text-white active:scale-[0.95]"
                  >
                    <ArrowRight className="size-4" strokeWidth={1.4} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </Reveal>
        <ul
          ref={track}
          className="no-scrollbar grid snap-x snap-mandatory auto-cols-[85%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-2 sm:auto-cols-[calc(50%-0.375rem)] min-[1100px]:auto-cols-[calc(33.333%-0.5rem)]"
        >
          {reviews.map((review, index) => (
            <li key={review.id} className="snap-start">
              <Reveal delay={Math.min(index, 3) * 60} className="h-full">
                <ReviewCard review={review} product={productFor(review.productId)} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
