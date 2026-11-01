import Link from "next/link";

import { HomeReviews, HomeTrust } from "@/components/home/HomeSections";
import { Reveal } from "@/components/Reveal";
import { ProductImage } from "@/components/site/ProductImage";
import type { Product } from "@/lib/catalog-types";
import { getCatalog } from "@/lib/catalog.server";
import { catalogImageUrl } from "@/lib/media";
import { listLatestPublicReviews } from "@/lib/reviews.server";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import { productHref, productModelImage, titleCase } from "@/lib/storefront";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Our story",
  description:
    "AB Collection is a premium everyday essentials brand for men — heavyweight cotton, honest pricing, and timeless design. Founded by Abbas Badwahwala.",
  path: "/about",
  image: catalogImageUrl("fabric.jpg"),
});

function pick(products: Product[], id: string, color: string) {
  const product = products.find((row) => row.id === id) ?? products[0];
  if (!product) return null;
  const shade = product.colors.includes(color) ? color : (product.colors[0] ?? "");
  return {
    src: productModelImage(product, shade),
    alt: `${titleCase(product.name)} in ${shade.toLowerCase()}`,
    href: productHref(product),
  };
}

const PRINCIPLES = [
  {
    eyebrow: "01 · Comfort first",
    title: "How it feels on the third wash.",
    body: "Everything starts with the fabric: 240 GSM cotton for the everyday tees, 260 and 300 GSM French terry for the heavyweights. Our polo is double bio-washed and pre-shrunk. We spent months on fabric weight, shrinkage and neck ribbing so you never have to think about any of it.",
    image: { id: "", color: "", fabric: true },
  },
  {
    eyebrow: "02 · Timeless design",
    title: "Cuts that outlive trends.",
    body: "A regular fit, an oversized fit, a polo, two heavyweights and a couple of special finishes. Few pieces, each one considered, in colours that work with what you already own.",
    image: { id: "oversized-240", color: "Coffee Brown", fabric: false },
  },
  {
    eyebrow: "03 · Honest pricing",
    title: "Direct to you. No retail markup.",
    body: "We sell direct, so the price reflects the garment rather than a retail markup. Shipping across India is free, and checkout is prepaid to keep costs honest.",
    image: { id: "regular-240", color: "White", fabric: false },
  },
  {
    eyebrow: "04 · Made in India",
    title: "With partner units we visit ourselves.",
    body: "Every piece is made in India with partner units we visit ourselves, because quality is easier to keep when you can see it for yourself.",
    image: { id: "acid-wash", color: "Black", fabric: false },
  },
];

