"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";

import { readImageSize, uploadAdminImage } from "@/components/admin/AdminFields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { HERO_BANNER_SIZES, MAX_HERO_BANNERS, type HeroBanner } from "@/lib/home-banners";
import { cn } from "@/lib/utils";

type Slot = "desktop" | "mobile";

const SLOT_KEY = { desktop: "desktopImage", mobile: "mobileImage" } as const;

const newBanner = (): HeroBanner => ({
  id: Math.random().toString(36).slice(2, 10),
  desktopImage: "",
  mobileImage: "",
  alt: "",
  active: true,
});

/** Friendly note when an upload is the wrong shape or too small for its slot. */
async function sizeWarning(file: File, slot: Slot) {
  const target = HERO_BANNER_SIZES[slot];
  try {
    const { width, height } = await readImageSize(file);
    const notes: string[] = [];
    const ratio = width / height;
    const targetRatio = target.width / target.height;
    if (Math.abs(ratio - targetRatio) / targetRatio > 0.04) {
      notes.push(`it is not ${target.ratio}, so the edges will be cropped`);
    }
    if (width < target.width * 0.75) notes.push("it may look blurry on large screens");
    if (!notes.length) return "";
    return `This image is ${width}×${height}px: ${notes.join(" and ")}. Best size is ${target.width}×${target.height}px.`;
  } catch {
    return "";
  }
}

