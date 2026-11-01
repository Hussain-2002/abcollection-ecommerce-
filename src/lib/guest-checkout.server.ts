import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { z } from "zod";

import {
  clearCart,
  createCustomerRecord,
  findCustomerByEmail,
  findCustomerById,
  mergeGuestCart,
  updateCustomerProfile,
} from "@/lib/commerce.server";
import { cartItemInputSchema, type CustomerPublic } from "@/lib/commerce-types";
import { getCustomerSession, toPublicCustomer } from "@/lib/customer-auth.server";
import { GUEST_NO_EMAIL_DOMAIN } from "@/lib/guest-email";
import { normalizeMobile } from "@/lib/reservation-utils";

const GUEST_COOKIE_NAME = "ab_guest_checkout";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, long enough to view and track the order
/** Not a bcrypt hash, so no password ever matches a guest row. */
const GUEST_PASSWORD_HASH = "!guest-checkout";

export const guestCheckoutSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z.string().trim().min(10, "Enter a 10-digit mobile number.").max(15),
  email: z.string().trim().max(200).email("Enter a valid email.").optional().or(z.literal("")),
  items: z.array(cartItemInputSchema).max(50).default([]),
});

export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;

function getSecret() {
  const raw = (
    process.env["CUSTOMER_SESSION_SECRET"] ||
    process.env["ADMIN_SESSION_SECRET"] ||
    "ab-collection-customer-dev-secret"
  ).trim();
  // Domain-separated so a guest token can never pass as a customer session.
  return `guest-checkout:${raw.replace(/^["']|["']$/g, "")}`;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function encodeToken(guestId: string, email: string) {
  const payload = Buffer.from(
    JSON.stringify({ gid: guestId, em: email, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeToken(token: string): { guestId: string; email: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      gid?: string;
      em?: string;
      exp?: number;
    };
    if (!data.gid || !data.exp || Date.now() > data.exp) return null;
    return { guestId: data.gid, email: data.em ?? "" };
  } catch {
    return null;
  }
}

async function setGuestCookie(guestId: string, email: string) {
  const jar = await cookies();
  jar.set(GUEST_COOKIE_NAME, encodeToken(guestId, email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** The guest shopper on this browser, if they started a guest checkout. */
export const getGuestCustomer = cache(async (): Promise<CustomerPublic | null> => {
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded) return null;
  const row = await findCustomerById(decoded.guestId);
  if (!row || row.passwordHash !== GUEST_PASSWORD_HASH) return null;
  const customer = toPublicCustomer(row);
  // Orders and emails use the address the guest typed, even when another
  // account already owns it (the guest row then stores a placeholder).
  return decoded.email ? { ...customer, email: decoded.email } : customer;
});

/** Logged-in customer first, otherwise the guest shopper. */
export async function getCheckoutCustomer() {
  return (await getCustomerSession()) ?? (await getGuestCustomer());
}

async function createGuestRow(fields: { fullName: string; phone: string; email: string }) {
  const id = randomUUID();
  const taken = fields.email ? await findCustomerByEmail(fields.email) : null;
  const now = new Date().toISOString();
  const record = {
    id,
    email: fields.email && !taken ? fields.email : `guest-${id}@${GUEST_NO_EMAIL_DOMAIN}`,
    passwordHash: GUEST_PASSWORD_HASH,
    fullName: fields.fullName,
    phone: fields.phone,
    alternatePhone: null,
    status: "guest",
    createdAt: now,
    updatedAt: now,
  };
  try {
    return await createCustomerRecord(record);
  } catch (error) {
    // Before the guest_checkout migration runs, status only allows active/disabled.
    // "disabled" rows can't log in either, and the password hash marks them as guests.
    if ((error as { code?: string }).code === "23514") {
      return createCustomerRecord({ ...record, status: "disabled" });
    }
    throw error;
  }
}

/**
 * Starts (or refreshes) a guest checkout: saves the contact details, copies the
 * browser cart to the server so pricing and stock checks run as usual, and
 * sets the guest cookie. Call from a route handler.
 */
export async function startGuestCheckout(input: GuestCheckoutInput) {
  const phone = normalizeMobile(input.phone);
  if (!phone) {
    throw Object.assign(new Error("Enter a valid 10-digit Indian mobile number."), {
      status: 400,
    });
  }
  const fields = {
    fullName: input.fullName.trim(),
    phone,
    email: input.email?.trim().toLowerCase() ?? "",
  };

  let guest = await getGuestCustomer();
  if (guest) {
    await updateCustomerProfile(guest.id, {
      fullName: fields.fullName,
      phone: fields.phone,
      alternatePhone: guest.alternatePhone,
    });
  } else {
    guest = toPublicCustomer(await createGuestRow(fields));
  }

  await clearCart(guest.id);
  if (input.items.length) await mergeGuestCart(guest.id, input.items);
  await setGuestCookie(guest.id, fields.email);
  return { fullName: fields.fullName, phone: fields.phone, email: fields.email };
}
