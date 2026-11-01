"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCatalog } from "@/components/site/CatalogProvider";
import { ProductImage } from "@/components/site/ProductImage";
import { productImageForColor } from "@/lib/cart-display";
import { priceLabel, productHref } from "@/lib/storefront";
import { cn } from "@/lib/utils";

/** Full-width search that drops from the top; matches name, fabric and colour. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products } = useCatalog();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return products.slice(0, 6).map((product) => ({ product, color: "" }));
    return products.flatMap((product) => {
      const haystack = [product.name, product.fabric, product.tagline, ...product.colors]
        .join(" ")
        .toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return [];
      const color =
        product.colors.find((option) =>
          terms.some((term) => option.toLowerCase().includes(term)),
        ) ?? "";
      return [{ product, color }];
    });
  }, [products, query]);

  return (
    <div
      className={cn("fixed inset-0 z-[45]", open ? "visible" : "pointer-events-none invisible")}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close search"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/35 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className={cn(
          "absolute inset-x-0 top-0 max-h-full overflow-y-auto bg-background transition-transform duration-[450ms] ease-[var(--ease-brand)]",
          open ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="page-wrap pt-4 pb-8">
          <div className="flex items-center justify-between">
            <p className="eyebrow mb-0">Search</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="-mr-2.5 inline-grid size-11 place-items-center"
            >
              <X className="size-5" strokeWidth={1.4} />
            </button>
          </div>
          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="mt-2 flex items-center gap-3 border-b border-foreground"
          >
            <Search className="size-6 shrink-0" strokeWidth={1.4} aria-hidden />
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <input
              ref={inputRef}
              id="site-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tees, polo, black, 260 GSM…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-3 text-[clamp(1.4rem,4vw,2.6rem)] leading-tight font-light outline-none placeholder:text-muted-foreground/60"
            />
          </form>

          <p className="mt-5 text-xs tracking-[0.16em] text-muted-foreground uppercase">
            {query.trim()
              ? `${results.length} ${results.length === 1 ? "result" : "results"}`
              : "Popular now"}
          </p>
          {results.length ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {results.map(({ product, color }) => (
                <li key={product.id}>
                  <Link
                    href={productHref(product)}
                    onClick={onClose}
                    className="flex items-center gap-4 bg-paper p-2.5 transition-colors hover:bg-muted"
                  >
                    <ProductImage
                      src={productImageForColor(product, color || product.colors[0] || "")}
                      alt=""
                      width={96}
                      height={144}
                      sizes="48px"
                      className="h-[72px] w-12 shrink-0 object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.82rem] font-medium tracking-[0.1em] uppercase">
                        {product.name}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {color ? `${color} · ` : ""}
                        {product.fabric}
                      </span>
                      <span className="block text-sm">{priceLabel(product.price)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing matches “{query.trim()}”. Try a colour or a fabric, or{" "}
              <Link href="/collection" onClick={onClose} className="underline underline-offset-4">
                browse everything
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
