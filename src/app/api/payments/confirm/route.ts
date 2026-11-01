import { after, NextResponse } from "next/server";
import { z } from "zod";

import { confirmCashfreeCheckout } from "@/lib/commerce.server";
import { actionErrorMessage } from "@/lib/form-request";
import { notifyOrderEvent } from "@/lib/notifications.server";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  cashfreeOrderId: z.string().trim().min(3).max(50),
});

/**
 * Marks the reserved checkout order paid after Cashfree, even if the browser lost the draft.
 * Safe to call repeatedly: the webhook and page refreshes only ever mark the order paid once.
 * Responds with `status: "paid" | "pending" | "failed"` so the return page can wait for UPI.
 */
export async function POST(request: Request) {
  try {
    const body = confirmSchema.parse(await request.json());
    const { order, justPaid } = await confirmCashfreeCheckout(body.cashfreeOrderId);
    if (justPaid) {
      after(() => {
        void notifyOrderEvent(order, "order_placed");
        void notifyOrderEvent(order, "payment_confirmed");
      });
    }
    return NextResponse.json({
      status: order.paymentStatus === "paid" ? "paid" : "pending",
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "payment_pending" || code === "payment_failed") {
      return NextResponse.json({
        status: code === "payment_pending" ? "pending" : "failed",
        error: (error as Error).message,
      });
    }
    const { status, message } = actionErrorMessage(error, "Could not confirm payment.");
    return NextResponse.json({ error: message }, { status });
  }
}
