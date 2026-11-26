"use client";

import { ApiError } from "@/lib/api";
import { isEmbedded } from "@/lib/embedBridge";
import { readVisitorToken, writeVisitorToken } from "@/lib/visitorStorage";
import type {
  ChatResponse,
  ChatStreamEvent,
  PublicBotConfig,
  VisitorSession,
} from "@/types";

/**
 * The public chatbot's API client uses an anonymous visitor session.
 *
 * Identity here is an opaque visitor session token the backend signs and we
 * simply carry. We never parse it: it is an HMAC, and treating it as data
 * would invite someone to "fix" it later by trusting its contents.
 *
 * Two headers matter:
 *   X-Visitor-Token — the session. A header rather than a cookie, because
 *     every modern browser blocks cookies for a third-party iframe, which is
 *     exactly how this page runs on a customer's website.
 *   X-Embed-Origin  — the page the chatbot was embedded on, read from
 *     `document.referrer`. The backend uses it for the customer's
 *     allowed-domain check. It is page-supplied and therefore a supplementary
 *     signal, not authentication. Sent ONLY when we are actually in an
 *     iframe: at the top level (the shareable link) `document.referrer` is
 *     whatever linked here — a search engine, a messaging app's redirect —
 *     which is not an embedding origin and would fail a configured
 *     allowed-domain list for no reason.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type ApiErrorShape = {
  message?: string;
  code?: string;
  retryable?: boolean;
};

/**
 * The origin of the page embedding us, or null when we are not embedded.
 *
 * `isEmbedded()` is the important half. In an iframe `document.referrer` is
 * the host page, which is exactly what the allowed-domain check wants. At the
 * top level it is an unrelated referrer, so reporting it as an embedding
 * origin would get the shareable link refused by a restricted chatbot.
 */
function embedOrigin(): string | null {
  if (typeof document === "undefined") return null;
  if (!isEmbedded()) return null;
  try {
    const referrer = document.referrer;
    if (!referrer) return null;
    const origin = new URL(referrer).origin;
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

function headers(token?: string | null): Record<string, string> {
  const result: Record<string, string> = { "Content-Type": "application/json" };
  if (token) result["X-Visitor-Token"] = token;
  const origin = embedOrigin();
  if (origin) result["X-Embed-Origin"] = origin;
  return result;
}

function unreachable(): ApiError {
  return new ApiError(
    "The chat assistant could not be reached. Please check your connection and try again.",
    "network_error",
    0,
    true,
  );
}

async function toApiError(response: Response): Promise<ApiError> {
  let envelope: { error?: ApiErrorShape } | null = null;
  try {
    envelope = JSON.parse(await response.text());
  } catch {
    envelope = null;
  }
  return new ApiError(
    envelope?.error?.message ?? "Something went wrong. Please try again.",
    envelope?.error?.code ?? "unknown_error",
    response.status,
    envelope?.error?.retryable ?? false,
  );
}

async function publicRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { ...headers(token), ...(init.headers as Record<string, string>) },
      cache: "no-store",
    });
  } catch {
    throw unreachable();
  }

  if (!response.ok) throw await toApiError(response);

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ------------------------------------------------------------------ */
/* Configuration and sessions                                          */
/* ------------------------------------------------------------------ */

export function getPublicConfig(publicId: string): Promise<PublicBotConfig> {
  return publicRequest<PublicBotConfig>(
    `/api/public/bots/${encodeURIComponent(publicId)}/config`,
  );
}

/**
 * Return a usable visitor session, reusing the stored one when possible.
 *
 * A stored token is reused so a visitor who reloads the page keeps their
 * conversation. The backend re-verifies it on every request, so a token that
 * has expired or was issued for another chatbot is rejected there and we mint
 * a fresh one — which is why no expiry arithmetic happens here.
 */
export async function ensureVisitorSession(publicId: string): Promise<string> {
  const stored = readVisitorToken(publicId);
  if (stored) return stored;

  const session = await publicRequest<VisitorSession>(
    `/api/public/bots/${encodeURIComponent(publicId)}/sessions`,
    { method: "POST", body: "{}" },
  );
  writeVisitorToken(publicId, session.token);
  return session.token;
}

/** Mint a new session, discarding any stored one. */
export async function renewVisitorSession(publicId: string): Promise<string> {
  writeVisitorToken(publicId, null);
  return ensureVisitorSession(publicId);
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export function sendPublicMessage(
  publicId: string,
  token: string,
  message: string,
  conversationId: string | null,
): Promise<ChatResponse> {
  return publicRequest<ChatResponse>(
    `/api/public/bots/${encodeURIComponent(publicId)}/chat`,
    {
      method: "POST",
      body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
    },
    token,
  );
}

/**
 * Stream a public reply over SSE.
 *
 * Mirrors `streamMessage` in lib/api.ts frame for frame: the same buffering
 * across chunks, the same silent handling of aborts, the same rule that an
 * error arriving *inside* the stream is delivered as an `error` event rather
 * than thrown, because by then the UI may already show part of an answer.
 *
 * The one difference is the credential, so the two cannot be collapsed into
 * one function without passing the auth strategy in — which would put the
 * public path's security on a parameter.
 */
export async function streamPublicMessage(
  publicId: string,
  token: string,
  message: string,
  conversationId: string | null,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/public/bots/${encodeURIComponent(publicId)}/chat?stream=true`,
      {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
        cache: "no-store",
        signal,
      },
    );
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    throw unreachable();
  }

  if (!response.ok) throw await toApiError(response);
  if (!response.body) {
    throw new ApiError(
      "Your browser could not read the streamed reply.",
      "stream_unsupported",
      0,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separator = buffer.indexOf("\n\n");
      while (separator !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        separator = buffer.indexOf("\n\n");

        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            onEvent(JSON.parse(data) as ChatStreamEvent);
          } catch {
            // A malformed frame is skipped rather than killing the stream.
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    onEvent({
      type: "error",
      code: "stream_interrupted",
      message: "The reply was cut off. Please try again.",
      retryable: true,
    });
  } finally {
    reader.releaseLock();
  }
}
