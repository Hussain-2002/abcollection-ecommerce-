"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, X } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { OrderProcessingScreen } from "@/components/commerce/OrderProcessingScreen";
import { Button } from "@/components/ui/button";
import { BUY_NOW_KEY, CHECKOUT_DRAFT_KEY } from "@/lib/commerce-constants";
import type { CheckoutInput, Order } from "@/lib/commerce-types";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";
import { fbqTrackPurchase } from "@/lib/meta-pixel";

/** UPI and some banks confirm a payment well after the shopper is sent back. */
const POLL_INTERVAL_MS = 3000;
const POLL_LIMIT_MS = 3 * 60 * 1000;

type ConfirmResult =
  | { status: "paid"; orderNumber: string; order?: Order }
  | { status: "pending" }
  | { status: "failed"; error: string };

type Phase = "checking" | "pending" | "timeout" | "failed";

function readDraft(cashfreeOrderId: string): CheckoutInput | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    const draft = raw ? (JSON.parse(raw) as CheckoutInput) : null;
    if (!draft?.checkoutId) return draft;
    // Ignore a draft left behind by a different checkout.
    const expected = `ab${draft.checkoutId.replace(/-/g, "")}`.toLowerCase();
    return expected === cashfreeOrderId.toLowerCase() ? draft : null;
  } catch {
    return null;
  }
}

async function confirmPayment(
  cashfreeOrderId: string,
  draft: CheckoutInput | null,
): Promise<ConfirmResult> {
  const res = await fetch("/api/payments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cashfreeOrderId }),
  });
  const data = await readJsonBody<{
    status?: "paid" | "pending" | "failed";
    orderNumber?: string;
    error?: string;
  }>(res);
  if (res.ok && data.status === "paid" && data.orderNumber) {
    return { status: "paid", orderNumber: data.orderNumber };
  }
  if (res.ok && data.status === "pending") return { status: "pending" };
  if (res.ok && data.status === "failed") {
    return { status: "failed", error: data.error || "Payment was not completed." };
  }

  // Checkouts started before the order was reserved are placed from the saved draft.
  if (res.status === 404 && draft) {
    const placeRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, cashfreeOrderId }),
    });
    const placed = await readJsonBody<{ order?: Order; error?: string }>(placeRes);
    if (placeRes.ok && placed.order?.paymentStatus === "paid") {
      return { status: "paid", orderNumber: placed.order.orderNumber, order: placed.order };
    }
    if (/pending/i.test(placed.error ?? "")) return { status: "pending" };
    return {
      status: "failed",
      error: apiErrorMessage(placed, "Payment could not be confirmed. Your cart is unchanged."),
    };
  }
  return {
    status: "failed",
    error: apiErrorMessage(data, "Payment could not be confirmed. Your cart is unchanged."),
  };
}

function ReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cashfreeOrderId = params.get("order_id") || "";
  const { applySuccessfulOrder, customer } = useCommerce();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState("");
  const runId = useRef(0);

  const finish = useCallback(
    async (orderNumber: string, placed: Order | undefined, draft: CheckoutInput | null) => {
      // Only the first arrival with this checkout's draft updates the cart and pixel,
      // so refreshing this page or the success page never counts the order twice.
      if (draft) {
        let order = placed;
        if (!order) {
          const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
            cache: "no-store",
          }).catch(() => null);
          if (res?.ok) order = (await readJsonBody<{ order?: Order }>(res)).order;
        }
        if (order) {
          fbqTrackPurchase(order);
          void applySuccessfulOrder(order, draft.mode === "buy_now" ? "buy_now" : "cart");
        }
      }
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      sessionStorage.removeItem(BUY_NOW_KEY);
      router.replace(`/checkout/success?order=${encodeURIComponent(orderNumber)}`);
    },
    [applySuccessfulOrder, router],
  );

  const run = useCallback(async () => {
    const id = ++runId.current;
    const active = () => runId.current === id;
    setError("");
    setPhase("checking");
    if (!cashfreeOrderId) {
      setError("We could not find this checkout. Return to checkout and try again.");
      setPhase("failed");
      return;
    }
    const draft = readDraft(cashfreeOrderId);
    const startedAt = Date.now();
    while (active()) {
      let result: ConfirmResult;
      try {
        result = await confirmPayment(cashfreeOrderId, draft);
      } catch {
        // Mobile networks drop requests when switching back from a UPI app. Retry.
        result = { status: "pending" };
      }
      if (!active()) return;
      if (result.status === "paid") {
        await finish(result.orderNumber, result.order, draft);
        return;
      }
      if (result.status === "failed") {
        setError(result.error);
        setPhase("failed");
        return;
      }
      if (Date.now() - startedAt > POLL_LIMIT_MS) {
        setPhase("timeout");
        return;
      }
      setPhase("pending");
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }, [cashfreeOrderId, finish]);

  useEffect(() => {
    void run();
    return () => {
      runId.current += 1;
    };
  }, [run]);

  if (phase === "failed") {
    return (
      <PaymentStatusMessage
        icon={<X className="size-7" strokeWidth={1.75} />}
        tone="error"
        title="Payment not completed"
        body={error}
        note="No order was placed and your cart is unchanged. If money was debited, it will be refunded automatically by your bank."
      >
        <Button
          asChild
          className="h-12 w-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase sm:w-auto"
        >
          <Link href="/checkout">Back to checkout</Link>
        </Button>
      </PaymentStatusMessage>
    );
  }

  if (phase === "timeout") {
    return (
      <PaymentStatusMessage
        icon={<Clock className="size-7" strokeWidth={1.75} />}
        tone="pending"
        title="Payment confirmation is taking longer"
        body="Your bank hasn't confirmed this payment yet. Please don't pay again."
        note="If the amount was debited, your order is confirmed automatically and we'll email you the Order ID. You can also check My Orders."
      >
        <Button
          type="button"
          onClick={() => void run()}
          className="h-12 w-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase sm:w-auto"
        >
          Check again
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 w-full border-foreground px-8 text-xs tracking-[0.12em] uppercase sm:w-auto"
        >
          {/* Guests have no account page; they track by order number + phone. */}
          <Link href={customer ? "/account/orders" : "/track-order"}>
            {customer ? "My Orders" : "Track order"}
          </Link>
        </Button>
      </PaymentStatusMessage>
    );
  }

  return (
    <OrderProcessingScreen
      title={phase === "pending" ? "Waiting for your bank" : "Confirming your payment"}
      subtitle={
        phase === "pending"
          ? "Your payment is still being confirmed. This can take up to a minute for UPI — please keep this page open."
          : "Please wait — we are verifying your payment and placing your order."
      }
    />
  );
}

function PaymentStatusMessage({
  icon,
  tone,
  title,
  body,
  note,
  children,
}: {
  icon: ReactNode;
  tone: "error" | "pending";
  title: string;
  body: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <div
        className={
          tone === "error"
            ? "flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            : "flex size-16 items-center justify-center rounded-full bg-muted text-foreground"
        }
        aria-hidden
      >
        {icon}
      </div>
      <h1 className="mt-8 font-display text-[clamp(1.75rem,7vw,2.25rem)] font-normal tracking-tight">
        {title}
      </h1>
      <p
        className={
          tone === "error" ? "mt-4 text-sm text-destructive" : "mt-4 text-sm text-foreground"
        }
        role={tone === "error" ? "alert" : "status"}
      >
        {body}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{note}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
        {children}
      </div>
    </div>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <OrderProcessingScreen
          title="Confirming your payment"
          subtitle="Please wait — we are verifying your payment and placing your order."
        />
      }
    >
      <ReturnInner />
    </Suspense>
  );
}
