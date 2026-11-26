"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Globe, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Playground } from "@/components/chat/Playground";
import { CrawlProgress } from "@/components/crawl/CrawlProgress";
import { DeployPanel } from "@/components/deploy/DeployPanel";
import { KnowledgeBase } from "@/components/knowledge/KnowledgeBase";
import { CustomizationStudio } from "@/components/studio/CustomizationStudio";
import { CrawlStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { useCrawlStatus } from "@/hooks/useCrawlStatus";
import { ApiError, api } from "@/lib/api";
import { cn, prettyUrl } from "@/lib/utils";
import type { Chatbot } from "@/types";

type Tab = "knowledge" | "playground" | "customize" | "deploy";

const TAB_LABELS: Record<Tab, string> = {
  knowledge: "Knowledge base",
  playground: "Test it",
  customize: "Customise",
  deploy: "Publish",
};

export default function ChatbotDetailPage() {
  const params = useParams<{ id: string }>();
  const chatbotId = params.id;

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [tab, setTab] = useState<Tab>("knowledge");
  const [studioVisited, setStudioVisited] = useState(false);
  useEffect(() => { if (tab === "customize") setStudioVisited(true); }, [tab]);

  const { status, error: statusError, refresh } = useCrawlStatus(chatbotId);

  const loadChatbot = useCallback(async () => {
    try {
      setLoadError(null);
      setChatbot(await api.getChatbot(chatbotId));
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Could not load this assistant.",
      );
    }
  }, [chatbotId]);

  useEffect(() => {
    void loadChatbot();
  }, [loadChatbot]);

  // When the crawl reaches a terminal state, refresh the chatbot (for its
  // stats) and the knowledge base exactly once.
  const settledRef = useRef(false);
  useEffect(() => {
    if (!status?.is_terminal || settledRef.current) return;
    settledRef.current = true;
    void loadChatbot();
    setRefreshToken((token) => token + 1);
  }, [status?.is_terminal, loadChatbot]);

  async function onRetry() {
    setRetrying(true);
    setRetryError(null);
    try {
      await api.retryCrawl(chatbotId);
      settledRef.current = false;
      await refresh();
    } catch (err) {
      setRetryError(
        err instanceof ApiError ? err.message : "Could not restart scraping.",
      );
    } finally {
      setRetrying(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl">
        <BackLink />
        <Callout tone="error" className="mt-5">
          {loadError}
        </Callout>
      </div>
    );
  }

  const isWorking =
    status !== null &&
    !status.is_terminal &&
    ["pending", "crawling", "processing"].includes(status.crawl_status);

  const showKnowledgeBase =
    chatbot !== null &&
    status !== null &&
    (status.successful_pages > 0 || status.stored_pages > 0);

  return (
    <div className="space-y-5">
      <div>
        <BackLink />

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink-900">
                {chatbot?.name ?? "Loading…"}
              </h1>
              {chatbot ? <CrawlStatusBadge status={chatbot.crawl_status} /> : null}
            </div>

            {chatbot ? (
              <a
                href={chatbot.website_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-ink-500 underline-offset-2 transition-colors hover:text-ink-900 hover:underline"
              >
                <Globe aria-hidden className="size-3.5" />
                {prettyUrl(chatbot.website_url, 52)}
              </a>
            ) : null}
          </div>

          {status?.is_terminal ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              loading={retrying}
              icon={<RotateCcw aria-hidden className="size-3.5" />}
            >
              Re-scrape website
            </Button>
          ) : null}
        </div>
      </div>

      {retryError ? <Callout tone="error">{retryError}</Callout> : null}

      {statusError && !status ? (
        <Callout
          tone="error"
          action={
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        >
          {statusError}
        </Callout>
      ) : null}

      {/* Transient polling failure while we still have a last-known state. */}
      {statusError && status ? (
        <Callout tone="warning">
          Progress updates paused: {statusError}
        </Callout>
      ) : null}

      {status ? (
        isWorking || status.crawl_status === "failed" ? (
          <CrawlProgress status={status} onRetry={onRetry} retrying={retrying} />
        ) : status.crawl_status === "partially_completed" ? (
          <Callout tone="warning" title="Scraping finished with some issues">
            {status.error_message ??
              "Some pages could not be read. The rest are saved below."}
          </Callout>
        ) : (
          <Callout tone="success" title="Knowledge base ready">
            {status.successful_pages} page
            {status.successful_pages === 1 ? "" : "s"} saved from{" "}
            {prettyUrl(status.website_url, 40)}. Test it below.
          </Callout>
        )
      ) : (
        <div className="h-48 animate-pulse rounded-card border border-ink-100 bg-surface" />
      )}

      {chatbot ? (
        <>
          <div
            role="tablist"
            aria-label="Assistant sections"
            className="flex gap-1 overflow-x-auto border-b border-ink-100"
          >
            {(["knowledge", "playground", "customize", "deploy"] as const).map((id) => (
              <TabButton
                key={id}
                id={id}
                active={tab === id}
                onSelect={setTab}
              >
                {TAB_LABELS[id]}
              </TabButton>
            ))}
          </div>

          <div
            role="tabpanel"
            id="panel-knowledge"
            aria-labelledby="tab-knowledge"
            hidden={tab !== "knowledge"}
          >
            {tab === "knowledge" ? (
              <KnowledgeBase chatbot={chatbot} refreshToken={refreshToken} />
            ) : null}
          </div>

          <div
            role="tabpanel"
            id="panel-playground"
            aria-labelledby="tab-playground"
            hidden={tab !== "playground"}
          >
            {/* Mounted only when visible: switching tabs abandons an
                in-flight stream rather than leaving it running unseen. */}
            {tab === "playground" ? <Playground chatbot={chatbot} /> : null}
          </div>

          <div
            role="tabpanel"
            id="panel-customize"
            aria-labelledby="tab-customize"
            hidden={tab !== "customize"}
          >
            {/* Mounted on demand: the studio loads the settings catalogue and
                a live preview that talks to the AI, neither of which should
                happen on a tab nobody opened. */}
            {studioVisited || tab === "customize" ? (
              <CustomizationStudio chatbot={chatbot} />
            ) : null}
          </div>

          <div
            role="tabpanel"
            id="panel-deploy"
            aria-labelledby="tab-deploy"
            hidden={tab !== "deploy"}
          >
            {/* Also mounted on demand: the preview iframe loads the real
                public chatbot, which should not happen on a tab nobody
                opened. */}
            {tab === "deploy" ? <DeployPanel chatbot={chatbot} /> : null}
          </div>
        </>
      ) : null}

      {chatbot?.embed_url_preview ? (
        <p className="px-1 text-xs text-ink-500">
          This assistant&apos;s permanent address is{" "}
          <code className="rounded bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-700">
            {chatbot.embed_url_preview}
          </code>
          {chatbot.is_published
            ? "."
            : ". It goes live when you publish, and never changes after that."}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Tab with a single shared underline.
 *
 * The indicator is one element that framer-motion moves between tabs via
 * `layoutId`, rather than a border that blinks on and off per button. It is
 * `aria-hidden` and sits behind the label: the selected state is already
 * carried by `aria-selected`, so the animation adds nothing a screen reader
 * needs and should not be announced.
 */
function TabButton({
  id,
  active,
  onSelect,
  children,
}: {
  id: Tab;
  active: boolean;
  onSelect: (tab: Tab) => void;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={() => onSelect(id)}
      className={cn(
        "relative -mb-px px-3.5 py-2.5 text-sm font-medium transition-colors duration-200",
        active ? "text-burgundy-700" : "text-ink-500 hover:text-ink-900",
      )}
    >
      {active ? (
        <motion.span
          aria-hidden
          layoutId={reduced ? undefined : "chatbot-tab-indicator"}
          className="gradient-brand absolute inset-x-0 -bottom-px h-0.5 rounded-full"
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : null}
      {children}
    </button>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-ink-500 underline-offset-2 transition-colors hover:text-ink-900 hover:underline"
    >
      <ArrowLeft aria-hidden className="size-3.5" />
      Back to my assistants
    </Link>
  );
}
