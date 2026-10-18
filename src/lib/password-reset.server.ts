import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

import type { CustomerPublic } from "@/lib/commerce-types";
import { findCustomerByEmail, setCustomerPasswordHash } from "@/lib/commerce.server";
import { sendCustomerEmail } from "@/lib/notifications.server";
import { SITE_NAME } from "@/lib/site";
import { toPublicCustomer } from "@/lib/customer-auth.server";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const recentSends = new Map<string, number>();

function cleanEnv(value: string | undefined, fallback: string) {
  const raw = (value ?? fallback).trim();
  return raw.replace(/^["']|["']$/g, "").trim();
}

function secret() {
  return cleanEnv(
    process.env["CUSTOMER_SESSION_SECRET"] || process.env["ADMIN_SESSION_SECRET"],
    "ab-collection-customer-dev-secret",
  );
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function codeDigest(email: string, code: string) {
  return createHmac("sha256", secret()).update(`otp:${email}:${code}`).digest("base64url");
}

function passwordTag(passwordHash: string) {
  return createHmac("sha256", secret())
    .update(`pwd:${passwordHash}`)
    .digest("base64url")
    .slice(0, 24);
}

type ResetPayload = { email: string; exp: number; code: string; pwd: string };

function createResetToken(email: string, code: string, passwordHash: string) {
  const payload = Buffer.from(
    JSON.stringify({
      email,
      exp: Date.now() + OTP_TTL_MS,
      code: codeDigest(email, code),
      pwd: passwordTag(passwordHash),
    } satisfies ResetPayload),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readResetToken(token: string): ResetPayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<ResetPayload>;
    if (!data.email || !data.exp || !data.code || !data.pwd) return null;
    return { email: data.email, exp: data.exp, code: data.code, pwd: data.pwd };
  } catch {
    return null;
  }
}

function invalidCode() {
  return Object.assign(new Error("That code is incorrect or has expired."), { status: 400 });
}

export async function sendPasswordResetCode(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const lastSent = recentSends.get(email) ?? 0;
  if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
    throw Object.assign(new Error("Please wait a minute before requesting another code."), {
      status: 429,
    });
  }
  recentSends.set(email, Date.now());

  const customer = await findCustomerByEmail(email);
  if (!customer || customer.status !== "active") return { resetToken: "" };

  const code = String(randomInt(100000, 1000000));
  const text = [
    `Your ${SITE_NAME} password reset code is ${code}.`,
    "",
    "It expires in 10 minutes. If you did not ask to reset your password, you can ignore this email.",
  ].join("\n");
  const html = `<p>Your ${SITE_NAME} password reset code is <strong style="font-size:20px;letter-spacing:0.2em">${code}</strong>.</p><p>It expires in 10 minutes. If you did not ask to reset your password, you can ignore this email.</p>`;
  const sent = await sendCustomerEmail(email, `${SITE_NAME} password reset code`, text, html);
  if (!sent.ok) {
    recentSends.delete(email);
    throw Object.assign(new Error("Could not send the email. Please try again."), { status: 503 });
  }
  return { resetToken: createResetToken(email, code, customer.passwordHash) };
}

export async function resetPasswordWithOtp(input: {
  email: string;
  otp: string;
  password: string;
  resetToken: string;
}): Promise<CustomerPublic> {
  const parsed = readResetToken(input.resetToken);
  const email = input.email.trim().toLowerCase();
  if (!parsed || parsed.email !== email || Date.now() > parsed.exp) throw invalidCode();

  const customer = await findCustomerByEmail(email);
  if (!customer || customer.status !== "active") throw invalidCode();
  if (passwordTag(customer.passwordHash) !== parsed.pwd) throw invalidCode();
  if (!safeEqual(codeDigest(email, input.otp.trim()), parsed.code)) throw invalidCode();

  const passwordHash = await bcrypt.hash(input.password, 12);
  await setCustomerPasswordHash(customer.id, passwordHash);
  return toPublicCustomer({ ...customer, passwordHash });
}
