import { cn } from "@/lib/utils";

/** AB monogram + wordmark. `light` is for dark or photo backgrounds. */
export function BrandLogo({
  light = false,
  className,
  showWordmark = true,
}: {
  light?: boolean;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={light ? "/brand/ab-monogram-light-sm.png" : "/brand/ab-monogram-sm.png"}
        alt=""
        width={180}
        height={148}
        className="h-8 w-auto sm:h-9"
      />
      {showWordmark ? (
        <span className="hidden text-[0.62rem] leading-none tracking-[0.42em] uppercase sm:inline">
          Collection
        </span>
      ) : null}
    </span>
  );
}

/** Full lockup with the "Comfort everyday" line, used in the footer. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <img
      src="/brand/ab-lockup-md.png"
      alt="AB Collection · Comfort everyday"
      width={520}
      height={394}
      className={cn("h-auto w-40", className)}
      loading="lazy"
    />
  );
}

type IconName = "truck" | "exchange" | "lock" | "india";

/** Hairline icons drawn to match the brand (1.3px stroke, no fill). */
export function LineIcon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    "aria-hidden": true,
    className: cn("size-6", className),
  } as const;
  if (name === "truck") {
    return (
      <svg {...common}>
        <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" />
        <circle cx="6.5" cy="17.5" r="1.8" />
        <circle cx="17" cy="17.5" r="1.8" />
      </svg>
    );
  }
  if (name === "exchange") {
    return (
      <svg {...common}>
        <path d="M4 8h13l-3-3M20 16H7l3 3" />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="10.5" width="14" height="9.5" rx="1" />
        <path d="M8 10.5V8a4 4 0 018 0v2.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3.5v6.3M12 14.2v6.3M3.5 12h6.3M14.2 12h6.3" />
    </svg>
  );
}

export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)} fill="currentColor">
      <path d="M12 3C6.9 3 3 6.6 3 11.2c0 2.5 1.2 4.7 3.1 6.2V21l3-1.7c.9.3 1.9.4 2.9.4 5.1 0 9-3.6 9-8.2S17.1 3 12 3zm.9 11.1-2.3-2.5-4.5 2.5 5-5.3 2.4 2.5 4.4-2.5-5 5.3z" />
    </svg>
  );
}
