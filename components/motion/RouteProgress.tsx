"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The bar that runs across the top of the window while a page is on its way.
 *
 * This exists because clicking through to another page used to produce no
 * feedback at all: the dashboard layout is `force-dynamic`, so every entry
 * costs a server round trip, and for the length of that trip the old page
 * simply sat there looking broken. A spinner in the middle of the screen
 * would be worse — it covers the content you are leaving and tells you
 * nothing — whereas a 2px line at the edge says "received, working" without
 * taking the page away from you.
 *
 * Two details that separate this from a bar that merely exists:
 *
 * 1. It waits 120ms before showing. Most navigations here resolve from the
 *    client router in well under a frame, and a bar that flashes for 40ms
 *    reads as a glitch rather than as progress.
 * 2. It creeps asymptotically toward 92% and never reaches it on its own.
 *    A bar that fills to 100% and then waits is lying; one that keeps easing
 *    forward is honest about not knowing how long is left, and still reads
 *    as movement.
 */

/** Lets a programmatic `router.push` start the bar too — see `startRouteProgress`. */
let externalStart: (() => void) | null = null;

/**
 * Starts the bar for a navigation that does not come from clicking a link,
 * such as the redirect after signing in or after creating an assistant.
 */
export function startRouteProgress() {
  externalStart?.();
}

export function RouteProgress() {
  const pathname = usePathname();
  const [value, setValue] = useState(0);
  const [shown, setShown] = useState(false);

  const running = useRef(false);
  // Mirrors `shown` so `finish` can branch on it without reading state inside
  // a state updater — StrictMode double-invokes those, which would schedule
  // the wind-down twice.
  const shownRef = useRef(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const failsafe = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (creepTimer.current) clearInterval(creepTimer.current);
    if (failsafe.current) clearTimeout(failsafe.current);
    showTimer.current = null;
    hideTimer.current = null;
    creepTimer.current = null;
    failsafe.current = null;
  }, []);

  const finish = useCallback(() => {
    if (!running.current) return;
    running.current = false;
    clearTimers();
    // Resolved before the 120ms threshold, so nothing was ever painted and
    // there is nothing to wind down.
    if (!shownRef.current) return;
    // Run it to full, hold for a beat, then fade — a bar that vanishes at
    // 80% reads as an interruption rather than as an arrival.
    setValue(1);
    hideTimer.current = setTimeout(() => {
      shownRef.current = false;
      setShown(false);
      setValue(0);
    }, 400);
  }, [clearTimers]);

  const start = useCallback(() => {
    if (running.current) return;
    running.current = true;
    clearTimers();

    showTimer.current = setTimeout(() => {
      shownRef.current = true;
      setShown(true);
      setValue(0.08);
      creepTimer.current = setInterval(() => {
        setValue((current) => current + (0.92 - current) * 0.14);
      }, 240);
    }, 120);

    // If a navigation never resolves — a failed fetch, an aborted route — the
    // bar must not stay on screen forever claiming to be busy.
    failsafe.current = setTimeout(finish, 15000);
  }, [clearTimers, finish]);

  // A completed navigation is the only thing that ends the bar.
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    externalStart = start;
    return () => {
      externalStart = null;
    };
  }, [start]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Anything that is not a plain left click is the browser's business:
      // open-in-new-tab, downloads and context menus do not navigate us.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      // Same page, or a jump to an anchor on it — no navigation to report.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      start();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", start);
    };
  }, [start]);

  return (
    <div className="route-progress" data-active={shown} aria-hidden>
      <span style={{ transform: `scaleX(${value})` }} />
    </div>
  );
}
