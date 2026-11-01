import { adminRoute } from "@/lib/admin-api.server";
import { getAdminProducts } from "@/lib/catalog.server";
import { memberRuleSchema } from "@/lib/membership";
import { deleteMemberRule, listMemberRules, saveMemberRule } from "@/lib/membership.server";
import { parsePriceInr } from "@/lib/price";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminRoute(async () => {
    const [rules, products] = await Promise.all([listMemberRules(), getAdminProducts()]);
    return {
      rules,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        image: product.image,
        regularPrice: parsePriceInr(product.price),
        archived: Boolean(product.archived),
        variants: product.variants.map((variant) => ({
          id: variant.id,
          color: variant.color,
          size: variant.size,
        })),
      })),
    };
  }, "Could not load member pricing.");
}

export async function POST(request: Request) {
  return adminRoute(async (admin) => {
    const input = memberRuleSchema.parse(await request.json());
    return { rule: await saveMemberRule(input, admin, await getAdminProducts()) };
  }, "Could not save member price.");
}

export async function DELETE(request: Request) {
  return adminRoute(async (admin) => {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    await deleteMemberRule(id, admin);
    return { ok: true };
  }, "Could not remove member price.");
}
