"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Modal } from "@/components/ui/Modal";
import { ApiError, api } from "@/lib/api";
import { formatCharacters } from "@/lib/utils";
import type { WebsitePageDetail, WebsitePageSummary } from "@/types";

/**
 * Shows the extracted text for one page.
 *
 * Scraped content is untrusted, so it is rendered as plain text inside a
 * <pre>. There is no dangerouslySetInnerHTML and no Markdown-to-HTML step
 * anywhere in this app.
 */
export function PageContentModal({
  chatbotId,
  page,
  onClose,
}: {
  chatbotId: string;
  page: WebsitePageSummary | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<WebsitePageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!page) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    api
      .getPage(chatbotId, page.id)
      .then((response) => {
        if (!cancelled) setDetail(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load this page's content.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatbotId, page]);

  return (
    <Modal
      open={page !== null}
      onClose={onClose}
      size="lg"
      title={page?.title ?? "Page content"}
      description={page?.url}
      footer={
        <>
          {page ? (
            <a href={page.url} target="_blank" rel="noopener noreferrer nofollow">
              <Button
                variant="secondary"
                size="sm"
                icon={<ExternalLink aria-hidden className="size-3.5" />}
              >
                Open original
              </Button>
            </a>
          ) : null}
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="space-y-2" aria-busy>
          {[0, 1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className="app-skeleton h-3.5 rounded bg-ink-50"
              style={
                {
                  // Narrowing lines, so the placeholder reads as a paragraph
                  // rather than as a stack of identical bars.
                  width: `${100 - index * 7}%`,
                  "--skeleton-delay": `${index * 0.09}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ) : error ? (
        <Callout tone="error">{error}</Callout>
      ) : detail ? (
        <>
          <p className="mb-3 text-xs text-ink-500">
            {formatCharacters(detail.content_length)} extracted
            {detail.language ? ` · language: ${detail.language}` : ""}
          </p>
          {detail.content.trim() ? (
            <pre className="scrollbar-thin max-h-[60vh] overflow-auto rounded-md border border-ink-100 bg-canvas p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-900">
              {detail.content}
            </pre>
          ) : (
            <Callout tone="warning">
              No text content was extracted from this page.
            </Callout>
          )}
        </>
      ) : null}
    </Modal>
  );
}
