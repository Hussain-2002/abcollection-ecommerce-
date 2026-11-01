"use client";

import Link from "next/link";
import { ArrowUpRight, Heart, MessageCircle, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { InstagramGlyph } from "@/components/site/Brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  FOUNDER_HANDLE,
  FOUNDER_INSTAGRAM,
  compactCount,
  reelEmbedUrl,
  reelUrl,
  type Reel,
} from "@/lib/founder-journey";
import { cn } from "@/lib/utils";

const press =
  "transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]";

function postedLabel(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** 9:16 reel poster. Opens the on-site player; the Instagram embed loads only then. */
export function ReelCard({
  reel,
  onPlay,
  size = "md",
  className,
}: {
  reel: Reel;
  onPlay: (reel: Reel) => void;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay(reel)}
      aria-label={`Play reel: ${reel.title}`}
      className={cn(
        "group relative block w-full overflow-hidden bg-ink text-left text-white",
        press,
        className,
      )}
    >
      <div className="aspect-[9/16]">
        <img
          src={reel.cover}
          alt=""
          width={360}
          height={640}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] can-hover:group-hover:scale-[1.04]"
        />
      </div>
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0)_28%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.85)_100%)]"
      />
      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-black/55 px-2 py-1 text-[0.66rem] tracking-[0.08em] backdrop-blur-sm">
        <Play className="size-3 fill-current" aria-hidden />
        {compactCount(reel.views)}
        <span className="sr-only"> views</span>
      </span>
      {reel.day ? (
        <span className="absolute top-2.5 right-2.5 bg-white px-2 py-1 text-[0.62rem] tracking-[0.16em] text-ink uppercase">
          Day {reel.day}
        </span>
      ) : reel.kind === "drop" ? (
        <span className="absolute top-2.5 right-2.5 bg-white px-2 py-1 text-[0.62rem] tracking-[0.16em] text-ink uppercase">
          New drop
        </span>
      ) : null}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-black/25 backdrop-blur-sm transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] can-hover:group-hover:scale-110 can-hover:group-hover:bg-white/20"
      >
        <Play className="ml-0.5 size-5 fill-current" />
      </span>
      <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <span
          className={cn(
            "line-clamp-3 leading-snug font-light",
            size === "lg" ? "text-[1.05rem] sm:text-xl" : "text-[0.9rem]",
          )}
        >
          {reel.title}
        </span>
        <span className="mt-1.5 block text-[0.66rem] tracking-[0.14em] text-white/70 uppercase">
          {postedLabel(reel.postedAt)}
        </span>
      </span>
    </button>
  );
}

