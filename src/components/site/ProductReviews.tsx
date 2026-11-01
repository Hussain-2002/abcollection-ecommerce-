"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { ReviewCard } from "@/components/site/ReviewCard";
import { StarRating } from "@/components/site/StarRating";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";
import type { PublicReview, ReviewEligibility, ReviewListing } from "@/lib/reviews";
import { REVIEW_MAX_LENGTH, REVIEW_MIN_LENGTH } from "@/lib/reviews";
import { cn } from "@/lib/utils";

type Sort = "newest" | "highest" | "lowest";
type Payload = ReviewListing & { eligibility: ReviewEligibility };

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Most recent" },
  { value: "highest", label: "Highest" },
  { value: "lowest", label: "Lowest" },
];

const RATING_WORDS = [
  "",
  "Not for me",
  "Could be better",
  "It's okay",
  "Really like it",
  "Love it",
];

/** True once the element has scrolled into view; stays true. */
function useSeenOnce(ref: React.RefObject<Element | null>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, seen]);
  return seen;
}

const pressable =
  "transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";

export function ProductReviews({
  productId,
  initialListing,
}: {
  productId: string;
  initialListing?: ReviewListing | undefined;
}) {
  const { customer, openAuth } = useCommerce();
  const [summary, setSummary] = useState(initialListing?.summary);
  const [reviews, setReviews] = useState<PublicReview[]>(initialListing?.reviews ?? []);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialListing?.totalPages ?? 1);
  const [sort, setSort] = useState<Sort>("newest");
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const barsRef = useRef<HTMLUListElement>(null);
  const barsVisible = useSeenOnce(barsRef);
  const skipFirst = useRef(Boolean(initialListing));

  const load = useCallback(
    async (nextPage: number, nextSort: Sort, append: boolean) => {
      const res = await fetch(
        `/api/products/${productId}/reviews?page=${nextPage}&sort=${nextSort}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const payload = (await res.json()) as Payload;
      setSummary(payload.summary);
      setTotalPages(payload.totalPages);
      setEligibility(payload.eligibility);
      setReviews((current) => (append ? [...current, ...payload.reviews] : payload.reviews));
      setPage(nextPage);
    },
    [productId],
  );

  // Server-rendered reviews show first; fetch again only for sort changes or
  // to learn whether the signed-in shopper can write one.
  useEffect(() => {
    if (skipFirst.current && sort === "newest" && !customer) {
      skipFirst.current = false;
      return;
    }
    skipFirst.current = false;
    void load(1, sort, false);
  }, [customer, load, sort]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, sort, true);
    setLoadingMore(false);
  };

  const count = summary?.count ?? 0;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="scroll-mt-24 border-t border-border py-[clamp(3rem,6vw,5rem)]"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <p className="eyebrow mb-3">Reviews</p>
          <h2 id="reviews-heading" className="text-[clamp(1.6rem,3vw,2.4rem)] leading-tight">
            What customers say
          </h2>
          {count > 0 && summary ? (
            <>
              <div className="mt-6 flex items-end gap-4">
                <p className="editorial text-[4rem] leading-[0.85]">{summary.average.toFixed(1)}</p>
                <div className="pb-1">
                  <StarRating value={summary.average} />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {count} review{count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <ul ref={barsRef} className="mt-6 grid gap-2" aria-label="Rating breakdown">
                {[...summary.distribution]
                  .sort((a, b) => b.rating - a.rating)
                  .map((row, index) => {
                    const share = count ? row.count / count : 0;
                    return (
                      <li
                        key={row.rating}
                        className="grid grid-cols-[1.5rem_1fr_1.5rem] items-center gap-3 text-xs text-muted-foreground"
                      >
                        <span>{row.rating}★</span>
                        <span className="relative h-0.5 overflow-hidden bg-border">
                          <span
                            className="absolute inset-0 origin-left bg-ink transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                            style={{
                              transform: `scaleX(${barsVisible ? share : 0})`,
                              transitionDelay: `${index * 60}ms`,
                            }}
                          />
                        </span>
                        <span className="text-right">{row.count}</span>
                      </li>
                    );
                  })}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No reviews yet. Bought this one? Tell others how it fits.
            </p>
          )}
          <button
            type="button"
            onClick={() => setWriteOpen(true)}
            className={cn(
              "mt-7 min-h-12 w-full border border-ink px-6 text-[0.74rem] tracking-[0.18em] uppercase hover:bg-ink hover:text-white sm:w-auto lg:w-full",
              pressable,
            )}
          >
            Write a review
          </button>
        </div>

        <div className="min-w-0">
          {count > 1 ? (
            <div
              className="mb-5 inline-flex border border-border bg-paper p-0.5"
              role="radiogroup"
              aria-label="Sort reviews"
            >
              {SORTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={sort === option.value}
                  onClick={() => setSort(option.value)}
                  className={cn(
                    "min-h-9 px-3.5 text-[0.7rem] tracking-[0.14em] uppercase transition-colors duration-200",
                    sort === option.value
                      ? "bg-ink text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          {reviews.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {reviews.map((review, index) => (
                <li
                  key={review.id}
                  className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 ease-out"
                  style={{ animationDelay: `${Math.min(index % 6, 5) * 50}ms` }}
                >
                  <ReviewCard review={review} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid min-h-48 place-items-center border border-dashed border-border bg-paper/60 p-8 text-center">
              <div>
                <StarRating value={0} size="md" label="No ratings yet" />
                <p className="mt-3 text-lg font-light">Be the first to review this</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fit, fabric, how it held up after a wash — it all helps.
                </p>
              </div>
            </div>
          )}

          {page < totalPages ? (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className={cn(
                "mt-6 inline-flex min-h-12 items-center gap-2 border border-ink px-8 text-[0.74rem] tracking-[0.18em] uppercase hover:bg-ink hover:text-white disabled:opacity-60",
                pressable,
              )}
            >
              {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
              Load more reviews
            </button>
          ) : null}
        </div>
      </div>

      <WriteReviewSheet
        open={writeOpen}
        onOpenChange={setWriteOpen}
        productId={productId}
        signedIn={Boolean(customer)}
        eligibility={eligibility}
        onLogin={() => {
          setWriteOpen(false);
          openAuth({ type: "generic", redirect: `/collection/${productId}#reviews` });
        }}
        onSubmitted={() => void load(1, sort, false)}
      />
    </section>
  );
}

