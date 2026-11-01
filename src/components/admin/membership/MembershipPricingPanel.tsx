"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/admin/StatusPill";
import {
  adminJson,
  fromLocalInput,
  numberOrNull,
  toLocalInput,
} from "@/components/admin/membership/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { cdnImageUrl } from "@/lib/media";
import { memberUnitPrice, ruleIsLive, type MemberRule } from "@/lib/membership";
import { formatInr } from "@/lib/price";

type AdminProduct = {
  id: string;
  name: string;
  image: string;
  regularPrice: number;
  archived: boolean;
  variants: { id: string; color: string; size: string }[];
};

type Target = { product: AdminProduct; variantId: string | null };

function ruleSummary(rule: MemberRule | undefined, regular: number) {
  if (!rule) return { text: "Not set", tone: "neutral" as const };
  if (!rule.isEligible) return { text: "Excluded", tone: "danger" as const };
  if (!rule.enabled) return { text: "Off", tone: "neutral" as const };
  const price = memberUnitPrice(regular, { ...rule, startsAt: null, endsAt: null });
  const base =
    rule.pricingType === "fixed"
      ? `${formatInr(rule.memberPrice ?? 0)}`
      : `${rule.discountPercent}% off${price !== null ? ` → ${formatInr(price)}` : ""}`;
  const live = ruleIsLive(rule);
  return {
    text: live ? base : `${base} · scheduled`,
    tone: live ? ("success" as const) : ("warning" as const),
  };
}

