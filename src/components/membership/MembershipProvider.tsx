"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import type { Product } from "@/lib/catalog-types";
import { memberPriceFor, type MembershipSnapshot } from "@/lib/membership";

type MembershipContextValue = {
  snapshot: MembershipSnapshot | null;
  /** Programme switched on with a fee set: shoppers can join. */
  open: boolean;
  /** Signed in with a live membership. Display only; the server decides prices. */
  isMember: boolean;
  refresh: () => Promise<void>;
  /** Member price for a product (a specific variant when colour and size are given). */
  memberPrice: (product: Product, color?: string, size?: string) => number | null;
};

const MembershipContext = createContext<MembershipContextValue | null>(null);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const { customer, loading } = useCommerce();
  const [snapshot, setSnapshot] = useState<MembershipSnapshot | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/membership", { cache: "no-store" });
      if (res.ok) setSnapshot((await res.json()) as MembershipSnapshot);
    } catch {
      // Without a snapshot everyone sees regular prices, which is the safe default.
    }
  }, []);

  // Reload when the shopper logs in or out: membership is per account.
  useEffect(() => {
    if (loading) return;
    void refresh();
  }, [customer?.id, loading, refresh]);

  const memberPrice = useCallback(
    (product: Product, color?: string, size?: string) => {
      if (!snapshot) return null;
      const variantId =
        color && size
          ? (product.variants.find((variant) => variant.color === color && variant.size === size)
              ?.id ?? null)
          : null;
      return memberPriceFor(snapshot.prices, product.id, variantId);
    },
    [snapshot],
  );

  const value = useMemo<MembershipContextValue>(
    () => ({
      snapshot,
      open: Boolean(snapshot?.settings.programmeEnabled && snapshot.settings.membershipFee > 0),
      isMember: Boolean(customer && snapshot?.isMember),
      refresh,
      memberPrice,
    }),
    [customer, memberPrice, refresh, snapshot],
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useMembership() {
  const ctx = useContext(MembershipContext);
  if (!ctx) throw new Error("useMembership must be used within MembershipProvider");
  return ctx;
}

type PriceableLine = {
  productId: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: Product | undefined;
};

/**
 * Member prices applied to cart lines for display, mirroring the server rule:
 * with stacking off, member-priced lines get no offer or bundle discount.
 */
export function useMemberPricing<L extends PriceableLine>(lines: L[]) {
  const { isMember, memberPrice, snapshot } = useMembership();
  return useMemo(() => {
    const priced = lines.map((line) => {
      const price =
        isMember && line.product ? memberPrice(line.product, line.color, line.size) : null;
      const member = price !== null && price < line.unitPrice;
      return {
        ...line,
        regularUnitPrice: line.unitPrice,
        isMemberPriced: member,
        unitPrice: member ? price : line.unitPrice,
        lineTotal: member ? price * line.quantity : line.lineTotal,
      };
    });
    const memberSavings = priced.reduce(
      (sum, line) => sum + (line.regularUnitPrice - line.unitPrice) * line.quantity,
      0,
    );
    const settings = snapshot?.settings;
    const offerLines = settings?.stackOffers
      ? priced
      : priced.filter((line) => !line.isMemberPriced);
    const bundleLines = settings?.stackBundles
      ? priced
      : priced.filter((line) => !line.isMemberPriced);
    return { lines: priced, memberSavings, offerLines, bundleLines };
  }, [isMember, lines, memberPrice, snapshot]);
}
