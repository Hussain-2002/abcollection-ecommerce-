"use client";

import type { Order } from "@/lib/commerce-types";

type FbqParams = Record<string, unknown>;
type FbqOptions = { eventID?: string };

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const META_CURRENCY = "INR";

function canTrack() {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/** Fire a Meta Pixel standard event. No-op when the pixel isn't loaded. */
export function fbqTrack(event: string, params?: FbqParams, options?: FbqOptions) {
  if (!canTrack()) return;
  try {
    if (options?.eventID) window.fbq!("track", event, params ?? {}, options);
    else if (params) window.fbq!("track", event, params);
    else window.fbq!("track", event);
  } catch {
    /* never break the UI for analytics */
  }
}

/** Fire a Meta Pixel custom event. No-op when the pixel isn't loaded. */
export function fbqTrackCustom(event: string, params?: FbqParams, options?: FbqOptions) {
  if (!canTrack()) return;
  try {
    if (options?.eventID) window.fbq!("trackCustom", event, params ?? {}, options);
    else if (params) window.fbq!("trackCustom", event, params);
    else window.fbq!("trackCustom", event);
  } catch {
    /* never break the UI for analytics */
  }
}

/**
 * These actions already send their own Meta event (AddToCart, AddToWishlist,
 * InitiateCheckout, AddPaymentInfo). A second event named Click would hide them.
 */
function hasDedicatedMetaEvent(label: string) {
  return /^(add to cart|adding\.\.\.|added\b.*|try again|add to wishlist|buy now|checkout|pay\b.*)$/i.test(
    label.trim(),
  );
}

/** Meta custom event names: letters, numbers, spaces, hyphens, underscores. */
function metaEventName(label: string) {
  const name = label
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
  const generic = new Set(["click", "button", "a", "input", "link"]);
  if (name.length < 2 || generic.has(name.toLowerCase())) return "";
  return name;
}

/** Name the pixel event after the control. Never send a generic Click event. */
export function fbqTrackClick(label: string, path: string, destination?: string | undefined) {
  if (hasDedicatedMetaEvent(label)) return;
  const eventName = metaEventName(label);
  if (!eventName) return;
  const params: FbqParams = {
    content_name: label.slice(0, 120),
    content_category: path.slice(0, 200),
  };
  if (destination) params["destination"] = destination.slice(0, 500);
  fbqTrackCustom(eventName, params);
}

const PURCHASE_KEY_PREFIX = "ab_meta_purchase_";

/** Fire Purchase once per order (guarded with sessionStorage + eventID dedupe). */
export function fbqTrackPurchase(order: Order) {
  if (typeof window === "undefined") return;
  const key = `${PURCHASE_KEY_PREFIX}${order.orderNumber}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* storage unavailable: still track */
  }
  const items = order.items ?? [];
  fbqTrack(
    "Purchase",
    {
      value: order.totalAmount,
      currency: META_CURRENCY,
      content_type: "product",
      content_ids: items.map((item) => item.productId),
      contents: items.map((item) => ({
        id: item.productId,
        quantity: item.quantity,
        item_price: item.unitPrice,
      })),
      num_items: items.reduce((sum, item) => sum + item.quantity, 0),
      order_id: order.orderNumber,
    },
    { eventID: order.orderNumber },
  );
}
