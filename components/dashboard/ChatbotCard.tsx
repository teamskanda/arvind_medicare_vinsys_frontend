"use client";

import { ExternalLink, FileText, Globe, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Spotlight } from "@/components/motion/Spotlight";
import { Button } from "@/components/ui/Button";
import { CrawlStatusBadge } from "@/components/ui/Badge";
import { LiveCount } from "@/components/ui/Counter";
import { Modal } from "@/components/ui/Modal";
import { formatDate, hostOf, prettyUrl } from "@/lib/utils";
import type { Chatbot } from "@/types";

export function ChatbotCard({
  chatbot,
  onDelete,
  deleting,
}: {
  chatbot: Chatbot;
  onDelete: (id: string) => Promise<void>;
  deleting: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isWorking =
    chatbot.crawl_status === "crawling" ||
    chatbot.crawl_status === "processing" ||
    chatbot.crawl_status === "pending";

  return (
    <>
      <Spotlight
        as="article"
        className="spotlight-card lift-card flex flex-col rounded-2xl border border-ink-100 bg-surface"
      >
        <div className="relative z-1 flex-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-ink-900">
                <Link
                  href={`/dashboard/${chatbot.id}`}
                  className="underline-offset-2 hover:underline"
                >
                  {chatbot.name}
                </Link>
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                <Globe aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{prettyUrl(chatbot.website_url, 34)}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Only while the crawl is genuinely running. A dot that always
                  pulsed would stop meaning anything, so it is absent on a
                  settled assistant. */}
              {isWorking ? (
                <span
                  aria-hidden
                  className="pulse-ring size-1.5 rounded-full bg-burgundy-600"
                  style={{ "--pulse-scale": "3" } as React.CSSProperties}
                />
              ) : null}
              <CrawlStatusBadge status={chatbot.crawl_status} />
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-ink-100 pt-4">
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-ink-500 uppercase">
                Pages scraped
              </dt>
              <dd className="mt-0.5 flex items-baseline gap-1 text-sm text-ink-900">
                <FileText aria-hidden className="size-3.5 text-ink-300" />
                <span className="font-semibold">
                  {/* No count-up on mount here: on a card in a list the
                      figure is settled information, and rolling it every
                      time the list renders would be theatre. It still rolls
                      when the number actually changes mid-crawl. */}
                  <LiveCount
                    value={chatbot.stats.successful_pages}
                    label="pages scraped"
                  />
                </span>
                {chatbot.stats.failed_pages > 0 ? (
                  <span className="text-xs text-ink-500">
                    ({chatbot.stats.failed_pages} failed)
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-ink-500 uppercase">
                Created
              </dt>
              <dd className="mt-0.5 text-sm text-ink-900">
                {formatDate(chatbot.created_at)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative z-1 flex items-center justify-between gap-2 border-t border-ink-100 bg-surface-2/60 px-5 py-3.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            icon={<Trash2 aria-hidden className="size-3.5" />}
            aria-label={`Delete ${chatbot.name}`}
          >
            Delete
          </Button>

          <Link href={`/dashboard/${chatbot.id}`}>
            <Button
              size="sm"
              icon={<ExternalLink aria-hidden className="size-3.5" />}
            >
              {isWorking ? "View progress" : "Knowledge base"}
            </Button>
          </Link>
        </div>
      </Spotlight>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this assistant?"
        description={`${chatbot.name} · ${hostOf(chatbot.website_url)}`}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={async () => {
                await onDelete(chatbot.id);
                setConfirmOpen(false);
              }}
            >
              Delete assistant
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          This permanently removes the assistant and the{" "}
          <strong>{chatbot.stats.total_pages}</strong> scraped page
          {chatbot.stats.total_pages === 1 ? "" : "s"} in its knowledge base.
          This cannot be undone.
        </p>
      </Modal>
    </>
  );
}
