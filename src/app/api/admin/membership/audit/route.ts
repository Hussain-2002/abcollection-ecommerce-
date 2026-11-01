import { adminRoute } from "@/lib/admin-api.server";
import { listMembershipAudit } from "@/lib/membership.server";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminRoute(
    async () => ({ entries: await listMembershipAudit({ limit: 300 }) }),
    "Could not load audit log.",
  );
}
