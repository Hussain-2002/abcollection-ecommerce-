import { adminRoute } from "@/lib/admin-api.server";
import { membershipStats } from "@/lib/membership.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return adminRoute(async () => {
    const params = new URL(request.url).searchParams;
    const from = params.get("from") || undefined;
    const to = params.get("to") || undefined;
    return { stats: await membershipStats({ ...(from ? { from } : {}), ...(to ? { to } : {}) }) };
  }, "Could not load membership reports.");
}
