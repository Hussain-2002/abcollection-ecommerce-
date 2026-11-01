"use client";

import { useIstefadaOffer } from "@/hooks/use-istefada-offer";
import { ANNOUNCEMENTS } from "@/lib/storefront";

/** Ink marquee above the header. The Istefada offer leads it when unlocked. */
export function AnnouncementBar() {
  const { hasOffer, promoCode, discountInr } = useIstefadaOffer();
  const items = [
    ...(hasOffer ? [`₹${discountInr} off every product · code ${promoCode} applied`] : []),
    ...ANNOUNCEMENTS,
  ];
  // Two copies so the loop is seamless at -50%.
  const loop = [...items, ...items];

  return (
    <div
      className="h-[var(--announce-h)] overflow-hidden bg-ink text-[0.7rem] tracking-[0.16em] text-ink-foreground uppercase"
      role="region"
      aria-label="Store announcements"
    >
      <p className="sr-only">{items.join(". ")}</p>
      <div className="animate-marquee flex h-full w-max items-center gap-16 pl-16" aria-hidden>
        {loop.map((item, index) => (
          <span key={`${item}-${index}`} className="whitespace-nowrap">
            <span className="mr-4 opacity-50">✦</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
