"use client";

import Link from "next/link";

import { useMembership } from "@/components/membership/MembershipProvider";

/** Slim strip on listing pages: invite non-members, reassure members. */
export function MemberPromo() {
  const { open, isMember, snapshot } = useMembership();
  if (!snapshot || !snapshot.prices.length) return null;
  const name = snapshot.settings.planName;
  if (isMember) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <span className="bg-ink px-1.5 py-0.5 text-[0.56rem] tracking-[0.14em] text-white uppercase">
          Insider
        </span>
        You&apos;re seeing {name} member prices.
      </p>
    );
  }
  if (!open) return null;
  return (
    <Link href="/membership" className="group inline-flex items-center gap-2 text-sm">
      <span className="bg-ink px-1.5 py-0.5 text-[0.56rem] tracking-[0.14em] text-white uppercase">
        Insider
      </span>
      <span>
        {name} members pay less on selected pieces.{" "}
        <span className="underline underline-offset-4 group-hover:no-underline">Learn more</span>
      </span>
    </Link>
  );
}
