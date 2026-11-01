import { adminRoute } from "@/lib/admin-api.server";
import { membershipSettingsSchema } from "@/lib/membership";
import { getMembershipSettings, saveMembershipSettings } from "@/lib/membership.server";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminRoute(
    async () => ({ settings: await getMembershipSettings() }),
    "Could not load settings.",
  );
}

export async function PUT(request: Request) {
  return adminRoute(
    async (admin) => ({
      settings: await saveMembershipSettings(
        membershipSettingsSchema.parse(await request.json()),
        admin,
      ),
    }),
    "Could not save settings.",
  );
}
