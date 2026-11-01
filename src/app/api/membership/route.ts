import { NextResponse } from "next/server";

import { getProducts } from "@/lib/catalog.server";
import { getCustomerSession } from "@/lib/customer-auth.server";
import { isMembershipLive, type MembershipSnapshot } from "@/lib/membership";
import {
  getMembershipSettings,
  listMemberRules,
  listMembershipsForCustomer,
  memberPriceEntries,
  primaryMembership,
  toPublicMembership,
  toPublicSettings,
} from "@/lib/membership.server";

export const dynamic = "force-dynamic";

/** Programme info, member prices and (if signed in) the shopper's own membership. */
export async function GET() {
  const [settings, rules, products, customer] = await Promise.all([
    getMembershipSettings(),
    listMemberRules(),
    getProducts(),
    getCustomerSession(),
  ]);
  const memberships = customer ? await listMembershipsForCustomer(customer.id) : [];
  const primary = primaryMembership(memberships);
  const snapshot: MembershipSnapshot = {
    settings: toPublicSettings(settings),
    prices: memberPriceEntries(products, rules),
    membership: primary ? toPublicMembership(primary) : null,
    isMember: memberships.some((row) => isMembershipLive(row)),
  };
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
