import { after, NextResponse } from "next/server";
import { z } from "zod";

import { getCustomerSession } from "@/lib/customer-auth.server";
import { actionErrorMessage } from "@/lib/form-request";
import { effectiveStatus } from "@/lib/membership";
import {
  confirmMembershipPayment,
  notifyActivated,
  toPublicMembership,
} from "@/lib/membership.server";

export const dynamic = "force-dynamic";

const FALLBACK = "Could not confirm membership payment.";

const bodySchema = z.object({ orderId: z.string().trim().min(3).max(60) });

/**
 * Checks a membership payment with Cashfree (never trusts the return URL).
 * Responds pending/failed/active; details only for the membership's owner.
 */
export async function POST(request: Request) {
  try {
    const { orderId } = bodySchema.parse(await request.json());
    const { membership, justActivated } = await confirmMembershipPayment(orderId);
    if (justActivated) after(() => notifyActivated(membership));
    const customer = await getCustomerSession();
    const own = customer?.id === membership.customerId;
    return NextResponse.json({
      status: effectiveStatus(membership),
      ...(own ? { membership: toPublicMembership(membership) } : {}),
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "payment_pending" || code === "payment_failed") {
      return NextResponse.json({
        status: code === "payment_pending" ? "pending_payment" : "failed",
        error: (error as Error).message,
      });
    }
    const { status, message } = actionErrorMessage(error, FALLBACK);
    // Never show database or gateway internals to shoppers.
    return NextResponse.json({ error: status >= 500 ? FALLBACK : message }, { status });
  }
}
