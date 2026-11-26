import { cn } from "@/lib/utils";

/**
 * SKANDA AI wordmark. A typographic mark with a single geometric glyph —
 * no stock illustration, no gradient.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "gradient-brand flex size-7 shrink-0 items-center justify-center rounded-[8px]",
          "shadow-[0_4px_14px_-4px_#b23763cc,inset_0_1px_0_0_#ffffff33]",
          "transition-transform duration-500 ease-out group-hover:rotate-[8deg] group-hover:scale-105",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path
            d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z"
            stroke="white"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.4" fill="white" />
        </svg>
      </span>
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.025em] text-ink-900">
          SKANDA<span className="text-burgundy-700"> AI</span>
        </span>
      ) : null}
    </span>
  );
}
