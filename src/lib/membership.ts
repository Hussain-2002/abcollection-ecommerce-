import { z } from "zod";

/** AB Insider Membership: shared types, validation and pricing (server + browser). */

export const MEMBERSHIP_STATUSES = [
  "pending_payment",
  "active",
  "expired",
  "failed",
  "revoked",
] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
export type MembershipSource = "paid" | "admin_granted";

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  pending_payment: "Pending payment",
  active: "Active",
  expired: "Expired",
  failed: "Failed",
  revoked: "Revoked",
};

export const MEMBERSHIP_SOURCE_LABELS: Record<MembershipSource, string> = {
  paid: "Paid",
  admin_granted: "Admin granted",
};

export const DEFAULT_VALIDITY_DAYS = 365;

export type MembershipSettings = {
  programmeEnabled: boolean;
  membershipFee: number;
  defaultValidityDays: number;
  planName: string;
  description: string;
  benefits: string[];
  termsContent: string;
  termsVersion: number;
  stackCoupons: boolean;
  stackOffers: boolean;
  stackBundles: boolean;
  reminderDays: number;
  notifyOnGrant: boolean;
  updatedBy: string | null;
  updatedAt: string;
};

/** What shoppers may see about the programme. */
export type PublicMembershipSettings = Omit<MembershipSettings, "updatedBy" | "updatedAt">;

export type MemberRule = {
  id: string;
  productId: string;
  variantId: string | null;
  isEligible: boolean;
  enabled: boolean;
  pricingType: "fixed" | "percent";
  memberPrice: number | null;
  discountPercent: number | null;
  maxDiscount: number | null;
  minAllowedPrice: number | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

export type CustomerMembership = {
  id: string;
  membershipNumber: string;
  customerId: string;
  status: MembershipStatus;
  source: MembershipSource;
  planName: string;
  feeAmount: number;
  validityDays: number;
  termsVersion: number;
  purchasedAt: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  gatewayOrderId: string | null;
  grantedBy: string | null;
  grantNote: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A shopper's own membership, without internal or payment details. */
export type PublicMembership = Pick<
  CustomerMembership,
  | "id"
  | "membershipNumber"
  | "status"
  | "source"
  | "planName"
  | "feeAmount"
  | "purchasedAt"
  | "startsAt"
  | "expiresAt"
>;

/** Member price per product, resolved server-side for display. */
export type MemberPriceEntry = {
  productId: string;
  /** Applies to variants without their own rule; null when only some variants qualify. */
  price: number | null;
  /** variantId -> member price (only eligible variants). */
  variants: Record<string, number>;
  /** Lowest member price across eligible variants, for "from" labels. */
  lowest: number;
};

export type MembershipSnapshot = {
  settings: PublicMembershipSettings;
  prices: MemberPriceEntry[];
  membership: PublicMembership | null;
  isMember: boolean;
};

// ---------- status ----------

/** Stored status, corrected for time: an active row past its expiry is expired. */
export function effectiveStatus(
  membership: Pick<CustomerMembership, "status" | "expiresAt">,
  now = new Date(),
): MembershipStatus {
  if (
    membership.status === "active" &&
    membership.expiresAt &&
    new Date(membership.expiresAt).getTime() <= now.getTime()
  ) {
    return "expired";
  }
  return membership.status;
}

/** Grants member pricing right now. Fails closed on missing dates. */
export function isMembershipLive(
  membership: Pick<CustomerMembership, "status" | "startsAt" | "expiresAt">,
  now = new Date(),
) {
  if (membership.status !== "active" || !membership.startsAt || !membership.expiresAt) return false;
  const t = now.getTime();
  return (
    new Date(membership.startsAt).getTime() <= t && t < new Date(membership.expiresAt).getTime()
  );
}

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * 86_400_000);
}

// ---------- pricing ----------

export function ruleIsLive(rule: MemberRule, now = new Date()) {
  if (!rule.enabled || !rule.isEligible) return false;
  const t = now.getTime();
  if (rule.startsAt && new Date(rule.startsAt).getTime() > t) return false;
  if (rule.endsAt && new Date(rule.endsAt).getTime() <= t) return false;
  return true;
}

/**
 * Member unit price for a regular price under one rule, or null when the rule
 * gives no saving. Never above the regular price, never below the configured floor.
 */
