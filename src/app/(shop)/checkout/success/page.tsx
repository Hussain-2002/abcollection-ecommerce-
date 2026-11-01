"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { OrderPlaced } from "@/components/commerce/OrderPlaced";
import { OrderProcessingScreen } from "@/components/commerce/OrderProcessingScreen";
import { Button } from "@/components/ui/button";
import { useLiveOrder } from "@/hooks/use-live-orders";

const CONFIRM_RETRY_MS = 8000;

function SuccessMessage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] font-normal tracking-tight">
        {title}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
        {children}
      </div>
    </div>
  );
}

function SuccessInner() {
  const params = useSearchParams();
  const orderNumber = params.get("order")?.trim() || "";
  const { customer, loading, openAuth, closeCart } = useCommerce();
  const [paymentFailed, setPaymentFailed] = useState(false);
  // Details come from the server for the signed-in customer or this browser's
  // guest checkout, never from the URL, so only the shopper's own order shows.
  const { order, error, refresh } = useLiveOrder(!loading && orderNumber ? orderNumber : undefined);
  const pendingGatewayId =
    order && order.paymentStatus === "pending" && order.paymentMethod === "cashfree"
      ? order.gatewayOrderId || ""
      : "";

  useEffect(() => {
    closeCart();
  }, [closeCart]);

  // The order is only shown as placed once Cashfree reports it paid.
  useEffect(() => {
    if (!pendingGatewayId) return;
    let cancelled = false;
    void (async () => {
      while (!cancelled) {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cashfreeOrderId: pendingGatewayId }),
        }).catch(() => null);
        const data = res?.ok ? ((await res.json().catch(() => ({}))) as { status?: string }) : {};
        if (cancelled) return;
        if (data.status === "failed") {
          setPaymentFailed(true);
          return;
        }
        await refresh();
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_RETRY_MS));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingGatewayId, refresh]);

  if (!orderNumber) {
    return (
      <SuccessMessage
        title="Order not found"
        body="We couldn't tell which order to show. Your orders are listed in your account."
      >
        <MyOrdersButton />
      </SuccessMessage>
    );
  }

  if (loading) return <LoadingOrder />;

  if (error && !order) {
    // Opened on another device or after the guest session ended.
    return customer ? (
      <SuccessMessage
        title="Order not found"
        body={`We couldn't find order #${orderNumber} on this account.`}
      >
        <MyOrdersButton />
      </SuccessMessage>
    ) : (
      <SuccessMessage
        title="View your order"
        body={`Track order #${orderNumber} with the mobile number used at checkout, or log in if you have an account.`}
      >
        <Button
          asChild
          className="h-12 w-full bg-ink px-8 text-xs tracking-[0.16em] text-white uppercase sm:w-auto"
        >
          <Link href={`/track-order?order=${encodeURIComponent(orderNumber)}`}>Track order</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            openAuth({
              type: "generic",
              redirect: `/checkout/success?order=${encodeURIComponent(orderNumber)}`,
            })
          }
          className="h-12 w-full border-ink px-8 text-xs tracking-[0.16em] uppercase sm:w-auto"
        >
          Log in
        </Button>
      </SuccessMessage>
    );
  }

  if (!order) return <LoadingOrder />;

  if (order.paymentStatus === "paid") return <OrderPlaced order={order} guest={!customer} />;

  if (order.paymentStatus === "pending" && order.orderStatus !== "cancelled" && !paymentFailed) {
    return (
      <OrderProcessingScreen
        title="Waiting for payment confirmation"
        subtitle="Your bank is still confirming this payment. This page updates on its own — please don't pay again."
      />
    );
  }

  return (
    <SuccessMessage
      title="Payment not completed"
      body={`Order #${order.orderNumber} was not paid, so it has not been placed. Your cart is unchanged.`}
    >
      <Button
        asChild
        className="h-12 w-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase sm:w-auto"
      >
        <Link href="/checkout">Back to checkout</Link>
      </Button>
    </SuccessMessage>
  );
}

function LoadingOrder() {
  return (
    <OrderProcessingScreen
      title="Loading your order"
      subtitle="Just a moment while we fetch your order details."
    />
  );
}

function MyOrdersButton() {
  const { customer, openAuth } = useCommerce();
  const className =
    "h-12 w-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase sm:w-auto";
  // Account pages need a login, so logged-out shoppers get the login panel in place.
  if (!customer) {
    return (
      <Button
        type="button"
        onClick={() => openAuth({ type: "generic", redirect: "/account/orders" })}
        className={className}
      >
        Log in to see orders
      </Button>
    );
  }
  return (
    <Button asChild className={className}>
      <Link href="/account/orders">My Orders</Link>
    </Button>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingOrder />}>
      <SuccessInner />
    </Suspense>
  );
}
