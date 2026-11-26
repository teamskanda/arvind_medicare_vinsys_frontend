"use client";

/**
 * Where a visitor's session token lives, with a graceful fallback.
 *
 * The chatbot runs in a third-party iframe, which is the most hostile storage
 * environment the web has:
 *
 *   * Third-party **cookies** are blocked by default in Safari, Firefox and
 *     now Chrome. So cookies are not an option at all — which is why the
 *     token travels in a request header instead.
 *   * `localStorage` is partitioned per top-level site in modern browsers.
 *     That is fine, and in fact desirable: a visitor's session on one
 *     customer's website is naturally separate from their session on another.
 *   * `localStorage` can still **throw** — Safari in Lockdown Mode, a browser
 *     with site data disabled, or private browsing with a full quota. Writing
 *     to it unguarded is one of the commonest ways an embedded widget breaks
 *     on a minority of real visitors.
 *
 * So every access is wrapped, and when storage is unavailable we fall back to
 * an in-memory map. The visitor then keeps their conversation for as long as
 * the page is open and starts fresh on reload, which is a graceful
 * degradation rather than a failure.
 */

const KEY_PREFIX = "skanda-ai.visitor.";

/** Survives for the lifetime of the page when real storage is unavailable. */
const memory = new Map<string, string>();

let storageWorks: boolean | null = null;

/**
 * Probe once whether localStorage can actually be used.
 *
 * Feature-detecting by presence is not enough: the object exists and throws
 * on access in several configurations, so the probe performs a real write.
 */
function hasStorage(): boolean {
  if (storageWorks !== null) return storageWorks;
  try {
    const probe = `${KEY_PREFIX}probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    storageWorks = true;
  } catch {
    storageWorks = false;
  }
  return storageWorks;
}

function key(publicId: string): string {
  return `${KEY_PREFIX}${publicId}`;
}

export function readVisitorToken(publicId: string): string | null {
  if (typeof window === "undefined") return null;
  if (hasStorage()) {
    try {
      return window.localStorage.getItem(key(publicId));
    } catch {
      // Storage worked at probe time and fails now (quota, mode change).
      // Fall through to memory rather than breaking the chat.
    }
  }
  return memory.get(key(publicId)) ?? null;
}

/** Store a token, or clear it by passing `null`. */
export function writeVisitorToken(publicId: string, token: string | null): void {
  if (typeof window === "undefined") return;

  if (token === null) {
    memory.delete(key(publicId));
    if (hasStorage()) {
      try {
        window.localStorage.removeItem(key(publicId));
      } catch {
        /* nothing more we can do, and nothing is broken by it */
      }
    }
    return;
  }

  memory.set(key(publicId), token);
  if (hasStorage()) {
    try {
      window.localStorage.setItem(key(publicId), token);
    } catch {
      /* the in-memory copy above is the fallback */
    }
  }
}

/** True when the token will not survive a page reload. Shown nowhere; used in tests. */
export function isStoragePersistent(): boolean {
  if (typeof window === "undefined") return false;
  return hasStorage();
}
