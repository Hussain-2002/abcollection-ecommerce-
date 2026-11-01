import { NextResponse } from "next/server";

import { getCustomerSession } from "@/lib/customer-auth.server";
import {
  listMembershipsForCustomer,
  primaryMembership,
  toPublicMembership,
} from "@/lib/membership.server";

export const dynamic = "force-dynamic";

/** The signed-in customer's own memberships only. */
export async function GET() {
  const customer = await getCustomerSession();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberships = await listMembershipsForCustomer(customer.id);
  const primary = primaryMembership(memberships);
  return NextResponse.json(
    {
      current: primary ? toPublicMembership(primary) : null,
      history: memberships.map(toPublicMembership),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
