import "server-only";

import { randomBytes, randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Product } from "@/lib/catalog-types";
import {
  getCashfreeConfig,
  membershipGatewayOrderId,
  verifyCashfreePayment,
} from "@/lib/cashfree.server";
import { findCustomerById } from "@/lib/commerce.server";
import type { CustomerPublic } from "@/lib/commerce-types";
import { isPlaceholderEmail } from "@/lib/guest-email";
import {
  DEFAULT_VALIDITY_DAYS,
  addDays,
  effectiveStatus,
  formatIstDate,
  isMembershipLive,
  memberUnitPrice,
  ruleFor,
  type CustomerMembership,
  type MemberPriceEntry,
  type MemberRule,
  type MemberRuleInput,
  type MembershipSettings,
  type MembershipSettingsInput,
  type MembershipSource,
  type MembershipStatus,
  type PublicMembership,
  type PublicMembershipSettings,
} from "@/lib/membership";
import { sendCustomerEmail } from "@/lib/notifications.server";
import { parsePriceInr, formatInr } from "@/lib/price";
import { SITE_URL } from "@/lib/site";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

function db(): SupabaseClient {
  return getSupabaseWriteClient() as unknown as SupabaseClient;
}

function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status });
}

function str(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function num(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- settings

const DEFAULT_SETTINGS: MembershipSettings = {
  programmeEnabled: false,
  membershipFee: 0,
  defaultValidityDays: DEFAULT_VALIDITY_DAYS,
  planName: "AB Insider",
  description: "",
  benefits: [],
  termsContent: "",
  termsVersion: 1,
  stackCoupons: false,
  stackOffers: false,
  stackBundles: false,
  reminderDays: 7,
  notifyOnGrant: true,
  updatedBy: null,
  updatedAt: new Date(0).toISOString(),
};

function mapSettings(row: Record<string, unknown>): MembershipSettings {
  return {
    programmeEnabled: Boolean(row["programme_enabled"]),
    membershipFee: Number(row["membership_fee"] ?? 0),
    defaultValidityDays:
      Number(row["default_validity_days"] ?? DEFAULT_VALIDITY_DAYS) || DEFAULT_VALIDITY_DAYS,
    planName: String(row["plan_name"] ?? "AB Insider"),
    description: String(row["description"] ?? ""),
    benefits: Array.isArray(row["benefits"]) ? (row["benefits"] as unknown[]).map(String) : [],
    termsContent: String(row["terms_content"] ?? ""),
    termsVersion: Number(row["terms_version"] ?? 1),
    stackCoupons: Boolean(row["stack_coupons"]),
    stackOffers: Boolean(row["stack_offers"]),
    stackBundles: Boolean(row["stack_bundles"]),
    reminderDays: Number(row["reminder_days"] ?? 7),
    notifyOnGrant: row["notify_on_grant"] === undefined ? true : Boolean(row["notify_on_grant"]),
    updatedBy: str(row["updated_by"]),
    updatedAt: String(row["updated_at"] ?? new Date(0).toISOString()),
  };
}

/** Programme settings. Fails safe (programme off) if the table isn't there yet. */
export async function getMembershipSettings(): Promise<MembershipSettings> {
  try {
    const { data, error } = await db()
      .from("membership_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return mapSettings(data as Record<string, unknown>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function toPublicSettings(settings: MembershipSettings): PublicMembershipSettings {
  const { updatedBy: _updatedBy, updatedAt: _updatedAt, ...rest } = settings;
  return rest;
}

export async function saveMembershipSettings(input: MembershipSettingsInput, admin: string) {
  const before = await getMembershipSettings();
  const termsChanged = input.termsContent.trim() !== before.termsContent.trim();
  const patch = {
    id: 1,
    programme_enabled: input.programmeEnabled,
    membership_fee: input.membershipFee,
    default_validity_days: input.defaultValidityDays,
    plan_name: input.planName,
    description: input.description,
    benefits: input.benefits,
    terms_content: input.termsContent,
    terms_version: before.termsVersion + (input.bumpTermsVersion || termsChanged ? 1 : 0),
    stack_coupons: input.stackCoupons,
    stack_offers: input.stackOffers,
    stack_bundles: input.stackBundles,
    reminder_days: input.reminderDays,
    notify_on_grant: input.notifyOnGrant,
    updated_by: admin,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db().from("membership_settings").upsert(patch).select("*").single();
  if (error) throw error;
  const after = mapSettings(data as Record<string, unknown>);
  await audit(
    admin,
    "settings.update",
    "membership_settings",
    "1",
    diffObject(before, after),
    null,
  );
  return after;
}

// ---------------------------------------------------------------- audit

type AuditDiff = { old: Record<string, unknown> | null; new: Record<string, unknown> | null };

function diffObject<T extends Record<string, unknown>>(before: T, after: T): AuditDiff {
  const old: Record<string, unknown> = {};
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (key === "updatedAt" || key === "updatedBy") continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      old[key] = before[key];
      next[key] = after[key];
    }
  }
  return { old, new: next };
}

async function audit(
  admin: string,
  action: string,
  entityType: string,
  entityId: string | null,
  diff: AuditDiff | null,
  note: string | null,
) {
  const { error } = await db()
    .from("membership_audit_logs")
    .insert({
      admin_id: admin,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: diff?.old ?? null,
      new_value: diff?.new ?? null,
      note,
    });
  if (error) console.error("[membership] audit log", error);
}

export type MembershipAuditEntry = {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  note: string | null;
  createdAt: string;
};

export async function listMembershipAudit(filter?: { entityId?: string; limit?: number }) {
  let query = db()
    .from("membership_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filter?.limit ?? 200);
  if (filter?.entityId) query = query.eq("entity_id", filter.entityId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>): MembershipAuditEntry => ({
    id: String(row["id"]),
    adminId: String(row["admin_id"]),
    action: String(row["action"]),
    entityType: String(row["entity_type"]),
    entityId: str(row["entity_id"]),
    oldValue: (row["old_value"] as Record<string, unknown> | null) ?? null,
    newValue: (row["new_value"] as Record<string, unknown> | null) ?? null,
    note: str(row["note"]),
    createdAt: String(row["created_at"]),
  }));
}

// ---------------------------------------------------------------- pricing rules

function mapRule(row: Record<string, unknown>): MemberRule {
  return {
    id: String(row["id"]),
    productId: String(row["product_id"]),
    variantId: str(row["variant_id"]),
    isEligible: Boolean(row["is_eligible"]),
    enabled: Boolean(row["enabled"]),
    pricingType: row["pricing_type"] === "percent" ? "percent" : "fixed",
    memberPrice: num(row["member_price"]),
    discountPercent: num(row["discount_percent"]),
    maxDiscount: num(row["max_discount"]),
    minAllowedPrice: num(row["min_allowed_price"]),
    startsAt: str(row["starts_at"]),
    endsAt: str(row["ends_at"]),
    updatedBy: str(row["updated_by"]),
    updatedAt: String(row["updated_at"]),
  };
}

export async function listMemberRules(): Promise<MemberRule[]> {
  try {
    const { data, error } = await db().from("membership_product_rules").select("*");
    if (error) return [];
    return (data ?? []).map((row) => mapRule(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

function ruleRow(rule: MemberRuleInput, admin: string) {
  return {
    product_id: rule.productId,
    variant_id: rule.variantId,
    is_eligible: rule.isEligible,
    enabled: rule.enabled,
    pricing_type: rule.pricingType,
    member_price: rule.pricingType === "fixed" ? rule.memberPrice : null,
    discount_percent: rule.pricingType === "percent" ? rule.discountPercent : null,
    max_discount: rule.pricingType === "percent" ? rule.maxDiscount : null,
    min_allowed_price: rule.minAllowedPrice,
    starts_at: rule.startsAt,
    ends_at: rule.endsAt,
    updated_by: admin,
    updated_at: new Date().toISOString(),
  };
}

/** Creates or updates one rule per product/variant target and logs the change. */
export async function saveMemberRule(input: MemberRuleInput, admin: string, products: Product[]) {
  const product = products.find((row) => row.id === input.productId);
  if (!product) fail("Product not found.", 404);
  if (input.variantId && !product.variants.some((variant) => variant.id === input.variantId)) {
    fail("Variant not found for this product.", 404);
  }
  const regular = parsePriceInr(product.price);
  if (input.pricingType === "fixed" && input.memberPrice !== null && input.memberPrice >= regular) {
    fail(`Member price must be below the regular price (${formatInr(regular)}).`, 400);
  }
  if (input.minAllowedPrice !== null && input.minAllowedPrice >= regular) {
    fail(`Minimum price must be below the regular price (${formatInr(regular)}).`, 400);
  }

  const rules = await listMemberRules();
  const existing = rules.find(
    (rule) => rule.productId === input.productId && rule.variantId === input.variantId,
  );
  const row = ruleRow(input, admin);
  const { data, error } = existing
    ? await db()
        .from("membership_product_rules")
        .update(row)
        .eq("id", existing.id)
        .select("*")
        .single()
    : await db()
        .from("membership_product_rules")
        .insert({ id: randomUUID(), ...row })
        .select("*")
        .single();
  if (error) throw error;
  const saved = mapRule(data as Record<string, unknown>);
  await audit(
    admin,
    existing ? "rule.update" : "rule.create",
    "membership_product_rule",
    saved.id,
    existing
      ? diffObject(
          existing as unknown as Record<string, unknown>,
          saved as unknown as Record<string, unknown>,
        )
      : { old: null, new: saved as unknown as Record<string, unknown> },
    `${product.name}${input.variantId ? " (variant)" : ""}`,
  );
  return saved;
}

export async function deleteMemberRule(id: string, admin: string) {
  const rules = await listMemberRules();
  const existing = rules.find((rule) => rule.id === id);
  if (!existing) fail("Rule not found.", 404);
  const { error } = await db().from("membership_product_rules").delete().eq("id", id);
  if (error) throw error;
  await audit(
    admin,
    "rule.delete",
    "membership_product_rule",
    id,
    {
      old: existing as unknown as Record<string, unknown>,
      new: null,
    },
    null,
  );
}

/** Member prices for display, resolved per product and variant. */
export function memberPriceEntries(products: Product[], rules: MemberRule[], now = new Date()) {
  const entries: MemberPriceEntry[] = [];
  for (const product of products) {
    if (!rules.some((rule) => rule.productId === product.id)) continue;
    const regular = parsePriceInr(product.price);
    const productRule = ruleFor(rules, product.id, null);
    const base = productRule ? memberUnitPrice(regular, productRule, now) : null;
    const variants: Record<string, number> = {};
    for (const variant of product.variants) {
      const rule = ruleFor(rules, product.id, variant.id);
      const price = rule ? memberUnitPrice(regular, rule, now) : null;
      if (price !== null) variants[variant.id] = price;
    }
    const prices = Object.values(variants);
    if (!prices.length && base === null) continue;
    entries.push({
      productId: product.id,
      price: base,
      variants,
      lowest: Math.min(...(prices.length ? prices : [base ?? regular])),
    });
  }
  return entries;
}

// ---------------------------------------------------------------- memberships

function mapMembership(row: Record<string, unknown>): CustomerMembership {
  return {
    id: String(row["id"]),
    membershipNumber: String(row["membership_number"]),
    customerId: String(row["customer_id"]),
    status: String(row["status"]) as MembershipStatus,
    source: (String(row["source"]) as MembershipSource) || "paid",
    planName: String(row["plan_name"] ?? "AB Insider"),
    feeAmount: Number(row["fee_amount"] ?? 0),
    validityDays: Number(row["validity_days"] ?? DEFAULT_VALIDITY_DAYS),
    termsVersion: Number(row["terms_version"] ?? 1),
    purchasedAt: str(row["purchased_at"]),
    startsAt: str(row["starts_at"]),
    expiresAt: str(row["expires_at"]),
    gatewayOrderId: str(row["gateway_order_id"]),
    grantedBy: str(row["granted_by"]),
    grantNote: str(row["grant_note"]),
    revokedAt: str(row["revoked_at"]),
    revokedBy: str(row["revoked_by"]),
    revokeReason: str(row["revoke_reason"]),
    createdAt: String(row["created_at"]),
    updatedAt: String(row["updated_at"]),
  };
}

function withEffectiveStatus(membership: CustomerMembership): CustomerMembership {
  return { ...membership, status: effectiveStatus(membership) };
}

export function toPublicMembership(membership: CustomerMembership): PublicMembership {
  return {
    id: membership.id,
    membershipNumber: membership.membershipNumber,
    status: effectiveStatus(membership),
    source: membership.source,
    planName: membership.planName,
    feeAmount: membership.feeAmount,
    purchasedAt: membership.purchasedAt,
    startsAt: membership.startsAt,
    expiresAt: membership.expiresAt,
  };
}

function newMembershipNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `ABI-${code}`;
}

export async function listMembershipsForCustomer(customerId: string) {
  try {
    const { data, error } = await db()
      .from("customer_memberships")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) =>
      withEffectiveStatus(mapMembership(row as Record<string, unknown>)),
    );
  } catch {
    return [];
  }
}

/**
 * The membership that prices this customer's orders right now, or null.
 * Fails closed: any lookup error means no member pricing.
 */
export async function getLiveMembership(customerId: string, now = new Date()) {
  const memberships = await listMembershipsForCustomer(customerId);
  return memberships.find((row) => isMembershipLive(row, now)) ?? null;
}

/** The membership to show in My Account: live first, then upcoming, pending, then latest. */
export function primaryMembership(memberships: CustomerMembership[], now = new Date()) {
  return (
    memberships.find((row) => isMembershipLive(row, now)) ??
    memberships.find(
      (row) => row.status === "active" && row.startsAt && new Date(row.startsAt) > now,
    ) ??
    memberships.find((row) => row.status === "pending_payment") ??
    memberships[0] ??
    null
  );
}

/** Starts a paid membership: a pending record plus its payment row. */
export async function createPendingMembership(
  customer: CustomerPublic,
  settings: MembershipSettings,
) {
  if (!settings.programmeEnabled) fail("AB Insider membership is not open right now.", 409);
  if (settings.membershipFee <= 0) fail("Membership is not available to buy yet.", 409);
  const id = randomUUID();
  const gatewayOrderId = membershipGatewayOrderId(id);
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("customer_memberships")
    .insert({
      id,
      membership_number: newMembershipNumber(),
      customer_id: customer.id,
      status: "pending_payment",
      source: "paid",
      plan_name: settings.planName,
      fee_amount: settings.membershipFee,
      validity_days: settings.defaultValidityDays,
      terms_version: settings.termsVersion,
      gateway_order_id: gatewayOrderId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;
  const { error: paymentError } = await db().from("membership_payments").insert({
    customer_membership_id: id,
    provider: "cashfree",
    provider_order_id: gatewayOrderId,
    amount: settings.membershipFee,
    payment_status: "pending",
  });
  if (paymentError) throw paymentError;
  return mapMembership(data as Record<string, unknown>);
}

async function findByGatewayOrder(gatewayOrderId: string) {
  const { data, error } = await db()
    .from("customer_memberships")
    .select("*")
    .eq("gateway_order_id", gatewayOrderId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapMembership(data as Record<string, unknown>) : null;
}

/** Renewals start when the current membership ends; first-timers start now. */
async function nextStartFor(customerId: string, excludeId: string, now = new Date()) {
  const memberships = await listMembershipsForCustomer(customerId);
  const latestEnd = memberships
    .filter((row) => row.id !== excludeId && row.status === "active" && row.expiresAt)
    .map((row) => new Date(row.expiresAt!).getTime())
    .filter((time) => time > now.getTime())
    .sort((a, b) => b - a)[0];
  return latestEnd ? new Date(latestEnd) : now;
}

/**
 * Verifies the membership fee with Cashfree and activates exactly once.
 * Safe to call from the webhook and the return page at the same time.
 */
export async function confirmMembershipPayment(gatewayOrderId: string) {
  const membership = await findByGatewayOrder(gatewayOrderId);
  if (!membership) fail("Membership payment was not found.", 404);
  if (membership.status === "active")
    return { membership: withEffectiveStatus(membership), justActivated: false };
  if (membership.status !== "pending_payment" && membership.status !== "failed") {
    return { membership: withEffectiveStatus(membership), justActivated: false };
  }

  let paid: Awaited<ReturnType<typeof verifyCashfreePayment>>;
  try {
    paid = await verifyCashfreePayment(gatewayOrderId, membership.feeAmount);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "payment_failed") {
      await db()
        .from("customer_memberships")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", membership.id)
        .eq("status", "pending_payment");
      await db()
        .from("membership_payments")
        .update({ payment_status: "failed" })
        .eq("provider_order_id", gatewayOrderId)
        .eq("payment_status", "pending");
    }
    throw error;
  }

  const now = new Date();
  const startsAt = await nextStartFor(membership.customerId, membership.id, now);
  const expiresAt = addDays(startsAt, membership.validityDays);
  // Only one caller wins this update; the rest see no rows and report justActivated: false.
  const { data, error } = await db()
    .from("customer_memberships")
    .update({
      status: "active",
      purchased_at: now.toISOString(),
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", membership.id)
    .in("status", ["pending_payment", "failed"])
    .select("*");
  if (error) throw error;
  const claimed = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!claimed) {
    const latest = await findByGatewayOrder(gatewayOrderId);
    return { membership: withEffectiveStatus(latest ?? membership), justActivated: false };
  }
  await db()
    .from("membership_payments")
    .update({
      payment_status: "paid",
      provider_payment_id: paid.paymentId,
      paid_at: now.toISOString(),
    })
    .eq("provider_order_id", gatewayOrderId);
  const activated = mapMembership(claimed);
  return { membership: activated, justActivated: true };
}

export async function grantMembership(
  input: { customerId: string; startsAt: string | null; expiresAt: string | null; note: string },
  admin: string,
) {
  const customer = await findCustomerById(input.customerId);
  if (!customer || customer.status !== "active") fail("Pick a registered customer account.", 404);
  const settings = await getMembershipSettings();
  const startsAt = input.startsAt ? new Date(input.startsAt) : new Date();
  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt)
    : addDays(startsAt, settings.defaultValidityDays || DEFAULT_VALIDITY_DAYS);
  if (expiresAt <= startsAt) fail("Expiry must be after the start date.", 400);
  const now = new Date().toISOString();
  const id = randomUUID();
  const { data, error } = await db()
    .from("customer_memberships")
    .insert({
      id,
      membership_number: newMembershipNumber(),
      customer_id: input.customerId,
      status: "active",
      source: "admin_granted",
      plan_name: settings.planName,
      fee_amount: 0,
      validity_days: Math.max(
        1,
        Math.round((expiresAt.getTime() - startsAt.getTime()) / 86_400_000),
      ),
      terms_version: settings.termsVersion,
      purchased_at: now,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      granted_by: admin,
      grant_note: input.note || null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;
  const granted = mapMembership(data as Record<string, unknown>);
  await audit(
    admin,
    "membership.grant",
    "customer_membership",
    id,
    {
      old: null,
      new: {
        customerId: input.customerId,
        startsAt: granted.startsAt,
        expiresAt: granted.expiresAt,
      },
    },
    input.note || null,
  );
  if (settings.notifyOnGrant) await notifyActivated(granted);
  return granted;
}

export async function applyMembershipAction(
  id: string,
  action:
    | { action: "revoke"; reason: string }
    | { action: "reactivate"; reason: string }
    | { action: "change_dates"; startsAt: string | null; expiresAt: string; reason: string },
  admin: string,
) {
  const { data: row, error: readError } = await db()
    .from("customer_memberships")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!row) fail("Membership not found.", 404);
  const before = mapMembership(row as Record<string, unknown>);
  const now = new Date().toISOString();
  let patch: Record<string, unknown>;

  if (action.action === "revoke") {
    if (before.status === "revoked") fail("This membership is already revoked.", 409);
    patch = { status: "revoked", revoked_at: now, revoked_by: admin, revoke_reason: action.reason };
  } else if (action.action === "reactivate") {
    if (before.status !== "revoked" && effectiveStatus(before) !== "expired") {
      fail("Only revoked or expired memberships can be reactivated.", 409);
    }
    if (!before.startsAt || !before.expiresAt) fail("This membership was never activated.", 409);
    if (new Date(before.expiresAt) <= new Date()) {
      fail("Set a new expiry date first; this membership has already ended.", 409);
    }
    patch = { status: "active", revoked_at: null, revoked_by: null, revoke_reason: null };
  } else {
    const expiresAt = new Date(action.expiresAt);
    const startsAt = action.startsAt
      ? new Date(action.startsAt)
      : before.startsAt
        ? new Date(before.startsAt)
        : null;
    if (Number.isNaN(expiresAt.getTime())) fail("Enter a valid expiry date.", 400);
    if (startsAt && expiresAt <= startsAt) fail("Expiry must be after the start date.", 400);
    if (before.status === "pending_payment" || before.status === "failed") {
      fail("Dates can only be changed on activated memberships.", 409);
    }
    patch = {
      ...(startsAt ? { starts_at: startsAt.toISOString() } : {}),
      expires_at: expiresAt.toISOString(),
      // Extending an expired membership brings it back; reminders restart.
      ...(before.status === "expired" && expiresAt > new Date() ? { status: "active" } : {}),
      reminder_sent_at: null,
      expiry_notified_at: null,
    };
  }

  const { data, error } = await db()
    .from("customer_memberships")
    .update({ ...patch, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  const after = mapMembership(data as Record<string, unknown>);
  await audit(
    admin,
    `membership.${action.action}`,
    "customer_membership",
    id,
    diffObject(
      before as unknown as Record<string, unknown>,
      after as unknown as Record<string, unknown>,
    ),
    action.reason,
  );
  return withEffectiveStatus(after);
}

// ---------------------------------------------------------------- admin records

export type MembershipRecord = CustomerMembership & {
  customer: { id: string; fullName: string; email: string; phone: string } | null;
};

export async function listMembershipRecords(filter: {
  q?: string;
  status?: string;
  source?: string;
  from?: string;
  to?: string;
}) {
  let query = db()
    .from("customer_memberships")
    .select("*, customers(id, full_name, email, phone)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter.source) query = query.eq("source", filter.source);
  if (filter.from) query = query.gte("created_at", filter.from);
  if (filter.to) query = query.lte("created_at", filter.to);
  const q = filter.q?.trim();
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    const { data: matches } = await db()
      .from("customers")
      .select("id")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      .limit(200);
    const ids = (matches ?? []).map((row: { id: string }) => row.id);
    const isUuid = /^[0-9a-f-]{36}$/i.test(term);
    const parts = [`membership_number.ilike.%${term}%`];
    if (ids.length) parts.push(`customer_id.in.(${ids.join(",")})`);
    if (isUuid) parts.push(`customer_id.eq.${term}`, `id.eq.${term}`);
    query = query.or(parts.join(","));
  }
  const { data, error } = await query;
  if (error) throw error;
  const records = (data ?? []).map((row: Record<string, unknown>): MembershipRecord => {
    const customer = row["customers"] as Record<string, unknown> | null;
    return {
      ...withEffectiveStatus(mapMembership(row)),
      customer: customer
        ? {
            id: String(customer["id"]),
            fullName: String(customer["full_name"] ?? ""),
            email: String(customer["email"] ?? ""),
            phone: String(customer["phone"] ?? ""),
          }
        : null,
    };
  });
  // Status filter uses the effective status so time-expired rows show as expired.
  return filter.status ? records.filter((row) => row.status === filter.status) : records;
}

export async function getMembershipDetail(id: string) {
  const { data, error } = await db()
    .from("customer_memberships")
    .select("*, customers(id, full_name, email, phone)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const customer = row["customers"] as Record<string, unknown> | null;
  const [{ data: payments }, history] = await Promise.all([
    db()
      .from("membership_payments")
      .select("*")
      .eq("customer_membership_id", id)
      .order("created_at", { ascending: false }),
    listMembershipAudit({ entityId: id, limit: 100 }),
  ]);
  return {
    membership: withEffectiveStatus(mapMembership(row)),
    customer: customer
      ? {
          id: String(customer["id"]),
          fullName: String(customer["full_name"] ?? ""),
          email: String(customer["email"] ?? ""),
          phone: String(customer["phone"] ?? ""),
        }
      : null,
    payments: (payments ?? []).map((payment: Record<string, unknown>) => ({
      id: String(payment["id"]),
      provider: String(payment["provider"]),
      providerOrderId: String(payment["provider_order_id"]),
      providerPaymentId: str(payment["provider_payment_id"]),
      amount: Number(payment["amount"] ?? 0),
      status: String(payment["payment_status"]),
      paidAt: str(payment["paid_at"]),
      createdAt: String(payment["created_at"]),
    })),
    history,
  };
}

export async function membershipStats(filter: { from?: string; to?: string }) {
  const records = await listMembershipRecords(filter);
  const counts: Record<MembershipStatus, number> = {
    pending_payment: 0,
    active: 0,
    expired: 0,
    failed: 0,
    revoked: 0,
  };
  for (const record of records) counts[record.status] += 1;
  let paymentsQuery = db()
    .from("membership_payments")
    .select("amount, paid_at")
    .eq("payment_status", "paid");
  if (filter.from) paymentsQuery = paymentsQuery.gte("paid_at", filter.from);
  if (filter.to) paymentsQuery = paymentsQuery.lte("paid_at", filter.to);
  let ordersQuery = db()
    .from("orders")
    .select("customer_id, total_amount, member_discount, customer_membership_id")
    .eq("payment_status", "paid");
  if (filter.from) ordersQuery = ordersQuery.gte("created_at", filter.from);
  if (filter.to) ordersQuery = ordersQuery.lte("created_at", filter.to);
  const [{ data: payments }, { data: orders }] = await Promise.all([paymentsQuery, ordersQuery]);
  const feeRevenue = (payments ?? []).reduce(
    (sum, row: { amount: number }) => sum + Number(row.amount ?? 0),
    0,
  );
  const allOrders = (orders ?? []) as {
    customer_id: string;
    total_amount: number;
    member_discount: number | null;
    customer_membership_id: string | null;
  }[];
  const memberOrders = allOrders.filter((row) => row.customer_membership_id);
  const nonMemberOrders = allOrders.filter((row) => !row.customer_membership_id);
  const repeatRate = (rows: typeof allOrders) => {
    const perCustomer = new Map<string, number>();
    for (const row of rows)
      perCustomer.set(row.customer_id, (perCustomer.get(row.customer_id) ?? 0) + 1);
    const customers = perCustomer.size;
    const repeat = [...perCustomer.values()].filter((count) => count > 1).length;
    return customers ? Math.round((repeat / customers) * 100) : 0;
  };
  const memberRevenue = memberOrders.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
  return {
    total: records.length,
    counts,
    paid: records.filter(
      (row) => row.source === "paid" && row.status !== "pending_payment" && row.status !== "failed",
    ).length,
    granted: records.filter((row) => row.source === "admin_granted").length,
    feeRevenue,
    memberOrders: memberOrders.length,
    memberRevenue,
    memberAov: memberOrders.length ? Math.round(memberRevenue / memberOrders.length) : 0,
    memberDiscount: memberOrders.reduce((sum, row) => sum + Number(row.member_discount ?? 0), 0),
    nonMemberOrders: nonMemberOrders.length,
    nonMemberAov: nonMemberOrders.length
      ? Math.round(
          nonMemberOrders.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0) /
            nonMemberOrders.length,
        )
      : 0,
    memberRepeatRate: repeatRate(memberOrders),
    nonMemberRepeatRate: repeatRate(nonMemberOrders),
  };
}

export async function searchCustomersForGrant(q: string) {
  const term = q.trim().replace(/[%,()]/g, " ");
  if (term.length < 2) return [];
  const isUuid = /^[0-9a-f-]{36}$/i.test(term);
  const filter = [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `phone.ilike.%${term}%`];
  if (isUuid) filter.push(`id.eq.${term}`);
  const { data, error } = await db()
    .from("customers")
    .select("id, full_name, email, phone, status")
    .eq("status", "active")
    .or(filter.join(","))
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row["id"]),
    fullName: String(row["full_name"] ?? ""),
    email: String(row["email"] ?? ""),
    phone: String(row["phone"] ?? ""),
  }));
}

// ---------------------------------------------------------------- notifications

function membershipEmail(title: string, lines: string[], cta?: { label: string; href: string }) {
  const text = [
    title,
    "",
    ...lines,
    ...(cta ? ["", `${cta.label}: ${cta.href}`] : []),
    "",
    "AB Collection",
  ].join("\n");
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;color:#111;max-width:520px">
<p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6b6862">AB Insider</p>
<h1 style="font-weight:400;font-size:24px;margin:0 0 16px">${title}</h1>
${lines.map((line) => `<p style="font-size:15px;line-height:1.6;margin:0 0 10px">${line}</p>`).join("")}
${cta ? `<p style="margin-top:24px"><a href="${cta.href}" style="display:inline-block;background:#111;color:#fff;padding:12px 22px;text-decoration:none;font-size:12px;letter-spacing:.16em;text-transform:uppercase">${cta.label}</a></p>` : ""}
<p style="font-size:12px;color:#6b6862;margin-top:28px">AB Collection · Made in India</p></div>`;
  return { text, html };
}

/** Claims a notification column atomically so repeats never double-send. */
async function claimNotification(
  id: string,
  column: "activation_notified_at" | "reminder_sent_at" | "expiry_notified_at",
) {
  const { data, error } = await db()
    .from("customer_memberships")
    .update({ [column]: new Date().toISOString() })
    .eq("id", id)
    .is(column, null)
    .select("id");
  if (error) {
    console.error("[membership] claim notification", error);
    return false;
  }
  return (data ?? []).length > 0;
}

async function emailFor(customerId: string) {
  const customer = await findCustomerById(customerId);
  if (!customer || isPlaceholderEmail(customer.email)) return null;
  return customer;
}

export async function notifyActivated(membership: CustomerMembership) {
  if (!(await claimNotification(membership.id, "activation_notified_at"))) return;
  const customer = await emailFor(membership.customerId);
  if (!customer) return;
  const settings = await getMembershipSettings();
  const complimentary = membership.source === "admin_granted";
  const { text, html } = membershipEmail(
    complimentary ? "You've been made an AB Insider" : "Welcome to AB Insider",
    [
      `Hi ${customer.fullName.split(" ")[0] || "there"}, your ${membership.planName} membership is active${complimentary ? " (complimentary)" : ""}.`,
      `Membership ID: ${membership.membershipNumber}`,
      `Valid from ${formatIstDate(membership.startsAt)} to ${formatIstDate(membership.expiresAt)}.`,
      ...(settings.benefits.length ? [`Your benefits: ${settings.benefits.join(" · ")}`] : []),
      "Member prices show automatically when you're logged in.",
    ],
    { label: "Shop member prices", href: `${SITE_URL}/collection` },
  );
  await sendCustomerEmail(
    customer.email,
    `Your ${membership.planName} membership is active`,
    text,
    html,
  ).catch((error) => console.error("[membership] activation email", error));
}

/**
 * Daily job (Supabase pg_cron → /api/cron/membership): marks expired rows,
 * sends "ending soon" and "expired" emails once each, and fails stale payments.
 */
export async function runMembershipMaintenance(now = new Date()) {
  const settings = await getMembershipSettings();
  const result = { expired: 0, reminders: 0, expiryEmails: 0, staleFailed: 0 };

  const { data: active } = await db()
    .from("customer_memberships")
    .select("*")
    .eq("status", "active");
  for (const row of (active ?? []) as Record<string, unknown>[]) {
    const membership = mapMembership(row);
    if (!membership.expiresAt) continue;
    const expiresAt = new Date(membership.expiresAt);
    if (expiresAt <= now) {
      const { data } = await db()
        .from("customer_memberships")
        .update({ status: "expired", updated_at: now.toISOString() })
        .eq("id", membership.id)
        .eq("status", "active")
        .select("id");
      if ((data ?? []).length) result.expired += 1;
      if (await claimNotification(membership.id, "expiry_notified_at")) {
        const customer = await emailFor(membership.customerId);
        if (customer) {
          const { text, html } = membershipEmail(
            "Your AB Insider membership has ended",
            [
              `Membership ${membership.membershipNumber} ended on ${formatIstDate(membership.expiresAt)}.`,
              "Member prices no longer apply. Renew any time to get them back.",
            ],
            { label: "Renew membership", href: `${SITE_URL}/membership` },
          );
          await sendCustomerEmail(
            customer.email,
            "Your AB Insider membership has ended",
            text,
            html,
          ).catch(() => undefined);
          result.expiryEmails += 1;
        }
      }
      continue;
    }
    const days = (expiresAt.getTime() - now.getTime()) / 86_400_000;
    if (settings.reminderDays > 0 && days <= settings.reminderDays) {
      if (await claimNotification(membership.id, "reminder_sent_at")) {
        const customer = await emailFor(membership.customerId);
        if (customer) {
          const { text, html } = membershipEmail(
            "Your AB Insider membership ends soon",
            [
              `Membership ${membership.membershipNumber} ends on ${formatIstDate(membership.expiresAt)}.`,
              "Renew before then to keep member prices without a gap. Memberships never renew automatically.",
            ],
            { label: "Renew membership", href: `${SITE_URL}/membership` },
          );
          await sendCustomerEmail(
            customer.email,
            "Your AB Insider membership ends soon",
            text,
            html,
          ).catch(() => undefined);
          result.reminders += 1;
        }
      }
    }
  }

  // Abandoned checkouts: payments still pending after a day are marked failed.
  const cutoff = new Date(now.getTime() - 86_400_000).toISOString();
  const { data: stale } = await db()
    .from("customer_memberships")
    .update({ status: "failed", updated_at: now.toISOString() })
    .eq("status", "pending_payment")
    .lt("created_at", cutoff)
    .select("id");
  result.staleFailed = (stale ?? []).length;
  return result;
}

export function membershipPaymentsConfigured() {
  return getCashfreeConfig().configured;
}
