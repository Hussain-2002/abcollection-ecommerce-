import { timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";

import { runMembershipMaintenance } from "@/lib/membership.server";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env["MEMBERSHIP_CRON_SECRET"]?.trim();
  const given = request.headers.get("x-cron-secret")?.trim() ?? "";
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Daily maintenance, called by Supabase pg_cron (see supabase/MEMBERSHIP.md). */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runMembershipMaintenance();
  return NextResponse.json({ ok: true, ...result });
}
