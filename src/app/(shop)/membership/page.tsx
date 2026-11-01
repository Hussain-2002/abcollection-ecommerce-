import Link from "next/link";

import { JoinMembership } from "@/components/membership/JoinMembership";
import { Reveal } from "@/components/Reveal";
import { ProductImage } from "@/components/site/ProductImage";
import { getProducts } from "@/lib/catalog.server";
import { validityLabel } from "@/lib/membership";
import {
  getMembershipSettings,
  listMemberRules,
  memberPriceEntries,
} from "@/lib/membership.server";
import { formatInr, parsePriceInr } from "@/lib/price";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import { productHref } from "@/lib/storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const settings = await getMembershipSettings();
  return buildPageMetadata({
    title: settings.planName,
    description:
      settings.description ||
      `${settings.planName} membership from AB Collection: member prices on selected pieces.`,
    path: "/membership",
  });
}

export default async function MembershipPage() {
  const [settings, rules, products] = await Promise.all([
    getMembershipSettings(),
    listMemberRules(),
    getProducts(),
  ]);
  const prices = memberPriceEntries(products, rules);
  const eligible = prices
    .map((entry) => {
      const product = products.find((row) => row.id === entry.productId);
      if (!product) return null;
      const regular = parsePriceInr(product.price);
      const partial = entry.price === null;
      return { product, regular, member: entry.price ?? entry.lowest, partial };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const stacking = [
    settings.stackCoupons
      ? "can be combined with coupon codes"
      : "can't be combined with coupon codes",
    settings.stackOffers
      ? "can be combined with store offers"
      : "can't be combined with store offers (such as Istefada)",
    settings.stackBundles
      ? "can be combined with bundle deals"
      : "can't be combined with bundle deals",
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: settings.planName, path: "/membership" },
        ])}
      />

      <section className="page-wrap grid gap-12 py-[clamp(3rem,7vw,6rem)] min-[1000px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] min-[1000px]:items-start">
        <div>
          <p className="eyebrow mb-5">Membership</p>
          <h1 className="editorial text-[clamp(3.2rem,9vw,7rem)] leading-[0.92]">
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="animate-line-up inline-block">{settings.planName}</span>
            </span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-[1.05rem] leading-relaxed text-charcoal">
            {settings.description ||
              "Member prices on our heavyweight essentials, for as long as your membership lasts."}
          </p>
          {settings.benefits.length ? (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {settings.benefits.map((benefit) => (
                <li key={benefit} className="border-t border-ink pt-3 text-sm">
                  {benefit}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="min-[1000px]:sticky min-[1000px]:top-[calc(var(--header-h)+1.5rem)]">
          <JoinMembership />
        </div>
      </section>

      {eligible.length ? (
        <section
          className="border-t border-border bg-paper py-[clamp(3rem,7vw,5rem)]"
          aria-labelledby="eligible-heading"
        >
          <div className="page-wrap">
            <Reveal>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <h2
                  id="eligible-heading"
                  className="text-[clamp(1.8rem,3.6vw,2.8rem)] leading-tight"
                >
                  Member prices
                </h2>
                <p className="text-sm text-muted-foreground">
                  Applied automatically at checkout while you&apos;re logged in.
                </p>
              </div>
            </Reveal>
            <ul className="grid gap-px border border-border bg-border sm:grid-cols-2 min-[1100px]:grid-cols-3">
              {eligible.map(({ product, regular, member, partial }) => (
                <li key={product.id} className="bg-paper">
                  <Link href={productHref(product)} className="group flex items-center gap-4 p-4">
                    <ProductImage
                      src={product.image}
                      alt=""
                      width={160}
                      height={240}
                      sizes="64px"
                      className="aspect-[2/3] w-16 shrink-0 bg-muted object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.82rem] font-medium tracking-[0.08em] uppercase group-hover:underline">
                        {product.name}
                      </span>
                      <span className="mt-1 flex items-baseline gap-2">
                        <span>
                          {partial ? "from " : ""}
                          {formatInr(member)}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatInr(regular)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Save {formatInr(regular - member)}
                        {partial ? " on selected colours and sizes" : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Pieces not listed here aren&apos;t part of member pricing. Prices and eligibility can
              change; your cart and checkout always show the current price.
            </p>
          </div>
        </section>
      ) : null}

      <section
        id="terms"
        className="page-wrap scroll-mt-[calc(var(--header-h)+1rem)] py-[clamp(3rem,7vw,5rem)]"
      >
        <div className="grid gap-10 min-[1000px]:grid-cols-[minmax(0,320px)_minmax(0,1fr)] min-[1000px]:gap-16">
          <div>
            <p className="eyebrow mb-3">Terms</p>
            <h2 className="text-[clamp(1.8rem,3.6vw,2.6rem)] leading-tight">Good to know</h2>
            <p className="mt-3 text-xs text-muted-foreground">Version {settings.termsVersion}</p>
          </div>
          <div className="max-w-[68ch] space-y-6 text-[0.95rem] leading-relaxed text-charcoal">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                The fee is {formatInr(settings.membershipFee)}, paid once and charged separately
                from your orders. Membership is {validityLabel(settings.defaultValidityDays)} from
                the day it starts.
              </li>
              <li>Paid memberships start only after your payment is confirmed.</li>
              <li>
                Membership does not renew automatically. You can renew at any time; a renewal starts
                when your current membership ends.
              </li>
              <li>Member prices apply only while you&apos;re logged in to your account.</li>
              <li>Member prices {stacking.join("; ")}.</li>
              <li>
                Complimentary memberships granted by AB Collection may have their own start and end
                dates.
              </li>
            </ul>
            {settings.termsContent ? (
              <div className="border-t border-border pt-6 whitespace-pre-line">
                {settings.termsContent}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
