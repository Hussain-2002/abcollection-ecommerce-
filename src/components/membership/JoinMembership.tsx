"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useMembership } from "@/components/membership/MembershipProvider";
import { loadCashfreeCheckout } from "@/lib/cashfree-checkout";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";
import { daysLeft, formatIstDate, MEMBERSHIP_STATUS_LABELS, validityLabel } from "@/lib/membership";
import { formatInr } from "@/lib/price";
import { cn } from "@/lib/utils";

const press =
  "transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";

/**
 * Join / renew panel. Shows the current fee and terms from the server, requires
 * an account and accepted terms, then hands off to Cashfree. Activation happens
 * only after the server verifies payment.
 */
export function JoinMembership({ className }: { className?: string }) {
  const router = useRouter();
  const { customer, loading, openAuth } = useCommerce();
  const { snapshot, open, isMember, refresh } = useMembership();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!snapshot) {
    return <div className={cn("skeleton h-56", className)} aria-busy="true" />;
  }
  const { settings, membership } = snapshot;

  if (!open) {
    return (
      <div className={cn("border border-border bg-paper p-6", className)}>
        <p className="text-lg font-light">Membership opens soon.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          New memberships aren&apos;t available right now. Existing members keep their benefits.
        </p>
      </div>
    );
  }

  const live = isMember && membership?.status === "active";
  const renewing = Boolean(membership && (membership.status === "expired" || live));

  const join = async () => {
    if (!customer) {
      openAuth({ type: "generic", redirect: "/membership" });
      return;
    }
    if (!accepted || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/membership/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acceptTerms: true,
          termsVersion: settings.termsVersion,
          fee: settings.membershipFee,
        }),
      });
      const data = await readJsonBody<{
        orderId?: string;
        paymentSessionId?: string;
        mode?: "sandbox" | "production";
        error?: string;
        code?: string;
      }>(res);
      if (!res.ok || !data.orderId || !data.paymentSessionId) {
        if (data.code === "terms_changed") {
          setAccepted(false);
          await refresh();
        }
        setError(apiErrorMessage(data, "Could not start payment. Please try again."));
        return;
      }
      const cashfree = await loadCashfreeCheckout(
        data.mode === "production" ? "production" : "sandbox",
      );
      const result = await cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_modal",
      });
      const message = result?.error?.message?.trim() ?? "";
      if (/abort|cancelled|canceled|closed|dismiss/i.test(message)) {
        setError("Payment was cancelled. You haven't been charged.");
        return;
      }
      // The return page asks the server to verify the payment with Cashfree.
      router.push(`/membership/return?order_id=${encodeURIComponent(data.orderId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("border border-border bg-paper p-6 sm:p-8", className)}>
      {live && membership ? (
        <div className="mb-6 flex items-start gap-3 border-b border-border pb-6">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">
            <Check className="size-4" />
          </span>
          <div>
            <p className="font-medium">You&apos;re an {settings.planName} member</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Active until {formatIstDate(membership.expiresAt)} · {daysLeft(membership.expiresAt)}{" "}
              days left.{" "}
              <Link href="/account/membership" className="underline underline-offset-4">
                View membership
              </Link>
            </p>
          </div>
        </div>
      ) : membership && membership.status !== "active" ? (
        <p className="mb-5 text-sm text-muted-foreground">
          Your last membership: {MEMBERSHIP_STATUS_LABELS[membership.status]}
          {membership.expiresAt ? ` · ended ${formatIstDate(membership.expiresAt)}` : ""}
        </p>
      ) : null}

      <p className="text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase">
        {renewing ? "Renew membership" : "Membership fee"}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="editorial text-[3rem] leading-none">
          {formatInr(settings.membershipFee)}
        </span>
        <span className="text-sm text-muted-foreground">
          one-time · {validityLabel(settings.defaultValidityDays)}
        </span>
      </p>
      {live ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Renewing now adds {validityLabel(settings.defaultValidityDays)} after your current
          membership ends.
        </p>
      ) : null}

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-ink"
        />
        <span>
          I agree to the{" "}
          <a href="#terms" className="underline underline-offset-4">
            membership terms
          </a>
          . Membership starts only after payment succeeds and does not renew automatically.
        </span>
      </label>

      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void join()}
        disabled={busy || loading || (Boolean(customer) && !accepted)}
        className={cn(
          "mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-ink px-6 text-[0.76rem] tracking-[0.18em] text-white uppercase hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-40",
          press,
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {!customer
          ? "Log in to join"
          : `${renewing ? "Renew" : "Join"} for ${formatInr(settings.membershipFee)}`}
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Secure payment by UPI, card or netbanking. Charged separately from any order.
      </p>
    </div>
  );
}
