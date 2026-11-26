"use client";

import { Bot, MessageSquarePlus, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { ApiError } from "@/lib/api";
import { paletteVariables, useResolvedPalette, withAlpha } from "@/lib/appearance";
import type { ChatTransport } from "@/lib/chatTransport";
import { isEmbedded, listenToParent, notifyReady, requestClose } from "@/lib/embedBridge";
import { cn } from "@/lib/utils";
import type {
  ChatMessage,
  EmbedMode,
  Palette,
  PublicBotConfig,
  SourceReference,
} from "@/types";

/**
 * The chatbot a website visitor talks to — and, with a different transport,
 * the live preview inside the customisation studio.
 *
 * One component serves all three deployment modes. They differ only in
 * chrome, not behaviour:
 *
 *   inline — fills its iframe container, no close button
 *   panel  — floating, shows a close button that asks the loader to collapse
 *   full   — a centred full-page conversation for the shareable link
 *
 * Everything else — the session, the streaming, the citations, the error
 * handling — is identical, because they are the same chatbot reached three
 * ways.
 *
 * Phase 4 added two things and deliberately not a third:
 *
 *   * **Appearance.** Every colour, the font and the corner radius come from
 *     `config.appearance`, resolved by the backend. Nothing here derives a
 *     colour, so the studio preview and a visitor's window cannot drift.
 *   * **A transport.** The caller supplies how a message is sent, which is
 *     what lets the studio preview answer real questions through the real
 *     pipeline against the *draft* configuration. See lib/chatTransport.ts.
 *
 * What was not added is a "preview mode" branch. The preview is this
 * component with no conditions of its own — the moment it renders something
 * different from the deployed chatbot, it stops being a preview.
 *
 * This component renders **no HTML from the model**. `MessageBubble` prints
 * plain text; answers derive from scraped pages, which are untrusted, so
 * treating them as markup would turn a hostile page into stored XSS on the
 * customer's own website.
 */

interface PendingAnswer {
  text: string;
  sources: SourceReference[];
}

export function PublicChat({
  config,
  mode,
  transport,
  onClose,
}: {
  config: PublicBotConfig;
  mode: EmbedMode;
  transport: ChatTransport;
  onClose?: () => void;
}) {
  const { appearance } = config;
  const { palette } = useResolvedPalette(appearance);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingAnswer | null>(null);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostIsMobile, setHostIsMobile] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const embedded = isEmbedded();
  // `hostIsMobile` is the host page's own report, which is authoritative: on
  // a mobile sheet the launcher is hidden, so this button is the only exit.
  const showClose = Boolean(onClose) || (embedded && (mode === "panel" || hostIsMobile));
  const started = messages.length > 0 || pending !== null;

  /* ---------------------------------------------------------------- */
  /* Host-page bridge                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    notifyReady();
    // The host page answers `ready` with its viewport. We only need one fact
    // from it: whether the launcher is hidden, because on a full-screen
    // mobile sheet the in-frame close button is the visitor's *only* way out.
    //
    // Note what is deliberately absent: `close` does not cancel an answer in
    // flight. Closing the panel only hides the iframe — the frame keeps
    // running, so letting the reply finish means it is streamed, persisted
    // and waiting when the visitor reopens. Aborting would throw away an
    // answer they are about to come back for.
    return listenToParent((message) => {
      if (message.type === "viewport") setHostIsMobile(message.mobile);
    });
  }, []);

  // Cancel an in-flight stream if the chatbot is unmounted mid-answer.
  useEffect(() => () => abortRef.current?.abort(), []);

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

      const run = (thread: string | null) =>
        transport.stream(
          trimmed,
          thread,
          (event) => {
            switch (event.type) {
              case "start":
                setConversationId(event.conversation_id);
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
                  setError("The reply was cut off before it finished.");
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

      try {
        await run(conversationId);
      } catch (err) {
        // Only the transport knows what is worth retrying: a visitor's
        // expired session is, an expired dashboard login is not.
        if (transport.isRecoverable(err)) {
          try {
            await transport.recover();
            // The new session has a new handle, and a conversation belongs to
            // the handle that created it. Carrying the old conversation id
            // over would 404 on the visitor-isolation check and leave the
            // chat permanently broken, so the retry starts a fresh thread.
            setConversationId(null);
            await run(null);
            return;
          } catch (retryError) {
            setPending(null);
            setError(
              retryError instanceof ApiError
                ? retryError.message
                : "The chat assistant is unavailable. Please try again.",
            );
          }
        } else {
          setPending(null);
          setError(
            err instanceof ApiError
              ? err.message
              : "The chat assistant is unavailable. Please try again.",
          );
        }
      } finally {
        setSending(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [conversationId, sending, transport],
  );

  /**
   * Start a genuinely new thread, not just a cleared screen.
   *
   * Clearing the transcript is not enough on the public path. The backend
   * resumes a conversation by `(chatbot_id, session_id)`, so with the same
   * visitor session the next question would reopen the same row and the
   * previous turns would still be loaded into the prompt — the visitor would
   * clear the screen and find the assistant still remembering. The transport
   * knows what its own identity needs; here we only clear the screen.
   */
  async function startNewConversation() {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setPending(null);
    setError(null);
    await transport.startNewThread();
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(question);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className={cn(
        // Height comes from the container, not the viewport. In an iframe
        // that container is the frame (the embed page gives it `h-dvh`, which
        // unlike `h-screen` accounts for a mobile address bar); in the
        // customisation studio it is the preview surface. Same component,
        // sized by wherever it is.
        "flex h-full min-h-0 w-full flex-col overflow-hidden",
        mode === "full" && "mx-auto max-w-2xl border-x",
      )}
      // The palette arrives as custom properties so a nested element can read
      // a colour without it being threaded through every component.
      style={{
        ...paletteVariables(palette, appearance),
        backgroundColor: palette.ai_bubble,
        borderColor: palette.border,
      }}
    >
      <header
        className="flex shrink-0 items-center gap-2.5 px-4 py-3"
        style={{
          backgroundColor: palette.header_background,
          color: palette.header_text,
        }}
      >
        <Avatar config={config} palette={palette} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{config.chatbot_name}</p>
          {/* The business name when the customer set one, otherwise the
              hostname the visitor is already on. */}
          {(config.business_name ?? config.website_host) ? (
            <p className="truncate text-[11px] opacity-80">
              {config.business_name ?? config.website_host}
            </p>
          ) : null}
        </div>

        {config.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.logo_url} alt={`${config.business_name ?? config.chatbot_name} logo`}
            className="max-h-7 max-w-16 object-contain" />
        ) : null}

        {started ? (
          <HeaderButton
            onClick={() => void startNewConversation()}
            label="Start a new conversation"
            palette={palette}
          >
            <MessageSquarePlus aria-hidden className="size-4" />
          </HeaderButton>
        ) : null}

        {showClose ? (
          <HeaderButton
            onClick={onClose ?? requestClose}
            label="Close the chat"
            palette={palette}
          >
            <X aria-hidden className="size-4" />
          </HeaderButton>
        ) : null}
      </header>

      {/* Transcript */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overflow-x-hidden px-3.5 py-4"
        style={{ backgroundColor: palette.chat_background }}
      >
        {/* The welcome line sits above the first message: an instruction for
            the visitor ("Ask about our opening hours"), not something the
            assistant said. */}
        {config.welcome_message ? (
          <p
            className="px-1 text-center text-[11px] leading-relaxed"
            style={{ color: palette.muted_text }}
          >
            {config.welcome_message}
          </p>
        ) : null}

        <MessageBubble
          message={{ role: "assistant", content: config.greeting, error_code: null }}
          palette={palette}
        />

        {messages.map((message) => (
          <MessageBubble key={message.id} message={{ ...message, source_references: config.cite_sources ? message.source_references : [] }} palette={palette} />
        ))}

        {pending ? (
          pending.text ? (
            <MessageBubble
              message={{
                role: "assistant",
                content: pending.text,
                error_code: null,
                source_references: config.cite_sources ? pending.sources : [],
              }}
              streaming
              palette={palette}
            />
          ) : (
            <TypingIndicator palette={palette} />
          )
        ) : null}

        {/* Suggested questions, only when the customer configured them and
            only before the conversation starts. */}
        {!started && config.suggested_questions.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5 pl-9">
            {config.suggested_questions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="px-3 py-1.5 text-left text-xs transition-colors"
                style={{
                  border: `1px solid ${withAlpha(palette.secondary, 0.4)}`,
                  backgroundColor: palette.ai_bubble,
                  color: palette.secondary,
                  borderRadius: "var(--chat-radius)",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="shrink-0 border-t border-danger-700/20 bg-danger-50 px-4 py-2.5 text-xs text-danger-700"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 font-medium underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* Composer */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(question);
        }}
        className="flex shrink-0 items-end gap-2 border-t px-3 py-2.5"
        style={{ borderColor: palette.border, backgroundColor: palette.ai_bubble }}
      >
        <label htmlFor="skanda-question" className="sr-only">
          Type your question
        </label>
        <textarea
          id="skanda-question"
          ref={inputRef}
          rows={1}
          value={question}
          maxLength={config.max_message_length}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your question…"
          className="max-h-28 min-h-9 flex-1 resize-none px-3 py-2 text-sm focus:outline-none"
          style={{
            border: `1px solid ${palette.border}`,
            backgroundColor: palette.chat_background,
            color: palette.message_text,
            borderRadius: "var(--chat-radius-sm)",
          }}
        />
        <button
          type="submit"
          disabled={sending || !question.trim()}
          className="flex size-9 shrink-0 items-center justify-center transition-opacity disabled:opacity-40"
          style={{
            backgroundColor: palette.primary,
            color: palette.header_text,
            borderRadius: "var(--chat-radius-sm)",
          }}
        >
          <Send aria-hidden className="size-4" />
          <span className="sr-only">Send</span>
        </button>
      </form>

      {config.show_branding ? (
        <p
          className="shrink-0 border-t py-1.5 text-center text-[10px]"
          style={{
            borderColor: palette.border,
            backgroundColor: palette.ai_bubble,
            color: palette.muted_text,
          }}
        >
          Powered by <span className="font-semibold tracking-wide">SKANDA AI</span>
        </p>
      ) : null}
    </div>
  );
}

function HeaderButton({
  onClick,
  label,
  palette,
  children,
}: {
  onClick: () => void;
  label: string;
  palette: Palette;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="p-1.5 transition-opacity hover:opacity-70"
      style={{ color: palette.header_text, borderRadius: "var(--chat-radius-sm)" }}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function Avatar({
  config,
  palette,
}: {
  config: PublicBotConfig;
  palette: Palette;
}) {
  const image = config.avatar_url;
  if (image) {
    return (
      // A plain <img>: the URL is either an image this customer uploaded or
      // an https URL they chose, and next/image would need every possible
      // host configured at build time. The backend restricts the value to
      // `asset:<uuid>` or https (see `resolve_image`).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className="size-7 shrink-0 object-contain p-0.5"
        style={{
          backgroundColor: withAlpha(palette.header_text, 0.9),
          borderRadius: "var(--chat-radius-sm)",
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: withAlpha(palette.header_text, 0.2) }}
    >
      <Bot className="size-4" />
    </div>
  );
}

/**
 * Shown between sending and the first streamed token.
 *
 * A genuine waiting state: it exists only while a request is actually open
 * and vanishes the moment real text arrives.
 */
function TypingIndicator({ palette }: { palette: Palette }) {
  return (
    <div className="flex items-center gap-2.5" role="status">
      <div
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full border"
        style={{
          borderColor: withAlpha(palette.primary, 0.22),
          color: palette.primary,
          backgroundColor: withAlpha(palette.primary, 0.08),
        }}
      >
        <Bot className="size-3.5" />
      </div>
      <div
        className="flex items-center gap-1 border px-3.5 py-3"
        style={{
          borderColor: palette.border,
          backgroundColor: palette.ai_bubble,
          borderRadius: "var(--chat-radius)",
        }}
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="size-1.5 animate-bounce rounded-full"
            style={{ animationDelay: `${delay}ms`, backgroundColor: palette.muted_text }}
          />
        ))}
        <span className="sr-only">Looking that up…</span>
      </div>
    </div>
  );
}
