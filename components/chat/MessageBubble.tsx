"use client";

import { AlertCircle, Bot, User } from "lucide-react";

import { withAlpha } from "@/lib/appearance";
import { cn } from "@/lib/utils";
import type { ChatMessage, Palette, SourceReference } from "@/types";

import { SourceList } from "./SourceList";

/**
 * One chat turn.
 *
 * The AI's answer is rendered as **plain text**, never as HTML or Markdown
 * through `dangerouslySetInnerHTML`. The model's output is derived from
 * scraped website content, which is untrusted, so treating it as markup would
 * turn a hostile page into stored XSS. `whitespace-pre-wrap` preserves the
 * line breaks the model produces without interpreting anything.
 *
 * One component, two looks. Without a `palette` it wears the SKANDA AI theme,
 * which is what the dashboard playground wants. With one it wears the
 * customer's chosen colours, which is what the public chatbot and the
 * customisation preview want — the same component in both, so what the
 * customer designs is literally what a visitor gets.
 */
export function MessageBubble({
  message,
  streaming = false,
  palette = null,
}: {
  message: Pick<ChatMessage, "role" | "content" | "error_code"> & {
    source_references?: SourceReference[];
  };
  streaming?: boolean;
  /**
   * The customer's resolved colours.
   *
   * Applied as inline styles rather than classes because the values come
   * from the database and Tailwind can only generate classes for values
   * present in the source at build time. Every one is validated as a hex
   * literal server-side (`is_hex_color` in backend/models/customization.py),
   * so none of them can carry anything but a colour.
   */
  palette?: Palette | null;
}) {
  const isUser = message.role === "user";
  const isError = Boolean(message.error_code) && !isUser;
  const sources = message.source_references ?? [];
  // An error keeps the red treatment whatever the brand colour is: a failure
  // that looks like a normal answer is worse than a palette inconsistency.
  const themed = palette !== null && !isError;

  const avatarStyle: React.CSSProperties | undefined =
    themed && palette
      ? isUser
        ? {
            borderColor: palette.border,
            backgroundColor: palette.ai_bubble,
            color: palette.muted_text,
          }
        : {
            borderColor: withAlpha(palette.primary, 0.22),
            backgroundColor: withAlpha(palette.primary, 0.08),
            color: palette.primary,
          }
      : undefined;

  const bubbleStyle: React.CSSProperties | undefined =
    themed && palette
      ? isUser
        ? {
            backgroundColor: palette.user_bubble,
            color: palette.user_bubble_text,
            borderColor: withAlpha(palette.primary, 0.18),
            borderRadius: "var(--chat-radius, 10px)",
          }
        : {
            backgroundColor: palette.ai_bubble,
            color: palette.message_text,
            borderColor: palette.border,
            borderRadius: "var(--chat-radius, 10px)",
          }
      : undefined;

  return (
    <div
      className={cn(
        "flex w-full gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "border-ink-200 bg-surface text-ink-500"
            : isError
              ? "border-danger-700/25 bg-danger-50 text-danger-700"
              : "border-burgundy-600/20 bg-burgundy-50 text-burgundy-700",
        )}
        style={avatarStyle}
      >
        {isUser ? (
          <User className="size-3.5" />
        ) : isError ? (
          <AlertCircle className="size-3.5" />
        ) : (
          <Bot className="size-3.5" />
        )}
      </div>

      <div className={cn("min-w-0 max-w-[85%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-card border px-3.5 py-2.5 text-sm leading-relaxed",
            isUser
              ? "border-burgundy-600/15 bg-burgundy-50 text-ink-900"
              : isError
                ? "border-danger-700/25 bg-danger-50 text-danger-700"
                : "border-ink-100 bg-surface text-ink-900",
          )}
          style={bubbleStyle}
        >
          {/* Plain text only — see the note above. */}
          <p className="whitespace-pre-wrap break-words">
            {message.content}
            {streaming ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-burgundy-600"
                style={themed && palette ? { backgroundColor: palette.primary } : undefined}
              />
            ) : null}
          </p>
        </div>

        {!isUser && sources.length > 0 ? (
          <SourceList sources={sources} palette={palette} />
        ) : null}
      </div>
    </div>
  );
}
