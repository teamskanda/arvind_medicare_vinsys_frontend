"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { RetrievalDebug } from "@/types";

/**
 * What retrieval and the token budget actually did for the last answer.
 *
 * Every figure here is measured by the backend, not estimated for display.
 * It exists so a wrong answer is diagnosable during a walkthrough ("it only searched
 * three pages because the rest are excluded") instead of mysterious.
 */
export function RetrievalPanel({ retrieval }: { retrieval: RetrievalDebug }) {
  const [open, setOpen] = useState(false);

  const rows: Array<[string, string]> = [
    ["Pages searched", String(retrieval.pages_searched)],
    [
      "Sections used",
      `${retrieval.sections_used} of ${retrieval.sections_considered}`,
    ],
    ["Website content sent", `${retrieval.knowledge_tokens} tokens`],
    ["Whole prompt", `~${retrieval.prompt_tokens_estimated} tokens`],
    ["Previous turns included", String(retrieval.history_messages_used)],
    [
      "Selection",
      retrieval.whole_knowledge_base_used
        ? "Entire knowledge base (it fits the budget)"
        : "Keyword retrieval",
    ],
    ["Token counting", retrieval.token_estimate_source],
  ];

  return (
    <div className="rounded-md border border-ink-100 bg-canvas">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] text-ink-500 transition-colors hover:text-ink-900"
      >
        <span>
          How this answer was found
          {retrieval.keywords.length > 0 ? (
            <span className="ml-1.5 text-ink-400">
              ({retrieval.keywords.slice(0, 4).join(", ")}
              {retrieval.keywords.length > 4 ? ", …" : ""})
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <dl className="grid gap-x-4 gap-y-1.5 border-t border-ink-100 px-3 py-2.5 text-[12px] sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 sm:block">
              <dt className="text-ink-500">{label}</dt>
              <dd className="font-medium text-ink-900 sm:mt-0.5">{value}</dd>
            </div>
          ))}
          {retrieval.keywords.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-ink-500">Search terms</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {retrieval.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded bg-ink-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-700"
                  >
                    {keyword}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
