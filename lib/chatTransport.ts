"use client";

import { ApiError, streamMessage } from "@/lib/api";
import {
  ensureVisitorSession,
  renewVisitorSession,
  streamPublicMessage,
} from "@/lib/publicApi";
import type { ChatStreamEvent, CustomizationUpdate } from "@/types";

/**
 * How the chat UI sends a message — the one thing that differs between the
 * chatbot a visitor talks to and the same chatbot previewed in the studio.
 *
 * Why this exists
 * ---------------
 *
 * Phase 4 requires the customisation preview to be the real chatbot: the same
 * component, answering real questions through the real Gemma pipeline. But
 * the two callers cannot share a credential. A visitor has an anonymous,
 * signed session and talks to the public endpoint, which serves the
 * **published** configuration. A customer in the studio has a verified session
 * and needs the **draft** configuration — the whole point of previewing is to
 * see changes that are not published yet.
 *
 * So the component takes its transport as a parameter and the caller
 * constructs it. What is deliberately *not* done here: there is no "mode"
 * flag inside one function that picks a credential, because that would put
 * the public path's authentication on a boolean. Each transport is built in
 * its own factory, from its own module, and neither can be reached by passing
 * the wrong argument.
 *
 * The retry contract is part of the interface because only the transport
 * knows what is recoverable. A visitor's expired session is worth one silent
 * retry; an expired dashboard login is not — that one needs the customer to
 * sign in again, and quietly retrying would hide why nothing is happening.
 */
export interface ChatTransport {
  /** Stream one answer. Errors inside the stream arrive as `error` events. */
  stream(
    message: string,
    conversationId: string | null,
    onEvent: (event: ChatStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void>;

  /**
   * Prepare for a genuinely new thread.
   *
   * Clearing the transcript is not enough on the public path: the backend
   * resumes by `(chatbot_id, session_id)`, so the same visitor session would
   * reopen the same row and the old turns would still be fed to the prompt.
   */
  startNewThread(): Promise<void>;

  /** Is this failure worth one automatic retry on a fresh thread? */
  isRecoverable(error: unknown): boolean;

  /** Do whatever that retry needs. Only called when `isRecoverable`. */
  recover(): Promise<void>;
}

/**
 * The visitor's transport: anonymous session, published configuration.
 */
export function publicTransport(publicId: string): ChatTransport {
  return {
    async stream(message, conversationId, onEvent, signal) {
      const token = await ensureVisitorSession(publicId);
      await streamPublicMessage(
        publicId,
        token,
        message,
        conversationId,
        onEvent,
        signal,
      );
    },

    async startNewThread() {
      try {
        await renewVisitorSession(publicId);
      } catch {
        // Not fatal: the next send calls `ensureVisitorSession` anyway. The
        // worst case is that the thread continues, which is what would have
        // happened without a "new conversation" button at all.
      }
    },

    isRecoverable(error) {
      // A stored token that has expired, or was signed by a previous server
      // process, is the one failure worth retrying automatically: the visitor
      // did nothing wrong and a fresh session fixes it.
      return (
        error instanceof ApiError &&
        (error.code === "visitor_session_expired" ||
          error.code === "visitor_session_invalid")
      );
    },

    async recover() {
      await renewVisitorSession(publicId);
    },
  };
}

/**
 * The studio's transport: the customer's own token, draft configuration.
 *
 * The ordinary playground uses saved drafts. When getCustomization is supplied,
 * the studio sends its latest unsaved edits to the authenticated preview-chat
 * endpoint, using the same retrieval and generation pipeline.
 */
export function playgroundTransport(
  chatbotId: string, getCustomization?: () => CustomizationUpdate,
): ChatTransport {
  return {
    async stream(message, conversationId, onEvent, signal) {
      await streamMessage(chatbotId, message, conversationId, onEvent, signal, getCustomization?.());
    },

    async startNewThread() {
      // Nothing to do: with no session handle the backend generates a fresh
      // one, so clearing the conversation id is the whole of it.
    },

    isRecoverable() {
      // An expired dashboard session needs a real sign-in. Retrying silently
      // would hide that from the customer.
      return false;
    },

    async recover() {
      // Unreachable while `isRecoverable` is false; present so the interface
      // has no optional members to forget to check.
    },
  };
}