export default async function AboutPage() {
  const [catalog, latest] = await Promise.all([
    getCatalog(),
    listLatestPublicReviews(9).catch(() => null),
  ]);
  const products = catalog.products;
  const hero = pick(products, "terry-260", "White");
  const sizes = Array.from(new Set(products.flatMap((product) => product.sizes)));
  const sizeRange = sizes.length > 1 ? `${sizes[0]}–${sizes[sizes.length - 1]}` : "S–XXL";

  const stats = [
    { value: "240–300", label: "GSM cotton & French terry" },
    { value: String(products.length || 7), label: "Pieces in the first drop" },
    { value: sizeRange, label: "Sizes, regular & oversized" },
    { value: "2–3", label: "Business days to dispatch" },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Our story", path: "/about" },
        ])}
      />

      <section className="page-wrap grid items-end gap-8 pt-[clamp(2rem,5vw,4rem)] pb-[clamp(3rem,6vw,5rem)] lg:grid-cols-[1fr_0.85fr] lg:gap-16">
        <div className="lg:pb-10">
          <p className="eyebrow mb-4">Our story</p>
          <h1 className="editorial text-[clamp(2.8rem,8vw,7rem)] leading-[0.92]">
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="animate-line-up inline-block">Built for the</span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="animate-line-up inline-block [animation-delay:120ms]">
                <em>in-between.</em>
              </span>
            </span>
          </h1>
          <p className="mt-6 max-w-[44ch] text-[1.05rem] leading-relaxed text-charcoal">
            Most everyday clothing asks you to compromise. Either it feels good and falls apart, or
            it lasts and never feels like yours. AB Collection is premium construction without
            luxury pricing.
          </p>
          <Link
            href="/collection"
            className="mt-8 inline-flex min-h-12 items-center border border-ink px-7 text-[0.76rem] tracking-[0.18em] uppercase transition-[background-color,color,transform] duration-200 hover:bg-ink hover:text-white active:scale-[0.97]"
          >
            Shop the collection
          </Link>
        </div>
        {hero ? (
          <Reveal>
            <Link href={hero.href} className="block aspect-[4/5] overflow-hidden bg-sand">
              <ProductImage
                src={hero.src}
                alt={hero.alt}
                width={1200}
                height={1500}
                sizes="(min-width: 1024px) 45vw, 100vw"
                priority
                className="size-full object-cover object-[50%_15%]"
              />
            </Link>
          </Reveal>
        ) : null}
      </section>

      <section className="bg-paper py-[clamp(4rem,9vw,8rem)]">
        <Reveal className="page-wrap">
          <p className="mx-auto max-w-[28ch] text-center text-[clamp(1.6rem,3.6vw,3rem)] leading-[1.2] font-light">
            Buy fewer things. Wear them for years. That&apos;s the whole idea.
          </p>
        </Reveal>
      </section>

      <section
        className="page-wrap py-[clamp(3rem,6vw,5rem)]"
        aria-label="AB Collection in numbers"
      >
        <dl className="grid grid-cols-2 border-t border-l border-border min-[900px]:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal
              key={stat.label}
              delay={index * 70}
              className="border-r border-b border-border p-[clamp(1.1rem,2.5vw,2rem)]"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="editorial block text-[clamp(2.2rem,4.5vw,3.6rem)] leading-none">
                  {stat.value}
                </span>
                <span className="mt-2 block text-[0.72rem] tracking-[0.16em] text-muted-foreground uppercase">
                  {stat.label}
                </span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </section>

      <section className="page-wrap grid gap-[clamp(3.5rem,8vw,7rem)] py-[clamp(2rem,5vw,4rem)]">
        {PRINCIPLES.map((principle, index) => {
          const image = principle.image.fabric
            ? {
                src: catalogImageUrl("fabric.jpg"),
                alt: "Close-up of heavyweight AB Collection cotton",
                href: "/collection",
              }
            : pick(products, principle.image.id, principle.image.color);
          const flip = index % 2 === 1;
          return (
            <article
              key={principle.title}
              className="grid items-center gap-[clamp(1.5rem,4vw,4rem)] min-[900px]:grid-cols-2"
            >
              {image ? (
                <Reveal className={flip ? "min-[900px]:order-2" : ""}>
                  <Link href={image.href} className="block aspect-[4/5] overflow-hidden bg-sand">
                    <ProductImage
                      src={image.src}
                      alt={image.alt}
                      width={1200}
                      height={1500}
                      sizes="(min-width: 900px) 46vw, 100vw"
                      className="size-full object-cover object-[50%_20%] transition-transform duration-[900ms] ease-[var(--ease-brand)] hover:scale-[1.03]"
                    />
                  </Link>
                </Reveal>
              ) : null}
              <Reveal delay={120} className="max-w-[46ch]">
                <p className="eyebrow mb-4">{principle.eyebrow}</p>
                <h2 className="editorial text-[clamp(2rem,4vw,3.4rem)] leading-[1.02]">
                  {principle.title}
                </h2>
                <p className="mt-5 leading-relaxed text-charcoal">{principle.body}</p>
              </Reveal>
            </article>
          );
        })}
      </section>

      <section className="mt-[clamp(3rem,6vw,5rem)] bg-sand py-[clamp(4rem,9vw,8rem)]">
        <Reveal className="page-wrap">
          <figure className="mx-auto max-w-4xl text-center">
            <span
              aria-hidden
              className="editorial block text-[5rem] leading-none text-foreground/15"
            >
              “
            </span>
            <blockquote className="-mt-6 text-[clamp(1.5rem,3.4vw,2.6rem)] leading-[1.3]">
              I kept buying tees that looked right in a photo and felt wrong by the third wash. So
              we built the one I wanted to wear.
            </blockquote>
            <figcaption className="mt-8 text-[0.72rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Abbas Badwahwala · Founder
            </figcaption>
          </figure>
        </Reveal>
      </section>

      {latest ? (
        <HomeReviews reviews={latest.reviews} summary={latest.summary} products={products} />
      ) : null}

      <HomeTrust />

      <section className="page-wrap pb-[clamp(4rem,9vw,8rem)] text-center">
        <Reveal>
          <h2 className="editorial text-[clamp(2.4rem,6vw,5rem)] leading-none">Wear everyday.</h2>
          <p className="mx-auto mt-4 max-w-[40ch] text-muted-foreground">
            Heavyweight essentials, free shipping across India.
          </p>
          <Link
            href="/collection"
            className="mt-8 inline-flex min-h-12 items-center bg-ink px-8 text-[0.76rem] tracking-[0.18em] text-white uppercase transition-[background-color,transform] duration-200 hover:bg-[#333] active:scale-[0.97]"
          >
            Shop the collection
          </Link>
        </Reveal>
      </section>
    </>
  );
}
