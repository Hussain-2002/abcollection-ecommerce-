"use client";

import { Loader2 } from "lucide-react";
import { useEffect } from "react";

/**
 * Full-height waiting screen. As a page it starts at the top and fills the
 * viewport, so the footer never slides into view while a payment confirms.
 */
export function OrderProcessingScreen({
  title = "Placing your order",
  subtitle = "Please wait — don't close this page.",
  embedded = false,
}: {
  title?: string | undefined;
  subtitle?: string | undefined;
  /** Inside an overlay: don't touch the page scroll. */
  embedded?: boolean;
}) {
  useEffect(() => {
    if (!embedded) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [embedded]);

  return (
    <div
      className={
        embedded
          ? "flex flex-col items-center justify-center px-5 py-16 text-center"
          : "flex min-h-[calc(100svh-var(--header-h)-var(--announce-h))] flex-col items-center justify-center px-5 py-16 text-center"
      }
      role="status"
      aria-live="polite"
    >
      <div className="relative size-16" aria-hidden>
        <span className="absolute inset-0 border-2 border-border" />
        <Loader2 className="size-16 animate-spin text-foreground" strokeWidth={1.5} />
      </div>
      <h1 className="mt-8 font-display text-[1.85rem] font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-charcoal">{subtitle}</p>
    </div>
  );
}

export function OrderProcessingOverlay({
  title,
  subtitle,
}: {
  title?: string | undefined;
  subtitle?: string | undefined;
}) {
  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-background/95 px-5 backdrop-blur-sm animate-in fade-in duration-200"
      role="status"
      aria-live="assertive"
      aria-busy="true"
    >
      <OrderProcessingScreen title={title} subtitle={subtitle} embedded />
    </div>
  );
}