export function memberUnitPrice(regular: number, rule: MemberRule, now = new Date()) {
  if (regular <= 0 || !ruleIsLive(rule, now)) return null;
  let price: number;
  if (rule.pricingType === "fixed") {
    if (rule.memberPrice === null) return null;
    price = rule.memberPrice;
  } else {
    if (!rule.discountPercent) return null;
    let off = Math.round((regular * rule.discountPercent) / 100);
    if (rule.maxDiscount !== null) off = Math.min(off, rule.maxDiscount);
    price = regular - off;
  }
  if (rule.minAllowedPrice !== null) price = Math.max(price, rule.minAllowedPrice);
  price = Math.min(Math.round(price), regular);
  return price < regular ? price : null;
}

/** The rule that governs a variant: its own row if present, else the product row. */
export function ruleFor(rules: MemberRule[], productId: string, variantId: string | null) {
  if (variantId) {
    const own = rules.find((rule) => rule.productId === productId && rule.variantId === variantId);
    if (own) return own;
  }
  return rules.find((rule) => rule.productId === productId && rule.variantId === null) ?? null;
}

export function resolveMemberPrice(
  rules: MemberRule[],
  productId: string,
  variantId: string | null,
  regular: number,
  now = new Date(),
) {
  const rule = ruleFor(rules, productId, variantId);
  return rule ? memberUnitPrice(regular, rule, now) : null;
}

/** Display lookup: member price for a product, optionally for one variant. */
export function memberPriceFor(
  prices: MemberPriceEntry[],
  productId: string,
  variantId?: string | null,
) {
  const entry = prices.find((row) => row.productId === productId);
  if (!entry) return null;
  if (variantId) return entry.variants[variantId] ?? null;
  return entry.price ?? entry.lowest ?? null;
}

// ---------- dates (IST) ----------

export function formatIstDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

/** "valid 1 year", "valid 2 years" or "valid 90 days". */
export function validityLabel(days: number) {
  if (days > 0 && days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? "valid 1 year" : `valid ${years} years`;
  }
  return `valid ${days} days`;
}

export function daysLeft(expiresAt: string | null, now = new Date()) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000));
}

// ---------- admin input validation ----------

const money = z.coerce.number().int().min(0).max(10_000_000);
const optionalDate = z
  .string()
  .trim()
  .max(40)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || !Number.isNaN(new Date(value).getTime()), "Invalid date.");

export const membershipSettingsSchema = z.object({
  programmeEnabled: z.boolean(),
  membershipFee: money,
  defaultValidityDays: z.coerce.number().int().min(1).max(3650),
  planName: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(""),
  benefits: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  termsContent: z.string().trim().max(20_000).default(""),
  stackCoupons: z.boolean(),
  stackOffers: z.boolean(),
  stackBundles: z.boolean(),
  reminderDays: z.coerce.number().int().min(0).max(60),
  notifyOnGrant: z.boolean(),
  /** Bump the terms version so new buyers accept the latest terms. */
  bumpTermsVersion: z.boolean().optional(),
});
export type MembershipSettingsInput = z.infer<typeof membershipSettingsSchema>;

export const memberRuleSchema = z
  .object({
    productId: z.string().trim().min(1).max(80),
    variantId: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    isEligible: z.boolean(),
    enabled: z.boolean(),
    pricingType: z.enum(["fixed", "percent"]),
    memberPrice: money
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    discountPercent: z.coerce
      .number()
      .gt(0)
      .lt(100)
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    maxDiscount: money
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    minAllowedPrice: money
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .superRefine((rule, ctx) => {
    if (rule.isEligible && rule.pricingType === "fixed" && rule.memberPrice === null) {
      ctx.addIssue({ code: "custom", message: "Enter a member price.", path: ["memberPrice"] });
    }
    if (rule.isEligible && rule.pricingType === "percent" && rule.discountPercent === null) {
      ctx.addIssue({ code: "custom", message: "Enter a discount %.", path: ["discountPercent"] });
    }
    if (rule.startsAt && rule.endsAt && new Date(rule.endsAt) <= new Date(rule.startsAt)) {
      ctx.addIssue({ code: "custom", message: "End must be after start.", path: ["endsAt"] });
    }
  });
export type MemberRuleInput = z.infer<typeof memberRuleSchema>;

export const grantMembershipSchema = z.object({
  customerId: z.string().uuid(),
  startsAt: optionalDate,
  expiresAt: optionalDate,
  note: z.string().trim().max(500).optional().default(""),
});

export const membershipActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revoke"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("reactivate"), reason: z.string().trim().min(3).max(500) }),
  z.object({
    action: z.literal("change_dates"),
    startsAt: optionalDate,
    expiresAt: z.string().trim().min(1),
    reason: z.string().trim().min(3).max(500),
  }),
]);
