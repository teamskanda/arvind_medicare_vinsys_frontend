"use client";

import { AlertCircle } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PublicChat } from "@/components/embed/PublicChat";
import { ApiError } from "@/lib/api";
import { publicTransport } from "@/lib/chatTransport";
import { getPublicConfig } from "@/lib/publicApi";
import type { EmbedMode, PublicBotConfig } from "@/types";

/**
 * The universal chatbot page. One route serves every chatbot.
 *
 * `/embed/{public_id}` resolves the chatbot from its handle at runtime and
 * renders whatever that chatbot's published configuration says — its name,
 * avatar, brand colour, greeting, persona, language and knowledge base. There
 * is no per-customer page, no per-customer build and no per-customer
 * deployment: adding a chatbot adds a database row, nothing more.
 *
 * `?mode=` picks the chrome:
 *   (absent) / inline — fills the iframe container
 *   panel             — floating, with a close button
 *   full              — standalone full-page conversation
 *
 * No authentication. A visitor never needs a SKANDA AI account, and the
 * backend serves this route's configuration only for chatbots whose status
 * is `published` — so an unpublished chatbot renders the unavailable state
 * below and cannot start a conversation.
 */

function parseMode(raw: string | null): EmbedMode {
  if (raw === "panel" || raw === "full") return raw;
  return "inline";
}

export default function EmbedPage() {
  const params = useParams<{ publicId: string }>();
  const searchParams = useSearchParams();
  const publicId = params.publicId;
  const mode = parseMode(searchParams.get("mode"));

  const [config, setConfig] = useState<PublicBotConfig | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // The visitor's transport: an anonymous signed session against the public
  // endpoint, which serves the chatbot's *published* configuration. Memoised
  // so a re-render does not hand the chat a new object every time.
  const transport = useMemo(() => publicTransport(publicId), [publicId]);

  useEffect(() => {
    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const loaded = await getPublicConfig(publicId);
        if (!cancelled) { setConfig(loaded); setFailure(null); }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) setConfig(null);
        setFailure(
          error instanceof ApiError
            ? error.message
            : "This chat assistant could not be loaded.",
        );
      } finally { refreshing = false; }
    };
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [publicId]);

  // The embed page is its own document inside an iframe, so it sets its own
  // background rather than inheriting the dashboard's canvas.
  if (failure) return <Unavailable message={failure} />;
  if (!config) return <Loading />;

  return <PublicChat config={config} mode={mode} transport={transport} />;
}

function Loading() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-white">
      <div className="flex items-center gap-2 text-sm text-ink-500" role="status">
        <span className="size-3 animate-pulse rounded-full bg-ink-300" />
        Loading the assistant…
      </div>
    </div>
  );
}

/**
 * Shown for an unknown handle, a chatbot that was never published, and one
 * that has been unpublished.
 *
 * Deliberately the same message in all three cases: the backend returns an
 * identical 404 so the endpoint does not confirm which handles exist, and the
 * visitor-facing truth is the same either way.
 */
function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-white px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-ink-200 bg-ink-50 text-ink-500">
          <AlertCircle aria-hidden className="size-5" />
        </div>
        <h1 className="mt-3 text-sm font-semibold text-ink-900">
          Assistant unavailable
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{message}</p>
        <p className="mt-5 text-[10px] uppercase tracking-wide text-ink-300">
          SKANDA AI
        </p>
      </div>
    </div>
  );
}
