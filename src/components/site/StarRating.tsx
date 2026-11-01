"use client";

import { useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

const STAR_PATH =
  "M12 2.8l2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.83l-5.5 2.89 1.05-6.12L3.1 9.27l6.15-.9L12 2.8z";

const SIZE = { sm: "size-3.5", md: "size-4.5", lg: "size-9" } as const;

function Star({ fill, className }: { fill: number; className: string }) {
  // fill is 0..1 so averages like 4.6 show a partly filled last star.
  const id = `star-${Math.round(fill * 100)}`;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--color-foreground)" />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d={STAR_PATH}
        fill={`url(#${id})`}
        stroke="var(--color-foreground)"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarRating({
  value,
  onChange,
  size = "md",
  label,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: keyof typeof SIZE;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (!onChange) {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={label ?? `${Number(value.toFixed(1))} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            fill={Math.max(0, Math.min(1, value - star + 1))}
            className={SIZE[size]}
          />
        ))}
      </span>
    );
  }

  const shown = hover ?? value;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(5, value + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(1, value - 1));
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label ?? "Your rating"}
      className="inline-flex items-center"
      onMouseLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          tabIndex={star === value ? 0 : -1}
          onMouseEnter={() => setHover(star)}
          onClick={() => onChange(star)}
          className="grid size-12 place-items-center transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90"
        >
          <Star
            fill={star <= shown ? 1 : 0}
            className={cn(
              SIZE[size],
              "transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
              hover !== null && star <= hover && "scale-110",
            )}
          />
        </button>
      ))}
    </div>
  );
}