/** Plays a reel on-site with Instagram's official embed. */
export function ReelPlayer({ reel, onClose }: { reel: Reel | null; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [reel?.id]);

  return (
    <Dialog open={reel !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] w-[min(100%,calc(100vw-1.5rem))] max-w-4xl gap-0 overflow-y-auto bg-background p-0 sm:grid sm:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {reel ? (
          <>
            <div className="relative bg-ink">
              {!loaded ? (
                <div className="absolute inset-0 grid place-items-center">
                  <img
                    src={reel.cover}
                    alt=""
                    className="absolute inset-0 size-full object-cover opacity-50 blur-sm"
                  />
                  <span className="relative size-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              ) : null}
              <iframe
                key={reel.id}
                src={reelEmbedUrl(reel.id)}
                title={`Instagram reel: ${reel.title}`}
                onLoad={() => setLoaded(true)}
                allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
                allowFullScreen
                className="relative block h-[min(78dvh,720px)] w-full border-0 bg-white"
              />
            </div>
            <div className="flex flex-col p-6 sm:p-8">
              <p className="eyebrow mb-3">
                {reel.day
                  ? `Day ${reel.day}`
                  : reel.kind === "drop"
                    ? "New drop"
                    : "Founder's journey"}
              </p>
              <DialogTitle className="editorial text-[clamp(1.5rem,3vw,2.2rem)] leading-[1.1] font-normal">
                {reel.title}
              </DialogTitle>
              <DialogDescription className="mt-4 text-[0.95rem] leading-relaxed text-charcoal">
                {reel.excerpt}
              </DialogDescription>
              <dl className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Views</dt>
                  <Play className="size-3.5" aria-hidden />
                  <dd>{compactCount(reel.views)} views</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Likes</dt>
                  <Heart className="size-3.5" aria-hidden />
                  <dd>{compactCount(reel.likes)}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Comments</dt>
                  <MessageCircle className="size-3.5" aria-hidden />
                  <dd>{compactCount(reel.comments)}</dd>
                </div>
                <div>
                  <dt className="sr-only">Posted</dt>
                  <dd>{postedLabel(reel.postedAt)}</dd>
                </div>
              </dl>
              <div className="mt-auto grid gap-2 pt-8">
                {reel.productId ? (
                  <Link
                    href={`/collection/${reel.productId}`}
                    onClick={onClose}
                    className={cn(
                      "inline-flex min-h-12 items-center justify-center bg-ink px-6 text-[0.74rem] tracking-[0.18em] text-white uppercase hover:bg-[#333]",
                      press,
                    )}
                  >
                    Shop this piece
                  </Link>
                ) : null}
                <a
                  href={reelUrl(reel.id)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(
                    "inline-flex min-h-12 items-center justify-center gap-2 border border-ink px-6 text-[0.74rem] tracking-[0.18em] uppercase hover:bg-ink hover:text-white",
                    press,
                  )}
                >
                  Watch on Instagram
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function FollowButton({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <a
      href={FOUNDER_INSTAGRAM}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2.5 border px-6 text-[0.74rem] tracking-[0.18em] uppercase",
        tone === "dark"
          ? "border-white text-white hover:bg-white hover:text-ink"
          : "border-ink hover:bg-ink hover:text-white",
        "transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
        className,
      )}
    >
      <InstagramGlyph className="size-4" />
      Follow @{FOUNDER_HANDLE}
    </a>
  );
}

/** Horizontal, swipeable reel row with one shared player. */
export function ReelRail({ reels, className }: { reels: Reel[]; className?: string }) {
  const [active, setActive] = useState<Reel | null>(null);
  return (
    <>
      <ul
        className={cn(
          "no-scrollbar grid snap-x snap-mandatory auto-cols-[58%] grid-flow-col gap-2.5 overflow-x-auto overscroll-x-contain pb-2 sm:auto-cols-[34%] min-[1000px]:auto-cols-[calc(25%-0.6rem)]",
          className,
        )}
      >
        {reels.map((reel) => (
          <li key={reel.id} className="snap-start">
            <ReelCard reel={reel} onPlay={setActive} />
          </li>
        ))}
      </ul>
      <ReelPlayer reel={active} onClose={() => setActive(null)} />
    </>
  );
}

/** Responsive grid of reels with one shared player. */
export function ReelGrid({
  reels,
  featuredFirst = false,
}: {
  reels: Reel[];
  featuredFirst?: boolean;
}) {
  const [active, setActive] = useState<Reel | null>(null);
  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 min-[1100px]:grid-cols-4 min-[1100px]:gap-3">
        {reels.map((reel, index) => (
          <li key={reel.id} className={cn(featuredFirst && index === 0 && "col-span-2 row-span-2")}>
            <ReelCard
              reel={reel}
              onPlay={setActive}
              size={featuredFirst && index === 0 ? "lg" : "md"}
              className="h-full [&>div]:h-full"
            />
          </li>
        ))}
      </ul>
      <ReelPlayer reel={active} onClose={() => setActive(null)} />
    </>
  );
}

/** Home page band: the founder documenting the brand, most-viewed reels first. */
export function HomeJourney({ reels }: { reels: Reel[] }) {
  if (!reels.length) return null;
  return (
    <section
      className="overflow-hidden bg-ink py-[clamp(3.5rem,8vw,7rem)] text-white"
      aria-labelledby="journey-heading"
    >
      <div className="page-wrap grid gap-10 min-[1000px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] min-[1000px]:items-center min-[1000px]:gap-14">
        <div>
          <p className="mb-3 text-[0.72rem] tracking-[0.22em] text-white/60 uppercase">
            Build with AB · @{FOUNDER_HANDLE}
          </p>
          <h2
            id="journey-heading"
            className="editorial text-[clamp(2.2rem,4.6vw,4rem)] leading-[1.02]"
          >
            Watch the brand being built.
          </h2>
          <p className="mt-5 max-w-[42ch] leading-relaxed text-white/75">
            Abbas is building AB Collection in public. The fabric hunts, the pricing calls, the
            first order, one reel at a time. No highlight reel, just the real work.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link
              href="/journey"
              className="inline-flex min-h-12 flex-1 items-center justify-center bg-white px-6 text-[0.74rem] tracking-[0.18em] text-ink uppercase transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/85 active:scale-[0.97] sm:flex-none"
            >
              Follow the journey
            </Link>
            <FollowButton tone="dark" className="flex-1 sm:flex-none" />
          </div>
        </div>
        <ReelRail reels={reels} className="min-[1000px]:auto-cols-[calc(33.333%-0.45rem)]" />
      </div>
    </section>
  );
}
