import { adminRoute } from "@/lib/admin-api.server";
import { grantMembershipSchema } from "@/lib/membership";
import { grantMembership, listMembershipRecords } from "@/lib/membership.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return adminRoute(async () => {
    const params = new URL(request.url).searchParams;
    const pick = (key: string) => params.get(key)?.trim() || undefined;
    return {
      records: await listMembershipRecords({
        ...(pick("q") ? { q: pick("q")! } : {}),
        ...(pick("status") ? { status: pick("status")! } : {}),
        ...(pick("source") ? { source: pick("source")! } : {}),
        ...(pick("from") ? { from: pick("from")! } : {}),
        ...(pick("to") ? { to: pick("to")! } : {}),
      }),
    };
  }, "Could not load memberships.");
}

/** Admin-granted membership: no payment request, no fee transaction. */
export async function POST(request: Request) {
  return adminRoute(async (admin) => {
    const input = grantMembershipSchema.parse(await request.json());
    return { membership: await grantMembership(input, admin) };
  }, "Could not grant membership.");
}
