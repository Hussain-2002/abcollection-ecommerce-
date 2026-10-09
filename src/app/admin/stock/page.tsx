import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { StockManager, type StockRow } from "@/components/admin/StockManager";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getAdminProducts } from "@/lib/catalog.server";
import { findProductVariant, makeVariantSku } from "@/lib/inventory";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Admin Stock",
  description: "Update and clear product stock",
  path: "/admin/stock",
  noIndex: true,
});

function stockRows(products: Awaited<ReturnType<typeof getAdminProducts>>): StockRow[] {
  return products
    .flatMap((product) =>
      product.colors.flatMap((color) =>
        product.sizes.map((size) => {
          const found = findProductVariant(product.variants, color, size);
          return {
            variantId: found?.id ?? "",
            productId: product.id,
            productName: product.name,
            color,
            size,
            sku: found?.sku ?? makeVariantSku(product.id, color, size),
            stock: found?.stock ?? 0,
          };
        }),
      ),
    )
    .sort((a, b) =>
      `${a.productName} ${a.color} ${a.size}`.localeCompare(
        `${b.productName} ${b.color} ${b.size}`,
      ),
    );
}

export default async function AdminStockPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const products = await getAdminProducts();
  const rows = stockRows(products);

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Stock</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Update the count for each colour and size, or delete it to mark that option out of stock. A
        completed order reduces the matching count on its own.
      </p>
      <div className="mt-8">
        <StockManager initial={rows} />
      </div>
    </AdminShell>
  );
}
