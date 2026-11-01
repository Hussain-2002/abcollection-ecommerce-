"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { useState } from "react";

import { StarRating } from "@/components/site/StarRating";
import type { PublicReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";

const LONG_REVIEW = 220;

export function relativeDate(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.round((Date.now() - then) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
  if (days < 1) return "Today";
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.round(days / 7), "week");
  if (days < 365) return rtf.format(-Math.round(days / 30), "month");
  return rtf.format(-Math.round(days / 365), "year");
}

function initials(name: string) {
  const parts = name.replace(/\./g, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "AB";
}

export function ReviewCard({
  review,
  product,
  className,
}: {
  review: PublicReview;
  product?: { name: string; href: string } | undefined;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = review.body.length > LONG_REVIEW;
  const bought = [review.color, review.size].filter(Boolean).join(" · ");

  return (
    <article className={cn("flex h-full flex-col bg-paper p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <StarRating value={review.rating} size="sm" />
        <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
          {relativeDate(review.createdAt)}
        </time>
      </div>

      <blockquote className="mt-4 flex-1 font-sans text-[0.95rem] leading-relaxed text-charcoal">
        <p className={cn("whitespace-pre-line", long && !expanded && "line-clamp-5")}>
          {review.body}
        </p>
        {long ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-2 text-[0.72rem] tracking-[0.16em] text-foreground uppercase underline underline-offset-4"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        ) : null}
      </blockquote>

      <footer className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-sand text-[0.7rem] font-medium tracking-[0.08em]"
        >
          {initials(review.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            {review.displayName}
            {review.verifiedPurchase ? (
              <span className="inline-flex items-center gap-1 text-[0.7rem] font-normal text-muted-foreground">
                <BadgeCheck className="size-3.5 text-foreground" aria-hidden />
                Verified buyer
              </span>
            ) : null}
          </p>
          {product || bought ? (
            <p className="truncate text-xs text-muted-foreground">
              {product ? (
                <Link href={product.href} className="underline-offset-4 hover:underline">
                  {product.name}
                </Link>
              ) : null}
              {product && bought ? " · " : ""}
              {bought ? `Bought ${bought}` : ""}
            </p>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
