import { after, NextResponse } from "next/server";

import { getCashfreeConfig, verifyCashfreePayment } from "@/lib/cashfree.server";
import {
  confirmCashfreeCheckout,
  listOrdersForCustomer,
  placeOrder,
  quoteCheckout,
} from "@/lib/commerce.server";
import { checkoutSchema } from "@/lib/commerce-types";
import { getCustomerSession } from "@/lib/customer-auth.server";
import { actionErrorMessage } from "@/lib/form-request";
import { notifyOrderEvent } from "@/lib/notifications.server";
import { isListedOrder } from "@/lib/order-tracking";
import { withExpectedDelivery } from "@/lib/order-tracking.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await withExpectedDelivery(
    (await listOrdersForCustomer(session.id)).filter(isListedOrder),
  );
  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = checkoutSchema.parse(await request.json());
    const quote = await quoteCheckout(session, body);
    const cashfree = getCashfreeConfig();

    if (quote.totalAmount > 0) {
      if (!cashfree.configured) {
        return NextResponse.json(
          {
            error:
              "Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY, then restart the app.",
          },
          { status: 503 },
        );
      }
      if (!body.cashfreeOrderId) {
        return NextResponse.json(
          { error: "Complete payment to place this order." },
          { status: 400 },
        );
      }
      try {
        const confirmed = await confirmCashfreeCheckout(body.cashfreeOrderId);
        if (confirmed.order.customerId !== session.id) {
          return NextResponse.json({ error: "Could not place order." }, { status: 403 });
        }
        if (confirmed.justPaid) {
          after(() => {
            void notifyOrderEvent(confirmed.order, "order_placed");
            void notifyOrderEvent(confirmed.order, "payment_confirmed");
          });
        }
        return NextResponse.json({ order: confirmed.order });
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404) throw error;
      }
      const paid = await verifyCashfreePayment(body.cashfreeOrderId, quote.totalAmount);
      const { order, justPaid } = await placeOrder(session, body, {
        paymentStatus: "paid",
        paymentMethod: "cashfree",
        paymentId: paid.paymentId,
        gatewayOrderId: paid.cashfreeOrderId,
      });
      if (justPaid) {
        after(() => {
          void notifyOrderEvent(order, "order_placed");
          void notifyOrderEvent(order, "payment_confirmed");
        });
      }
      return NextResponse.json({ order });
    }

    const { order, justPaid } = await placeOrder(session, body, {
      paymentStatus: "paid",
      paymentMethod: "prepaid",
    });
    if (justPaid) {
      after(() => {
        void notifyOrderEvent(order, "order_placed");
      });
    }
    return NextResponse.json({ order });
  } catch (error) {
    const { status, message } = actionErrorMessage(error, "Could not place order.");
    return NextResponse.json({ error: message }, { status });
  }
}
