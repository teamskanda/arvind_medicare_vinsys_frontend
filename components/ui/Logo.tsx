import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * SKANDA AI lockup: the swan-and-veena mark beside the wordmark.
 *
 * The mark is shown on its own rather than inside a brand-coloured tile. A
 * tile is the right container for a simple geometric glyph, but this mark is
 * fine-lined and ornate — boxing it in costs roughly a third of its height,
 * and below about 32px its strokes stop resolving and it greys into a smudge.
 * Standing free, it gets the full line height to work with.
 *
 * `height` is the control, not width: the mark is portrait, and every place
 * it appears is a horizontal bar whose height is the real constraint.
 */

/** Intrinsic pixels of the source asset — the aspect ratio comes from these. */
const MARK = { src: "/brand/skanda-mark.png", width: 187, height: 314 };

export function Logo({
  className,
  showWordmark = true,
  height = 36,
  priority = true,
}: {
  className?: string;
  showWordmark?: boolean;
  /** Rendered height in px. Below ~32 the mark's detail stops resolving. */
  height?: number;
  priority?: boolean;
}) {
  return (
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <Image
        src={MARK.src}
        // The wordmark beside it already names the company, so repeating it
        // here would have a screen reader say "SKANDA AI SKANDA AI".
        alt={showWordmark ? "" : "SKANDA AI"}
        width={Math.round((height * MARK.width) / MARK.height)}
        height={height}
        priority={priority}
        className={cn(
          "logo-mark shrink-0 select-none",
          // No rotation on hover: a tilt reads as playful on a geometric
          // tile and as crooked on a drawn mark.
          "transition-transform duration-500 ease-out group-hover:scale-[1.06]",
        )}
      />
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.025em] text-ink-900">
          SKANDA<span className="text-burgundy-700"> AI</span>
        </span>
      ) : null}
    </span>
  );
}
