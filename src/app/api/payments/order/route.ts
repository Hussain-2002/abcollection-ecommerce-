import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import {
  createCashfreeOrder,
  getCashfreeConfig,
  requestStorefrontOrigin,
} from "@/lib/cashfree.server";
import {
  abandonUnpaidCheckout,
  placeOrder,
  quoteCheckout,
  rememberGatewayOrder,
} from "@/lib/commerce.server";
import { checkoutSchema } from "@/lib/commerce-types";
import { getCustomerSession } from "@/lib/customer-auth.server";
import { actionErrorMessage } from "@/lib/form-request";
import { normalizeMobile } from "@/lib/reservation-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = checkoutSchema.parse(await request.json());
    const checkoutId = body.checkoutId?.trim();
    if (!checkoutId) {
      return NextResponse.json(
        { error: "Checkout session is missing. Refresh and try again." },
        { status: 400 },
      );
    }

    const quote = await quoteCheckout(session, body);
    if (quote.totalAmount <= 0) {
      return NextResponse.json({ skipPayment: true, amount: 0, checkoutId });
    }

    const reserve = (id: string) =>
      placeOrder(session, { ...body, checkoutId: id }, {
        paymentStatus: "pending",
        paymentMethod: "cashfree",
      });

    // Save the order before Cashfree takes payment, so a successful payment
    // still shows in the admin orders tab if the browser never returns.
    let activeCheckoutId = checkoutId;
    let reserved = await reserve(activeCheckoutId);

    const config = getCashfreeConfig();
    if (!config.configured) {
      return NextResponse.json(
        {
          error:
            "Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY, then restart the app.",
        },
        { status: 503 },
      );
    }

    const phone = normalizeMobile(session.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Add a valid 10-digit mobile number in your account before paying." },
        { status: 400 },
      );
    }

    const openCashfree = (id: string) =>
      createCashfreeOrder({
        checkoutId: id,
        amount: quote.totalAmount,
        customerId: session.id,
        customerName: session.fullName,
        customerEmail: session.email,
        customerPhone: phone,
        returnOrigin: requestStorefrontOrigin(request),
      });

    let cashfree = await openCashfree(activeCheckoutId);
    const amountMatches = (order: { order_amount?: number }) => {
      const charged = Number(order.order_amount);
      return !Number.isFinite(charged) || Math.round(charged) === Math.round(quote.totalAmount);
    };
    // Cashfree keeps the first amount for a checkout id. A changed cart needs a new id.
    if (!amountMatches(cashfree) && reserved.order.paymentStatus !== "paid") {
      await abandonUnpaidCheckout(reserved.order.id);
      activeCheckoutId = randomUUID();
      reserved = await reserve(activeCheckoutId);
      cashfree = await openCashfree(activeCheckoutId);
      if (!amountMatches(cashfree)) {
        return NextResponse.json(
          { error: "The payment amount changed. Refresh checkout and try again." },
          { status: 409 },
        );
      }
    }
    if (cashfree.order_id) {
      await rememberGatewayOrder(reserved.order.id, cashfree.order_id).catch((error) => {
        console.error("[orders] could not store Cashfree order id", error);
      });
    }
    if (!cashfree.order_id) {
      return NextResponse.json(
        { error: cashfree.message || "Could not start Cashfree checkout." },
        { status: 502 },
      );
    }

    if (String(cashfree.order_status || "").toUpperCase() === "PAID") {
      return NextResponse.json({
        skipPayment: false,
        alreadyPaid: true,
        amount: quote.totalAmount,
        mode: config.mode,
        cashfreeOrderId: cashfree.order_id,
        checkoutId: activeCheckoutId,
      });
    }

    if (!cashfree.payment_session_id) {
      return NextResponse.json(
        { error: cashfree.message || "Could not start Cashfree checkout." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      skipPayment: false,
      amount: quote.totalAmount,
      mode: config.mode,
      cashfreeOrderId: cashfree.order_id,
      paymentSessionId: cashfree.payment_session_id,
      checkoutId: activeCheckoutId,
    });
  } catch (error) {
    const { status, message } = actionErrorMessage(error, "Could not start payment.");
    return NextResponse.json({ error: message }, { status });
  }
}
