"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Product, ProductVariant } from "@/lib/catalog-types";

export function useProductInventory(product: Product) {
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants ?? []);
  const liveFor = useRef<string | null>(null);

  useEffect(() => {
    if (liveFor.current === product.id) return;
    setVariants(product.variants ?? []);
  }, [product.id, product.variants]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/inventory/${encodeURIComponent(product.id)}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { variants?: ProductVariant[] };
        if (!cancelled && Array.isArray(data.variants)) {
          liveFor.current = product.id;
          setVariants(
            data.variants.map((row) => ({
              id: row.id,
              sku: row.sku,
              color: row.color,
              size: row.size,
              stock: Number(row.stock ?? 0),
            })),
          );
        }
      } catch {
        /* keep last known catalog stock */
      }
    };

    void load();

    const onFocus = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [product.id]);

  return useMemo(() => ({ ...product, variants }), [product, variants]);
}
