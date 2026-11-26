"use client";

import { useCallback, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Pointer-tracking spotlight.
 *
 * Writes the cursor position onto the element as `--mx` / `--my`; the glow
 * itself is a CSS radial-gradient in globals.css that reads those. Doing it
 * this way means no React state and no re-render per mouse move — the
 * handler only touches two custom properties, which the compositor can
 * resolve without re-running the component.
 *
 * Pointer-only by design: there is nothing here a keyboard or screen-reader
 * user misses, so it is purely decorative and the container stays inert.
 */
export function Spotlight({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const node = ref.current;
    if (!node) return;

    // Coalesce to one write per frame; pointermove can fire far faster.
    if (frame.current !== null) return;
    const { clientX, clientY } = event;

    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--mx", `${clientX - rect.left}px`);
      node.style.setProperty("--my", `${clientY - rect.top}px`);
    });
  }, []);

  return (
    <Tag
      ref={ref as never}
      onPointerMove={onPointerMove}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
