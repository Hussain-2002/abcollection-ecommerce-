import type { Product } from "@/lib/catalog-types";
import { productHasPurchasableStock } from "@/lib/inventory";
import { type ProductBadge } from "@/lib/promotions";
import { cn } from "@/lib/utils";

export function productDisplayBadges(product: Product): ProductBadge[] {
  const soldOut = !productHasPurchasableStock(product);
  const assigned = (product.badges ?? []).filter((badge) => {
    if (!badge.active) return false;
    if (badge.id === "sold-out" || /sold\s*out/i.test(badge.label)) return soldOut;
    return true;
  });
  if (
    soldOut &&
    !assigned.some((badge) => badge.id === "sold-out" || /sold\s*out/i.test(badge.label))
  ) {
    assigned.push({
      id: "sold-out",
      name: "Sold Out",
      label: "SOLD OUT",
      active: true,
      sortOrder: 999,
      tone: "ink",
    });
  }
  if (!assigned.length && product.badge?.trim() && !soldOut) {
    assigned.push({
      id: "legacy",
      name: product.badge,
      label: product.badge,
      active: true,
      sortOrder: 0,
      tone: "default",
    });
  }
  return assigned.sort((a, b) => a.sortOrder - b.sortOrder);
}

function toneClass(tone: ProductBadge["tone"] | undefined) {
  if (tone === "ink" || tone === "teal") return "bg-ink text-white";
  if (tone === "sale") return "bg-[#9a3412] text-white";
  return "bg-white text-foreground";
}

/** Square white tags (ink for sold out), like a printed swing tag. */
export function ProductBadgeList({
  product,
  className,
  limit,
}: {
  product: Product;
  className?: string;
  limit?: number;
}) {
  const badges = productDisplayBadges(product);
  if (!badges.length) return null;
  const shown = limit ? badges.slice(0, limit) : badges;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {shown.map((badge) => (
        <span
          key={badge.id}
          className={cn(
            "px-2 py-1 text-[0.62rem] leading-none tracking-[0.16em] uppercase",
            toneClass(badge.tone),
          )}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
