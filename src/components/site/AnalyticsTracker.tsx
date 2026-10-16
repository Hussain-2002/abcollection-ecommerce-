"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  getAnalyticsAttribution,
  resolveClickLabel,
  resolveClickTarget,
  trackClick,
  trackPageView,
} from "@/lib/analytics.client";
import { fbqTrackClick } from "@/lib/meta-pixel";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    getAnalyticsAttribution();
  }, []);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.closest("[data-analytics-ignore]")) return;

      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/admin")) return;

      const metaClickable = target.closest(
        "a[href], button, [role='button'], input[type='submit'], input[type='button'], [data-track]",
      );
      if (metaClickable instanceof HTMLElement) {
        fbqTrackClick(
          resolveClickLabel(metaClickable),
          currentPath,
          resolveClickTarget(metaClickable),
        );
      }

      const clickable = target.closest("a[href], [data-track]");
      if (!(clickable instanceof HTMLElement)) return;
      trackClick(currentPath, resolveClickLabel(clickable), resolveClickTarget(clickable));
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