/** Eligible products/variants and their member prices, with schedules. */
export function MembershipPricingPanel() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [rules, setRules] = useState<MemberRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Target | null>(null);
  const [openProduct, setOpenProduct] = useState<AdminProduct | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminJson<{ rules: MemberRule[]; products: AdminProduct[] }>(
        "/api/admin/membership/rules",
      );
      setRules(data.rules);
      setProducts(data.products.filter((product) => !product.archived));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load member pricing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ruleFor = (productId: string, variantId: string | null) =>
    rules.find((rule) => rule.productId === productId && rule.variantId === variantId);

  if (loading) {
    return (
      <div className="mt-6 grid gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="skeleton h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Set a member price per product. Use variant overrides when a colour or size needs a
        different price, or should be excluded. Member prices are never above the regular price.
      </p>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <ul className="mt-6 divide-y divide-border border border-border bg-white">
        {products.map((product) => {
          const summary = ruleSummary(ruleFor(product.id, null), product.regularPrice);
          const overrides = rules.filter(
            (rule) => rule.productId === product.id && rule.variantId,
          ).length;
          return (
            <li key={product.id} className="flex flex-wrap items-center gap-4 p-4">
              <img
                src={cdnImageUrl(product.image)}
                alt=""
                className="aspect-[2/3] w-12 shrink-0 bg-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Regular {formatInr(product.regularPrice)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={summary.tone}>{summary.text}</StatusPill>
                {overrides ? (
                  <StatusPill tone="info">
                    {overrides} variant override{overrides === 1 ? "" : "s"}
                  </StatusPill>
                ) : null}
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 flex-1 sm:flex-none"
                  onClick={() => setEditing({ product, variantId: null })}
                >
                  Edit price
                </Button>
                {product.variants.length ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 flex-1 sm:flex-none"
                    onClick={() => setOpenProduct(product)}
                  >
                    Variants
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={openProduct !== null}
        onOpenChange={(open) => (open ? undefined : setOpenProduct(null))}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(100%,calc(100vw-1.5rem))] max-w-2xl overflow-y-auto">
          {openProduct ? (
            <>
              <DialogHeader>
                <DialogTitle>{openProduct.name}: variants</DialogTitle>
                <DialogDescription>
                  Variants without an override use the product price.
                </DialogDescription>
              </DialogHeader>
              <ul className="divide-y divide-border border border-border">
                {openProduct.variants.map((variant) => {
                  const own = ruleFor(openProduct.id, variant.id);
                  const summary = own
                    ? ruleSummary(own, openProduct.regularPrice)
                    : { text: "Uses product price", tone: "neutral" as const };
                  return (
                    <li key={variant.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                      <span className="min-w-0 flex-1">
                        {variant.color} · {variant.size}
                      </span>
                      <StatusPill tone={summary.tone}>{summary.text}</StatusPill>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8"
                        onClick={() => setEditing({ product: openProduct, variantId: variant.id })}
                      >
                        {own ? "Edit" : "Override"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {editing ? (
        <RuleEditor
          target={editing}
          rule={ruleFor(editing.product.id, editing.variantId)}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function RuleEditor({
  target,
  rule,
  onClose,
  onSaved,
}: {
  target: Target;
  rule: MemberRule | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { product, variantId } = target;
  const variant = product.variants.find((row) => row.id === variantId);
  const [isEligible, setIsEligible] = useState(rule?.isEligible ?? true);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [pricingType, setPricingType] = useState<"fixed" | "percent">(rule?.pricingType ?? "fixed");
  const [memberPrice, setMemberPrice] = useState(rule?.memberPrice?.toString() ?? "");
  const [discountPercent, setDiscountPercent] = useState(rule?.discountPercent?.toString() ?? "");
  const [maxDiscount, setMaxDiscount] = useState(rule?.maxDiscount?.toString() ?? "");
  const [minAllowedPrice, setMinAllowedPrice] = useState(rule?.minAllowedPrice?.toString() ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(rule?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(rule?.endsAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const draft: MemberRule = useMemo(
    () => ({
      id: rule?.id ?? "draft",
      productId: product.id,
      variantId,
      isEligible,
      enabled: true,
      pricingType,
      memberPrice: numberOrNull(memberPrice),
      discountPercent: numberOrNull(discountPercent),
      maxDiscount: numberOrNull(maxDiscount),
      minAllowedPrice: numberOrNull(minAllowedPrice),
      startsAt: null,
      endsAt: null,
      updatedBy: null,
      updatedAt: "",
    }),
    [
      discountPercent,
      isEligible,
      maxDiscount,
      memberPrice,
      minAllowedPrice,
      pricingType,
      product.id,
      rule?.id,
      variantId,
    ],
  );
  const preview = isEligible ? memberUnitPrice(product.regularPrice, draft) : null;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await adminJson("/api/admin/membership/rules", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          variantId,
          isEligible,
          enabled,
          pricingType,
          memberPrice: draft.memberPrice,
          discountPercent: draft.discountPercent,
          maxDiscount: draft.maxDiscount,
          minAllowedPrice: draft.minAllowedPrice,
          startsAt: fromLocalInput(startsAt),
          endsAt: fromLocalInput(endsAt),
        }),
      });
      toast.success("Member price saved");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!rule) return;
    setBusy(true);
    try {
      await adminJson(`/api/admin/membership/rules?id=${rule.id}`, { method: "DELETE" });
      toast.success(variantId ? "Override removed" : "Member price removed");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(100%,calc(100vw-1.5rem))] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product.name}
            {variant ? ` · ${variant.color} / ${variant.size}` : ""}
          </DialogTitle>
          <DialogDescription>Regular price {formatInr(product.regularPrice)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="flex items-center justify-between gap-4 text-sm">
            Eligible for member pricing
            <Switch checked={isEligible} onCheckedChange={setIsEligible} />
          </label>
          {isEligible ? (
            <>
              <label className="flex items-center justify-between gap-4 text-sm">
                Offer switched on
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </label>
              <div className="space-y-1.5">
                <Label>Pricing</Label>
                <NativeSelect
                  value={pricingType}
                  onChange={(event) => setPricingType(event.target.value as "fixed" | "percent")}
                >
                  <option value="fixed">Fixed member price (recommended)</option>
                  <option value="percent">Percentage off</option>
                </NativeSelect>
              </div>
              {pricingType === "fixed" ? (
                <div className="space-y-1.5">
                  <Label>Member price (₹)</Label>
                  <Input
                    inputMode="numeric"
                    value={memberPrice}
                    onChange={(event) => setMemberPrice(event.target.value)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Discount %</Label>
                    <Input
                      inputMode="decimal"
                      value={discountPercent}
                      onChange={(event) => setDiscountPercent(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max discount (₹)</Label>
                    <Input
                      inputMode="numeric"
                      value={maxDiscount}
                      onChange={(event) => setMaxDiscount(event.target.value)}
                      placeholder="No cap"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Minimum selling price (₹)</Label>
                <Input
                  inputMode="numeric"
                  value={minAllowedPrice}
                  onChange={(event) => setMinAllowedPrice(event.target.value)}
                  placeholder="Optional floor"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Starts</Label>
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ends</Label>
                  <Input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                  />
                </div>
              </div>
              <p className="border border-border bg-muted px-3 py-2 text-sm">
                {preview !== null
                  ? `Members pay ${formatInr(preview)} · save ${formatInr(product.regularPrice - preview)}`
                  : "No member saving with these values."}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {variantId ? "This variant" : "This product"} will always sell at the regular price,
              even to members.
            </p>
          )}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2">
            {rule ? (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void remove()}
                className="text-destructive"
              >
                Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" disabled={busy} onClick={() => void save()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
