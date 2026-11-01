import type { Collection, Product } from "@/lib/catalog-types";
import { productImageForColor } from "@/lib/cart-display";
import { productHasPurchasableStock } from "@/lib/inventory";
import { getImageIndicesForColor } from "@/lib/product-colors";
import { formatInr, parsePriceInr } from "@/lib/price";

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

/** Header links. "Shop" opens the mega menu on desktop. */
export const PRIMARY_NAV = [
  { href: "/collection", label: "New in" },
  { href: "/collection", label: "Shop", mega: true },
  { href: "/about", label: "Our story" },
] as const;

export const HELP_LINKS = [
  { href: "/track-order", label: "Track your order" },
  { href: "/shipping", label: "Shipping & delivery" },
  { href: "/returns", label: "Refund & returns" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact us" },
  { href: "/wholesale", label: "Wholesale" },
] as const;

export const ANNOUNCEMENTS = [
  "Free shipping across India",
  "240–300 GSM premium cotton",
  "Made in India",
  "Prepaid checkout · UPI, cards & netbanking",
] as const;

export const TRUST_POINTS = [
  {
    icon: "truck",
    title: "Ships across India",
    body: "Dispatch in 2–3 business days, then usually 5–7 business days to you.",
  },
  {
    icon: "exchange",
    title: "Exchange assurance",
    body: "Defect or wrong item? Report within 2 days of delivery for an exchange.",
  },
  {
    icon: "lock",
    title: "Prepaid checkout",
    body: "Pay securely by UPI, card or netbanking. Free shipping on every order.",
  },
  {
    icon: "india",
    title: "Made in India",
    body: "Heavyweight 240–300 GSM cotton from partner units we visit.",
  },
] as const;

/** Home hero: art-directed flat-lays, landscape for desktop and portrait for phones. */
const HERO_SLIDES = [
  {
    image: "everyday-tees",
    productId: "regular-240",
    alt: "The Everyday Tee in black, white and coffee brown",
  },
  {
    image: "lava-split",
    productId: "acid-wash",
    alt: "The Lava Split washed tees in black and light grey",
  },
  {
    image: "sun-fades",
    productId: "sun-faded-240",
    alt: "Sun-Fades tees in olive green and grey",
  },
];

export type HeroSlide = { desktop: string; mobile: string; alt: string; href: string };

export function heroSlides(products: Product[]): HeroSlide[] {
  return HERO_SLIDES.map((slide) => {
    const product = products.find((row) => row.id === slide.productId);
    return {
      desktop: `/hero/${slide.image}-desktop.webp`,
      mobile: `/hero/${slide.image}-mobile.webp`,
      alt: slide.alt,
      // A retired product sends the slide to the full collection instead.
      href: product ? productHref(product) : "/collection",
    };
  });
}

export function productHref(product: Pick<Product, "id">) {
  return `/collection/${product.id}`;
}

export function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|[\s-])\S/g, (match) => match.toUpperCase());
}

/** All images for one colour, in gallery order. */
export function colorImages(product: Product, color: string) {
  const images = product.images?.length ? product.images : [product.image];
  return getImageIndicesForColor(color, product.colors, images, product.colorImages)
    .map((index) => images[index] ?? "")
    .filter((src) => src.trim());
}

/** Second shot of a colour (usually worn on a model) for hover swaps. */
export function productHoverImage(product: Product, color: string) {
  const own = colorImages(product, color);
  if (own.length > 1) return own[1] ?? "";
  const images = product.images?.length ? product.images : [product.image];
  const primary = productImageForColor(product, color);
  return images.find((src) => src.trim() && src !== primary) ?? "";
}

/** Prefer the model shot of a colour for editorial placements. */
export function productModelImage(product: Product, color: string) {
  return productHoverImage(product, color) || productImageForColor(product, color);
}

export function priceLabel(value: string | number | undefined) {
  return formatInr(parsePriceInr(value));
}

export function isSoldOut(product: Product) {
  return !productHasPurchasableStock(product);
}

export type FitTile = { href: string; image: string; title: string; caption: string };

/** "Shop by fit" uses admin collections when they exist, otherwise one tile per product. */
export function fitTiles(collections: Collection[], products: Product[]): FitTile[] {
  if (collections.length) {
    return collections.map((collection) => {
      const product = products.find((row) => row.id === collection.productId);
      return {
        href: product ? productHref(product) : "/collection",
        image: collection.image,
        title: collection.title,
        caption: product?.fabric ?? "",
      };
    });
  }
  return products.slice(0, 5).map((product) => ({
    href: productHref(product),
    image: productModelImage(product, product.colors[0] ?? ""),
    title: product.name,
    caption: product.fabric,
  }));
}

/** Featured first, then the rest, keeping the admin sort order. */
export function bestsellers(products: Product[]) {
  const flagged = products.filter((product) =>
    (product.badges ?? []).some((badge) => badge.active && /best|trend|popular/i.test(badge.label)),
  );
  const rest = products.filter((product) => !flagged.includes(product));
  return [...flagged, ...rest].filter((product) => !isSoldOut(product));
}
