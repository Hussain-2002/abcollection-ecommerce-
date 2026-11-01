"use client";

import { colorSwatchClass } from "@/lib/product-colors";
import { cn } from "@/lib/utils";

/**
 * Round colour chips. Static rows render small dots; interactive rows render
 * 36px swatches with an inset gap and an ink ring on the selected colour.
 */
export function ColorSwatchRow({
  colors,
  selected,
  onSelect,
  disabled,
  label,
  className,
  isAvailable,
}: {
  colors: string[];
  selected?: string | undefined;
  onSelect?: ((color: string) => void) | undefined;
  disabled?: boolean | undefined;
  label?: string | undefined;
  className?: string | undefined;
  isAvailable?: ((color: string) => boolean) | undefined;
}) {
  if (!colors.length) return null;
  const interactive = Boolean(onSelect);

  if (!interactive) {
    return (
      <span
        role="img"
        aria-label={`${colors.length} ${colors.length === 1 ? "colour" : "colours"}: ${colors.join(", ")}`}
        className={cn("flex items-center gap-1", className)}
      >
        {colors.map((color) => (
          <i
            key={color}
            className={cn(
              "block size-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]",
              colorSwatchClass(color),
            )}
          />
        ))}
      </span>
    );
  }

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label={label || "Colours"}
    >
      {colors.map((color) => {
        const isSelected = selected === color;
        const available = isAvailable ? isAvailable(color) : true;
        return (
          <li key={color}>
            <button
              type="button"
              disabled={disabled}
              title={available ? color : `${color} · sold out`}
              aria-label={available ? color : `${color}, sold out`}
              aria-pressed={isSelected}
              onClick={() => onSelect?.(color)}
              className={cn(
                "relative grid size-9 place-items-center rounded-full border transition-colors disabled:opacity-50",
                isSelected ? "border-foreground" : "border-border hover:border-foreground/50",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "block size-[26px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
                  colorSwatchClass(color),
                )}
              />
              {!available ? (
                <span aria-hidden className="absolute h-px w-9 rotate-45 bg-foreground/60" />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
