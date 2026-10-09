"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type StockRow = {
  variantId: string;
  productId: string;
  productName: string;
  color: string;
  size: string;
  sku: string;
  stock: number;
};

function rowKey(row: StockRow) {
  return row.variantId || `${row.productId}--${row.color}--${row.size}`;
}

export function StockManager({ initial }: { initial: StockRow[] }) {
  const [rows, setRows] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.productName, row.color, row.size, row.sku, row.productId]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, rows]);

  const applySaved = (row: StockRow, variant: { id?: string; sku?: string; stock?: number }) => {
    const key = rowKey(row);
    const stock = Number(variant.stock ?? 0);
    setRows((current) =>
      current.map((item) =>
        rowKey(item) === key
          ? {
              ...item,
              variantId: variant.id || item.variantId,
              sku: variant.sku || item.sku,
              stock,
            }
          : item,
      ),
    );
    setDrafts((current) => ({ ...current, [key]: String(stock) }));
  };

  const save = async (row: StockRow, stock: number, label: string) => {
    const key = rowKey(row);
    setBusyKey(key);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/stock", {
        method: stock === 0 && label === "deleted" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: row.variantId,
          productId: row.productId,
          color: row.color,
          size: row.size,
          stock,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        variant?: { id?: string; sku?: string; stock?: number };
      };
      if (!res.ok || !data.variant) throw new Error(data.error || "Could not update stock.");
      applySaved(row, data.variant);
      setMessage(
        label === "deleted"
          ? `${row.productName} (${row.color}, ${row.size}) stock is now 0.`
          : `${row.productName} (${row.color}, ${row.size}) updated to ${data.variant.stock ?? stock}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update stock.");
    } finally {
      setBusyKey("");
    }
  };

  const onUpdate = (row: StockRow) => {
    const raw = drafts[rowKey(row)] ?? String(row.stock);
    const stock = Math.floor(Number(raw));
    if (!Number.isFinite(stock) || stock < 0) {
      setError("Enter a stock count of 0 or more.");
      return;
    }
    void save(row, stock, "updated");
  };

  const onDelete = (row: StockRow) => {
    const confirmed = window.confirm(
      `Delete stock for ${row.productName} (${row.color}, size ${row.size})? The count will be set to 0 and customers will not be able to buy it.`,
    );
    if (!confirmed) return;
    void save(row, 0, "deleted");
  };

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search product, colour, size, or SKU"
        className="h-11 w-full max-w-md rounded-full border border-border bg-white px-4 text-sm"
      />

      {message ? <p className="text-sm text-teal">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs tracking-[0.08em] text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Colour</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((row) => {
                const key = rowKey(row);
                const busy = busyKey === key;
                const value = drafts[key] ?? String(row.stock);
                return (
                  <tr key={key} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.productName}</td>
                    <td className="px-4 py-3">{row.color}</td>
                    <td className="px-4 py-3">{row.size}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.sku}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={99999}
                        value={value}
                        disabled={busy}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [key]: event.target.value }))
                        }
                        className="h-10 w-24 rounded-xl border border-border px-3 text-right text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => onUpdate(row)}
                          className="rounded-full bg-teal text-teal-foreground hover:bg-teal/90"
                        >
                          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                          Update
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => onDelete(row)}
                          className="rounded-full"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No stock records match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
