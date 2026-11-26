"use client";

import { Bot, MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ApiError, api, streamMessage } from "@/lib/api";
import { prettyUrl } from "@/lib/utils";
import type {
  ChatConfig,
  ChatMessage,
  Chatbot,
  RetrievalDebug,
  SourceReference,
} from "@/types";

import { MessageBubble } from "./MessageBubble";
import { RetrievalPanel } from "./RetrievalPanel";

/** A turn being streamed, before the backend hands us the persisted row. */
interface PendingAnswer {
  text: string;
  sources: SourceReference[];
}

export function Playground({ chatbot }: { chatbot: Chatbot }) {
  const chatbotId = chatbot.id;

  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingAnswer | null>(null);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrieval, setRetrieval] = useState<RetrievalDebug | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /* ---------------------------------------------------------------- */
  /* Load the resolved AI configuration                                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await api.getChatConfig(chatbotId);
        if (!cancelled) setConfig(loaded);
      } catch (err) {
        if (!cancelled) {
          setConfigError(
            err instanceof ApiError
              ? err.message
              : "Could not load the assistant's settings.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatbotId]);

  // Cancel an in-flight stream if the component goes away mid-answer.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep the newest turn in view, including while text streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending?.text]);

  /* ---------------------------------------------------------------- */
  /* Sending                                                           */
  /* ---------------------------------------------------------------- */

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      setError(null);
      setSending(true);
      setQuestion("");

      // Show the question immediately. `id` is provisional until the backend
      // returns the persisted row in the `start` event.
      const provisionalId = `pending-${Date.now()}`;
      setMessages((current) => [
        ...current,
        {
          id: provisionalId,
          conversation_id: conversationId ?? "",
          role: "user",
          content: trimmed,
          source_references: [],
          input_tokens: null,
          output_tokens: null,
          error_code: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setPending({ text: "", sources: [] });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamMessage(
          chatbotId,
          trimmed,
          conversationId,
          (event) => {
            switch (event.type) {
              case "start":
                setConversationId(event.conversation_id);
                setRetrieval(event.retrieval);
                setMessages((current) =>
                  current.map((message) =>
                    message.id === provisionalId
                      ? {
                          ...message,
                          id: event.user_message_id,
                          conversation_id: event.conversation_id,
                        }
                      : message,
                  ),
                );
                break;

              case "delta":
                setPending((current) =>
                  current
                    ? { ...current, text: current.text + event.text }
                    : { text: event.text, sources: [] },
                );
                break;

              case "sources":
                setPending((current) =>
                  current ? { ...current, sources: event.sources } : current,
                );
                break;

              case "done":
                setPending(null);
                setMessages((current) => [...current, event.message]);
                if (event.partial) {
                  setError(
                    "The reply was cut off before it finished. What arrived has been saved.",
                  );
                }
                break;

              case "error":
                setPending(null);
                setError(event.message);
                break;
            }
          },
          controller.signal,
        );
      } catch (err) {
        setPending(null);
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not reach the AI assistant. Please try again.",
        );
      } finally {
        setSending(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [chatbotId, conversationId, sending],
  );

  function startNewConversation() {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setPending(null);
    setRetrieval(null);
    setError(null);
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter adds a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(question);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  if (configError) {
    return <Callout tone="error">{configError}</Callout>;
  }

  if (!config) {
    return (
      <div className="h-80 animate-pulse rounded-card border border-ink-100 bg-surface" />
    );
  }

  const blocked = !config.ai_ready || !config.knowledge_base_ready;
  const hasConversation = messages.length > 0 || pending !== null;

  return (
    <section className="rounded-card border border-ink-100 bg-surface">
      {/* Header: real figures only, no invented statistics. */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot aria-hidden className="size-4 shrink-0 text-burgundy-600" />
            <h2 className="truncate text-sm font-semibold text-ink-900">
              {config.chatbot_name}
            </h2>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {prettyUrl(config.website_url, 40)} ·{" "}
            {config.included_pages} page
            {config.included_pages === 1 ? "" : "s"} in the knowledge base
          </p>
        </div>

        {hasConversation ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={startNewConversation}
            icon={<MessageSquarePlus aria-hidden className="size-3.5" />}
          >
            New conversation
          </Button>
        ) : null}
      </header>

      {!config.ai_ready ? (
        <div className="px-4 pt-3">
          <Callout tone="warning" title="The AI assistant is not configured">
            No Gemma API key is set on the server, so questions cannot be
            answered yet. Set <code>GEMMA_API_KEY</code> in{" "}
            <code>backend/.env</code> and restart the API.
          </Callout>
        </div>
      ) : !config.knowledge_base_ready ? (
        <div className="px-4 pt-3">
          <Callout tone="warning" title="No pages are included yet">
            This chatbot has no website content to answer from. Scrape the
            website, then include at least one page in the knowledge base.
          </Callout>
        </div>
      ) : null}

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="flex h-[26rem] flex-col gap-3.5 overflow-y-auto px-4 py-4"
      >
        {/* The greeting is the configured value, not a hardcoded string. */}
        <MessageBubble
          message={{
            role: "assistant",
            content: config.greeting,
            error_code: null,
          }}
        />

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {pending ? (
          pending.text ? (
            <MessageBubble
              message={{
                role: "assistant",
                content: pending.text,
                error_code: null,
                source_references: pending.sources,
              }}
              streaming
            />
          ) : (
            <ThinkingIndicator />
          )
        ) : null}
      </div>

      {error ? (
        <div className="px-4 pb-3">
          <Callout
            tone="error"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setError(null)}
                icon={<Trash2 aria-hidden className="size-3.5" />}
              >
                Dismiss
              </Button>
            }
          >
            {error}
          </Callout>
        </div>
      ) : null}

      {retrieval ? (
        <div className="px-4 pb-3">
          <RetrievalPanel retrieval={retrieval} />
        </div>
      ) : null}

      {/* Composer */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(question);
        }}
        className="flex items-end gap-2 border-t border-ink-100 px-4 py-3"
      >
        <label htmlFor="playground-question" className="sr-only">
          Ask this chatbot a question
        </label>
        <textarea
          id="playground-question"
          ref={inputRef}
          rows={1}
          value={question}
          disabled={blocked}
          maxLength={2000}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            blocked
              ? "Unavailable until the assistant is ready"
              : "Ask about prices, services, contact details…"
          }
          className="max-h-32 min-h-10 flex-1 resize-y rounded-md border border-ink-200 bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 disabled:bg-ink-50 disabled:text-ink-500"
        />
        <Button
          type="submit"
          loading={sending}
          disabled={blocked || !question.trim()}
          icon={<Send aria-hidden className="size-3.5" />}
        >
          Send
        </Button>
      </form>
    </section>
  );
}

/**
 * Shown between sending and the first streamed token. This is a genuine
 * waiting state — it appears only while a request is actually open, and
 * disappears the moment real text arrives.
 */
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2.5" role="status">
      <div
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-burgundy-600/20 bg-burgundy-50 text-burgundy-700"
      >
        <Bot className="size-3.5" />
      </div>
      <div className="flex items-center gap-1 rounded-card border border-ink-100 bg-surface px-3.5 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="size-1.5 animate-bounce rounded-full bg-ink-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
        <span className="sr-only">Reading the website content…</span>
      </div>
    </div>
  );
}
