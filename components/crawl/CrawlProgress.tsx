"use client";

import { Check, Globe2, Loader2, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { cn, formatCharacters, prettyUrl } from "@/lib/utils";
import type { CrawlStatus, CrawlStatusResponse } from "@/types";

/** The six stages the customer sees, in order. */
const STAGES = [
  { key: "validate", label: "Validating website" },
  { key: "discover", label: "Discovering website pages" },
  { key: "extract", label: "Extracting website content" },
  { key: "process", label: "Processing content" },
  { key: "save", label: "Saving knowledge base" },
] as const;

type StageState = "done" | "active" | "pending" | "failed";

/**
 * Maps the real backend status onto stage states.
 *
 * This is presentation only — it never invents a percentage. The page counts
 * shown alongside are the server's own figures.
 */
function stageStates(status: CrawlStatus, hasPages: boolean): StageState[] {
  switch (status) {
    case "pending":
      return ["active", "pending", "pending", "pending", "pending"];
    case "crawling":
      return hasPages
        ? ["done", "done", "active", "pending", "pending"]
        : ["done", "active", "pending", "pending", "pending"];
    case "processing":
      return ["done", "done", "done", "active", "active"];
    case "completed":
    case "partially_completed":
      return ["done", "done", "done", "done", "done"];
    case "failed":
      return hasPages
        ? ["done", "done", "done", "failed", "failed"]
        : ["done", "failed", "pending", "pending", "pending"];
    default:
      return ["pending", "pending", "pending", "pending", "pending"];
  }
}

export function CrawlProgress({
  status,
  onRetry,
  retrying,
}: {
  status: CrawlStatusResponse;
  onRetry: () => void;
  retrying: boolean;
}) {
  const states = stageStates(status.crawl_status, status.successful_pages > 0);
  const failed = status.crawl_status === "failed";
  const partial = status.crawl_status === "partially_completed";

  return (
    <div className="crawl-progress rounded-card border border-ink-100 bg-surface">
      <div className="crawl-banner">
        <div className="crawl-signal" aria-hidden="true"><Globe2 className="size-7" />{!status.is_terminal && <span />}</div>
        <div className="min-w-0"><p className="crawl-eyebrow">{failed ? "Let’s try another way" : status.is_terminal ? "Your website, connected" : "Turning pages into possibilities"}</p>
        <h2 className="text-xl font-semibold tracking-tight">{failed ? "We couldn’t finish this crawl" : status.is_terminal ? "Your knowledge base is ready" : "Building your knowledge base"}</h2>
        <p className="mt-1 truncate text-sm text-white/70">
          {prettyUrl(status.website_url, 60)}
        </p></div>
      </div>

      <div className="px-5 py-5">
        <ol className="crawl-stages">
          {STAGES.map((stage, index) => {
            const state = states[index];
            return (
              <li key={stage.key} className={cn("flex items-center gap-3", state === "active" && "crawl-stage-active")}>
                <StageIcon state={state} />
                <span
                  className={cn(
                    "text-sm",
                    state === "active" && "font-medium text-ink-900",
                    state === "done" && "text-ink-700",
                    state === "pending" && "text-ink-300",
                    state === "failed" && "font-medium text-danger-700",
                  )}
                >
                  {stage.label}
                  {state === "active" ? "…" : ""}
                </span>
              </li>
            );
          })}
        </ol>

        {/* The server's own message — not a generated one. */}
        <p
          aria-live="polite"
          className="mt-5 border-t border-ink-100 pt-4 text-sm text-ink-700"
        >
          {status.progress_message}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Discovered" value={status.discovered_pages} />
          <Stat label="Scraped" value={status.successful_pages} emphasis />
          <Stat
            label="Failed / empty"
            value={status.failed_pages}
            tone={status.failed_pages > 0 ? "warning" : undefined}
          />
          <Stat label="Duplicates" value={status.duplicate_pages} />
        </dl>

        {status.total_content_characters > 0 ? (
          <p className="mt-3 text-xs text-ink-500">
            {formatCharacters(status.total_content_characters)} of text extracted.
          </p>
        ) : null}
        {!status.is_terminal && <p className="mt-4 text-sm text-ink-500">Progress is saved as pages arrive. You can leave this screen and come back.</p>}

        {status.error_message ? (
          <Callout
            tone={failed ? "error" : "warning"}
            className="mt-5"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                loading={retrying}
                icon={<RotateCcw aria-hidden className="size-3.5" />}
              >
                Retry
              </Button>
            }
          >
            {status.error_message}
          </Callout>
        ) : null}

        {failed && !status.error_message ? (
          <Callout
            tone="error"
            className="mt-5"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                loading={retrying}
                icon={<RotateCcw aria-hidden className="size-3.5" />}
              >
                Retry
              </Button>
            }
          >
            Scraping failed. You can try again.
          </Callout>
        ) : null}

        {partial && !status.error_message ? (
          <Callout tone="warning" className="mt-5">
            Some pages could not be read. The pages that succeeded are saved
            below.
          </Callout>
        ) : null}
      </div>
    </div>
  );
}

function StageIcon({ state }: { state: StageState }) {
  if (state === "done") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-50"
      >
        <Check className="size-3 text-success-700" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-burgundy-50"
      >
        <Loader2 className="size-3 animate-spin text-burgundy-600" strokeWidth={3} />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-danger-50"
      >
        <X className="size-3 text-danger-700" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center"
    >
      <span className="size-1.5 rounded-full bg-ink-200" />
    </span>
  );
}

function Stat({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
  tone?: "warning";
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-ink-500 uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-lg leading-none font-semibold tabular-nums",
          emphasis ? "text-burgundy-600" : "text-ink-900",
          tone === "warning" && "text-warning-700",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
