"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { ProductImage } from "@/components/site/ProductImage";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/commerce-types";
import { isPlaceholderEmail } from "@/lib/guest-email";
import { formatInr } from "@/lib/price";

function paymentMethodLabel(method: string | null | undefined) {
  if (!method || method === "cashfree") return "Paid online via Cashfree";
  if (method === "prepaid") return "Prepaid";
  return `Paid via ${method}`;
}

/** Order confirmation shown once the payment for this order is verified. */
export function OrderPlaced({ order, guest = false }: { order: Order; guest?: boolean }) {
  const { openAuth } = useCommerce();
  const [copied, setCopied] = useState(false);
  const firstName = order.customerName.trim().split(/\s+/)[0] || "";
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasEmail = !isPlaceholderEmail(order.customerEmail);
  // Guests track with order number + phone; account holders get the live order page.
  const trackHref = guest
    ? `/track-order?order=${encodeURIComponent(order.orderNumber)}`
    : `/account/orders/${encodeURIComponent(order.orderNumber)}`;

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pt-12 pb-16 sm:px-8 sm:pt-16">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-teal text-teal-foreground">
          <Check className="size-7" strokeWidth={1.75} />
        </div>
        <h1 className="mt-6 font-display text-[clamp(1.6rem,7vw,2.5rem)] leading-tight font-normal tracking-tight">
          Your order has been placed successfully!
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Thank you{firstName ? `, ${firstName}` : ""}. Your payment is confirmed
          {hasEmail ? (
            <>
              {" "}
              and a confirmation email is on its way to{" "}
              <span className="break-all text-foreground">{order.customerEmail}</span>.
            </>
          ) : (
            <>. Save your Order ID below to track this order.</>
          )}
        </p>
      </div>

      <div className="mt-8 border border-border bg-paper p-5 text-center">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Order ID
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="min-w-0 break-all font-display text-2xl font-normal tracking-wide sm:text-3xl">
            #{order.orderNumber}
          </span>
          <button
            type="button"
            onClick={() => void copyOrderId()}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label={copied ? "Order ID copied" : "Copy order ID"}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Placed {new Date(order.createdAt).toLocaleString("en-IN")}
        </p>
        {order.expectedDelivery ? (
          <p className="mt-1 text-sm text-foreground">{order.expectedDelivery}</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          className="h-12 flex-1 bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          <Link href={trackHref}>Track Your Order</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 flex-1 border-foreground px-8 text-xs tracking-[0.12em] uppercase"
        >
          <Link href="/collection">Continue Shopping</Link>
        </Button>
      </div>

      {guest ? (
        <div className="mt-6 flex flex-col gap-4 border border-border bg-paper p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.72rem] tracking-[0.18em] uppercase">Track orders easily</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a free account to see every order, delivery update and saved address in one
              place. Totally optional.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => openAuth({ type: "generic", redirect: "/account" })}
            className="h-11 shrink-0 border-ink px-6 text-[0.7rem] tracking-[0.16em] uppercase active:scale-[0.97]"
          >
            Create account
          </Button>
        </div>
      ) : null}

      <section className="mt-10 border border-border p-5">
        <h2 className="font-semibold">
          Order summary{" "}
          <span className="font-normal text-muted-foreground">
            ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        </h2>
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 py-4 text-sm first:pt-0 last:pb-0">
              {item.productImage ? (
                <ProductImage
                  src={item.productImage}
                  alt=""
                  width={128}
                  height={160}
                  sizes="64px"
                  className="h-20 w-16 shrink-0 object-cover object-top"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.productName}</p>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-muted-foreground">
                  <dt>Colour</dt>
                  <dd className="text-foreground">{item.color}</dd>
                  <dt>Size</dt>
                  <dd className="text-foreground">{item.size}</dd>
                  <dt>Qty</dt>
                  <dd className="text-foreground">
                    {item.quantity}
                    {item.quantity > 1 ? ` × ${formatInr(item.unitPrice)}` : ""}
                  </dd>
                </dl>
              </div>
              <p className="shrink-0 font-semibold">{formatInr(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatInr(order.subtotal)}</span>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between text-teal">
              <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
              <span>-{formatInr(order.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{order.shippingCost > 0 ? formatInr(order.shippingCost) : "Free"}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total paid</span>
            <span className="text-teal">{formatInr(order.totalAmount)}</span>
          </div>
          <p className="text-xs text-muted-foreground">{paymentMethodLabel(order.paymentMethod)}</p>
        </div>
      </section>

      <section className="mt-6 border border-border p-5">
        <h2 className="font-semibold">Delivery details</h2>
        <p className="mt-3 text-sm leading-relaxed">
          {order.customerName}
          <br />
          {order.customerPhone}
          {order.alternatePhone ? ` · Alt ${order.alternatePhone}` : ""}
          <br />
          {order.addressLine1}
          {order.addressLine2 ? `, ${order.addressLine2}` : ""}
          <br />
          {order.addressCity}, {order.addressState} {order.addressPincode}
        </p>
      </section>
    </div>
  );
}
