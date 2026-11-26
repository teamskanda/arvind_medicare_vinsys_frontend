"use client";

import { Bot, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ChatbotCard } from "@/components/dashboard/ChatbotCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ApiError, api } from "@/lib/api";
import type { Chatbot } from "@/types";

export default function DashboardPage() {
  const [chatbots, setChatbots] = useState<Chatbot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await api.listChatbots();
      setChatbots(response.chatbots);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load your assistants.",
      );
      setChatbots([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the list fresh while any chatbot is still being scraped.
  const hasActiveCrawl = (chatbots ?? []).some(
    (c) =>
      c.crawl_status === "pending" ||
      c.crawl_status === "crawling" ||
      c.crawl_status === "processing",
  );

  useEffect(() => {
    if (!hasActiveCrawl) return;
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [hasActiveCrawl, load]);

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      await api.deleteChatbot(id);
      setChatbots((current) => (current ?? []).filter((c) => c.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not delete that assistant.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="landing-kicker">
            <Sparkles className="size-3.5" aria-hidden />
            Your workspace
          </p>
          <h1 className="mt-3 text-[1.75rem] leading-none font-semibold tracking-[-0.04em] text-ink-900">
            My <span className="font-display italic text-burgundy-700">assistants</span>
          </h1>
          <p className="mt-2.5 text-sm text-ink-500">
            Each one is built from the pages of a single website.
          </p>
        </div>

        <Link href="/dashboard/new">
          <Button icon={<Plus aria-hidden className="size-4" />}>
            Create assistant
          </Button>
        </Link>
      </div>

      {error ? (
        <Callout
          tone="error"
          className="mt-6"
          action={
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          }
        >
          {error}
        </Callout>
      ) : null}

      {chatbots === null ? (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-[208px] animate-pulse rounded-2xl border border-ink-100 bg-surface"
            />
          ))}
        </div>
      ) : chatbots.length === 0 && !error ? (
        <EmptyState />
      ) : (
        <RevealGroup
          className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          stagger={0.07}
        >
          {chatbots.map((chatbot) => (
            <RevealItem key={chatbot.id}>
              <ChatbotCard
                chatbot={chatbot}
                onDelete={onDelete}
                deleting={deletingId === chatbot.id}
              />
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Reveal className="mt-7">
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface/50 px-6 py-16 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-[radial-gradient(ellipse_50%_100%_at_50%_100%,#c0456b2e,transparent_70%)]"
        />
        <span
          aria-hidden
          className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-burgundy-50 ring-1 ring-burgundy-200"
        >
          <Bot className="size-6 text-burgundy-700" strokeWidth={1.5} />
        </span>
        <h2 className="relative mt-5 text-lg font-semibold tracking-[-0.025em] text-ink-900">
          Nothing here yet
        </h2>
        <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
          Add your website address and SKANDA AI will read the site and build
          a knowledge base from it. It takes about a minute.
        </p>
        <Link href="/dashboard/new" className="relative mt-7 inline-block">
          <Button icon={<Plus aria-hidden className="size-4" />}>
            Create your first assistant
          </Button>
        </Link>
      </div>
    </Reveal>
  );
}
