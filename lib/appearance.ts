"use client";

import { useEffect, useState } from "react";

import type { Palette, ResolvedAppearance } from "@/types";

/**
 * Turning resolved appearance settings into something a component can render.
 *
 * The backend sends both palettes and does all the colour arithmetic, so
 * there are only two jobs here:
 *
 *   1. Answer `theme: "auto"`, which can only be answered in a browser.
 *   2. Hand the chosen palette to the chat UI as CSS custom properties.
 *
 * Why custom properties rather than Tailwind classes: these colours come from
 * the database, and Tailwind generates classes at build time from the source.
 * A class like `bg-[#0f766e]` cannot exist for a value nobody has typed yet.
 * Custom properties also mean one `style` object on the root element instead
 * of an inline style on every node, so a nested component can read a colour
 * without having it threaded through its props.
 *
 * The values are safe to interpolate: every one is validated as a hex literal
 * server-side (`is_hex_color` in backend/models/customization.py), so none of
 * them can carry a `url(...)`, an `expression(...)` or a stray semicolon.
 */

/** Does this visitor's device prefer a dark interface? */
export function usePrefersDark(): boolean {
  // Starts false and corrects itself after mount. Guessing dark on the server
  // would flash the wrong palette for every light-mode visitor, and this
  // component tree is client-rendered anyway.
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(query.matches);

    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return prefersDark;
}

/**
 * The palette to paint with, and whether it is the dark one.
 *
 * `auto` follows the device and keeps following it: a visitor who switches
 * their system theme with the chat open sees it change.
 */
export function useResolvedPalette(appearance: ResolvedAppearance): {
  palette: Palette;
  isDark: boolean;
} {
  const prefersDark = usePrefersDark();
  const isDark =
    appearance.theme === "dark" ||
    (appearance.theme === "auto" && prefersDark);
  return { palette: isDark ? appearance.dark : appearance.light, isDark };
}

/** CSS custom properties for one palette, for the chat UI's root element. */
export function paletteVariables(
  palette: Palette,
  appearance: ResolvedAppearance,
): React.CSSProperties {
  return {
    "--chat-primary": palette.primary,
    "--chat-secondary": palette.secondary,
    "--chat-header-bg": palette.header_background,
    "--chat-header-text": palette.header_text,
    "--chat-bg": palette.chat_background,
    "--chat-user-bubble": palette.user_bubble,
    "--chat-user-text": palette.user_bubble_text,
    "--chat-ai-bubble": palette.ai_bubble,
    "--chat-text": palette.message_text,
    "--chat-border": palette.border,
    "--chat-muted": palette.muted_text,
    "--chat-radius": `${appearance.border_radius}px`,
    // A nested radius that stays proportionate: a 0px chat stays square, and
    // a 24px chat does not get pill-shaped avatars.
    "--chat-radius-sm": `${Math.max(2, Math.round(appearance.border_radius * 0.55))}px`,
    fontFamily: appearance.font_stack,
  } as React.CSSProperties;
}

/**
 * A translucent version of a hex colour.
 *
 * Used for the subtle tints — a focus ring, an avatar background — where a
 * second solid colour would be too heavy. Takes `#rgb` and `#rrggbb` and
 * returns them with an alpha channel appended, which every current browser
 * understands. Anything unexpected is returned unchanged rather than
 * producing an invalid value.
 */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  const byte = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, "0");

  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}${byte}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(hex)) return `${hex}${byte}`;
  return hex;
}

/** The CSS corner radius for the floating launcher, from its shape. */
export function launcherRadius(shape: string, size: number): string {
  if (shape === "square") return "10px";
  if (shape === "rounded") return `${Math.max(8, Math.round(size * 0.32))}px`;
  return "50%";
}
