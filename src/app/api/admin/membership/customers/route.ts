import { adminRoute } from "@/lib/admin-api.server";
import { searchCustomersForGrant } from "@/lib/membership.server";

export const dynamic = "force-dynamic";

/** Find a registered customer by name, mobile, email or ID to grant membership. */
export async function GET(request: Request) {
  return adminRoute(
    async () => ({
      customers: await searchCustomersForGrant(new URL(request.url).searchParams.get("q") ?? ""),
    }),
    "Could not search customers.",
  );
}
