"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Eye, FileWarning } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageContentModal } from "@/components/knowledge/PageContentModal";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PageStatusBadge } from "@/components/ui/Badge";
import { LiveCount } from "@/components/ui/Counter";
import { ApiError, api } from "@/lib/api";
import { cn, formatCharacters, formatDateTime, pathOf } from "@/lib/utils";
import type { Chatbot, WebsitePageSummary } from "@/types";

export function KnowledgeBase({
  chatbot,
  refreshToken,
}: {
  chatbot: Chatbot;
  /** Bumping this re-fetches, e.g. when a crawl finishes. */
  refreshToken: number;
}) {
  const [pages, setPages] = useState<WebsitePageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<WebsitePageSummary | null>(null);
  const reduced = useReducedMotion();

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await api.listPages(chatbot.id);
      setPages(response.pages);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load the knowledge base.",
      );
      setPages([]);
    }
  }, [chatbot.id]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  async function onToggle(page: WebsitePageSummary) {
    setTogglingId(page.id);
    const next = !page.is_included;
    try {
      const updated = await api.setPageIncluded(chatbot.id, page.id, next);
      setPages((current) =>
        (current ?? []).map((p) => (p.id === page.id ? updated : p)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update that page.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  const summary = {
    total: pages?.length ?? 0,
    scraped: (pages ?? []).filter((p) => p.status === "scraped").length,
    unusable: (pages ?? []).filter(
      (p) => p.status === "empty" || p.status === "failed",
    ).length,
    included: (pages ?? []).filter((p) => p.is_included).length,
  };

  return (
    <section className="rounded-card border border-ink-100 bg-surface">
      <header className="border-b border-ink-100 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink-900">
            Knowledge base
          </h2>
          <p className="text-xs text-ink-500">
            Last scraped {formatDateTime(chatbot.stats.last_scraped_at)}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <SummaryStat label="Pages stored" value={summary.total} />
          <SummaryStat label="Usable" value={summary.scraped} emphasis />
          <SummaryStat label="Included in AI" value={summary.included} />
          <SummaryStat
            label="Unusable"
            value={summary.unusable}
            tone={summary.unusable > 0 ? "warning" : undefined}
          />
        </dl>

        {chatbot.stats.total_content_characters > 0 ? (
          <p className="mt-3 text-xs text-ink-500">
            {formatCharacters(chatbot.stats.total_content_characters)} available
            to the assistant.
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="px-5 pt-4">
          <Callout
            tone="error"
            action={
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                Retry
              </Button>
            }
          >
            {error}
          </Callout>
        </div>
      ) : null}

      {pages === null ? (
        <div className="space-y-2 p-5">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="app-skeleton h-11 rounded bg-ink-50"
              style={{ "--skeleton-delay": `${index * 0.1}s` } as React.CSSProperties}
            />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <span
            aria-hidden
            className="mx-auto flex size-10 items-center justify-center rounded-full bg-ink-50"
          >
            <FileWarning className="size-5 text-ink-300" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink-900">
            No pages stored yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
            Once scraping finishes, every page we read will be listed here for
            you to review.
          </p>
        </div>
      ) : (
        <>
          {/* Table on desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left">
                  <Th>Page</Th>
                  <Th className="w-[88px]">Status</Th>
                  <Th className="w-[96px] text-right">Content</Th>
                  <Th className="w-[104px] text-center">In AI</Th>
                  <Th className="w-[88px]" />
                </tr>
              </thead>
              <tbody>
                {pages.map((page, index) => (
                  <motion.tr
                    key={page.id}
                    className="border-b border-ink-50 last:border-0 hover:bg-canvas"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    /* Capped: a cascade is lovely over five rows and
                       irritating over twenty, so the last rows arrive
                       together rather than making anyone wait. */
                    transition={{
                      duration: 0.4,
                      delay: Math.min(index * 0.035, 0.45),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <td className="px-5 py-3">
                      <p className="truncate font-medium text-ink-900">
                        {page.title ?? pathOf(page.url)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {pathOf(page.url)}
                      </p>
                      {page.error ? (
                        <p className="mt-0.5 truncate text-xs text-warning-700">
                          {page.error}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <PageStatusBadge status={page.status} />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-700">
                      {page.content_length.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <IncludeToggle
                        page={page}
                        busy={togglingId === page.id}
                        onToggle={() => void onToggle(page)}
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewing(page)}
                        icon={<Eye aria-hidden className="size-3.5" />}
                      >
                        View
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards on mobile */}
          <ul className="divide-y divide-ink-50 md:hidden">
            {pages.map((page, index) => (
              <motion.li
                key={page.id}
                className="px-5 py-4"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(index * 0.035, 0.45),
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {page.title ?? pathOf(page.url)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {pathOf(page.url)}
                    </p>
                  </div>
                  <PageStatusBadge status={page.status} />
                </div>

                {page.error ? (
                  <p className="mt-1.5 text-xs text-warning-700">{page.error}</p>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-ink-500">
                    {page.content_length.toLocaleString()} characters
                  </span>
                  <div className="flex items-center gap-2">
                    <IncludeToggle
                      page={page}
                      busy={togglingId === page.id}
                      onToggle={() => void onToggle(page)}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setViewing(page)}
                      icon={<Eye aria-hidden className="size-3.5" />}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </>
      )}

      <PageContentModal
        chatbotId={chatbot.id}
        page={viewing}
        onClose={() => setViewing(null)}
      />
    </section>
  );
}

function IncludeToggle({
  page,
  busy,
  onToggle,
}: {
  page: WebsitePageSummary;
  busy: boolean;
  onToggle: () => void;
}) {
  const disabled = busy || (page.status !== "scraped" && !page.is_included);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={page.is_included}
      aria-label={`${page.is_included ? "Exclude" : "Include"} ${
        page.title ?? page.url
      } ${page.is_included ? "from" : "in"} the knowledge base`}
      disabled={disabled}
      onClick={onToggle}
      title={
        disabled && !page.is_included
          ? "This page has no usable content"
          : undefined
      }
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150",
        page.is_included ? "bg-burgundy-600" : "bg-ink-200",
        disabled && "opacity-50",
        !disabled && "cursor-pointer",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-3.5 rounded-full bg-surface shadow-sm transition-transform duration-150",
          page.is_included ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-2.5 text-[11px] font-medium tracking-wide text-ink-500 uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SummaryStat({
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
        {/* Counts up on arrival. These four land at the same moment the page
            list does, so they are part of that arrival rather than a figure
            that was already sitting there. */}
        <LiveCount value={value} start={0} label={label} />
      </dd>
    </div>
  );
}
