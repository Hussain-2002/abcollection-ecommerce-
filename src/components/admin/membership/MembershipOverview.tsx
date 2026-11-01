"use client";

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/components/admin/membership/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInr } from "@/lib/price";

type Stats = {
  total: number;
  counts: Record<"pending_payment" | "active" | "expired" | "failed" | "revoked", number>;
  paid: number;
  granted: number;
  feeRevenue: number;
  memberOrders: number;
  memberRevenue: number;
  memberAov: number;
  memberDiscount: number;
  nonMemberOrders: number;
  nonMemberAov: number;
  memberRepeatRate: number;
  nonMemberRepeatRate: number;
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-border bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Reporting: membership counts, fee revenue and member order performance. */
export function MembershipOverview() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    try {
      setError("");
      const data = await adminJson<{ stats: Stats }>(`/api/admin/membership/stats?${params}`);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports.");
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="stats-from">From</Label>
          <Input
            id="stats-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="stats-to">To</Label>
          <Input
            id="stats-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-10"
          />
        </div>
        {from || to ? (
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="h-10 text-sm text-muted-foreground underline underline-offset-4"
          >
            All time
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
      {!stats ? (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="skeleton h-24" />
          ))}
        </div>
      ) : (
        <>
          <h2 className="mt-8 text-sm font-semibold tracking-[0.12em] uppercase">Memberships</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total created" value={String(stats.total)} />
            <Stat label="Active" value={String(stats.counts.active)} />
            <Stat label="Paid / granted" value={`${stats.paid} / ${stats.granted}`} />
            <Stat label="Fee revenue" value={formatInr(stats.feeRevenue)} hint="Paid memberships" />
            <Stat label="Expired" value={String(stats.counts.expired)} />
            <Stat label="Pending payment" value={String(stats.counts.pending_payment)} />
            <Stat label="Failed" value={String(stats.counts.failed)} />
            <Stat label="Revoked" value={String(stats.counts.revoked)} />
          </div>

          <h2 className="mt-8 text-sm font-semibold tracking-[0.12em] uppercase">Member orders</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Member orders"
              value={String(stats.memberOrders)}
              hint={`${stats.nonMemberOrders} non-member`}
            />
            <Stat label="Member sales" value={formatInr(stats.memberRevenue)} />
            <Stat
              label="Average order value"
              value={formatInr(stats.memberAov)}
              hint={`Non-members ${formatInr(stats.nonMemberAov)}`}
            />
            <Stat label="Member discount given" value={formatInr(stats.memberDiscount)} />
            <Stat
              label="Repeat purchase rate"
              value={`${stats.memberRepeatRate}%`}
              hint={`Non-members ${stats.nonMemberRepeatRate}%`}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Paid orders only. An order counts as a member order when member prices applied to it.
          </p>
        </>
      )}
    </div>
  );
}
