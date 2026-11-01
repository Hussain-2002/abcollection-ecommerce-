import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createCashfreeGatewayOrder,
  getCashfreeConfig,
  requestStorefrontOrigin,
} from "@/lib/cashfree.server";
import { getCustomerSession } from "@/lib/customer-auth.server";
import { actionErrorMessage } from "@/lib/form-request";
import { createPendingMembership, getMembershipSettings } from "@/lib/membership.server";
import { normalizeMobile } from "@/lib/reservation-utils";

export const dynamic = "force-dynamic";

const FALLBACK = "Could not start membership payment.";

const bodySchema = z.object({
  acceptTerms: z.literal(true, { message: "Please accept the membership terms." }),
  termsVersion: z.number().int().min(1),
  fee: z.number().int().min(0),
});

/** Starts a paid membership. Activation happens only after Cashfree confirms payment. */
export async function POST(request: Request) {
  try {
    const customer = await getCustomerSession();
    if (!customer) {
      return NextResponse.json({ error: "Log in to become a member." }, { status: 401 });
    }
    const body = bodySchema.parse(await request.json());
    const settings = await getMembershipSettings();
    if (!settings.programmeEnabled) {
      return NextResponse.json(
        { error: "AB Insider membership is not open right now." },
        { status: 409 },
      );
    }
    // The fee or terms changed since the page loaded: show the current ones first.
    if (body.fee !== settings.membershipFee || body.termsVersion !== settings.termsVersion) {
      return NextResponse.json(
        {
          error: "The membership fee or terms were just updated. Please review them again.",
          code: "terms_changed",
        },
        { status: 409 },
      );
    }
    const config = getCashfreeConfig();
    if (!config.configured) {
      return NextResponse.json({ error: "Payments are not available right now." }, { status: 503 });
    }
    const phone = normalizeMobile(customer.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Add a valid 10-digit mobile number in your account before paying." },
        { status: 400 },
      );
    }
    const membership = await createPendingMembership(customer, settings);
    const cashfree = await createCashfreeGatewayOrder({
      orderId: membership.gatewayOrderId!,
      amount: membership.feeAmount,
      customerId: customer.id,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: phone,
      returnOrigin: requestStorefrontOrigin(request),
      returnPath: "/membership/return",
      note: `${settings.planName} membership`,
    });
    if (!cashfree.payment_session_id || !cashfree.order_id) {
      return NextResponse.json(
        { error: cashfree.message || "Could not start payment." },
        { status: 502 },
      );
    }
    return NextResponse.json({
      orderId: cashfree.order_id,
      paymentSessionId: cashfree.payment_session_id,
      mode: config.mode,
    });
  } catch (error) {
    const { status, message } = actionErrorMessage(error, FALLBACK);
    // Never show database or gateway internals to shoppers.
    return NextResponse.json({ error: status >= 500 ? FALLBACK : message }, { status });
  }
}
