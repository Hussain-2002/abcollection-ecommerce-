"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import CheckoutPage from "./CheckoutClient";

export default function CheckoutRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100svh-var(--header-h)-var(--announce-h))] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckoutPage />
    </Suspense>
  );
}
