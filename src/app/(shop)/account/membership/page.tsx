"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { JoinMembership } from "@/components/membership/JoinMembership";
import { MembershipCard } from "@/components/membership/MembershipCard";
import { useMembership } from "@/components/membership/MembershipProvider";
import {
  MEMBERSHIP_SOURCE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  formatIstDate,
  type PublicMembership,
} from "@/lib/membership";
import { formatInr } from "@/lib/price";

export default function AccountMembershipPage() {
  const { customer, loading, openAuth } = useCommerce();
  const { snapshot } = useMembership();
  const [data, setData] = useState<{
    current: PublicMembership | null;
    history: PublicMembership[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account/membership" });
  }, [customer, loading, openAuth]);

  useEffect(() => {
    if (!customer) return;
    void fetch("/api/membership/mine", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setData(await res.json());
      })
      .catch(() => setError("We couldn't load your membership. Please refresh."));
  }, [customer]);

  if (!customer) return <div className="min-h-[50vh]" />;

  const planName = snapshot?.settings.planName ?? "AB Insider";
  const current = data?.current ?? null;
  const showJoin = data && (!current || current.status !== "active");

  return (
    <div className="page-wrap mx-auto max-w-4xl py-[clamp(2.5rem,6vw,4rem)]">
      <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground">
        ← My account
      </Link>
      <h1 className="editorial mt-4 text-[clamp(2.2rem,6vw,3.4rem)] leading-none">{planName}</h1>

      {error ? (
        <p className="mt-8 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : !data ? (
        <div className="skeleton mt-8 h-52" aria-busy="true" />
      ) : (
        <div className="mt-8 grid gap-8">
          {current ? (
            <MembershipCard membership={current} />
          ) : (
            <p className="text-muted-foreground">
              You&apos;re not a member yet. Join to unlock member prices on selected pieces.
            </p>
          )}

          {current?.status === "pending_payment" ? (
            <p className="border border-border bg-paper p-4 text-sm">
              We&apos;re still waiting for this payment to be confirmed. If the amount was debited,
              your membership activates automatically.
            </p>
          ) : null}

          {current?.status === "active" && snapshot?.settings.benefits.length ? (
            <section>
              <h2 className="text-[0.74rem] tracking-[0.18em] uppercase">Your benefits</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {snapshot.settings.benefits.map((benefit) => (
                  <li key={benefit} className="border-t border-ink pt-3 text-sm">
                    {benefit}
                  </li>
                ))}
              </ul>
              <Link
                href="/membership#terms"
                className="mt-4 inline-block text-sm underline underline-offset-4"
              >
                Membership terms
              </Link>
            </section>
          ) : null}

          {showJoin ? <JoinMembership /> : null}

          {data.history.length > 1 ? (
            <section>
              <h2 className="text-[0.74rem] tracking-[0.18em] uppercase">History</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-[0.66rem] tracking-[0.14em] text-muted-foreground uppercase">
                    <tr className="border-b border-border">
                      <th className="py-2 font-normal">Membership</th>
                      <th className="py-2 font-normal">Status</th>
                      <th className="py-2 font-normal">Source</th>
                      <th className="py-2 font-normal">Dates</th>
                      <th className="py-2 text-right font-normal">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((row) => (
                      <tr key={row.id} className="border-b border-border">
                        <td className="py-3">{row.membershipNumber}</td>
                        <td className="py-3">{MEMBERSHIP_STATUS_LABELS[row.status]}</td>
                        <td className="py-3">{MEMBERSHIP_SOURCE_LABELS[row.source]}</td>
                        <td className="py-3">
                          {row.startsAt
                            ? `${formatIstDate(row.startsAt)} – ${formatIstDate(row.expiresAt)}`
                            : "—"}
                        </td>
                        <td className="py-3 text-right">
                          {row.source === "admin_granted"
                            ? "Complimentary"
                            : formatInr(row.feeAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
