"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, X } from "lucide-react";

import { MembershipCard } from "@/components/membership/MembershipCard";
import { useMembership } from "@/components/membership/MembershipProvider";
import { OrderProcessingScreen } from "@/components/commerce/OrderProcessingScreen";
import { readJsonBody } from "@/lib/form-request";
import type { MembershipStatus, PublicMembership } from "@/lib/membership";

const POLL_MS = 3000;
const LIMIT_MS = 3 * 60 * 1000;

type Phase = "checking" | "pending" | "active" | "failed" | "timeout";

function ReturnInner() {
  const params = useSearchParams();
  const orderId = params.get("order_id") ?? "";
  const { refresh, snapshot } = useMembership();
  const [phase, setPhase] = useState<Phase>("checking");
  const [membership, setMembership] = useState<PublicMembership | null>(null);
  const [message, setMessage] = useState("");
  const run = useRef(0);

  const check = useCallback(async () => {
    const id = ++run.current;
    const started = Date.now();
    setPhase("checking");
    if (!orderId) {
      setMessage("We couldn't find this payment.");
      setPhase("failed");
      return;
    }
    while (run.current === id) {
      let status: MembershipStatus | "" = "";
      try {
        const res = await fetch("/api/membership/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await readJsonBody<{
          status?: MembershipStatus;
          membership?: PublicMembership;
          error?: string;
        }>(res);
        status = data.status ?? "";
        if (data.membership) setMembership(data.membership);
        if (!res.ok && !data.status) {
          setMessage(data.error || "We couldn't confirm this payment.");
          setPhase("failed");
          return;
        }
        if (data.error) setMessage(data.error);
      } catch {
        status = "pending_payment"; // Network blip after returning from a UPI app: retry.
      }
      if (run.current !== id) return;
      if (status === "active") {
        setPhase("active");
        void refresh();
        return;
      }
      if (status === "failed" || status === "revoked" || status === "expired") {
        setPhase("failed");
        return;
      }
      if (Date.now() - started > LIMIT_MS) {
        setPhase("timeout");
        return;
      }
      setPhase("pending");
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }, [orderId, refresh]);

  useEffect(() => {
    void check();
    return () => {
      run.current += 1;
    };
  }, [check]);

  if (phase === "checking" || phase === "pending") {
    return (
      <OrderProcessingScreen
        title={phase === "pending" ? "Waiting for your bank" : "Confirming your payment"}
        subtitle="Your membership starts as soon as the payment is confirmed. Please keep this page open."
      />
    );
  }

  if (phase === "active") {
    const benefits = snapshot?.settings.benefits ?? [];
    return (
      <div className="page-wrap mx-auto max-w-3xl py-[clamp(3rem,7vw,5rem)]">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-ink text-white">
            <Check className="size-6" strokeWidth={1.75} />
          </span>
          <h1 className="editorial mt-6 text-[clamp(2.2rem,6vw,3.6rem)] leading-none">
            Welcome to {membership?.planName ?? "AB Insider"}.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Your membership is active. Member prices now show across the store while you&apos;re
            logged in.
          </p>
        </div>
        {membership ? <MembershipCard membership={membership} className="mt-10" /> : null}
        {benefits.length ? (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <li key={benefit} className="border-t border-ink pt-3 text-sm">
                {benefit}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-10 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/collection"
            className="inline-flex min-h-12 items-center justify-center bg-ink px-8 text-[0.74rem] tracking-[0.18em] text-white uppercase transition-[background-color,transform] duration-200 hover:bg-[#333] active:scale-[0.97]"
          >
            Shop member prices
          </Link>
          <Link
            href="/account/membership"
            className="inline-flex min-h-12 items-center justify-center border border-ink px-8 text-[0.74rem] tracking-[0.18em] uppercase transition-[background-color,color,transform] duration-200 hover:bg-ink hover:text-white active:scale-[0.97]"
          >
            View membership
          </Link>
        </div>
      </div>
    );
  }

  const timeout = phase === "timeout";
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-muted">
        {timeout ? (
          <Clock className="size-6" strokeWidth={1.5} />
        ) : (
          <X className="size-6" strokeWidth={1.5} />
        )}
      </span>
      <h1 className="editorial mt-6 text-[clamp(2rem,6vw,3rem)] leading-none">
        {timeout ? "Still confirming" : "Payment not completed"}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {timeout
          ? "Your bank hasn't confirmed the payment yet. Please don't pay again. If the amount was debited, your membership activates automatically and we'll email you."
          : message || "Your membership wasn't activated and you haven't been charged."}
      </p>
      <div className="mt-8 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        {timeout ? (
          <button
            type="button"
            onClick={() => void check()}
            className="min-h-12 bg-ink px-8 text-[0.74rem] tracking-[0.18em] text-white uppercase hover:bg-[#333]"
          >
            Check again
          </button>
        ) : (
          <Link
            href="/membership"
            className="inline-flex min-h-12 items-center justify-center bg-ink px-8 text-[0.74rem] tracking-[0.18em] text-white uppercase hover:bg-[#333]"
          >
            Try again
          </Link>
        )}
        <Link
          href="/account/membership"
          className="inline-flex min-h-12 items-center justify-center border border-ink px-8 text-[0.74rem] tracking-[0.18em] uppercase hover:bg-ink hover:text-white"
        >
          My membership
        </Link>
      </div>
    </div>
  );
}

export default function MembershipReturnPage() {
  return (
    <Suspense
      fallback={
        <OrderProcessingScreen
          title="Confirming your payment"
          subtitle="Please keep this page open."
        />
      }
    >
      <ReturnInner />
    </Suspense>
  );
}
