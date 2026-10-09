import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { invalidateCatalogCache } from "@/lib/catalog.server";
import { setVariantStock } from "@/lib/inventory.server";

type StockBody = {
  variantId?: unknown;
  productId?: unknown;
  color?: unknown;
  size?: unknown;
  stock?: unknown;
};

function readStockBody(body: StockBody) {
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const color = typeof body.color === "string" ? body.color.trim() : "";
  const size = typeof body.size === "string" ? body.size.trim() : "";
  const variantId = typeof body.variantId === "string" ? body.variantId.trim() : "";
  const stock = Number(body.stock);
  if (!productId || !color || !size) {
    throw new Error("Product, colour, and size are required.");
  }
  if (!Number.isFinite(stock)) throw new Error("Enter a valid stock count.");
  return { productId, color, size, variantId, stock };
}

async function changeStock(request: Request, stockOverride?: number) {
  await requireAdminSession();
  const body = (await request.json()) as StockBody;
  const parsed = readStockBody(
    stockOverride === undefined ? body : { ...body, stock: stockOverride },
  );
  const variant = await setVariantStock(parsed);
  invalidateCatalogCache();
  return NextResponse.json({ variant });
}

export async function PATCH(request: Request) {
  try {
    return await changeStock(request);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not update stock";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    return await changeStock(request, 0);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not delete stock";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
