"use client";

import { ExternalLink } from "lucide-react";

import { prettyUrl } from "@/lib/utils";
import type { Palette, SourceReference } from "@/types";

/**
 * Citations for one answer.
 *
 * These come from the backend's retrieval step, which builds them from the
 * `website_pages` rows it actually selected — never from parsing the model's
 * text. So a source shown here is always a real page in this chatbot's
 * knowledge base, and the model cannot invent one.
 *
 * `palette` is the customer's chosen colours, present for the public chatbot
 * and absent in the dashboard playground, which uses the SKANDA AI theme.
 */
export function SourceList({
  sources,
  palette = null,
}: {
  sources: SourceReference[];
  palette?: Palette | null;
}) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
      <span
        className="text-[11px] font-medium uppercase tracking-wide text-ink-500"
        style={palette ? { color: palette.muted_text } : undefined}
      >
        {sources.length === 1 ? "Source" : "Sources"}
      </span>
      {sources.map((source) => (
        <a
          key={`${source.url}-${source.title}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title={source.url}
          className="inline-flex max-w-full items-center gap-1 rounded border border-ink-200 bg-surface px-1.5 py-0.5 text-[11px] text-ink-700 transition-colors hover:border-burgundy-600/30 hover:text-burgundy-700"
          style={
            palette
              ? {
                  borderColor: palette.border,
                  backgroundColor: palette.ai_bubble,
                  color: palette.secondary,
                  borderRadius: "var(--chat-radius-sm, 4px)",
                }
              : undefined
          }
        >
          <span className="truncate">{source.title}</span>
          <ExternalLink aria-hidden className="size-2.5 shrink-0 opacity-60" />
          <span className="sr-only">{`opens ${prettyUrl(source.url)} in a new tab`}</span>
        </a>
      ))}
    </div>
  );
}
