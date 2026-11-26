"use client";

/**
 * The iframe's half of the postMessage conversation with the host page.
 *
 * The loader (backend/helpers/widget.py) owns positioning, the launcher and
 * open/close. This side reports state and asks for changes. Messages are
 * tiny and few: `ready`, `close`, `resize` outbound; `init`, `open`, `close`,
 * `viewport` inbound.
 *
 * Trust model, which is the whole reason this file exists rather than a
 * `window.parent.postMessage` call inline:
 *
 *   * **Outbound** messages must never go to `"*"`. We do not know, and must
 *     not assume, that the parent is who we think it is — but we also cannot
 *     know its origin in advance, because any customer may embed us. The
 *     resolution is `document.referrer`: the browser tells us the embedding
 *     page, and we address that origin explicitly. If we cannot determine it,
 *     we stay silent rather than broadcasting.
 *   * **Inbound** messages are filtered on three things: the origin must
 *     equal the resolved parent origin, the sender must be `window.parent`,
 *     and the payload must carry our marker. A message that fails any check
 *     is ignored without comment.
 *   * Nothing inbound is ever executed, used as a URL, or written to the DOM.
 *     The parent can tell us the viewport is narrow and can ask us to close.
 *     That is the entire vocabulary, on purpose: a compromised host page
 *     should not be able to do anything to the conversation.
 */

const WIDGET_SOURCE = "skanda-ai-widget";
const PARENT_SOURCE = "skanda-ai-parent";

export type ParentMessage =
  | { type: "init" }
  | { type: "open" }
  | { type: "close" }
  | { type: "viewport"; mobile: boolean; width: number };

/** True when this page is rendered inside an iframe. */
export function isEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.parent !== window;
  } catch {
    // A cross-origin parent can throw on comparison in older browsers.
    return true;
  }
}

/**
 * The origin of the page embedding us, or null if it cannot be determined.
 *
 * `document.referrer` is set to the embedding page for an iframe. It is empty
 * when the parent sends a restrictive `Referrer-Policy`, in which case we
 * cannot safely target a message and do not send one.
 */
export function parentOrigin(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const referrer = document.referrer;
    if (!referrer) return null;
    const origin = new URL(referrer).origin;
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

function post(message: Record<string, unknown>): void {
  if (!isEmbedded()) return;
  const target = parentOrigin();
  // No target origin -> no message. Never "*".
  if (!target) return;
  try {
    window.parent.postMessage({ ...message, source: WIDGET_SOURCE }, target);
  } catch {
    /* a parent that refuses the message is not our problem to solve */
  }
}

/** Tell the host page the chatbot has mounted and is interactive. */
export function notifyReady(): void {
  post({ type: "ready" });
}

/** Ask the host page to collapse the panel back to its launcher. */
export function requestClose(): void {
  post({ type: "close" });
}

/**
 * Ask the host page for a different panel height.
 *
 * The loader clamps whatever we ask for, so this is a request and not a
 * command — a bug here cannot make the panel cover the customer's page.
 */
export function requestResize(height: number): void {
  if (!Number.isFinite(height) || height <= 0) return;
  post({ type: "resize", height: Math.round(height) });
}

/**
 * Subscribe to messages from the host page. Returns an unsubscribe function.
 *
 * The three-way check described in the module docstring happens here, once,
 * so no caller can accidentally skip it.
 */
export function listenToParent(
  onMessage: (message: ParentMessage) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const expected = parentOrigin();

  function handler(event: MessageEvent) {
    if (!expected || event.origin !== expected) return;
    if (event.source !== window.parent) return;

    const data = event.data as Record<string, unknown> | null;
    if (!data || data.source !== PARENT_SOURCE) return;

    const type = data.type;
    if (type === "init" || type === "open" || type === "close") {
      onMessage({ type });
    } else if (type === "viewport") {
      onMessage({
        type: "viewport",
        mobile: Boolean(data.mobile),
        width: typeof data.width === "number" ? data.width : 0,
      });
    }
  }

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