function WriteReviewSheet({
  open,
  onOpenChange,
  productId,
  signedIn,
  eligibility,
  onLogin,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  signedIn: boolean;
  eligibility: ReviewEligibility | null;
  onLogin: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const length = body.trim().length;

  useEffect(() => {
    if (!open) {
      setError("");
      setDone("");
    }
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (length < REVIEW_MIN_LENGTH) {
      setError(`Write at least ${REVIEW_MIN_LENGTH} characters.`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          body,
          ...(eligibility?.orderId ? { orderId: eligibility.orderId } : {}),
        }),
      });
      const payload = await readJsonBody<{ error?: string; message?: string }>(res);
      if (!res.ok) throw new Error(apiErrorMessage(payload, "Could not submit review."));
      setBody("");
      setRating(5);
      setDone(payload.message || "Thanks. Your review will appear once it's approved.");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[28rem] flex-col gap-0 bg-background p-0"
      >
        <div className="flex h-[var(--header-h)] shrink-0 items-center border-b border-border px-6 pr-14">
          <SheetTitle className="text-[0.78rem] font-medium tracking-[0.2em] uppercase">
            Write a review
          </SheetTitle>
          <SheetDescription className="sr-only">
            Rate this product and share your experience.
          </SheetDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          {done ? (
            <div className="animate-in fade-in zoom-in-95 grid place-items-center py-10 text-center duration-300 ease-out">
              <span className="grid size-14 place-items-center rounded-full bg-ink text-white">
                <Check className="size-6" strokeWidth={1.75} />
              </span>
              <p className="mt-5 text-xl font-light">Thank you</p>
              <p className="mt-2 max-w-[30ch] text-sm text-muted-foreground" role="status">
                {done}
              </p>
            </div>
          ) : !signedIn ? (
            <div>
              <p className="text-lg font-light">Reviews come from customers.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Log in with the account you ordered with. Once your order is delivered, you can rate
                it here.
              </p>
              <button
                type="button"
                onClick={onLogin}
                className={cn(
                  "mt-6 min-h-12 w-full bg-ink text-[0.74rem] tracking-[0.18em] text-white uppercase hover:bg-[#333]",
                  pressable,
                )}
              >
                Log in to review
              </button>
            </div>
          ) : !eligibility ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : !eligibility.canReview ? (
            <div>
              <p className="text-lg font-light">Not quite yet</p>
              <p className="mt-2 text-sm text-muted-foreground">{eligibility.reason}</p>
            </div>
          ) : (
            <form id="review-form" onSubmit={submit} aria-busy={submitting} className="space-y-6">
              <fieldset>
                <legend className="text-[0.72rem] tracking-[0.16em] uppercase">Your rating</legend>
                <div className="-ml-1.5 mt-2 flex items-center gap-2">
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                  {RATING_WORDS[rating]}
                </p>
              </fieldset>
              <div>
                <label htmlFor="review-body" className="text-[0.72rem] tracking-[0.16em] uppercase">
                  Your review
                </label>
                <textarea
                  id="review-body"
                  required
                  minLength={REVIEW_MIN_LENGTH}
                  maxLength={REVIEW_MAX_LENGTH}
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                    setError("");
                  }}
                  placeholder="How's the fit? How does the fabric feel after a wash?"
                  className="mt-2 min-h-40 w-full resize-y border border-border bg-paper p-3 text-[0.95rem] leading-relaxed outline-none focus:border-ink"
                />
                <p className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {length < REVIEW_MIN_LENGTH
                      ? `${REVIEW_MIN_LENGTH - length} more characters`
                      : "Looks good"}
                  </span>
                  <span>
                    {body.length}/{REVIEW_MAX_LENGTH}
                  </span>
                </p>
                {eligibility.color || eligibility.size ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reviewing your{" "}
                    {[eligibility.color, eligibility.size].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </div>

        {signedIn && eligibility?.canReview && !done ? (
          <div className="shrink-0 border-t border-border px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button
              type="submit"
              form="review-form"
              disabled={submitting}
              className={cn(
                "inline-flex min-h-12 w-full items-center justify-center gap-2 bg-ink text-[0.74rem] tracking-[0.18em] text-white uppercase hover:bg-[#333] disabled:opacity-60",
                pressable,
              )}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Submit review
            </button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
