import {
  HomeCommunity,
  HomeDiscover,
  HomeFeatured,
  HomeHero,
} from "@/components/home/HomeSections";
import { getCatalog } from "@/lib/catalog.server";
import { catalogImageUrl } from "@/lib/media";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Premium Everyday Essentials",
  description:
    "Shop AB Collection's heavyweight 240–300 GSM cotton tees. Choose an in-stock size, pay by UPI, card, or netbanking, and shipping is free.",
  path: "/",
  image: catalogImageUrl("hero-beige.png"),
});

export default async function HomePage() {
  const catalog = await getCatalog();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }])} />
      <HomeHero products={catalog.products} />
      {catalog.collections.length ? <HomeDiscover collections={catalog.collections} /> : null}
      <HomeFeatured products={catalog.products} />
      <HomeCommunity products={catalog.products} />
    </>
  );
}