export function HeroBannersForm({ initial }: { initial: HeroBanner[] }) {
  const [banners, setBanners] = useState<HeroBanner[]>(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (id: string, patch: Partial<HeroBanner>) => {
    setSaved(false);
    setBanners((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const move = (index: number, direction: -1 | 1) => {
    setSaved(false);
    setBanners((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banners }),
      });
      const data = (await res.json()) as { error?: string; banners?: HeroBanner[] };
      if (!res.ok || !data.banners) throw new Error(data.error ?? "Save failed");
      setBanners(data.banners);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SizeGuide />

      <Card className="bg-white shadow-none">
        <form onSubmit={onSubmit} className="space-y-5 p-6">
          {banners.length === 0 ? (
            <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No banners yet. The homepage shows the built-in banners until you add one.
            </p>
          ) : (
            <ol className="space-y-4">
              {banners.map((banner, index) => (
                <li key={banner.id} className="space-y-4 border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium">
                      Banner {index + 1}
                      {!banner.active ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (hidden)
                        </span>
                      ) : null}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move banner ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Move banner ${index + 1} down`}
                        disabled={index === banners.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove banner ${index + 1}`}
                        onClick={() => {
                          setSaved(false);
                          setBanners((prev) => prev.filter((row) => row.id !== banner.id));
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
                    <BannerImageSlot
                      slot="desktop"
                      value={banner.desktopImage}
                      onChange={(url) => update(banner.id, { desktopImage: url })}
                    />
                    <BannerImageSlot
                      slot="mobile"
                      value={banner.mobileImage}
                      fallback={banner.desktopImage}
                      onChange={(url) => update(banner.id, { mobileImage: url })}
                    />
                  </div>

                  <label className="block space-y-2 text-sm">
                    <span className="font-medium">Description (for screen readers and Google)</span>
                    <Input
                      required
                      value={banner.alt}
                      maxLength={160}
                      onChange={(e) => update(banner.id, { alt: e.target.value })}
                      placeholder="The Everyday Tee in black, white and coffee brown"
                      className="h-11 bg-white"
                    />
                  </label>

                  <label className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={banner.active}
                      onCheckedChange={(checked) => update(banner.id, { active: checked === true })}
                    />
                    Show on homepage
                  </label>
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={banners.length >= MAX_HERO_BANNERS}
              onClick={() => {
                setSaved(false);
                setBanners((prev) => [...prev, newBanner()]);
              }}
            >
              <Plus className="size-4" />
              Add banner
            </Button>
            <span className="text-xs text-muted-foreground">
              {banners.length} of {MAX_HERO_BANNERS} banners
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5">
            <Button type="submit" disabled={saving} className="bg-teal text-teal-foreground">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save banners
            </Button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {saved ? (
              <p className="text-sm text-emerald-700">
                Saved. The homepage updates within a minute.
              </p>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}

function SizeGuide() {
  const { desktop, mobile } = HERO_BANNER_SIZES;
  return (
    <Card className="bg-white p-6 shadow-none">
      <p className="text-sm font-medium">Banner sizes</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {[desktop, mobile].map((size) => (
          <div key={size.label} className="border border-border p-4">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              {size.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {size.width} × {size.height} px
            </p>
            <p className="text-sm text-muted-foreground">
              {size.ratio} {size.width > size.height ? "landscape" : "portrait"}
            </p>
          </div>
        ))}
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>JPG, PNG or WEBP, under 12 MB. Uploads are saved as optimised JPGs.</li>
        <li>
          The phone image is optional. Without it, phones show the middle of the desktop image, so
          add one if the banner has important detail near the sides.
        </li>
        <li>
          The headline and buttons sit over the <b>bottom-left</b> of the banner, on a dark fade.
          Keep that area calm, and put the product in the centre or right (desktop) or the top half
          (phone).
        </li>
        <li>
          Very wide or tall screens trim a little off the edges. Keep anything important inside the
          middle 80% of the image.
        </li>
        <li>Don't put text in the image itself; the site adds the headline.</li>
      </ul>
    </Card>
  );
}

function BannerImageSlot({
  slot,
  value,
  fallback,
  onChange,
}: {
  slot: Slot;
  value: string;
  fallback?: string;
  onChange: (url: string) => void;
}) {
  const size = HERO_BANNER_SIZES[slot];
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const preview = value || fallback || "";

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setWarning("");
    try {
      const [note, url] = await Promise.all([sizeWarning(file, slot), uploadAdminImage(file)]);
      setWarning(note);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">
          {size.label}
          {slot === "mobile" ? (
            <span className="font-normal text-muted-foreground"> (optional)</span>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {size.width}×{size.height}
        </span>
      </div>
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          slot === "desktop" ? "aspect-video" : "aspect-[9/16]",
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className={cn("size-full object-cover", !value && "opacity-60")}
            />
            {/* Where the homepage headline and buttons land. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.3)_0,rgba(0,0,0,0)_28%,rgba(0,0,0,0.06)_50%,rgba(0,0,0,0.6))]"
            />
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-[5%] grid gap-1",
                slot === "desktop" ? "bottom-[8%] w-[45%]" : "right-[5%] bottom-[5%]",
              )}
            >
              <span className="h-1.5 w-1/3 bg-white/70" />
              <span className="h-3 w-full bg-white/80" />
              <span className="h-3 w-3/4 bg-white/80" />
              <span className="mt-1 flex gap-1">
                <span className="h-3 w-1/3 border border-white/80" />
                <span className="h-3 w-1/3 border border-white/80" />
              </span>
            </div>
            {!value && fallback ? (
              <span className="absolute top-1.5 left-1.5 bg-white/90 px-1.5 py-0.5 text-[0.6rem] tracking-[0.1em] uppercase">
                Using desktop image
              </span>
            ) : null}
            {value ? (
              <button
                type="button"
                aria-label={`Remove ${size.label.toLowerCase()} image`}
                onClick={() => {
                  setWarning("");
                  onChange("");
                }}
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center bg-white/90"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </>
        ) : (
          <div className="grid size-full place-items-center p-2 text-center text-xs text-muted-foreground">
            {size.width}×{size.height}px
          </div>
        )}
      </div>
      <label className="inline-flex w-full cursor-pointer">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <span className="inline-flex h-10 w-full items-center justify-center gap-2 border border-border bg-white px-3 text-sm font-medium">
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {value ? "Replace" : "Upload"}
        </span>
      </label>
      {warning ? <p className="text-xs text-amber-700">{warning}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
