"use client";

import Link from "next/link";

import { useMembership } from "@/components/membership/MembershipProvider";
import type { Product } from "@/lib/catalog-types";
import { getDiscountedPriceLabel } from "@/lib/istefada-offer";
import { catalogPriceParts, formatInr } from "@/lib/price";
import { cn } from "@/lib/utils";

export function CatalogPrice({
  product,
  hasOffer = false,
  align = "right",
  size = "card",
  color,
  variantSize,
}: {
  product: Product;
  hasOffer?: boolean;
  align?: "left" | "right";
  size?: "card" | "detail";
  /** With variantSize, prices the exact variant (product page). */
  color?: string;
  variantSize?: string;
}) {
  const { isMember, open, memberPrice, snapshot } = useMembership();
  const parts = catalogPriceParts(product);
  const member = memberPrice(product, color, variantSize);
  const programmeName = snapshot?.settings.planName || "AB Insider";

  // Members see their price; with stacking off it replaces the Istefada offer.
  if (isMember && member !== null && member < parts.selling) {
    const saving = parts.selling - member;
    return (
      <div className={cn(align === "right" ? "text-right" : "text-left")}>
        <div
          className={cn(
            "flex items-baseline gap-x-2 gap-y-0.5",
            size === "card" ? "flex-nowrap whitespace-nowrap" : "flex-wrap",
            align === "right" ? "justify-end" : "justify-start",
          )}
        >
          <p className={cn(size === "detail" ? "text-xl" : "text-[0.92rem]")}>
            <span className="sr-only">Member price </span>
            {formatInr(member)}
          </p>
          <p
            className={cn(
              "text-muted-foreground line-through",
              size === "detail" ? "text-sm" : "text-[0.7rem] sm:text-xs",
            )}
          >
            <span className="sr-only">Regular price </span>
            {formatInr(parts.selling)}
          </p>
          <span className="bg-ink px-1.5 py-0.5 text-[0.56rem] tracking-[0.14em] text-white uppercase">
            Insider
          </span>
        </div>
        {size === "detail" ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {programmeName} member price · you save {formatInr(saving)}
          </p>
        ) : null}
      </div>
    );
  }

  const istefada = getDiscountedPriceLabel(product.price);
  const showIstefada = hasOffer && istefada.final > 0 && istefada.final < istefada.original;
  const strikeLabel = showIstefada
    ? parts.hasCompare
      ? parts.compareAtLabel
      : istefada.originalLabel
    : parts.hasCompare
      ? parts.compareAtLabel
      : "";
  const current = showIstefada ? istefada.final : parts.selling;
  const percentOff =
    parts.hasCompare && parts.compareAt > 0
      ? Math.round(((parts.compareAt - current) / parts.compareAt) * 100)
      : 0;
  const teaser = !isMember && open && member !== null && member < parts.selling ? member : null;

  return (
    <div className={cn(align === "right" ? "text-right" : "text-left")}>
      <div
        className={cn(
          "flex items-baseline gap-x-2 gap-y-0.5",
          size === "card" ? "flex-nowrap whitespace-nowrap" : "flex-wrap",
          align === "right" ? "justify-end" : "justify-start",
        )}
      >
        <p className={cn(size === "detail" ? "text-xl" : "text-[0.92rem]")}>
          <span className="sr-only">Selling price </span>
          {formatInr(current)}
        </p>
        {strikeLabel ? (
          <p
            className={cn(
              "text-muted-foreground line-through",
              size === "detail" ? "text-sm" : "text-[0.7rem] sm:text-xs",
            )}
          >
            <span className="sr-only">Original price </span>
            {strikeLabel}
          </p>
        ) : null}
        {size === "detail" && percentOff > 0 ? (
          <p className="text-xs tracking-[0.14em] text-[#9a3412] uppercase">{percentOff}% off</p>
        ) : null}
      </div>
      {showIstefada && size === "detail" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Istefada price, code applied at checkout
        </p>
      ) : null}
      {teaser !== null && size === "detail" ? (
        <Link
          href="/membership"
          className="mt-2 inline-flex items-center gap-2 border border-border bg-paper px-3 py-2 text-xs transition-colors hover:border-ink"
        >
          <span className="bg-ink px-1.5 py-0.5 text-[0.56rem] tracking-[0.14em] text-white uppercase">
            Insider
          </span>
          <span>
            {programmeName} members pay <b className="font-medium">{formatInr(teaser)}</b>
            <span className="text-muted-foreground"> · Join to unlock</span>
          </span>
        </Link>
      ) : null}
    </div>
  );
}
