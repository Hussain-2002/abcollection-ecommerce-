"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { InstagramGlyph } from "@/components/site/Brand";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

const CartDrawer = dynamic(
  () => import("@/components/commerce/CartDrawer").then((mod) => mod.CartDrawer),
  { ssr: false },
);

type ReservationContextValue = {
  unlocked: boolean;
  ctaLabel: string;
  openEarlyAccess: () => void;
  openReservation: () => void;
  primaryCta: () => void;
};

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function useReservation() {
  const ctx = useContext(ReservationContext);
  if (!ctx) throw new Error("useReservation must be used within SiteShell");
  return ctx;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Product, cart and checkout pages have their own bottom bars.
  const showDm = !/^\/(collection\/|cart|checkout)/.test(pathname);
  const { cartDrawerOpen } = useCommerce();
  const [loadDrawer, setLoadDrawer] = useState(false);
  const ctaLabel = "Shop Collection";

  useEffect(() => {
    if (cartDrawerOpen) setLoadDrawer(true);
  }, [cartDrawerOpen]);

  const goShop = useCallback(() => {
    router.push("/collection");
  }, [router]);

  const value = useMemo(
    () => ({
      unlocked: true,
      ctaLabel,
      openEarlyAccess: goShop,
      openReservation: goShop,
      primaryCta: goShop,
    }),
    [goShop],
  );

  return (
    <ReservationContext.Provider value={value}>
      <div className="min-h-screen min-w-0 bg-background text-foreground">
        <a
          href="#main"
          className="absolute -left-[9999px] z-[200] bg-white px-4 py-3 focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        <AnnouncementBar />
        <SiteHeader />
        {loadDrawer ? <CartDrawer /> : null}
        {/* Keeps the footer below the fold while a page is still loading. */}
        <main id="main" className="min-h-[70svh]">
          {children}
        </main>
        <SiteFooter />
        {showDm ? (
          <a
            href="https://ig.me/m/abcollection.co.in"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Message AB Collection on Instagram"
            className="fixed right-[clamp(0.8rem,2vw,1.5rem)] bottom-[calc(clamp(0.8rem,2vw,1.5rem)+env(safe-area-inset-bottom))] z-30 grid size-13 place-items-center rounded-full bg-ink text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:scale-105"
          >
            <InstagramGlyph />
          </a>
        ) : null}
      </div>
    </ReservationContext.Provider>
  );
}
