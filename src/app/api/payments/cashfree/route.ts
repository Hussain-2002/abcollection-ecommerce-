import { after, NextResponse } from "next/server";

import { verifyCashfreeWebhook } from "@/lib/cashfree.server";
import { confirmCashfreeCheckout } from "@/lib/commerce.server";
import { notifyOrderEvent } from "@/lib/notifications.server";

export const dynamic = "force-dynamic";

type CashfreeWebhook = {
  type?: string;
  data?: {
    order?: { order_id?: string; order_status?: string };
    payment?: { payment_status?: string };
  };
};

/** Cashfree calls this when payment succeeds, so the order is saved even if the shopper's browser closes. */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-webhook-signature") || "";
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  if (!verifyCashfreeWebhook(raw, signature, timestamp)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: CashfreeWebhook;
  try {
    payload = JSON.parse(raw) as CashfreeWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const orderStatus = String(payload.data?.order?.order_status || "").toUpperCase();
  const paymentStatus = String(payload.data?.payment?.payment_status || "").toUpperCase();
  const cashfreeOrderId = payload.data?.order?.order_id?.trim() || "";
  const succeeded =
    orderStatus === "PAID" ||
    paymentStatus === "SUCCESS" ||
    payload.type === "PAYMENT_SUCCESS_WEBHOOK";
  if (!succeeded || !cashfreeOrderId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const { order, justPaid } = await confirmCashfreeCheckout(cashfreeOrderId);
    if (justPaid) {
      after(() => {
        void notifyOrderEvent(order, "order_placed");
        void notifyOrderEvent(order, "payment_confirmed");
      });
    }
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return NextResponse.json({ ok: true, ignored: true });
    console.error("[cashfree-webhook]", error);
    return NextResponse.json({ error: "Could not record the paid order." }, { status: 500 });
  }
}
