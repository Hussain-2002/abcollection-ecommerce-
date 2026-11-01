import Link from "next/link";

import { MemberPromo } from "@/components/membership/MemberPromo";
import { ShopGrid } from "@/components/site/ShopGrid";
import { getProducts } from "@/lib/catalog.server";
import { catalogImageUrl } from "@/lib/media";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Collection",
  description:
    "Browse AB Collection's first drop: oversized tees, regular fit, French terry, sun-faded and acid-wash styles in heavyweight cotton.",
  path: "/collection",
  image: catalogImageUrl("oversized-lavender.png"),
});

export default async function CollectionPage() {
  const products = await getProducts();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Collection", path: "/collection" },
        ])}
      />

      <section className="page-wrap pt-[clamp(1.75rem,4vw,3rem)] pb-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex gap-2 text-[0.72rem] tracking-[0.14em] text-muted-foreground uppercase"
        >
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">Shop all</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[clamp(2.2rem,5vw,4rem)] leading-none">Shop all</h1>
          <p className="max-w-[46ch] text-sm text-muted-foreground">
            Heavyweight cotton essentials made for Indian weather and everyday life. Free shipping
            across India.
          </p>
        </div>
        <div className="mt-5">
          <MemberPromo />
        </div>
      </section>

      <ShopGrid products={products} />
    </>
  );
}
