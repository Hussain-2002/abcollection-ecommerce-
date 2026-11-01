import {
  HomeBestsellers,
  HomeFits,
  HomeHero,
  HomeInstagram,
  HomeNewArrivals,
  HomeReviews,
  HomeShopTheLook,
  HomeStory,
  HomeTrust,
} from "@/components/home/HomeSections";
import { HomeJourney } from "@/components/journey/Journey";
import { getCatalog } from "@/lib/catalog.server";
import { mostViewed } from "@/lib/founder-journey";
import { getFounderReels } from "@/lib/instagram.server";
import { listLatestPublicReviews } from "@/lib/reviews.server";
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
  const [catalog, latest, founder] = await Promise.all([
    getCatalog(),
    // Reviews are a nice-to-have on the home page; never block it on them.
    listLatestPublicReviews(9).catch(() => null),
    getFounderReels(),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }])} />
      <HomeHero products={catalog.products} />
      <HomeFits collections={catalog.collections} products={catalog.products} />
      <HomeNewArrivals products={catalog.products} />
      <HomeStory products={catalog.products} />
      <HomeJourney reels={mostViewed(founder.reels, 8)} />
      <HomeBestsellers products={catalog.products} />
      <HomeShopTheLook products={catalog.products} />
      {latest ? (
        <HomeReviews
          reviews={latest.reviews}
          summary={latest.summary}
          products={catalog.products}
        />
      ) : null}
      <HomeTrust />
      <HomeInstagram products={catalog.products} />
    </>
  );
}
