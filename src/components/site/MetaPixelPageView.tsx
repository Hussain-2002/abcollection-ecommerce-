"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { fbqTrack } from "@/lib/meta-pixel";

function PageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    const url = `${pathname}?${search}`;
    // The base pixel snippet already fires PageView on the initial load.
    if (lastUrl.current === null) {
      lastUrl.current = url;
      return;
    }
    if (lastUrl.current === url) return;
    lastUrl.current = url;
    fbqTrack("PageView");
  }, [pathname, search]);

  return null;
}

/** Fires Meta Pixel PageView on client-side route changes. */
export function MetaPixelPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewInner />
    </Suspense>
  );
}
