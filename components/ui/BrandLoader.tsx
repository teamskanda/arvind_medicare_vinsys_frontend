import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The product's loading mark: a ring orbiting the SKANDA glyph.
 *
 * Reserved for the handful of moments that genuinely have nothing to show
 * yet. Everywhere there *is* a known shape — a list, a card, a table — a
 * skeleton is the better answer, because it holds the layout and the content
 * arrives into it instead of replacing a spinner. A spinner in those places
 * only tells you the app has not crashed.
 *
 * The ring is a conic gradient rather than a rotating icon, so the trail
 * fades out behind the head. That is the detail that separates it from the
 * default throbber every framework ships with.
 */
export function BrandLoader({
  label,
  className,
  fullscreen = false,
}: {
  /** Said out loud to assistive tech, and shown under the mark when given. */
  label?: string;
  className?: string;
  fullscreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-5",
        fullscreen && "min-h-dvh w-full",
        className,
      )}
    >
      <div className="brand-loader" aria-hidden>
        <Image
          src="/brand/skanda-mark.png"
          alt=""
          width={22}
          height={37}
          priority
          // Above the ring's inner glow, which is a later pseudo-element and
          // would otherwise tint the white mark pink.
          className="relative z-1 opacity-90"
        />
      </div>

      {label ? (
        <p className="text-sm text-ink-500">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
