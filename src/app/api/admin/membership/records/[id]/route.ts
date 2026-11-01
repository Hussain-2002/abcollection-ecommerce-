import { adminRoute } from "@/lib/admin-api.server";
import { membershipActionSchema } from "@/lib/membership";
import { applyMembershipAction, getMembershipDetail } from "@/lib/membership.server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  return adminRoute(async () => {
    const { id } = await ctx.params;
    const detail = await getMembershipDetail(id);
    if (!detail) throw Object.assign(new Error("Membership not found."), { status: 404 });
    return detail;
  }, "Could not load membership.");
}

/** Revoke, reactivate or change dates. Every action needs a reason and is audit logged. */
export async function PATCH(request: Request, ctx: Ctx) {
  return adminRoute(async (admin) => {
    const { id } = await ctx.params;
    const action = membershipActionSchema.parse(await request.json());
    return { membership: await applyMembershipAction(id, action, admin) };
  }, "Could not update membership.");
}
